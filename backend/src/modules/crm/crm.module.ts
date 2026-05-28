import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import {
  CalendarEvent,
  Contact,
  CrmDeal,
  CrmPipeline,
  CrmTask,
  Form,
  FormSubmission,
  Workflow,
  WorkflowRun,
} from '@/database/entities';
import { CrmController } from './crm.controller';
import { CrmService } from './crm.service';
import { AutomationProcessor } from './automation.processor';
import { WorkflowChannelService } from './workflow-channel.service';
import { MobileModule } from '../mobile/mobile.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Contact,
      CrmPipeline,
      CrmDeal,
      CrmTask,
      Form,
      FormSubmission,
      Workflow,
      WorkflowRun,
      CalendarEvent,
    ]),
    BullModule.registerQueue({ name: 'automation' }),
    MobileModule,
  ],
  controllers: [CrmController],
  providers: [CrmService, AutomationProcessor, WorkflowChannelService],
  exports: [CrmService],
})
export class CrmModule {}
