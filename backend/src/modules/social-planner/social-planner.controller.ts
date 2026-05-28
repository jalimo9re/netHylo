import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { UserRole } from '@/database/entities/user.entity';
import { SocialPlannerService } from './social-planner.service';

@Controller('social-planner')
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.AGENT)
export class SocialPlannerController {
  constructor(private readonly socialPlannerService: SocialPlannerService) {}

  @Get('accounts')
  listAccounts(@Request() req: any) {
    return this.socialPlannerService.listAccounts(req.tenantId);
  }

  @Post('accounts')
  createAccount(@Request() req: any, @Body() data: any) {
    return this.socialPlannerService.createAccount(req.tenantId, data);
  }

  @Patch('accounts/:id')
  updateAccount(@Request() req: any, @Param('id') id: string, @Body() data: any) {
    return this.socialPlannerService.updateAccount(req.tenantId, id, data);
  }

  @Delete('accounts/:id')
  deleteAccount(@Request() req: any, @Param('id') id: string) {
    return this.socialPlannerService.deleteAccount(req.tenantId, id);
  }

  @Get('posts')
  listPosts(@Request() req: any) {
    return this.socialPlannerService.listPosts(req.tenantId);
  }

  @Get('posts/:id')
  getPost(@Request() req: any, @Param('id') id: string) {
    return this.socialPlannerService.getPost(req.tenantId, id);
  }

  @Post('posts')
  createPost(@Request() req: any, @Body() data: any) {
    return this.socialPlannerService.createPost(req.tenantId, data);
  }

  @Patch('posts/:id')
  updatePost(@Request() req: any, @Param('id') id: string, @Body() data: any) {
    return this.socialPlannerService.updatePost(req.tenantId, id, data);
  }

  @Delete('posts/:id')
  deletePost(@Request() req: any, @Param('id') id: string) {
    return this.socialPlannerService.deletePost(req.tenantId, id);
  }

  @Get('calendar')
  calendar(@Request() req: any, @Query('start') start: string, @Query('end') end: string) {
    return this.socialPlannerService.contentCalendar(req.tenantId, start, end);
  }

  @Get('metrics')
  metrics(@Request() req: any, @Query('start') start: string, @Query('end') end: string) {
    return this.socialPlannerService.metrics(req.tenantId, start, end);
  }
}
