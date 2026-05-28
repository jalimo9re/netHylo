import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Funnel,
  FunnelAnalytics,
  FunnelStep,
  Site,
  SitePage,
} from '@/database/entities';
import { SitesService } from './sites.service';
import { SitesController } from './sites.controller';
import { FunnelsController } from './funnels.controller';
import { PublicSitesController } from './public-sites.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Site, SitePage, Funnel, FunnelStep, FunnelAnalytics]),
  ],
  controllers: [SitesController, FunnelsController, PublicSitesController],
  providers: [SitesService],
  exports: [SitesService],
})
export class SitesModule {}
