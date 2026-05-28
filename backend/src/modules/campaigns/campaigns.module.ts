import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import {
  Campaign,
  CampaignEvent,
  CampaignRecipient,
  Contact,
} from '@/database/entities';
import { WorkflowChannelService } from '../crm/workflow-channel.service';
import { AffiliatesModule } from '../affiliates/affiliates.module';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';
import { CampaignProcessor } from './campaign.processor';

@Module({
  imports: [
    AffiliatesModule,
    TypeOrmModule.forFeature([Campaign, CampaignRecipient, CampaignEvent, Contact]),
    BullModule.registerQueue({ name: 'campaigns' }),
  ],
  controllers: [CampaignsController],
  providers: [CampaignsService, CampaignProcessor, WorkflowChannelService],
  exports: [CampaignsService],
})
export class CampaignsModule {}
