import { Controller, Get, Post, Param, Patch, Body, UseGuards, Req } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { UserRole } from '@/database/entities/user.entity';

@Controller('tenants')
@UseGuards(RolesGuard)
export class TenantsController {
  constructor(private tenantsService: TenantsService) {}

  @Get('me')
  @Roles(UserRole.ADMIN)
  findMe(@Req() req: any) {
    return this.tenantsService.findOne(req.tenantId ?? req.user?.tenantId);
  }

  @Post()
  @Roles(UserRole.SUPERADMIN)
  create(@Body() dto: any) {
    return this.tenantsService.create(dto);
  }

  @Get()
  @Roles(UserRole.SUPERADMIN)
  findAll() {
    return this.tenantsService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  findOne(@Param('id') id: string, @Req() req: any) {
    if (req.user?.role !== UserRole.SUPERADMIN) {
      return this.tenantsService.findOne(req.tenantId ?? req.user?.tenantId);
    }
    return this.tenantsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  update(@Param('id') id: string, @Body() data: Partial<any>, @Req() req: any) {
    if (req.user?.role !== UserRole.SUPERADMIN) {
      const allowed = ['name', 'logoUrl', 'primaryColor', 'customDomain', 'branding'];
      const filtered = Object.fromEntries(
        Object.entries(data).filter(([key]) => allowed.includes(key)),
      );
      return this.tenantsService.update(req.tenantId ?? req.user?.tenantId, filtered);
    }
    return this.tenantsService.update(id, data);
  }

  @Patch(':id/deactivate')
  @Roles(UserRole.SUPERADMIN)
  deactivate(@Param('id') id: string) {
    return this.tenantsService.deactivate(id);
  }
}
