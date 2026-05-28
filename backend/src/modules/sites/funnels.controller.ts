import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { SitesService } from './sites.service';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { UserRole } from '@/database/entities/user.entity';
import { CreateFunnelDto, UpdateFunnelDto } from './dto/site-builder.dto';

@Controller('funnels')
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.AGENT)
export class FunnelsController {
  constructor(private readonly sitesService: SitesService) {}

  @Get()
  list(@Request() req: { tenantId: string }) {
    return this.sitesService.listFunnels(req.tenantId);
  }

  @Get(':id')
  get(@Request() req: { tenantId: string }, @Param('id') id: string) {
    return this.sitesService.getFunnel(req.tenantId, id);
  }

  @Get(':id/metrics')
  metrics(@Request() req: { tenantId: string }, @Param('id') id: string) {
    return this.sitesService.getFunnelMetrics(req.tenantId, id);
  }

  @Post()
  create(@Request() req: { tenantId: string }, @Body() data: CreateFunnelDto) {
    return this.sitesService.createFunnel(req.tenantId, data);
  }

  @Patch(':id')
  update(
    @Request() req: { tenantId: string },
    @Param('id') id: string,
    @Body() data: UpdateFunnelDto,
  ) {
    return this.sitesService.updateFunnel(req.tenantId, id, data);
  }

  @Delete(':id')
  remove(@Request() req: { tenantId: string }, @Param('id') id: string) {
    return this.sitesService.deleteFunnel(req.tenantId, id);
  }

  @Patch(':id/publish')
  publish(
    @Request() req: { tenantId: string },
    @Param('id') id: string,
    @Body('isPublished') isPublished: boolean,
  ) {
    return this.sitesService.publishFunnel(req.tenantId, id, Boolean(isPublished));
  }
}
