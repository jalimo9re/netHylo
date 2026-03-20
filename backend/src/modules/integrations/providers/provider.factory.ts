import { Injectable } from '@nestjs/common';
import { IntegrationProvider } from '@/database/entities/integration.entity';
import { MessagingProviderBase } from './messaging-provider.interface';
import { WhatsAppProvider } from './whatsapp.provider';
import { MetaProvider } from './meta.provider';
import { InstagramProvider } from './instagram.provider';
import { TelegramProvider } from './telegram.provider';
import { TikTokProvider } from './tiktok.provider';

@Injectable()
export class ProviderFactory {
  private providers: Map<IntegrationProvider, MessagingProviderBase>;

  constructor(
    private whatsapp: WhatsAppProvider,
    private meta: MetaProvider,
    private instagram: InstagramProvider,
    private telegram: TelegramProvider,
    private tiktok: TikTokProvider,
  ) {
    this.providers = new Map<IntegrationProvider, MessagingProviderBase>();
    this.providers.set(IntegrationProvider.WHATSAPP, this.whatsapp);
    this.providers.set(IntegrationProvider.META, this.meta);
    this.providers.set(IntegrationProvider.INSTAGRAM, this.instagram);
    this.providers.set(IntegrationProvider.TELEGRAM, this.telegram);
    this.providers.set(IntegrationProvider.TIKTOK, this.tiktok);
  }

  getProvider(provider: IntegrationProvider): MessagingProviderBase {
    const instance = this.providers.get(provider);
    if (!instance) {
      throw new Error(`Provider "${provider}" not supported`);
    }
    return instance;
  }
}
