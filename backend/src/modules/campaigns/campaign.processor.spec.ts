import { Job } from 'bullmq';
import {
  CampaignChannel,
  CampaignRecipientStatus,
  CampaignStatus,
} from '@/database/entities';
import { CampaignProcessor } from './campaign.processor';

describe('CampaignProcessor', () => {
  it('envía batch y registra eventos sent', async () => {
    const campaign = {
      id: 'camp-1',
      channel: CampaignChannel.EMAIL,
      status: CampaignStatus.SENDING,
      subject: 'Hola',
      body: 'Mensaje',
    };
    const recipient = {
      id: 'rec-1',
      campaignId: 'camp-1',
      status: CampaignRecipientStatus.PENDING,
      toEmail: 'test@example.com',
      toPhone: null,
      externalId: null,
      error: null,
      sentAt: null,
    };

    const campaignRepo = { findOne: jest.fn().mockResolvedValue(campaign) };
    const recipientRepo = {
      find: jest.fn().mockResolvedValue([recipient]),
      save: jest.fn(async (value) => value),
    };
    const eventRepo = {
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => value),
    };
    const workflowChannelService = {
      send: jest.fn().mockResolvedValue({
        status: 'mocked',
        provider: 'mock',
        externalId: 'ext-1',
        error: null,
      }),
    };
    const campaignsService = {
      markCampaignSending: jest.fn(),
      queueNextBatch: jest.fn(),
      completeCampaignIfDone: jest.fn(),
    };
    const affiliatesService = {
      registerCampaignConversion: jest.fn(),
    };

    const processor = new CampaignProcessor(
      campaignRepo as any,
      recipientRepo as any,
      eventRepo as any,
      workflowChannelService as any,
      affiliatesService as any,
      campaignsService as any,
    );

    await processor.process({
      name: 'send-campaign-batch',
      data: { campaignId: 'camp-1', recipientIds: ['rec-1'] },
    } as Job);

    expect(workflowChannelService.send).toHaveBeenCalledWith('email', expect.objectContaining({
      toEmail: 'test@example.com',
    }));
    expect(recipient.status).toBe(CampaignRecipientStatus.SENT);
    expect(eventRepo.save).toHaveBeenCalled();
    expect(campaignsService.queueNextBatch).toHaveBeenCalledWith('camp-1');
  });
});
