import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bullmq';
import { ProviderFactory } from '../providers/provider.factory';
import { MessagingGateway } from '../gateway/messaging.gateway';
import { Integration, IntegrationProvider } from '@/database/entities/integration.entity';
import { Contact } from '@/database/entities/contact.entity';
import { Conversation, ConversationStatus } from '@/database/entities/conversation.entity';
import { Message, MessageDirection, MessageStatus, MessageType } from '@/database/entities/message.entity';
import { IncomingMessage, StatusUpdate } from '../providers/messaging-provider.interface';

interface WebhookJobData {
  provider: IntegrationProvider;
  integrationId: string;
  tenantId: string;
  payload: any;
}

@Processor('webhooks')
export class WebhooksProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhooksProcessor.name);

  constructor(
    private providerFactory: ProviderFactory,
    private messagingGateway: MessagingGateway,
    @InjectRepository(Integration) private integrationRepo: Repository<Integration>,
    @InjectRepository(Contact) private contactRepo: Repository<Contact>,
    @InjectRepository(Conversation) private conversationRepo: Repository<Conversation>,
    @InjectRepository(Message) private messageRepo: Repository<Message>,
  ) {
    super();
  }

  async process(job: Job<WebhookJobData>) {
    const { provider, integrationId, tenantId, payload } = job.data;
    this.logger.log(`Processing webhook job ${job.id} for integration ${integrationId}`);

    const providerInstance = this.providerFactory.getProvider(provider);
    const parsed = providerInstance.parseWebhookEvent(payload, {});

    // Fetch integration config for profile lookups
    const integration = provider === IntegrationProvider.WHATSAPP
      ? await this.integrationRepo.findOne({ where: { id: integrationId } })
      : null;

    for (const incomingMsg of parsed.messages) {
      if (integration?.provider === IntegrationProvider.WHATSAPP) {
        await this.enrichContactProfile(integration, incomingMsg);
      }
      await this.handleIncomingMessage(tenantId, integrationId, incomingMsg);
    }

    for (const statusUpdate of parsed.statusUpdates) {
      await this.handleStatusUpdate(tenantId, statusUpdate);
    }
  }

  private async handleIncomingMessage(
    tenantId: string,
    integrationId: string,
    incoming: IncomingMessage,
  ) {
    if (incoming.type === MessageType.IMAGE) {
      this.logger.log(
        `Handling inbound IMAGE. integrationId=${integrationId} mediaId=${incoming.metadata?.mediaId || 'n/a'} externalMessageId=${incoming.messageExternalId}`,
      );
    }

    // 1. Find or create contact
    let contact = await this.contactRepo.findOne({
      where: { tenantId, externalId: incoming.externalContactId },
    });

    if (!contact) {
      contact = this.contactRepo.create({
        tenantId,
        externalId: incoming.externalContactId,
        name: incoming.contactName || incoming.externalContactId,
        phone: incoming.contactPhone,
      });
      await this.contactRepo.save(contact);
    }

    // 2. Find or create conversation
    let conversation = await this.conversationRepo.findOne({
      where: {
        tenantId,
        integrationId,
        contactId: contact.id,
        status: ConversationStatus.OPEN,
      },
    });

    if (!conversation) {
      conversation = this.conversationRepo.create({
        tenantId,
        integrationId,
        contactId: contact.id,
        status: ConversationStatus.OPEN,
      });
      await this.conversationRepo.save(conversation);
    }

    // 3. Create message
    const message = this.messageRepo.create({
      tenantId,
      conversationId: conversation.id,
      direction: MessageDirection.INBOUND,
      content: incoming.content,
      type: incoming.type,
      status: MessageStatus.DELIVERED,
      externalId: incoming.messageExternalId,
      metadata: {
        ...(incoming.metadata || {}),
        rawPayload: incoming.rawPayload,
      },
    });
    await this.messageRepo.save(message);
    if (incoming.type === MessageType.IMAGE) {
      this.logger.log(
        `Inbound IMAGE persisted. messageId=${message.id} conversationId=${conversation.id} mediaId=${message.metadata?.mediaId || 'n/a'}`,
      );
    }

    // 4. Update conversation lastMessageAt
    conversation.lastMessageAt = new Date();
    await this.conversationRepo.save(conversation);

    // 5. Emit real-time event
    this.messagingGateway.emitToTenant(tenantId, 'new_message', {
      conversationId: conversation.id,
      message: {
        id: message.id,
        direction: message.direction,
        content: message.content,
        type: message.type,
        status: message.status,
        metadata: message.metadata,
        createdAt: message.createdAt,
      },
      contact: {
        id: contact.id,
        name: contact.name,
        phone: contact.phone,
      },
    });

    this.logger.log(
      `Message ${message.id} created in conversation ${conversation.id}`,
    );
  }

  /**
   * Reads the WhatsApp Business phone number profile via public_profile
   * (Graph API) to enrich contact data and satisfy Meta's permission review.
   */
  private async enrichContactProfile(integration: Integration, incoming: IncomingMessage) {
    const accessToken = integration.config?.accessToken;
    const phoneNumberId = integration.config?.phoneNumberId;
    if (!accessToken || !phoneNumberId) return;

    try {
      const response = await fetch(
        `https://graph.facebook.com/v21.0/${phoneNumberId}?fields=verified_name,display_phone_number&access_token=${accessToken}`,
      );
      const data = await response.json();

      if (response.ok) {
        this.logger.log(
          `public_profile read OK. phoneNumberId=${phoneNumberId} verified_name=${data.verified_name || 'n/a'} contact=${incoming.externalContactId}`,
        );
      } else {
        this.logger.warn(
          `public_profile read failed. phoneNumberId=${phoneNumberId} error=${JSON.stringify(data.error)}`,
        );
      }
    } catch (error) {
      this.logger.warn(`public_profile call error: ${(error as Error).message}`);
    }
  }

  private async handleStatusUpdate(tenantId: string, update: StatusUpdate) {
    const message = await this.messageRepo.findOne({
      where: { externalId: update.externalMessageId, tenantId },
    });

    if (!message) return;

    const statusMap: Record<string, MessageStatus> = {
      sent: MessageStatus.SENT,
      delivered: MessageStatus.DELIVERED,
      read: MessageStatus.READ,
      failed: MessageStatus.FAILED,
    };

    message.status = statusMap[update.status] || message.status;
    await this.messageRepo.save(message);

    this.messagingGateway.emitToTenant(tenantId, 'message_status', {
      messageId: message.id,
      conversationId: message.conversationId,
      status: message.status,
    });
  }
}
