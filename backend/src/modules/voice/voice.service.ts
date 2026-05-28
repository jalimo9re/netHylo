import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VoiceNumber } from '@/database/entities/voice-number.entity';
import { VoiceCall, VoiceCallDirection, VoiceCallStatus } from '@/database/entities/voice-call.entity';
import { VoiceAgentPresence, VoiceAgentStatus } from '@/database/entities/voice-agent-status.entity';
import { VoiceQueue } from '@/database/entities/voice-queue.entity';
import { VoiceQueueMember } from '@/database/entities/voice-queue-member.entity';
import { VoiceCallEvent } from '@/database/entities/voice-call-event.entity';
import { Contact } from '@/database/entities/contact.entity';
import { Conversation, ConversationStatus } from '@/database/entities/conversation.entity';
import { Integration, IntegrationStatus } from '@/database/entities/integration.entity';
import { Message, MessageDirection, MessageStatus, MessageType } from '@/database/entities/message.entity';

type TelnyxWebhookPayload = {
  data?: {
    event_type?: string;
    id?: string;
    occurred_at?: string;
    payload?: Record<string, any>;
  };
};

@Injectable()
export class VoiceService {
  private readonly logger = new Logger(VoiceService.name);

  constructor(
    @InjectRepository(VoiceNumber) private readonly voiceNumberRepo: Repository<VoiceNumber>,
    @InjectRepository(VoiceCall) private readonly voiceCallRepo: Repository<VoiceCall>,
    @InjectRepository(VoiceAgentStatus) private readonly agentStatusRepo: Repository<VoiceAgentStatus>,
    @InjectRepository(VoiceQueue) private readonly queueRepo: Repository<VoiceQueue>,
    @InjectRepository(VoiceQueueMember) private readonly queueMemberRepo: Repository<VoiceQueueMember>,
    @InjectRepository(VoiceCallEvent) private readonly callEventRepo: Repository<VoiceCallEvent>,
    @InjectRepository(Contact) private readonly contactRepo: Repository<Contact>,
    @InjectRepository(Conversation) private readonly conversationRepo: Repository<Conversation>,
    @InjectRepository(Integration) private readonly integrationRepo: Repository<Integration>,
    @InjectRepository(Message) private readonly messageRepo: Repository<Message>,
    private readonly config: ConfigService,
  ) {}

  async registerNumber(tenantId: string, data: Partial<VoiceNumber>) {
    if (!data.phoneNumber || !data.telnyxConnectionId) {
      throw new BadRequestException('phoneNumber y telnyxConnectionId son requeridos');
    }

    const existing = await this.voiceNumberRepo.findOne({
      where: { tenantId, phoneNumber: data.phoneNumber },
    });
    if (existing) {
      existing.telnyxConnectionId = data.telnyxConnectionId;
      existing.friendlyName = data.friendlyName ?? existing.friendlyName;
      existing.isActive = data.isActive ?? existing.isActive;
      existing.metadata = { ...(existing.metadata || {}), ...(data.metadata || {}) };
      return this.voiceNumberRepo.save(existing);
    }

    return this.voiceNumberRepo.save(
      this.voiceNumberRepo.create({
        tenantId,
        phoneNumber: data.phoneNumber,
        telnyxConnectionId: data.telnyxConnectionId,
        friendlyName: data.friendlyName || null,
        isActive: data.isActive ?? true,
        metadata: data.metadata || {},
      }),
    );
  }

  setAgentStatus(tenantId: string, userId: string, status: VoiceAgentPresence) {
    if (!Object.values(VoiceAgentPresence).includes(status)) {
      throw new BadRequestException('Estado de agente inválido');
    }
    const now = new Date();
    return this.agentStatusRepo.save(
      this.agentStatusRepo.create({
        tenantId,
        userId,
        status,
        lastChangedAt: now,
      }),
    );
  }

  listAgentStatuses(tenantId: string) {
    return this.agentStatusRepo.find({
      where: { tenantId },
      order: { updatedAt: 'DESC' },
    });
  }

  async upsertQueue(tenantId: string, queueId: string | null, data: Partial<VoiceQueue>) {
    if (!data.name?.trim()) throw new BadRequestException('El nombre de cola es requerido');
    if (!queueId) {
      return this.queueRepo.save(
        this.queueRepo.create({
          tenantId,
          name: data.name.trim(),
          strategy: data.strategy || 'round_robin',
          ringTimeoutSeconds: data.ringTimeoutSeconds ?? 30,
          isActive: data.isActive ?? true,
          metadata: data.metadata || {},
        }),
      );
    }
    const queue = await this.queueRepo.findOne({ where: { id: queueId, tenantId } });
    if (!queue) throw new NotFoundException('Cola no encontrada');
    queue.name = data.name.trim();
    queue.strategy = data.strategy || queue.strategy;
    queue.ringTimeoutSeconds = data.ringTimeoutSeconds ?? queue.ringTimeoutSeconds;
    queue.isActive = data.isActive ?? queue.isActive;
    queue.metadata = { ...(queue.metadata || {}), ...(data.metadata || {}) };
    return this.queueRepo.save(queue);
  }

  async setQueueMembers(tenantId: string, queueId: string, members: Array<{ userId: string; priority?: number }>) {
    const queue = await this.queueRepo.findOne({ where: { id: queueId, tenantId } });
    if (!queue) throw new NotFoundException('Cola no encontrada');
    await this.queueMemberRepo.delete({ tenantId, queueId });
    const toSave = members
      .filter((m) => !!m.userId)
      .map((m) =>
        this.queueMemberRepo.create({
          tenantId,
          queueId,
          userId: m.userId,
          priority: m.priority ?? 100,
          isActive: true,
        }),
      );
    if (toSave.length > 0) await this.queueMemberRepo.save(toSave);
    return this.listQueues(tenantId);
  }

  async listQueues(tenantId: string) {
    const queues = await this.queueRepo.find({
      where: { tenantId },
      order: { createdAt: 'ASC' },
    });
    const members = await this.queueMemberRepo.find({
      where: { tenantId, isActive: true },
      order: { priority: 'ASC' },
    });
    return queues.map((queue) => ({
      ...queue,
      members: members.filter((m) => m.queueId === queue.id),
    }));
  }

  async initiateOutboundCall(
    tenantId: string,
    userId: string,
    data: { toNumber: string; fromNumber?: string; queueId?: string | null },
  ) {
    const activeNumber = data.fromNumber
      ? await this.voiceNumberRepo.findOne({ where: { tenantId, phoneNumber: data.fromNumber } })
      : await this.voiceNumberRepo.findOne({
          where: { tenantId, isActive: true },
          order: { createdAt: 'ASC' },
        });

    if (!activeNumber) {
      throw new BadRequestException('No hay un número de voz activo para este tenant');
    }

    const call = await this.voiceCallRepo.save(
      this.voiceCallRepo.create({
        tenantId,
        voiceNumberId: activeNumber.id,
        queueId: data.queueId || null,
        agentUserId: userId,
        fromNumber: activeNumber.phoneNumber,
        toNumber: data.toNumber,
        direction: VoiceCallDirection.OUTBOUND,
        status: VoiceCallStatus.INITIATED,
        startedAt: new Date(),
        metadata: { source: 'click_to_call' },
      }),
    );

    const telnyxApiKey = this.config.get<string>('TELNYX_API_KEY', '').trim();
    if (!telnyxApiKey) {
      throw new BadRequestException('TELNYX_API_KEY no configurada');
    }

    const response = await fetch('https://api.telnyx.com/v2/calls', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${telnyxApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        connection_id: activeNumber.telnyxConnectionId,
        to: data.toNumber,
        from: activeNumber.phoneNumber,
      }),
    });
    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      call.status = VoiceCallStatus.FAILED;
      call.metadata = { ...(call.metadata || {}), telnyxError: body };
      await this.voiceCallRepo.save(call);
      throw new BadRequestException('Telnyx rechazó la llamada outbound');
    }

    call.externalCallControlId = body?.data?.call_control_id || null;
    call.metadata = { ...(call.metadata || {}), telnyx: body?.data || {} };
    await this.voiceCallRepo.save(call);
    await this.createCallEvent(call.id, tenantId, 'call.outbound.requested', body || {});
    await this.appendCallTraceMessage(call, 'Llamada outbound iniciada');
    return call;
  }

  async listCalls(
    tenantId: string,
    filters: { status?: string; direction?: string; queueId?: string; from?: string; to?: string; limit?: number },
  ) {
    const qb = this.voiceCallRepo.createQueryBuilder('call').where('call.tenant_id = :tenantId', { tenantId });
    if (filters.status) qb.andWhere('call.status = :status', { status: filters.status });
    if (filters.direction) qb.andWhere('call.direction = :direction', { direction: filters.direction });
    if (filters.queueId) qb.andWhere('call.queue_id = :queueId', { queueId: filters.queueId });
    if (filters.from) qb.andWhere('call.from_number ILIKE :from', { from: `%${filters.from}%` });
    if (filters.to) qb.andWhere('call.to_number ILIKE :to', { to: `%${filters.to}%` });
    qb.orderBy('call.createdAt', 'DESC').take(Math.min(Math.max(filters.limit || 50, 1), 200));
    return qb.getMany();
  }

  async getMetrics(tenantId: string) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const calls = await this.voiceCallRepo
      .createQueryBuilder('call')
      .where('call.tenant_id = :tenantId', { tenantId })
      .andWhere('call.createdAt >= :start', { start })
      .getMany();

    const answered = calls.filter((c) => c.status === VoiceCallStatus.ANSWERED || !!c.answeredAt).length;
    const missed = calls.filter((c) => c.status === VoiceCallStatus.MISSED).length;
    const durations = calls.map((c) => c.durationSeconds || 0).filter((v) => v > 0);
    const waits = calls.map((c) => c.queueWaitSeconds || 0).filter((v) => v > 0);
    const avgDuration = durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
    const avgQueueWait = waits.length ? Math.round(waits.reduce((a, b) => a + b, 0) / waits.length) : 0;
    return {
      total: calls.length,
      answered,
      missed,
      avgDurationSeconds: avgDuration,
      avgQueueWaitSeconds: avgQueueWait,
    };
  }

  async handleTelnyxWebhook(
    payload: TelnyxWebhookPayload,
    headers: Record<string, string | string[] | undefined>,
  ) {
    const configuredSecret = this.config.get<string>('TELNYX_WEBHOOK_SECRET', '').trim();
    if (configuredSecret) {
      const incomingSecret = String(headers['x-telnyx-webhook-secret'] || '');
      if (!incomingSecret || incomingSecret !== configuredSecret) {
        throw new UnauthorizedException('Webhook secret inválido');
      }
    }

    const eventType = payload.data?.event_type || 'unknown';
    const eventPayload = payload.data?.payload || {};
    const callControlId = String(eventPayload.call_control_id || eventPayload.call_leg_id || payload.data?.id || '');
    if (!callControlId) throw new BadRequestException('Webhook sin call_control_id');

    const toNumber = this.normalizePhone(eventPayload.to || eventPayload.destination || '');
    const fromNumber = this.normalizePhone(eventPayload.from || eventPayload.caller || '');
    const tenantId = await this.resolveTenantFromNumbers(toNumber, fromNumber);
    if (!tenantId) {
      this.logger.warn(`Webhook voice ignorado: no se encontró tenant para ${fromNumber} -> ${toNumber}`);
      return { status: 'ignored_no_tenant' };
    }

    let call = await this.voiceCallRepo.findOne({
      where: { tenantId, externalCallControlId: callControlId },
    });
    if (!call) {
      const tenantNumber = await this.findTenantNumber(tenantId, toNumber, fromNumber);
      call = await this.voiceCallRepo.save(
        this.voiceCallRepo.create({
          tenantId,
          voiceNumberId: tenantNumber?.id || null,
          fromNumber,
          toNumber,
          direction: this.inferDirection(tenantNumber?.phoneNumber || '', fromNumber),
          status: VoiceCallStatus.INITIATED,
          externalCallControlId: callControlId,
          startedAt: new Date(payload.data?.occurred_at || Date.now()),
          metadata: {},
        }),
      );
    }

    this.applyWebhookTransition(call, eventType, eventPayload, payload.data?.occurred_at);
    call.metadata = { ...(call.metadata || {}), lastEventPayload: eventPayload };
    await this.voiceCallRepo.save(call);
    await this.createCallEvent(call.id, tenantId, eventType, eventPayload);
    await this.appendCallTraceMessage(call, `Evento de llamada: ${eventType}`);
    return { status: 'ok' };
  }

  applyWebhookTransition(
    call: VoiceCall,
    eventType: string,
    eventPayload: Record<string, any>,
    occurredAt?: string,
  ) {
    const eventTime = occurredAt ? new Date(occurredAt) : new Date();
    if (eventType.includes('answered')) {
      call.status = VoiceCallStatus.ANSWERED;
      call.answeredAt = eventTime;
      if (call.startedAt) {
        call.queueWaitSeconds = Math.max(
          0,
          Math.floor((eventTime.getTime() - call.startedAt.getTime()) / 1000),
        );
      }
      return;
    }

    if (eventType.includes('hangup') || eventType.includes('ended')) {
      call.endedAt = eventTime;
      call.status = call.answeredAt ? VoiceCallStatus.HANGUP : VoiceCallStatus.MISSED;
      if (call.answeredAt) {
        call.durationSeconds = Math.max(
          0,
          Math.floor((eventTime.getTime() - call.answeredAt.getTime()) / 1000),
        );
      }
      return;
    }

    if (eventType.includes('dtmf')) {
      call.metadata = {
        ...(call.metadata || {}),
        lastDtmf: eventPayload.digits || eventPayload.digit || '',
      };
      return;
    }

    if (eventType.includes('ringing')) {
      call.status = VoiceCallStatus.RINGING;
    }
  }

  private async appendCallTraceMessage(call: VoiceCall, text: string) {
    const integration = await this.integrationRepo.findOne({
      where: { tenantId: call.tenantId, status: IntegrationStatus.ACTIVE },
      order: { createdAt: 'ASC' },
    });
    if (!integration) return;

    const externalId = this.normalizePhone(call.direction === VoiceCallDirection.INBOUND ? call.fromNumber : call.toNumber);
    if (!externalId) return;

    let contact = await this.contactRepo.findOne({ where: { tenantId: call.tenantId, externalId } });
    if (!contact) {
      contact = await this.contactRepo.save(
        this.contactRepo.create({
          tenantId: call.tenantId,
          externalId,
          phone: externalId,
          name: `Voice ${externalId}`,
          metadata: { source: 'voice' },
        }),
      );
    }

    let conversation = await this.conversationRepo.findOne({
      where: { tenantId: call.tenantId, contactId: contact.id, integrationId: integration.id },
    });
    if (!conversation) {
      conversation = await this.conversationRepo.save(
        this.conversationRepo.create({
          tenantId: call.tenantId,
          contactId: contact.id,
          integrationId: integration.id,
          status: ConversationStatus.OPEN,
          lastMessageAt: new Date(),
        }),
      );
    }

    await this.messageRepo.save(
      this.messageRepo.create({
        tenantId: call.tenantId,
        conversationId: conversation.id,
        direction: MessageDirection.INBOUND,
        content: `${text}. ${call.fromNumber} -> ${call.toNumber}`,
        type: MessageType.TEXT,
        status: MessageStatus.DELIVERED,
        metadata: { voiceCallId: call.id, callStatus: call.status },
      }),
    );
    conversation.lastMessageAt = new Date();
    await this.conversationRepo.save(conversation);
  }

  private async createCallEvent(
    voiceCallId: string,
    tenantId: string,
    eventType: string,
    payload: Record<string, any>,
  ) {
    await this.callEventRepo.save(
      this.callEventRepo.create({
        tenantId,
        voiceCallId,
        eventType,
        payload,
      }),
    );
  }

  private normalizePhone(input: string) {
    return String(input || '').trim();
  }

  private inferDirection(tenantNumber: string, fromNumber: string): VoiceCallDirection {
    return this.normalizePhone(fromNumber) === this.normalizePhone(tenantNumber)
      ? VoiceCallDirection.OUTBOUND
      : VoiceCallDirection.INBOUND;
  }

  private async findTenantNumber(tenantId: string, toNumber: string, fromNumber: string) {
    return this.voiceNumberRepo.findOne({
      where: [{ tenantId, phoneNumber: toNumber }, { tenantId, phoneNumber: fromNumber }],
    });
  }

  private async resolveTenantFromNumbers(toNumber: string, fromNumber: string) {
    const number = await this.voiceNumberRepo.findOne({
      where: [{ phoneNumber: toNumber }, { phoneNumber: fromNumber }],
    });
    return number?.tenantId;
  }
}
