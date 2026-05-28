import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { Conversation, ConversationStatus } from '@/database/entities/conversation.entity';
import { Message } from '@/database/entities/message.entity';
import { Contact } from '@/database/entities/contact.entity';
import { Integration, IntegrationStatus } from '@/database/entities/integration.entity';
import { CrmDeal } from '@/database/entities/crm-deal.entity';
import { CrmTask, CrmTaskStatus } from '@/database/entities/crm-task.entity';
import { User } from '@/database/entities/user.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Conversation) private conversationRepo: Repository<Conversation>,
    @InjectRepository(Message) private messageRepo: Repository<Message>,
    @InjectRepository(Contact) private contactRepo: Repository<Contact>,
    @InjectRepository(Integration) private integrationRepo: Repository<Integration>,
    @InjectRepository(CrmDeal) private dealRepo: Repository<CrmDeal>,
    @InjectRepository(CrmTask) private taskRepo: Repository<CrmTask>,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  async getStats(tenantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [openConversations, messagesToday, contacts, activeIntegrations] =
      await Promise.all([
        this.conversationRepo.count({
          where: { tenantId, status: ConversationStatus.OPEN },
        }),
        this.messageRepo.count({
          where: { tenantId, createdAt: MoreThanOrEqual(today) },
        }),
        this.contactRepo.count({ where: { tenantId } }),
        this.integrationRepo.count({
          where: { tenantId, status: IntegrationStatus.ACTIVE },
        }),
      ]);

    return { openConversations, messagesToday, contacts, activeIntegrations };
  }

  async getRecentActivity(tenantId: string) {
    const messages = await this.messageRepo.find({
      where: { tenantId },
      relations: ['conversation', 'conversation.contact', 'senderUser'],
      order: { createdAt: 'DESC' },
      take: 10,
    });

    return messages.map((m) => ({
      id: m.id,
      type: m.direction === 'inbound' ? 'received' : 'sent',
      contactName: m.conversation?.contact?.name || m.conversation?.contact?.phone || 'Desconocido',
      content: m.content?.substring(0, 80) || '',
      messageType: m.type,
      createdAt: m.createdAt,
      senderUser: m.senderUser
        ? `${m.senderUser.firstName} ${m.senderUser.lastName}`
        : null,
    }));
  }

  async getAgentPerformance(tenantId: string) {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [responsesRaw, wonDealsRaw, overdueTasksRaw, users] = await Promise.all([
      this.messageRepo
        .createQueryBuilder('message')
        .select('message.senderUserId', 'userId')
        .addSelect('COUNT(*)::int', 'responsesInbox')
        .where('message.tenantId = :tenantId', { tenantId })
        .andWhere("message.direction = 'outbound'")
        .andWhere('message.senderUserId IS NOT NULL')
        .andWhere('message.createdAt >= :weekAgo', { weekAgo })
        .groupBy('message.senderUserId')
        .getRawMany<{ userId: string; responsesInbox: number }>(),
      this.dealRepo
        .createQueryBuilder('deal')
        .select('deal.ownerUserId', 'userId')
        .addSelect('COUNT(*)::int', 'dealsWon')
        .where('deal.tenantId = :tenantId', { tenantId })
        .andWhere('deal.ownerUserId IS NOT NULL')
        .andWhere('LOWER(deal.stage) = :wonStage', { wonStage: 'won' })
        .groupBy('deal.ownerUserId')
        .getRawMany<{ userId: string; dealsWon: number }>(),
      this.taskRepo
        .createQueryBuilder('task')
        .select('task.assigneeUserId', 'userId')
        .addSelect('COUNT(*)::int', 'overdueTasks')
        .where('task.tenantId = :tenantId', { tenantId })
        .andWhere('task.assigneeUserId IS NOT NULL')
        .andWhere('task.status = :status', { status: CrmTaskStatus.OPEN })
        .andWhere('task.dueAt IS NOT NULL')
        .andWhere('task.dueAt < NOW()')
        .groupBy('task.assigneeUserId')
        .getRawMany<{ userId: string; overdueTasks: number }>(),
      this.userRepo.find({
        where: { tenantId },
        select: ['id', 'firstName', 'lastName', 'email'],
      }),
    ]);

    const byUser = new Map<
      string,
      { userId: string; agentName: string; responsesInbox: number; dealsWon: number; overdueTasks: number }
    >();

    const ensure = (userId: string) => {
      if (!byUser.has(userId)) {
        const user = users.find((candidate) => candidate.id === userId);
        byUser.set(userId, {
          userId,
          agentName: user ? `${user.firstName} ${user.lastName}`.trim() : 'Agente',
          responsesInbox: 0,
          dealsWon: 0,
          overdueTasks: 0,
        });
      }
      return byUser.get(userId)!;
    };

    for (const row of responsesRaw) ensure(row.userId).responsesInbox = Number(row.responsesInbox || 0);
    for (const row of wonDealsRaw) ensure(row.userId).dealsWon = Number(row.dealsWon || 0);
    for (const row of overdueTasksRaw) ensure(row.userId).overdueTasks = Number(row.overdueTasks || 0);

    const agents = Array.from(byUser.values()).sort(
      (a, b) =>
        b.responsesInbox - a.responsesInbox || b.dealsWon - a.dealsWon || a.overdueTasks - b.overdueTasks,
    );

    return {
      timeframeDays: 7,
      agents,
      totals: {
        responsesInbox: agents.reduce((sum, row) => sum + row.responsesInbox, 0),
        dealsWon: agents.reduce((sum, row) => sum + row.dealsWon, 0),
        overdueTasks: agents.reduce((sum, row) => sum + row.overdueTasks, 0),
      },
    };
  }
}
