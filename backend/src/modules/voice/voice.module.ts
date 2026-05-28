import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VoiceNumber } from '@/database/entities/voice-number.entity';
import { VoiceCall } from '@/database/entities/voice-call.entity';
import { VoiceAgentStatus } from '@/database/entities/voice-agent-status.entity';
import { VoiceQueue } from '@/database/entities/voice-queue.entity';
import { VoiceQueueMember } from '@/database/entities/voice-queue-member.entity';
import { VoiceCallEvent } from '@/database/entities/voice-call-event.entity';
import { Contact } from '@/database/entities/contact.entity';
import { Conversation } from '@/database/entities/conversation.entity';
import { Integration } from '@/database/entities/integration.entity';
import { Message } from '@/database/entities/message.entity';
import { VoiceController } from './voice.controller';
import { VoiceService } from './voice.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VoiceNumber,
      VoiceCall,
      VoiceAgentStatus,
      VoiceQueue,
      VoiceQueueMember,
      VoiceCallEvent,
      Contact,
      Conversation,
      Integration,
      Message,
    ]),
  ],
  controllers: [VoiceController],
  providers: [VoiceService],
  exports: [VoiceService],
})
export class VoiceModule {}
