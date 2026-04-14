import { Injectable, Logger, NotFoundException, StreamableFile } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message, MessageDirection, MessageStatus } from '@/database/entities/message.entity';
import { Conversation } from '@/database/entities/conversation.entity';
import { Integration, IntegrationProvider } from '@/database/entities/integration.entity';
import { ProviderFactory } from '../integrations/providers/provider.factory';
import { MessagingGateway } from '../integrations/gateway/messaging.gateway';
import { SendMessageOptions } from '../integrations/providers/messaging-provider.interface';

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

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
      metadata: options.metadata || {},
    });
    await this.messageRepo.save(message);
    if (options.type === 'image') {
      this.logger.log(
        `Outbound IMAGE queued. messageId=${message.id} conversationId=${conversationId} hasDataUrl=${!!options.metadata?.dataUrl} hasMediaId=${!!options.metadata?.mediaId}`,
      );
    }

    // Send via provider
    try {
      const provider = this.providerFactory.getProvider(integration.provider);
      const result = await provider.sendMessage(integration.config, {
        ...options,
        to: conversation.contact.externalId,
      });

      message.externalId = result.externalId;
      message.status = MessageStatus.SENT;
      message.metadata = { ...(message.metadata || {}), ...(result.metadata || {}) };
      if (options.type === 'image') {
        this.logger.log(
          `Outbound IMAGE sent. messageId=${message.id} externalId=${message.externalId || 'n/a'} mediaId=${message.metadata?.mediaId || 'n/a'}`,
        );
      }
    } catch (error) {
      message.status = MessageStatus.FAILED;
      message.metadata = {
        ...(message.metadata || {}),
        error: (error as Error).message,
      };
      if (options.type === 'image') {
        this.logger.error(
          `Outbound IMAGE failed. messageId=${message.id} error=${(error as Error).message}`,
        );
      }
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
        metadata: message.metadata,
        createdAt: message.createdAt,
      },
    });

    return message;
  }

  async getMediaFile(conversationId: string, messageId: string, tenantId: string) {
    const message = await this.messageRepo.findOne({
      where: { id: messageId, conversationId, tenantId },
    });
    if (!message) throw new NotFoundException('Message not found');

    const conversation = await this.conversationRepo.findOne({
      where: { id: conversationId, tenantId },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');

    const integration = await this.integrationRepo.findOne({
      where: { id: conversation.integrationId },
    });
    if (!integration) throw new NotFoundException('Integration not found');

    if (integration.provider !== IntegrationProvider.WHATSAPP) {
      throw new NotFoundException('Media preview not available for this provider');
    }

    const mediaId = message.metadata?.mediaId || message.content;
    if (!mediaId || typeof mediaId !== 'string') {
      this.logger.warn(
        `Media requested but unavailable. messageId=${messageId} conversationId=${conversationId}`,
      );
      throw new NotFoundException('Media not available');
    }

    const accessToken = integration.config?.accessToken;
    if (!accessToken) throw new NotFoundException('Provider access token not configured');
    this.logger.log(
      `Resolving WhatsApp media. messageId=${messageId} conversationId=${conversationId} mediaId=${mediaId}`,
    );

    const metadataResponse = await fetch(`https://graph.facebook.com/v21.0/${mediaId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const mediaMetadata = await metadataResponse.json();
    if (!metadataResponse.ok || !mediaMetadata?.url) {
      this.logger.error(
        `WhatsApp media metadata fetch failed. mediaId=${mediaId} status=${metadataResponse.status} body=${JSON.stringify(mediaMetadata)}`,
      );
      throw new NotFoundException('Could not resolve media URL');
    }

    const mediaResponse = await fetch(mediaMetadata.url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (!mediaResponse.ok) {
      this.logger.error(
        `WhatsApp media download failed. mediaId=${mediaId} status=${mediaResponse.status}`,
      );
      throw new NotFoundException('Could not download media');
    }

    const arrayBuffer = await mediaResponse.arrayBuffer();
    this.logger.log(
      `WhatsApp media downloaded. messageId=${messageId} mediaId=${mediaId} bytes=${arrayBuffer.byteLength}`,
    );
    return {
      file: new StreamableFile(Buffer.from(arrayBuffer)),
      contentType: mediaMetadata.mime_type || message.metadata?.mimeType || 'application/octet-stream',
      fileName: message.metadata?.fileName || `${message.id}`,
    };
  }
}
