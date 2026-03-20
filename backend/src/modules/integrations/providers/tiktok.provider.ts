import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import {
  MessagingProviderBase,
  SendMessageOptions,
  SendMessageResult,
  ParsedWebhookEvent,
  WebhookVerification,
  IncomingMessage,
} from './messaging-provider.interface';
import { IntegrationProvider } from '@/database/entities/integration.entity';
import { MessageType } from '@/database/entities/message.entity';

const TIKTOK_API_URL = 'https://business-api.tiktok.com/open_api/v1.3';

@Injectable()
export class TikTokProvider extends MessagingProviderBase {
  readonly provider = IntegrationProvider.TIKTOK;

  async sendMessage(
    config: Record<string, any>,
    options: SendMessageOptions,
  ): Promise<SendMessageResult> {
    const accessToken = config.accessToken;
    const url = `${TIKTOK_API_URL}/business/messages/send/`;

    const body = {
      business_id: config.businessId,
      user_id: options.to,
      message_type: options.type === MessageType.TEXT ? 'text' : 'media',
      content: options.type === MessageType.TEXT
        ? { text: options.content }
        : { media_url: options.content },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (data.code !== 0) {
      throw new Error(`TikTok API error: ${JSON.stringify(data)}`);
    }

    return {
      externalId: data.data?.message_id || '',
      timestamp: new Date(),
    };
  }

  parseWebhookEvent(
    payload: any,
    _headers: Record<string, string>,
  ): ParsedWebhookEvent {
    const messages: IncomingMessage[] = [];
    let integrationExternalId = '';

    const event = payload;
    if (event.type === 'receive_message') {
      integrationExternalId = event.business_id || '';
      messages.push({
        externalContactId: event.user_open_id || event.sender_id || '',
        contactName: event.user_name,
        messageExternalId: event.message_id || '',
        content: event.content?.text || event.content?.media_url || '[message]',
        type: event.content?.text ? MessageType.TEXT : MessageType.FILE,
        timestamp: new Date(event.timestamp || Date.now()),
        rawPayload: event,
      });
    }

    return { integrationExternalId, messages, statusUpdates: [] };
  }

  handleVerification(
    query: Record<string, string>,
    _config: Record<string, any>,
  ): WebhookVerification {
    const challenge = query['challenge'];
    if (challenge) {
      return { isVerification: true, challenge };
    }
    return { isVerification: false };
  }

  verifySignature(
    rawBody: Buffer,
    headers: Record<string, string>,
    secret: string,
  ): boolean {
    const signature = headers['x-tiktok-signature'];
    if (!signature) return false;

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );
  }

  getExternalIdFromConfig(config: Record<string, any>): string {
    return config.businessId || '';
  }
}
