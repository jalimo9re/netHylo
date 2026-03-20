import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message, MessageDirection, MessageStatus } from '@/database/entities/message.entity';
import { Conversation } from '@/database/entities/conversation.entity';
import { Integration } from '@/database/entities/integration.entity';
import { ProviderFactory } from '../integrations/providers/provider.factory';
import { MessagingGateway } from '../integrations/gateway/messaging.gateway';
import { SendMessageOptions } from '../integrations/providers/messaging-provider.interface';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message) private messageRepo: Repository<Message>,
    @InjectRepository(Conversation) private conversationRepo: Repository<Conversation>,
    @InjectRepository(Integration) private integrationRepo: Repository<Integration>,
    private providerFactory: ProviderFactory,
    private messagingGateway: MessagingGateway,
  ) {}

  async findByConversation(conversationId: string, tenantId: string) {
    return this.messageRepo.find({
      where: { conversationId, tenantId },
      relations: ['senderUser'],
      order: { createdAt: 'ASC' },
    });
  }

  async send(
    conversationId: string,
    tenantId: string,
    senderUserId: string,
    options: SendMessageOptions,
  ) {
    const conversation = await this.conversationRepo.findOne({
      where: { id: conversationId, tenantId },
      relations: ['contact', 'integration'],
    });
    if (!conversation) throw new NotFoundException('Conversation not found');

    const integration = await this.integrationRepo.findOne({
      where: { id: conversation.integrationId },
    });
    if (!integration) throw new NotFoundException('Integration not found');

    // Save message as pending
    const message = this.messageRepo.create({
      tenantId,
      conversationId,
      senderUserId,
      direction: MessageDirection.OUTBOUND,
      content: options.content,
      type: options.type,
      status: MessageStatus.PENDING,
    });
    await this.messageRepo.save(message);

    // Send via provider
    try {
      const provider = this.providerFactory.getProvider(integration.provider);
      const result = await provider.sendMessage(integration.config, {
        ...options,
        to: conversation.contact.externalId,
      });

      message.externalId = result.externalId;
      message.status = MessageStatus.SENT;
    } catch (error) {
      message.status = MessageStatus.FAILED;
      message.metadata = { error: (error as Error).message };
    }

    await this.messageRepo.save(message);

    // Update conversation
    conversation.lastMessageAt = new Date();
    await this.conversationRepo.save(conversation);

    // Emit real-time
    this.messagingGateway.emitToTenant(tenantId, 'new_message', {
      conversationId,
      message: {
        id: message.id,
        senderUserId: message.senderUserId,
        direction: message.direction,
        content: message.content,
        type: message.type,
        status: message.status,
        createdAt: message.createdAt,
      },
    });

    return message;
  }
}
