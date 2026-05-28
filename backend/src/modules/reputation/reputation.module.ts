import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Review, ReviewLink, ReviewRequest } from '@/database/entities';
import { CrmModule } from '../crm/crm.module';
import { ReputationController } from './reputation.controller';
import { ReputationPublicController } from './reputation-public.controller';
import { ReputationService } from './reputation.service';

@Module({
  imports: [TypeOrmModule.forFeature([ReviewRequest, ReviewLink, Review]), CrmModule],
  controllers: [ReputationController, ReputationPublicController],
  providers: [ReputationService],
})
export class ReputationModule {}
