import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  BillingInvoice,
  Campaign,
  CampaignEvent,
  CrmDeal,
  CrmPipeline,
  FormSubmission,
} from '@/database/entities';
import { DashboardModule } from '../dashboard/dashboard.module';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

@Module({
  imports: [
    DashboardModule,
    TypeOrmModule.forFeature([
      CrmPipeline,
      CrmDeal,
      FormSubmission,
      Campaign,
      CampaignEvent,
      BillingInvoice,
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
