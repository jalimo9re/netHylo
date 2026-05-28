import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course, Enrollment, Lesson, MembershipOffer } from '@/database/entities';
import { CrmModule } from '@/modules/crm/crm.module';
import { MembershipsController } from './memberships.controller';
import { MembershipsPublicController } from './memberships-public.controller';
import { MembershipsService } from './memberships.service';

@Module({
  imports: [TypeOrmModule.forFeature([Course, Lesson, Enrollment, MembershipOffer]), CrmModule],
  controllers: [MembershipsController, MembershipsPublicController],
  providers: [MembershipsService],
  exports: [MembershipsService],
})
export class MembershipsModule {}
