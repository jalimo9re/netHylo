import { Controller, Get, Post, Param, Body, Request, Res } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { MessageType } from '@/database/entities/message.entity';
import { Response } from 'express';

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
    @Body() body: { content: string; type?: MessageType; metadata?: Record<string, any> },
    @Request() req: any,
  ) {
    return this.messagesService.send(conversationId, req.tenantId, req.user.id, {
      to: '',  // resolved from conversation contact
      content: body.content,
      type: body.type || MessageType.TEXT,
      metadata: body.metadata || {},
    });
  }

  @Get(':messageId/media')
  async media(
    @Param('conversationId') conversationId: string,
    @Param('messageId') messageId: string,
    @Request() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const media = await this.messagesService.getMediaFile(
      conversationId,
      messageId,
      req.tenantId,
    );
    res.setHeader('Content-Type', media.contentType);
    res.setHeader('Cache-Control', 'private, max-age=60');
    return media.file;
  }
}
