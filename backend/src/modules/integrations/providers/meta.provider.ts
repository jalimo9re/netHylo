import { Injectable } from '@nestjs/common';
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

const META_API_URL = 'https://graph.facebook.com/v21.0';

@Injectable()
export class MetaProvider extends MessagingProviderBase {
  readonly provider = IntegrationProvider.META;

  async sendMessage(
    config: Record<string, any>,
    options: SendMessageOptions,
  ): Promise<SendMessageResult> {
    const pageAccessToken = config.pageAccessToken;
    const url = `${META_API_URL}/me/messages`;

    const body = {
      recipient: { id: options.to },
      message: this.buildMessage(options),
    };

    const response = await fetch(`${url}?access_token=${pageAccessToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Meta API error: ${JSON.stringify(data)}`);
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
      integrationExternalId = entry.id || '';

      const messaging = entry.messaging || [];
      for (const event of messaging) {
        if (event.message) {
          messages.push({
            externalContactId: event.sender.id,
            contactName: undefined,
            messageExternalId: event.message.mid,
            content: event.message.text || `[${event.message.attachments?.[0]?.type || 'attachment'}]`,
            type: this.mapAttachmentType(event.message.attachments?.[0]?.type),
            timestamp: new Date(event.timestamp),
            rawPayload: event,
          });
        }

        if (event.delivery) {
          for (const mid of event.delivery.mids || []) {
            statusUpdates.push({
              externalMessageId: mid,
              status: 'delivered',
              timestamp: new Date(event.timestamp),
            });
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
    return config.pageId || '';
  }

  private buildMessage(options: SendMessageOptions): any {
    if (options.type === MessageType.TEXT) {
      return { text: options.content };
    }
    return {
      attachment: {
        type: this.toMetaAttachmentType(options.type),
        payload: { url: options.content, is_reusable: true },
      },
    };
  }

  private toMetaAttachmentType(type: MessageType): string {
    const map: Record<string, string> = {
      [MessageType.IMAGE]: 'image',
      [MessageType.VIDEO]: 'video',
      [MessageType.AUDIO]: 'audio',
      [MessageType.FILE]: 'file',
    };
    return map[type] || 'file';
  }

  private mapAttachmentType(type?: string): MessageType {
    if (!type) return MessageType.TEXT;
    const map: Record<string, MessageType> = {
      image: MessageType.IMAGE,
      video: MessageType.VIDEO,
      audio: MessageType.AUDIO,
      file: MessageType.FILE,
    };
    return map[type] || MessageType.FILE;
  }
}
