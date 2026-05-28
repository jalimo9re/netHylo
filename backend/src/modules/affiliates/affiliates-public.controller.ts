import { Controller, Get, Param, Query } from '@nestjs/common';
import { Public } from '@/common/guards/jwt-auth.guard';
import { AffiliatesService } from './affiliates.service';

@Controller('public/affiliates')
export class AffiliatesPublicController {
  constructor(private readonly affiliatesService: AffiliatesService) {}

  @Get(':code/click')
  @Public()
  click(
    @Param('code') code: string,
    @Query('target') target?: string,
    @Query('utm_source') utmSource?: string,
    @Query('utm_medium') utmMedium?: string,
    @Query('utm_campaign') utmCampaign?: string,
  ) {
    return this.affiliatesService.trackClickByCode(code, {
      target: target || null,
      utm_source: utmSource || null,
      utm_medium: utmMedium || null,
      utm_campaign: utmCampaign || null,
    });
  }
}
