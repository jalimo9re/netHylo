import { Controller, Get, Patch, Param, Body, Request } from '@nestjs/common';
import { ConversationsService } from './conversations.service';

@Controller('conversations')
export class ConversationsController {
  constructor(private conversationsService: ConversationsService) {}

  @Get()
  findAll(@Request() req: any) {
    return this.conversationsService.findAllByTenant(req.tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.conversationsService.findOne(id, req.tenantId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: any, @Request() req: any) {
    return this.conversationsService.update(id, req.tenantId, data);
  }

  @Patch(':id/assign')
  assign(
    @Param('id') id: string,
    @Body('userId') userId: string,
    @Request() req: any,
  ) {
    return this.conversationsService.assign(id, req.tenantId, userId);
  }
}
