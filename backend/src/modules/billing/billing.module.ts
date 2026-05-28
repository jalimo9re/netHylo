import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingProduct } from '@/database/entities/billing-product.entity';
import { BillingPrice } from '@/database/entities/billing-price.entity';
import { BillingInvoice } from '@/database/entities/billing-invoice.entity';
import { BillingInvoiceItem } from '@/database/entities/billing-invoice-item.entity';
import { BillingSubscription } from '@/database/entities/billing-subscription.entity';
import { BillingPayment } from '@/database/entities/billing-payment.entity';
import { Contact } from '@/database/entities/contact.entity';
import { CrmDeal } from '@/database/entities/crm-deal.entity';
import { BillingController } from './billing.controller';
import { BillingWebhooksController } from './billing-webhooks.controller';
import { BillingService } from './billing.service';
import { MockBillingProvider } from './providers/mock-billing.provider';
import { AffiliatesModule } from '../affiliates/affiliates.module';

@Module({
  imports: [
    AffiliatesModule,
    TypeOrmModule.forFeature([
      BillingProduct,
      BillingPrice,
      BillingInvoice,
      BillingInvoiceItem,
      BillingSubscription,
      BillingPayment,
      Contact,
      CrmDeal,
    ]),
  ],
  controllers: [BillingController, BillingWebhooksController],
  providers: [BillingService, MockBillingProvider],
  exports: [BillingService],
})
export class BillingModule {}
