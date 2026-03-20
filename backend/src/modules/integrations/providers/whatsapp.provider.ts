import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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

const WHATSAPP_API_URL = 'https://graph.facebook.com/v21.0';

@Injectable()
export class WhatsAppProvider extends MessagingProviderBase {
  readonly provider = IntegrationProvider.WHATSAPP;

  constructor(private configService: ConfigService) {
    super();
  }

  async sendMessage(
    config: Record<string, any>,
    options: SendMessageOptions,
  ): Promise<SendMessageResult> {
    const phoneNumberId = config.phoneNumberId;
    const accessToken = config.accessToken;
    const url = `${WHATSAPP_API_URL}/${phoneNumberId}/messages`;

    const body = this.buildMessagePayload(options);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`WhatsApp API error: ${JSON.stringify(data)}`);
    }

    return {
      externalId: data.messages?.[0]?.id || '',
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
      const changes = entry.changes || [];
      for (const change of changes) {
        if (change.field !== 'messages') continue;
        const value = change.value;
        integrationExternalId = value.metadata?.phone_number_id || '';

        // Incoming messages
        if (value.messages) {
          const contacts = value.contacts || [];
          for (const msg of value.messages) {
            const contact = contacts.find(
              (c: any) => c.wa_id === msg.from,
            );
            messages.push({
              externalContactId: msg.from,
              contactName: contact?.profile?.name,
              contactPhone: msg.from,
              messageExternalId: msg.id,
              content: this.extractContent(msg),
              type: this.mapMessageType(msg.type),
              timestamp: new Date(parseInt(msg.timestamp) * 1000),
              rawPayload: msg,
            });
          }
        }

        // Status updates
        if (value.statuses) {
          for (const status of value.statuses) {
            statusUpdates.push({
              externalMessageId: status.id,
              status: this.mapStatus(status.status),
              timestamp: new Date(parseInt(status.timestamp) * 1000),
            });
          }
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
    return config.phoneNumberId || '';
  }

  private buildMessagePayload(options: SendMessageOptions): any {
    const base = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: options.to,
    };

    switch (options.type) {
      case MessageType.IMAGE:
        return { ...base, type: 'image', image: { link: options.content } };
      case MessageType.VIDEO:
        return { ...base, type: 'video', video: { link: options.content } };
      case MessageType.AUDIO:
        return { ...base, type: 'audio', audio: { link: options.content } };
      case MessageType.FILE:
        return { ...base, type: 'document', document: { link: options.content } };
      default:
        return { ...base, type: 'text', text: { preview_url: false, body: options.content } };
    }
  }

  private extractContent(msg: any): string {
    switch (msg.type) {
      case 'text':
        return msg.text?.body || '';
      case 'image':
        return msg.image?.id || msg.image?.link || '[image]';
      case 'video':
        return msg.video?.id || msg.video?.link || '[video]';
      case 'audio':
        return msg.audio?.id || msg.audio?.link || '[audio]';
      case 'document':
        return msg.document?.id || msg.document?.link || '[document]';
      default:
        return `[${msg.type}]`;
    }
  }

  private mapMessageType(waType: string): MessageType {
    const map: Record<string, MessageType> = {
      text: MessageType.TEXT,
      image: MessageType.IMAGE,
      video: MessageType.VIDEO,
      audio: MessageType.AUDIO,
      document: MessageType.FILE,
    };
    return map[waType] || MessageType.TEXT;
  }

  private mapStatus(waStatus: string): 'sent' | 'delivered' | 'read' | 'failed' {
    const map: Record<string, 'sent' | 'delivered' | 'read' | 'failed'> = {
      sent: 'sent',
      delivered: 'delivered',
      read: 'read',
      failed: 'failed',
    };
    return map[waStatus] || 'sent';
  }
}
