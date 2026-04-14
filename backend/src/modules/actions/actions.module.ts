import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActionIntegration } from '@/database/entities/action-integration.entity';
import { ActionsController } from './actions.controller';
import { ActionsService } from './actions.service';
import { FlowwProvider } from './providers/floww.provider';
import { ActionProviderFactory } from './providers/action-provider.factory';

@Module({
  imports: [TypeOrmModule.forFeature([ActionIntegration])],
  controllers: [ActionsController],
  providers: [ActionsService, FlowwProvider, ActionProviderFactory],
  exports: [ActionsService, ActionProviderFactory],
})
export class ActionsModule {}
