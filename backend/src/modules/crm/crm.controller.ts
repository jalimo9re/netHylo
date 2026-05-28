import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { CrmService } from './crm.service';
import { Public } from '@/common/guards/jwt-auth.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { UserRole } from '@/database/entities/user.entity';

@Controller('crm')
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
export class CrmController {
  constructor(private readonly crmService: CrmService) {}

  @Get('pipelines')
  listPipelines(@Request() req: any) {
    return this.crmService.listPipelines(req.tenantId);
  }

  @Post('pipelines')
  createPipeline(@Request() req: any, @Body() data: any) {
    return this.crmService.createPipeline(req.tenantId, data);
  }

  @Patch('pipelines/:id')
  updatePipeline(@Request() req: any, @Param('id') id: string, @Body() data: any) {
    return this.crmService.updatePipeline(req.tenantId, id, data);
  }

  @Patch('pipelines/:id/default')
  setDefaultPipeline(@Request() req: any, @Param('id') id: string) {
    return this.crmService.setDefaultPipeline(req.tenantId, id);
  }

  @Get('pipelines/:id/metrics')
  getPipelineMetrics(@Request() req: any, @Param('id') id: string) {
    return this.crmService.getPipelineMetrics(req.tenantId, id);
  }

  @Post('pipelines/:id/deals')
  createDealForPipeline(@Request() req: any, @Param('id') id: string, @Body() data: any) {
    return this.crmService.createDeal(req.tenantId, { ...data, pipelineId: id });
  }

  @Post('pipelines/:id/deals/:dealId/move')
  moveStageWithinPipeline(
    @Request() req: any,
    @Param('id') pipelineId: string,
    @Param('dealId') dealId: string,
    @Body('stage') stage: string,
  ) {
    return this.crmService.moveDealStage(req.tenantId, dealId, stage, pipelineId);
  }

  @Post('pipelines/:id/deals/:dealId/advance')
  advanceStage(@Request() req: any, @Param('id') pipelineId: string, @Param('dealId') dealId: string) {
    return this.crmService.advanceDealStage(req.tenantId, dealId, pipelineId);
  }

  @Post('pipelines/:id/deals/:dealId/regress')
  regressStage(@Request() req: any, @Param('id') pipelineId: string, @Param('dealId') dealId: string) {
    return this.crmService.regressDealStage(req.tenantId, dealId, pipelineId);
  }

  @Post('pipelines/:id/deals/:dealId/win')
  markWon(@Request() req: any, @Param('id') pipelineId: string, @Param('dealId') dealId: string) {
    return this.crmService.markDealAsWon(req.tenantId, dealId, pipelineId);
  }

  @Post('pipelines/:id/deals/:dealId/loss')
  markLost(@Request() req: any, @Param('id') pipelineId: string, @Param('dealId') dealId: string) {
    return this.crmService.markDealAsLost(req.tenantId, dealId, pipelineId);
  }

  @Post('pipelines/:id/deals/:dealId/reopen')
  reopenDeal(@Request() req: any, @Param('id') pipelineId: string, @Param('dealId') dealId: string) {
    return this.crmService.reopenDeal(req.tenantId, dealId, pipelineId);
  }

  @Post('pipelines/:id/deals/:dealId/assign')
  assignDeal(
    @Request() req: any,
    @Param('id') pipelineId: string,
    @Param('dealId') dealId: string,
    @Body('ownerUserId') ownerUserId: string,
  ) {
    return this.crmService.assignDealOwner(req.tenantId, dealId, ownerUserId, pipelineId);
  }

  @Get('pipelines/:id/deals/by-stage')
  getDealsByStage(@Request() req: any, @Param('id') pipelineId: string) {
    return this.crmService.getDealsByStage(req.tenantId, pipelineId);
  }

  @Get('pipelines/:id/deals/aging')
  getAgingBuckets(@Request() req: any, @Param('id') pipelineId: string) {
    return this.crmService.getDealAgingBuckets(req.tenantId, pipelineId);
  }

  @Get('deals')
  listDeals(@Request() req: any, @Query('pipelineId') pipelineId?: string) {
    return this.crmService.listDeals(req.tenantId, pipelineId);
  }

  @Get('deals/:id')
  getDeal(@Request() req: any, @Param('id') id: string) {
    return this.crmService.getDeal(req.tenantId, id);
  }

  @Post('deals')
  createDeal(@Request() req: any, @Body() data: any) {
    return this.crmService.createDeal(req.tenantId, data);
  }

  @Patch('deals/:id')
  updateDeal(@Request() req: any, @Param('id') id: string, @Body() data: any) {
    return this.crmService.updateDeal(req.tenantId, id, data);
  }

  @Post('deals/:id/win')
  markWonGlobal(@Request() req: any, @Param('id') id: string) {
    return this.crmService.markDealAsWon(req.tenantId, id);
  }

  @Post('deals/:id/loss')
  markLostGlobal(@Request() req: any, @Param('id') id: string) {
    return this.crmService.markDealAsLost(req.tenantId, id);
  }

  @Delete('deals/:id')
  deleteDeal(@Request() req: any, @Param('id') id: string) {
    return this.crmService.deleteDeal(req.tenantId, id);
  }

  @Get('tasks')
  listTasks(
    @Request() req: any,
    @Query('dealId') dealId?: string,
    @Query('assigneeUserId') assigneeUserId?: string,
    @Query('includeCompleted') includeCompleted?: string,
  ) {
    return this.crmService.listTasks(req.tenantId, {
      dealId,
      assigneeUserId,
      includeCompleted: includeCompleted === 'true',
    });
  }

  @Post('tasks')
  createTask(@Request() req: any, @Body() data: any) {
    return this.crmService.createTask(req.tenantId, data);
  }

  @Patch('tasks/:id')
  updateTask(@Request() req: any, @Param('id') id: string, @Body() data: any) {
    return this.crmService.updateTask(req.tenantId, id, data);
  }

  @Post('tasks/:id/complete')
  completeTask(@Request() req: any, @Param('id') id: string) {
    return this.crmService.completeTask(req.tenantId, id);
  }

  @Patch('deals/:id/stage')
  moveStage(@Request() req: any, @Param('id') id: string, @Body('stage') stage: string) {
    return this.crmService.moveDealStage(req.tenantId, id, stage);
  }

  @Get('forms')
  listForms(@Request() req: any) {
    return this.crmService.listForms(req.tenantId);
  }

  @Post('forms')
  createForm(@Request() req: any, @Body() data: any) {
    return this.crmService.createForm(req.tenantId, data);
  }

  @Patch('forms/:id')
  updateForm(@Request() req: any, @Param('id') id: string, @Body() data: any) {
    return this.crmService.updateForm(req.tenantId, id, data);
  }

  @Patch('forms/:id/publish')
  publishForm(@Request() req: any, @Param('id') id: string, @Body('isPublished') isPublished: boolean) {
    return this.crmService.publishForm(req.tenantId, id, isPublished);
  }

  @Get('forms/:id/submissions')
  listFormSubmissions(@Request() req: any, @Param('id') id: string) {
    return this.crmService.listFormSubmissions(req.tenantId, id);
  }

  @Get('forms/submissions')
  listAllSubmissions(@Request() req: any, @Query('formId') formId?: string) {
    return this.crmService.listSubmissions(req.tenantId, formId);
  }

  @Delete('forms/:id')
  deleteForm(@Request() req: any, @Param('id') id: string) {
    return this.crmService.deleteForm(req.tenantId, id);
  }

  @Post('forms/public/:slug/submit')
  @Public()
  submitPublicForm(
    @Param('slug') slug: string,
    @Body() data: any,
    @Headers('x-forwarded-for') forwardedFor?: string,
  ) {
    const ip = forwardedFor?.split(',')[0]?.trim();
    return this.crmService.submitForm(slug, data, ip);
  }

  @Get('workflows')
  listWorkflows(@Request() req: any) {
    return this.crmService.listWorkflows(req.tenantId);
  }

  @Post('workflows')
  createWorkflow(@Request() req: any, @Body() data: any) {
    return this.crmService.createWorkflow(req.tenantId, data);
  }

  @Get('workflow-runs')
  listRuns(@Request() req: any) {
    return this.crmService.listWorkflowRuns(req.tenantId);
  }

  @Get('calendar/events')
  listEvents(@Request() req: any) {
    return this.crmService.listCalendarEvents(req.tenantId);
  }

  @Post('calendar/events')
  createEvent(@Request() req: any, @Body() data: any) {
    return this.crmService.createCalendarEvent(req.tenantId, data);
  }

  @Patch('calendar/events/:id')
  updateEvent(@Request() req: any, @Param('id') id: string, @Body() data: any) {
    return this.crmService.updateCalendarEvent(req.tenantId, id, data);
  }

  @Delete('calendar/events/:id')
  deleteEvent(@Request() req: any, @Param('id') id: string) {
    return this.crmService.deleteCalendarEvent(req.tenantId, id);
  }

  @Get('calendar/public/slots/:slug')
  @Public()
  listPublicBookingSlots(@Param('slug') slug: string) {
    return this.crmService.listPublicBookingSlots(slug);
  }

  @Post('calendar/public/bookings/:eventId')
  @Public()
  createPublicBooking(@Param('eventId') eventId: string, @Body() data: any) {
    return this.crmService.createPublicBooking(eventId, data);
  }
}
