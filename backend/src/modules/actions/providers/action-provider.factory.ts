import { Injectable } from '@nestjs/common';
import { ActionProviderType } from '@/database/entities/action-integration.entity';
import { ActionProviderBase } from './action-provider.interface';
import { FlowwProvider } from './floww.provider';

@Injectable()
export class ActionProviderFactory {
  private providers: Map<ActionProviderType, ActionProviderBase>;

  constructor(private floww: FlowwProvider) {
    this.providers = new Map<ActionProviderType, ActionProviderBase>();
    this.providers.set(ActionProviderType.FLOWW, this.floww);
  }

  getProvider(provider: ActionProviderType): ActionProviderBase {
    const instance = this.providers.get(provider);
    if (!instance) {
      throw new Error(`Action provider "${provider}" not supported`);
    }
    return instance;
  }

  getAllProviders(): Map<ActionProviderType, ActionProviderBase> {
    return this.providers;
  }
}
