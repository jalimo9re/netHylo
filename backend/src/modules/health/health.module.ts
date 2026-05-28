import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  imports: [
    ConfigModule,
    BullModule.registerQueue({ name: 'webhooks' }, { name: 'automation' }),
  ],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
