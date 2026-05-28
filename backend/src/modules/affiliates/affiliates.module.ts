import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Affiliate, Payout, ReferralConversion, ReferralLink } from '@/database/entities';
import { CrmModule } from '../crm/crm.module';
import { AffiliatesController } from './affiliates.controller';
import { AffiliatesPublicController } from './affiliates-public.controller';
import { AffiliatesService } from './affiliates.service';

@Module({
  imports: [TypeOrmModule.forFeature([Affiliate, ReferralLink, ReferralConversion, Payout]), CrmModule],
  controllers: [AffiliatesController, AffiliatesPublicController],
  providers: [AffiliatesService],
  exports: [AffiliatesService],
})
export class AffiliatesModule {}
