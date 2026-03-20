import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Integration } from '@/database/entities/integration.entity';
import { Contact } from '@/database/entities/contact.entity';
import { Conversation } from '@/database/entities/conversation.entity';
import { Message } from '@/database/entities/message.entity';
import { Tenant } from '@/database/entities/tenant.entity';
import { User } from '@/database/entities/user.entity';
import { IntegrationsService } from './integrations.service';
import { IntegrationsController } from './integrations.controller';
import { WebhooksController } from './webhooks/webhooks.controller';
import { WebhooksProcessor } from './webhooks/webhooks.processor';
import { MessagingGateway } from './gateway/messaging.gateway';
import { ProviderFactory } from './providers/provider.factory';
import { WhatsAppProvider } from './providers/whatsapp.provider';
import { MetaProvider } from './providers/meta.provider';
import { InstagramProvider } from './providers/instagram.provider';
import { TelegramProvider } from './providers/telegram.provider';
import { TikTokProvider } from './providers/tiktok.provider';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Integration,
      Contact,
      Conversation,
      Message,
      Tenant,
      User,
    ]),
    BullModule.registerQueue({ name: 'webhooks' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    IntegrationsService,
    WhatsAppProvider,
    MetaProvider,
    InstagramProvider,
    TelegramProvider,
    TikTokProvider,
    ProviderFactory,
    WebhooksProcessor,
    MessagingGateway,
  ],
  controllers: [IntegrationsController, WebhooksController],
  exports: [IntegrationsService, ProviderFactory, MessagingGateway],
})
export class IntegrationsModule {}
