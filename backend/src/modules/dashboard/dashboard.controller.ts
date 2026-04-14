import { Controller, Get, Request } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('stats')
  getStats(@Request() req: any) {
    return this.dashboardService.getStats(req.tenantId);
  }

  @Get('activity')
  getRecentActivity(@Request() req: any) {
    return this.dashboardService.getRecentActivity(req.tenantId);
  }
}
