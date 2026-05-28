import { UnauthorizedException } from '@nestjs/common';
import { VoiceService } from './voice.service';
import { VoiceCall, VoiceCallDirection, VoiceCallStatus } from '@/database/entities/voice-call.entity';

const repoMock = () => ({
  findOne: jest.fn(),
  save: jest.fn(async (v) => v),
  create: jest.fn((v) => v),
  find: jest.fn(),
  delete: jest.fn(),
  createQueryBuilder: jest.fn(),
});

describe('VoiceService', () => {
  const buildService = () => {
    const voiceNumberRepo = repoMock();
    const voiceCallRepo = repoMock();
    const agentStatusRepo = repoMock();
    const queueRepo = repoMock();
    const queueMemberRepo = repoMock();
    const callEventRepo = repoMock();
    const contactRepo = repoMock();
    const conversationRepo = repoMock();
    const integrationRepo = repoMock();
    const messageRepo = repoMock();
    const config = { get: jest.fn((key: string) => (key === 'TELNYX_WEBHOOK_SECRET' ? 'secret-1' : '')) };

    const service = new VoiceService(
      voiceNumberRepo as any,
      voiceCallRepo as any,
      agentStatusRepo as any,
      queueRepo as any,
      queueMemberRepo as any,
      callEventRepo as any,
      contactRepo as any,
      conversationRepo as any,
      integrationRepo as any,
      messageRepo as any,
      config as any,
    );

    return { service, voiceNumberRepo, voiceCallRepo };
  };

  it('aplica transición answered -> hangup con duración', () => {
    const { service } = buildService();
    const call = {
      status: VoiceCallStatus.INITIATED,
      startedAt: new Date('2024-01-01T10:00:00.000Z'),
      answeredAt: null,
      endedAt: null,
      durationSeconds: null,
      queueWaitSeconds: null,
      metadata: {},
    } as VoiceCall;

    service.applyWebhookTransition(call, 'call.answered', {}, '2024-01-01T10:00:05.000Z');
    expect(call.status).toBe(VoiceCallStatus.ANSWERED);
    expect(call.queueWaitSeconds).toBe(5);

    service.applyWebhookTransition(call, 'call.hangup', {}, '2024-01-01T10:00:20.000Z');
    expect(call.status).toBe(VoiceCallStatus.HANGUP);
    expect(call.durationSeconds).toBe(15);
  });

  it('rechaza webhook si secret no coincide', async () => {
    const { service } = buildService();
    await expect(
      service.handleTelnyxWebhook(
        { data: { event_type: 'call.answered', payload: { call_control_id: 'abc', to: '+1', from: '+2' } } },
        { 'x-telnyx-webhook-secret': 'bad-secret' },
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('mapea dirección inbound al crear llamada desde webhook', async () => {
    const { service, voiceNumberRepo, voiceCallRepo } = buildService();
    voiceNumberRepo.findOne.mockResolvedValue({ tenantId: 't1', id: 'n1', phoneNumber: '+15550001111' });
    voiceCallRepo.findOne.mockResolvedValue(null);
    await service.handleTelnyxWebhook(
      {
        data: {
          event_type: 'call.initiated',
          payload: { call_control_id: 'call-1', to: '+15550001111', from: '+15552223333' },
        },
      },
      { 'x-telnyx-webhook-secret': 'secret-1' },
    );

    const created = voiceCallRepo.create.mock.calls[0][0];
    expect(created.direction).toBe(VoiceCallDirection.INBOUND);
  });
});
