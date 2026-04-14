import { MessageType } from '@/database/entities/message.entity';
import { IntegrationProvider } from '@/database/entities/integration.entity';

export interface SendMessageOptions {
  to: string;
  content: string;
  type: MessageType;
  metadata?: Record<string, any>;
}

export interface SendMessageResult {
  externalId: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface IncomingMessage {
  externalContactId: string;
  contactName?: string;
  contactPhone?: string;
  messageExternalId: string;
  content: string;
  type: MessageType;
  timestamp: Date;
  metadata?: Record<string, any>;
  rawPayload: Record<string, any>;
}

export interface ParsedWebhookEvent {
  integrationExternalId: string;
  messages: IncomingMessage[];
  statusUpdates: StatusUpdate[];
}

export interface StatusUpdate {
  externalMessageId: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: Date;
}

export interface WebhookVerification {
  isVerification: boolean;
  challenge?: string;
}

export abstract class MessagingProviderBase {
  abstract readonly provider: IntegrationProvider;

  abstract sendMessage(
    config: Record<string, any>,
    options: SendMessageOptions,
  ): Promise<SendMessageResult>;

  abstract parseWebhookEvent(
    payload: any,
    headers: Record<string, string>,
  ): ParsedWebhookEvent;

  abstract handleVerification(
    query: Record<string, string>,
    config: Record<string, any>,
  ): WebhookVerification;

  abstract verifySignature(
    rawBody: Buffer,
    headers: Record<string, string>,
    secret: string,
  ): boolean;

  abstract getExternalIdFromConfig(config: Record<string, any>): string;
}
