import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Request,
  UseGuards,
} from '@nestjs/common';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@/database/entities/user.entity';
import { ActionsService } from './actions.service';

@Controller('actions')
@UseGuards(RolesGuard)
export class ActionsController {
  constructor(private actionsService: ActionsService) {}

  @Get('providers/config-schema')
  getConfigSchema() {
    return this.actionsService.getProvidersSchema();
  }

  @Get()
  findAll(@Request() req: any) {
    return this.actionsService.findAllByTenant(req.tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.actionsService.findOne(id, req.tenantId);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  create(@Body() dto: any, @Request() req: any) {
    return this.actionsService.create(req.tenantId, dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  update(@Param('id') id: string, @Body() dto: any, @Request() req: any) {
    return this.actionsService.update(id, req.tenantId, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  remove(@Param('id') id: string, @Request() req: any) {
    return this.actionsService.remove(id, req.tenantId);
  }

  @Post(':id/test')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  testConnection(@Param('id') id: string, @Request() req: any) {
    return this.actionsService.testConnection(id, req.tenantId);
  }

  @Get(':id/capabilities')
  getCapabilities(@Param('id') id: string, @Request() req: any) {
    return this.actionsService.getCapabilities(id, req.tenantId);
  }

  @Post(':id/execute')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  executeAction(
    @Param('id') id: string,
    @Body() body: { category: string; action: string; params: Record<string, any> },
    @Request() req: any,
  ) {
    return this.actionsService.executeAction(
      id,
      req.tenantId,
      body.category,
      body.action,
      body.params,
    );
  }
}
