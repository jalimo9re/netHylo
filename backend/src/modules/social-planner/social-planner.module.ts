import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SocialAccount, SocialPost, SocialPostLog } from '@/database/entities';
import { SocialPlannerController } from './social-planner.controller';
import { SocialPlannerProcessor } from './social-planner.processor';
import { SocialPlannerService } from './social-planner.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([SocialAccount, SocialPost, SocialPostLog]),
    BullModule.registerQueue({ name: 'social-planner' }),
  ],
  controllers: [SocialPlannerController],
  providers: [SocialPlannerService, SocialPlannerProcessor],
  exports: [SocialPlannerService],
})
export class SocialPlannerModule {}
