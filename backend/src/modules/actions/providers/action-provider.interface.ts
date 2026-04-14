import { ActionProviderType } from '@/database/entities/action-integration.entity';

export interface ProviderConfigField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'select';
  required: boolean;
  help?: string;
  options?: { value: string; label: string }[];
}

export interface ActionCapability {
  category: string;
  action: string;
  label: string;
  description: string;
  params: ActionParam[];
}

export interface ActionParam {
  key: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'select' | 'text';
  required: boolean;
  help?: string;
  options?: { value: string; label: string }[];
}

export interface ActionResult {
  success: boolean;
  data?: any;
  error?: string;
}

export interface SetupStep {
  title: string;
  description: string;
}

export abstract class ActionProviderBase {
  abstract readonly providerType: ActionProviderType;
  abstract readonly label: string;

  abstract getConfigFields(): ProviderConfigField[];
  abstract getSetupGuide(): SetupStep[];
  abstract testConnection(config: Record<string, any>): Promise<ActionResult>;
  abstract getCapabilities(): ActionCapability[];
  abstract executeAction(
    config: Record<string, any>,
    category: string,
    action: string,
    params: Record<string, any>,
  ): Promise<ActionResult>;
}
