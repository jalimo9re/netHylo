import { Injectable, Logger } from '@nestjs/common';

type ChannelType = 'email' | 'sms';

export interface ChannelDeliveryResult {
  status: 'sent' | 'failed' | 'mocked';
  provider: string;
  externalId: string | null;
  error?: string | null;
}

@Injectable()
export class WorkflowChannelService {
  private readonly logger = new Logger(WorkflowChannelService.name);
  private readonly mockMode = (process.env.CRM_MOCK_CHANNELS || 'true') === 'true';

  async send(type: ChannelType, payload: Record<string, any>): Promise<ChannelDeliveryResult> {
    const recipient = type === 'email' ? payload?.toEmail : payload?.toPhone;
    if (!recipient) {
      return {
        status: 'failed',
        provider: this.mockMode ? 'mock' : 'placeholder',
        externalId: null,
        error: `Missing recipient for ${type}`,
      };
    }

    if (this.mockMode) {
      const externalId = `${type}-mock-${Date.now()}`;
      this.logger.log(`Mock ${type} sent to ${recipient} (${externalId})`);
      return { status: 'mocked', provider: 'mock', externalId, error: null };
    }

    const externalId = `${type}-placeholder-${Date.now()}`;
    this.logger.log(`Placeholder ${type} transport for ${recipient} (${externalId})`);
    return { status: 'sent', provider: 'placeholder', externalId, error: null };
  }
}
