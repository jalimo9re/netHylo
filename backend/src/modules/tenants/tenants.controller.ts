import { Controller, Get, Post, Param, Patch, Body, UseGuards } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { UserRole } from '@/database/entities/user.entity';

@Controller('tenants')
@UseGuards(RolesGuard)
@Roles(UserRole.SUPERADMIN)
export class TenantsController {
  constructor(private tenantsService: TenantsService) {}

  @Post()
  create(@Body() dto: any) {
    return this.tenantsService.create(dto);
  }

  @Get()
  findAll() {
    return this.tenantsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tenantsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: Partial<any>) {
    return this.tenantsService.update(id, data);
  }

  @Patch(':id/deactivate')
  deactivate(@Param('id') id: string) {
    return this.tenantsService.deactivate(id);
  }
}
