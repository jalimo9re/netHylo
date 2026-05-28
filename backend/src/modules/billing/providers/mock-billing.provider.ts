import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

@Injectable()
export class MockBillingProvider {
  constructor(private readonly config: ConfigService) {}

  isEnabled(): boolean {
    return this.config.get<string>('BILLING_MOCK', 'true') === 'true';
  }

  createExternalPriceId(): string {
    return `price_mock_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
  }

  createPaymentIntent(amount: number, currency: string): { id: string; clientSecret: string } {
    const id = `pi_mock_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
    return {
      id,
      clientSecret: `${id}_secret_${amount}_${currency}`,
    };
  }

  simulateWebhookConfirmation(paymentExternalId: string): { status: 'succeeded' | 'failed'; externalId: string } {
    return {
      status: 'succeeded',
      externalId: paymentExternalId || `ch_mock_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
    };
  }
}
