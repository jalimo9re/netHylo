import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from '@/database/entities/tenant.entity';
import { Plan } from '@/database/entities/plan.entity';
import { User } from '@/database/entities/user.entity';
import { AgencyService } from './agency.service';
import { AgencyController } from './agency.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Tenant, Plan, User])],
  providers: [AgencyService],
  controllers: [AgencyController],
  exports: [AgencyService],
})
export class AgencyModule {}
