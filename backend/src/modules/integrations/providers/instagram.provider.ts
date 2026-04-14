import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import {
  MessagingProviderBase,
  SendMessageOptions,
  SendMessageResult,
  ParsedWebhookEvent,
  WebhookVerification,
  IncomingMessage,
  StatusUpdate,
} from './messaging-provider.interface';
import { IntegrationProvider } from '@/database/entities/integration.entity';
import { MessageType } from '@/database/entities/message.entity';

// Instagram Messaging uses the Facebook Graph API, NOT graph.instagram.com
const GRAPH_API_URL = 'https://graph.facebook.com/v21.0';

@Injectable()
export class InstagramProvider extends MessagingProviderBase {
  readonly provider = IntegrationProvider.INSTAGRAM;
  private readonly logger = new Logger(InstagramProvider.name);

  async sendMessage(
    config: Record<string, any>,
    options: SendMessageOptions,
  ): Promise<SendMessageResult> {
    const accessToken = config.accessToken;
    const igAccountId = config.igAccountId;

    const body: any = {
      recipient: { id: options.to },
    };

    if (options.type === MessageType.TEXT) {
      body.message = { text: options.content };
    } else {
      body.message = {
        attachment: {
          type: this.toIgAttachmentType(options.type),
          payload: { url: options.content, is_reusable: true },
        },
      };
    }

    const url = `${GRAPH_API_URL}/${igAccountId}/messages`;
    const response = await fetch(`${url}?access_token=${accessToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      this.logger.error(`Instagram sendMessage failed: ${JSON.stringify(data)}`);
      throw new Error(`Instagram API error: ${JSON.stringify(data)}`);
    }

    return {
      externalId: data.message_id || '',
      timestamp: new Date(),
    };
  }

  parseWebhookEvent(
    payload: any,
    _headers: Record<string, string>,
  ): ParsedWebhookEvent {
    const messages: IncomingMessage[] = [];
    const statusUpdates: StatusUpdate[] = [];
    let integrationExternalId = '';

    const entries = payload.entry || [];
    for (const entry of entries) {
      // For Instagram, entry.id is the Instagram-scoped ID (igAccountId)
      integrationExternalId = entry.id || '';

      const messaging = entry.messaging || [];
      for (const event of messaging) {
        if (event.message) {
          const attachments = event.message.attachments || [];
          const firstAttachment = attachments[0];

          messages.push({
            externalContactId: event.sender.id,
            contactName: undefined,
            messageExternalId: event.message.mid,
            content: event.message.text || firstAttachment?.payload?.url || `[${firstAttachment?.type || 'media'}]`,
            type: this.mapAttachmentType(firstAttachment?.type),
            timestamp: new Date(event.timestamp),
            metadata: this.extractAttachmentMetadata(firstAttachment),
            rawPayload: event,
          });

          if (event.message?.reply_to?.story) {
            const msg = messages[messages.length - 1];
            if (msg) {
              msg.metadata = { ...msg.metadata, storyReply: true, storyUrl: event.message.reply_to.story.url };
            }
          }
        }

        if (event.read) {
          statusUpdates.push({
            externalMessageId: event.read.watermark?.toString() || '',
            status: 'read',
            timestamp: new Date(event.timestamp),
          });
        }
      }
    }

    return { integrationExternalId, messages, statusUpdates };
  }

  handleVerification(
    query: Record<string, string>,
    config: Record<string, any>,
  ): WebhookVerification {
    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];

    if (mode === 'subscribe' && token === config.verifyToken) {
      return { isVerification: true, challenge };
    }

    return { isVerification: false };
  }

  verifySignature(
    rawBody: Buffer,
    headers: Record<string, string>,
    secret: string,
  ): boolean {
    const signature = headers['x-hub-signature-256'];
    if (!signature) return false;

    const expectedSignature =
      'sha256=' +
      crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );
  }

  getExternalIdFromConfig(config: Record<string, any>): string {
    return config.igAccountId || '';
  }

  private extractAttachmentMetadata(attachment: any): Record<string, any> {
    if (!attachment) return {};
    return {
      mediaUrl: attachment.payload?.url,
      mediaType: attachment.type,
      mimeType: attachment.payload?.mime_type,
    };
  }

  private toIgAttachmentType(type: MessageType): string {
    const map: Record<string, string> = {
      [MessageType.IMAGE]: 'image',
      [MessageType.VIDEO]: 'video',
      [MessageType.AUDIO]: 'audio',
      [MessageType.FILE]: 'file',
    };
    return map[type] || 'image';
  }

  private mapAttachmentType(type?: string): MessageType {
    if (!type) return MessageType.TEXT;
    const map: Record<string, MessageType> = {
      image: MessageType.IMAGE,
      video: MessageType.VIDEO,
      audio: MessageType.AUDIO,
      file: MessageType.FILE,
      share: MessageType.IMAGE,
      story_mention: MessageType.IMAGE,
    };
    return map[type] || MessageType.FILE;
  }
}
