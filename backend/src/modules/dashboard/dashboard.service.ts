import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { Conversation, ConversationStatus } from '@/database/entities/conversation.entity';
import { Message } from '@/database/entities/message.entity';
import { Contact } from '@/database/entities/contact.entity';
import { Integration, IntegrationStatus } from '@/database/entities/integration.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Conversation) private conversationRepo: Repository<Conversation>,
    @InjectRepository(Message) private messageRepo: Repository<Message>,
    @InjectRepository(Contact) private contactRepo: Repository<Contact>,
    @InjectRepository(Integration) private integrationRepo: Repository<Integration>,
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
}
