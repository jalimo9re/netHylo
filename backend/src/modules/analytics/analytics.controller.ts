import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { UserRole } from '@/database/entities/user.entity';

@Controller('analytics')
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.AGENT)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  getOverview(@Request() req: any) {
    return this.analyticsService.getOverview(req.tenantId);
  }
}
