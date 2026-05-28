import { Body, Controller, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { UserRole } from '@/database/entities/user.entity';
import { CampaignChannel } from '@/database/entities';

@Controller('campaigns')
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.AGENT)
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Get()
  list(@Request() req: any) {
    return this.campaignsService.list(req.tenantId);
  }

  @Get(':id')
  getOne(@Request() req: any, @Param('id') id: string) {
    return this.campaignsService.findOne(req.tenantId, id);
  }

  @Get(':id/stats')
  getStats(@Request() req: any, @Param('id') id: string) {
    return this.campaignsService.getStats(req.tenantId, id);
  }

  @Post()
  create(@Request() req: any, @Body() data: any) {
    return this.campaignsService.create(req.tenantId, {
      name: data.name,
      channel: data.channel as CampaignChannel,
      subject: data.subject,
      body: data.body,
      contactIds: data.contactIds,
      scheduledAt: data.scheduledAt,
    });
  }

  @Patch(':id')
  update(@Request() req: any, @Param('id') id: string, @Body() data: any) {
    return this.campaignsService.update(req.tenantId, id, data);
  }

  @Post(':id/schedule')
  schedule(@Request() req: any, @Param('id') id: string, @Body('scheduledAt') scheduledAt?: string) {
    return this.campaignsService.schedule(req.tenantId, id, scheduledAt);
  }

  @Post(':id/cancel')
  cancel(@Request() req: any, @Param('id') id: string) {
    return this.campaignsService.cancel(req.tenantId, id);
  }
}
