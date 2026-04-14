import { Controller, Get, Param, Patch, Body } from '@nestjs/common';
import { PlansService } from './plans.service';
import { Public } from '@/common/guards/jwt-auth.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@/database/entities/user.entity';

@Controller('plans')
export class PlansController {
  constructor(private plansService: PlansService) {}

  @Public()
  @Get()
  findAll() {
    return this.plansService.findAll();
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.plansService.findOne(id);
  }

  @Roles(UserRole.SUPERADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.plansService.update(id, data);
  }
}
