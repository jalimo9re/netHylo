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

const TELEGRAM_API_URL = 'https://api.telegram.org/bot';

@Injectable()
export class TelegramProvider extends MessagingProviderBase {
  readonly provider = IntegrationProvider.TELEGRAM;

  async sendMessage(
    config: Record<string, any>,
    options: SendMessageOptions,
  ): Promise<SendMessageResult> {
    const botToken = config.botToken;
    const baseUrl = `${TELEGRAM_API_URL}${botToken}`;

    let url: string;
    let body: any;

    switch (options.type) {
      case MessageType.IMAGE:
        url = `${baseUrl}/sendPhoto`;
        body = { chat_id: options.to, photo: options.content, caption: options.metadata?.caption };
        break;
      case MessageType.VIDEO:
        url = `${baseUrl}/sendVideo`;
        body = { chat_id: options.to, video: options.content, caption: options.metadata?.caption };
        break;
      case MessageType.AUDIO:
        url = `${baseUrl}/sendAudio`;
        body = { chat_id: options.to, audio: options.content };
        break;
      case MessageType.FILE:
        url = `${baseUrl}/sendDocument`;
        body = { chat_id: options.to, document: options.content };
        break;
      default:
        url = `${baseUrl}/sendMessage`;
        body = { chat_id: options.to, text: options.content, parse_mode: 'HTML' };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!data.ok) {
      throw new Error(`Telegram API error: ${JSON.stringify(data)}`);
    }

    return {
      externalId: data.result?.message_id?.toString() || '',
      timestamp: new Date(),
    };
  }

  parseWebhookEvent(
    payload: any,
    _headers: Record<string, string>,
  ): ParsedWebhookEvent {
    const messages: IncomingMessage[] = [];
    const integrationExternalId = '';

    const message = payload.message || payload.edited_message;
    if (!message) {
      return { integrationExternalId, messages, statusUpdates: [] };
    }

    const from = message.from;
    const chatId = message.chat.id.toString();
    const contactName = [from.first_name, from.last_name].filter(Boolean).join(' ');

    messages.push({
      externalContactId: chatId,
      contactName,
      contactPhone: undefined,
      messageExternalId: message.message_id.toString(),
      content: this.extractContent(message),
      type: this.mapMessageType(message),
      timestamp: new Date(message.date * 1000),
      rawPayload: payload,
    });

    return { integrationExternalId, messages, statusUpdates: [] };
  }

  handleVerification(
    _query: Record<string, string>,
    _config: Record<string, any>,
  ): WebhookVerification {
    // Telegram no usa verificación por challenge.
    // El webhook se registra via API con setWebhook.
    return { isVerification: false };
  }

  verifySignature(
    rawBody: Buffer,
    headers: Record<string, string>,
    secret: string,
  ): boolean {
    // Telegram usa el hash SHA-256 del token como secret_key
    // y opcionalmente envía X-Telegram-Bot-Api-Secret-Token
    const headerToken = headers['x-telegram-bot-api-secret-token'];
    if (headerToken && headerToken === secret) {
      return true;
    }

    // Fallback: si no hay header, verificar por IP de Telegram
    // (en producción se debería filtrar por IP, aquí confiamos en el secret token)
    return false;
  }

  getExternalIdFromConfig(config: Record<string, any>): string {
    return config.botUsername || '';
  }

  private extractContent(message: any): string {
    if (message.text) return message.text;
    if (message.caption) return message.caption;
    if (message.photo) return '[photo]';
    if (message.video) return '[video]';
    if (message.audio || message.voice) return '[audio]';
    if (message.document) return '[document]';
    if (message.sticker) return '[sticker]';
    if (message.location) return `[location: ${message.location.latitude}, ${message.location.longitude}]`;
    if (message.contact) return `[contact: ${message.contact.phone_number}]`;
    return '[message]';
  }

  private mapMessageType(message: any): MessageType {
    if (message.photo) return MessageType.IMAGE;
    if (message.video || message.video_note) return MessageType.VIDEO;
    if (message.audio || message.voice) return MessageType.AUDIO;
    if (message.document) return MessageType.FILE;
    return MessageType.TEXT;
  }
}
