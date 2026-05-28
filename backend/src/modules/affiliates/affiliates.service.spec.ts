import { AffiliatesService } from './affiliates.service';
import { ReferralConversionSource } from '@/database/entities';

const repoMock = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(async (value) => value),
  create: jest.fn((value) => value),
  update: jest.fn(),
  count: jest.fn(),
  createQueryBuilder: jest.fn(),
});

describe('AffiliatesService', () => {
  it('crea conversión automática desde billing con referral code', async () => {
    const affiliateRepo = repoMock();
    const linkRepo = repoMock();
    const conversionRepo = repoMock();
    const payoutRepo = repoMock();
    const crmService = { fireTrigger: jest.fn().mockResolvedValue(undefined) };

    const service = new AffiliatesService(
      affiliateRepo as any,
      linkRepo as any,
      conversionRepo as any,
      payoutRepo as any,
      crmService as any,
    );

    linkRepo.findOne.mockResolvedValue({
      id: 'link-1',
      tenantId: 'tenant-1',
      affiliateId: 'aff-1',
      code: 'abc',
      conversions: 0,
      isActive: true,
    });
    affiliateRepo.findOne.mockResolvedValue({
      id: 'aff-1',
      tenantId: 'tenant-1',
      commissionRate: 20,
      totalConversions: 0,
      pendingCommission: 0,
      paidCommission: 0,
    });
    conversionRepo.findOne.mockResolvedValue(null);
    conversionRepo.save.mockImplementation(async (value) => ({ id: 'conv-1', ...value }));

    const result = await service.registerBillingConversionForInvoice({
      id: 'inv-1',
      tenantId: 'tenant-1',
      total: 100,
      currency: 'USD',
      metadata: { referralCode: 'abc' },
    });

    expect(result?.source).toBe(ReferralConversionSource.BILLING);
    expect(result?.commissionAmount).toBe(20);
    expect(crmService.fireTrigger).toHaveBeenCalledWith(
      'tenant-1',
      'affiliate.conversion',
      expect.objectContaining({ conversionId: 'conv-1' }),
    );
  });
});
