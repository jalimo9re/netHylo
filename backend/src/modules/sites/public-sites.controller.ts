import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { Public } from '@/common/guards/jwt-auth.guard';
import { SitesService } from './sites.service';

@Controller('public')
@Public()
export class PublicSitesController {
  constructor(private readonly sitesService: SitesService) {}

  @Get('sites/:slug')
  renderSite(@Param('slug') slug: string) {
    return this.sitesService.getPublicSite(slug);
  }

  @Get('sites/:siteSlug/pages/:pageSlug')
  renderSitePage(@Param('siteSlug') siteSlug: string, @Param('pageSlug') pageSlug: string) {
    return this.sitesService.getPublicSitePage(siteSlug, pageSlug);
  }

  @Get('funnels/:slug')
  renderFunnel(@Param('slug') slug: string) {
    return this.sitesService.getPublicFunnel(slug);
  }

  @Get('funnels/:slug/steps/:stepOrder')
  renderFunnelStep(
    @Param('slug') slug: string,
    @Param('stepOrder', ParseIntPipe) stepOrder: number,
  ) {
    return this.sitesService.getPublicFunnelStep(slug, stepOrder);
  }

  @Post('funnels/:slug/track')
  trackFunnel(
    @Param('slug') slug: string,
    @Body()
    body: {
      stepId?: string;
      eventType?: string;
      sessionId?: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    return this.sitesService.trackFunnelEvent(slug, body);
  }
}
