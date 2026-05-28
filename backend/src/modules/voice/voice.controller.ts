import { Body, Controller, Get, Param, Patch, Post, Put, Query, Req } from '@nestjs/common';
import { Public } from '@/common/guards/jwt-auth.guard';
import { VoiceAgentPresence } from '@/database/entities/voice-agent-status.entity';
import { VoiceService } from './voice.service';

@Controller('voice')
export class VoiceController {
  constructor(private readonly voiceService: VoiceService) {}

  @Post('numbers')
  registerNumber(@Req() req: any, @Body() body: any) {
    return this.voiceService.registerNumber(req.tenantId, body);
  }

  @Patch('agent/status')
  setAgentStatus(@Req() req: any, @Body('status') status: VoiceAgentPresence) {
    return this.voiceService.setAgentStatus(req.tenantId, req.user.id, status);
  }

  @Get('agent/status')
  listAgentStatuses(@Req() req: any) {
    return this.voiceService.listAgentStatuses(req.tenantId);
  }

  @Get('queues')
  listQueues(@Req() req: any) {
    return this.voiceService.listQueues(req.tenantId);
  }

  @Post('queues')
  createQueue(@Req() req: any, @Body() body: any) {
    return this.voiceService.upsertQueue(req.tenantId, null, body);
  }

  @Patch('queues/:queueId')
  updateQueue(@Req() req: any, @Param('queueId') queueId: string, @Body() body: any) {
    return this.voiceService.upsertQueue(req.tenantId, queueId, body);
  }

  @Put('queues/:queueId/members')
  setQueueMembers(@Req() req: any, @Param('queueId') queueId: string, @Body('members') members: any[]) {
    return this.voiceService.setQueueMembers(req.tenantId, queueId, Array.isArray(members) ? members : []);
  }

  @Post('calls/outbound')
  startOutboundCall(@Req() req: any, @Body() body: any) {
    return this.voiceService.initiateOutboundCall(req.tenantId, req.user.id, body);
  }

  @Get('calls')
  listCalls(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('direction') direction?: string,
    @Query('queueId') queueId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    return this.voiceService.listCalls(req.tenantId, {
      status,
      direction,
      queueId,
      from,
      to,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('metrics')
  getMetrics(@Req() req: any) {
    return this.voiceService.getMetrics(req.tenantId);
  }

  @Post('webhooks/telnyx')
  @Public()
  receiveTelnyxWebhook(@Body() body: any, @Req() req: any) {
    return this.voiceService.handleTelnyxWebhook(body, req.headers || {});
  }
}
