import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { UserRole } from '@/database/entities/user.entity';
import { AffiliatesService } from './affiliates.service';

@Controller('affiliates')
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.AGENT)
export class AffiliatesController {
  constructor(private readonly affiliatesService: AffiliatesService) {}

  @Get('metrics')
  getMetrics(@Request() req: any) {
    return this.affiliatesService.getMetrics(req.tenantId);
  }

  @Get()
  listAffiliates(@Request() req: any) {
    return this.affiliatesService.listAffiliates(req.tenantId);
  }

  @Post()
  createAffiliate(@Request() req: any, @Body() data: any) {
    return this.affiliatesService.createAffiliate(req.tenantId, data);
  }

  @Patch(':id')
  updateAffiliate(@Request() req: any, @Param('id') id: string, @Body() data: any) {
    return this.affiliatesService.updateAffiliate(req.tenantId, id, data);
  }

  @Get('links/list')
  listLinks(@Request() req: any, @Query('affiliateId') affiliateId?: string) {
    return this.affiliatesService.listLinks(req.tenantId, affiliateId);
  }

  @Post('links')
  createLink(@Request() req: any, @Body() data: any) {
    return this.affiliatesService.createLink(req.tenantId, data);
  }

  @Patch('links/:id')
  updateLink(@Request() req: any, @Param('id') id: string, @Body() data: any) {
    return this.affiliatesService.updateLink(req.tenantId, id, data);
  }

  @Get('conversions')
  listConversions(@Request() req: any, @Query('affiliateId') affiliateId?: string) {
    return this.affiliatesService.listConversions(req.tenantId, affiliateId);
  }

  @Post('conversions')
  createConversion(@Request() req: any, @Body() data: any) {
    return this.affiliatesService.createManualConversion(req.tenantId, data);
  }

  @Get('payouts')
  listPayouts(@Request() req: any, @Query('affiliateId') affiliateId?: string) {
    return this.affiliatesService.listPayouts(req.tenantId, affiliateId);
  }

  @Post('payouts')
  createPayout(@Request() req: any, @Body() data: any) {
    return this.affiliatesService.createPayout(req.tenantId, data);
  }
}
