import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AgencyService, CreateSubaccountDto, TenantBrandingDto } from './agency.service';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { PermissionGuard } from '@/common/guards/permission.guard';
import { RequirePermission } from '@/common/decorators/require-permission.decorator';
import { UserRole } from '@/database/entities/user.entity';

@Controller('agency')
@UseGuards(RolesGuard, PermissionGuard)
export class AgencyController {
  constructor(private readonly agencyService: AgencyService) {}

  @Get('profile')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @RequirePermission('agency:read')
  async getProfile(@Req() req: any, @Query('parentTenantId') parentTenantId?: string) {
    const agencyTenantId = await this.agencyService.resolveAgencyTenantId(
      req.user,
      parentTenantId,
    );
    return this.agencyService.getAgencyProfile(agencyTenantId);
  }

  @Get('subaccounts')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @RequirePermission('agency:read')
  async listSubaccounts(@Req() req: any, @Query('parentTenantId') parentTenantId?: string) {
    if (req.user.role === UserRole.SUPERADMIN && !parentTenantId) {
      return this.agencyService.listAllSubaccounts();
    }
    const agencyTenantId = await this.agencyService.resolveAgencyTenantId(
      req.user,
      parentTenantId,
    );
    return this.agencyService.listSubaccounts(agencyTenantId);
  }

  @Post('subaccounts')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @RequirePermission('agency:write')
  async createSubaccount(
    @Req() req: any,
    @Body() dto: CreateSubaccountDto,
    @Query('parentTenantId') parentTenantId?: string,
  ) {
    const agencyTenantId = await this.agencyService.resolveAgencyTenantId(
      req.user,
      parentTenantId,
    );
    return this.agencyService.createSubaccount(agencyTenantId, dto);
  }

  @Patch('branding')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @RequirePermission('agency:write')
  async updateOwnBranding(
    @Req() req: any,
    @Body() branding: TenantBrandingDto,
    @Query('parentTenantId') parentTenantId?: string,
  ) {
    const agencyTenantId = await this.agencyService.resolveAgencyTenantId(
      req.user,
      parentTenantId,
    );
    return this.agencyService.updateBranding(
      agencyTenantId,
      agencyTenantId,
      branding,
      req.user.role === UserRole.SUPERADMIN,
    );
  }

  @Patch('subaccounts/:id/branding')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @RequirePermission('agency:write')
  async updateSubaccountBranding(
    @Req() req: any,
    @Param('id') id: string,
    @Body() branding: TenantBrandingDto,
    @Query('parentTenantId') parentTenantId?: string,
  ) {
    const agencyTenantId = await this.agencyService.resolveAgencyTenantId(
      req.user,
      parentTenantId,
    );
    return this.agencyService.updateBranding(
      id,
      agencyTenantId,
      branding,
      req.user.role === UserRole.SUPERADMIN,
    );
  }

  @Patch('subaccounts/:id/plan')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @RequirePermission('agency:write')
  async assignPlan(
    @Req() req: any,
    @Param('id') id: string,
    @Body('planId') planId: string,
    @Query('parentTenantId') parentTenantId?: string,
  ) {
    const agencyTenantId = await this.agencyService.resolveAgencyTenantId(
      req.user,
      parentTenantId,
    );
    return this.agencyService.assignPlan(
      id,
      planId,
      agencyTenantId,
      req.user.role === UserRole.SUPERADMIN,
    );
  }
}
