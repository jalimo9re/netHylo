import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Public } from '@/common/guards/jwt-auth.guard';
import { BillingService } from './billing.service';

@Controller('billing/webhooks')
@Public()
export class BillingWebhooksController {
  constructor(
    private readonly billingService: BillingService,
    private readonly config: ConfigService,
  ) {}

  @Post('payment')
  @HttpCode(200)
  handlePaymentWebhook(
    @Headers('x-billing-webhook-secret') secret: string,
    @Body() payload: {
      paymentId?: string;
      invoiceId?: string;
      externalId?: string;
      status?: 'succeeded' | 'failed';
    },
  ) {
    const expected = this.config.get<string>('BILLING_WEBHOOK_SECRET', 'billing_webhook_dev_secret');
    if (!secret || secret !== expected) {
      throw new UnauthorizedException('Webhook secret inválido');
    }
    return this.billingService.confirmPaymentFromWebhook(payload);
  }
}
