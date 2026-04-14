import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { Conversation } from '@/database/entities/conversation.entity';
import { Message } from '@/database/entities/message.entity';
import { Contact } from '@/database/entities/contact.entity';
import { Integration } from '@/database/entities/integration.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Conversation, Message, Contact, Integration])],
  providers: [DashboardService],
  controllers: [DashboardController],
})
export class DashboardModule {}
