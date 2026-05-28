import { Injectable, Logger } from '@nestjs/common';
import { PushDeliveryPayload, PushDeliveryResult, PushProvider } from './push-provider.interface';

@Injectable()
export class MockPushProvider implements PushProvider {
  private readonly logger = new Logger(MockPushProvider.name);

  async send(tokens: string[], payload: PushDeliveryPayload): Promise<PushDeliveryResult> {
    this.logger.log(
      `[mock-push] tokens=${tokens.length} title=${payload.title} data=${JSON.stringify(payload.data || {})}`,
    );
    return {
      delivered: tokens.length,
      failed: 0,
      provider: 'mock-fcm-apns',
    };
  }
}
