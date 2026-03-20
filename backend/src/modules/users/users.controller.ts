import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { PlanGuard, CheckPlanLimit } from '@/common/guards/plan.guard';
import { UserRole } from '@/database/entities/user.entity';

@Controller('users')
@UseGuards(RolesGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  findAll(@Request() req: any) {
    return this.usersService.findAllByTenant(req.tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.usersService.findOne(id, req.tenantId);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @UseGuards(PlanGuard)
  @CheckPlanLimit('users')
  create(@Body() dto: any, @Request() req: any) {
    return this.usersService.create(req.tenantId, dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  update(@Param('id') id: string, @Body() data: any, @Request() req: any) {
    return this.usersService.update(id, req.tenantId, data);
  }
}
