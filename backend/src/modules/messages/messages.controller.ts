import { Controller, Get, Post, Param, Body, Request } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { MessageType } from '@/database/entities/message.entity';

@Controller('conversations/:conversationId/messages')
export class MessagesController {
  constructor(private messagesService: MessagesService) {}

  @Get()
  findAll(
    @Param('conversationId') conversationId: string,
    @Request() req: any,
  ) {
    return this.messagesService.findByConversation(conversationId, req.tenantId);
  }

  @Post()
  send(
    @Param('conversationId') conversationId: string,
    @Body() body: { content: string; type?: MessageType },
    @Request() req: any,
  ) {
    return this.messagesService.send(conversationId, req.tenantId, req.user.id, {
      to: '',  // resolved from conversation contact
      content: body.content,
      type: body.type || MessageType.TEXT,
    });
  }
}
