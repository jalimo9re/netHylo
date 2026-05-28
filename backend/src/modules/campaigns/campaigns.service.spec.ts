import { CampaignChannel, CampaignStatus } from '@/database/entities';
import { CampaignsService } from './campaigns.service';

describe('CampaignsService', () => {
  it('crea campaña email en draft cuando no hay schedule futuro', async () => {
    const saved = { id: 'c1', tenantId: 't1', status: CampaignStatus.DRAFT };
    const campaignRepo = {
      create: jest.fn((value) => value),
      save: jest.fn().mockResolvedValue(saved),
    };
    const contactRepo = {
      find: jest.fn().mockResolvedValue([{ id: 'contact-1' }]),
    };
    const recipientRepo = {
      create: jest.fn((value) => value),
      save: jest.fn(),
      count: jest.fn(),
      delete: jest.fn(),
    };
    const eventRepo = {};
    const campaignsQueue = { add: jest.fn(), getJobs: jest.fn().mockResolvedValue([]) };

    const service = new CampaignsService(
      campaignRepo as any,
      recipientRepo as any,
      eventRepo as any,
      contactRepo as any,
      campaignsQueue as any,
    );

    const result = await service.create('t1', {
      name: 'Promo',
      channel: CampaignChannel.EMAIL,
      subject: 'Oferta',
      body: 'Contenido',
      contactIds: ['contact-1'],
    });

    expect(result.status).toBe(CampaignStatus.DRAFT);
    expect(campaignRepo.save).toHaveBeenCalled();
  });
});
