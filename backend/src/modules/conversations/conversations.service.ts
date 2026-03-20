import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from '@/database/entities/conversation.entity';

@Injectable()
export class ConversationsService {
  constructor(
    @InjectRepository(Conversation)
    private conversationRepo: Repository<Conversation>,
  ) {}

  async findAllByTenant(tenantId: string) {
    return this.conversationRepo.find({
      where: { tenantId },
      relations: ['contact', 'integration', 'assignedUser'],
      order: { lastMessageAt: 'DESC' },
    });
  }

  async findOne(id: string, tenantId: string) {
    const conversation = await this.conversationRepo.findOne({
      where: { id, tenantId },
      relations: ['contact', 'integration', 'assignedUser'],
    });
    if (!conversation) throw new NotFoundException('Conversation not found');
    return conversation;
  }

  async update(id: string, tenantId: string, data: Partial<Conversation>) {
    await this.findOne(id, tenantId);
    await this.conversationRepo.update(id, data);
    return this.findOne(id, tenantId);
  }

  async assign(id: string, tenantId: string, userId: string) {
    return this.update(id, tenantId, { assignedUserId: userId });
  }
}
