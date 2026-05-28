import { Body, Controller, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { ReputationService } from './reputation.service';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { UserRole } from '@/database/entities/user.entity';

@Controller('reputation')
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
export class ReputationController {
  constructor(private readonly reputationService: ReputationService) {}

  @Post('campaigns')
  createCampaign(@Request() req: any, @Body() data: any) {
    return this.reputationService.createCampaign(req.tenantId, data);
  }

  @Get('requests')
  listRequests(@Request() req: any) {
    return this.reputationService.listRequests(req.tenantId);
  }

  @Get('reviews')
  listReviews(@Request() req: any) {
    return this.reputationService.listReviews(req.tenantId);
  }

  @Post('reviews/:id/respond')
  respondToReview(@Request() req: any, @Param('id') id: string, @Body('response') response: string) {
    return this.reputationService.respondToReview(req.tenantId, id, response);
  }

  @Get('metrics')
  getMetrics(@Request() req: any) {
    return this.reputationService.getMetrics(req.tenantId);
  }
}
