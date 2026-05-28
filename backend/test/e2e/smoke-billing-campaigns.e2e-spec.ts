import { BillingService } from '@/modules/billing/billing.service';
import { CampaignsService } from '@/modules/campaigns/campaigns.service';
import { CampaignChannel, CampaignStatus } from '@/database/entities';
import { BillingInvoiceStatus } from '@/database/entities/billing-invoice.entity';
import { BillingPaymentStatus } from '@/database/entities/billing-payment.entity';

const repoMock = () => ({
  create: jest.fn((value) => value),
  save: jest.fn(async (value) => value),
  findOne: jest.fn(),
  find: jest.fn(),
  count: jest.fn(),
  delete: jest.fn(),
  update: jest.fn(),
});

describe('Smoke E2E billing/campaigns (fallback integration)', () => {
  it('billing: genera factura y registra pago exitoso', async () => {
    const productRepo = repoMock();
    const priceRepo = repoMock();
    const invoiceRepo = repoMock();
    const invoiceItemRepo = repoMock();
    const subscriptionRepo = repoMock();
    const paymentRepo = repoMock();
    const contactRepo = repoMock();
    const dealRepo = repoMock();
    const mockProvider = {
      isEnabled: jest.fn(() => true),
      createExternalPriceId: jest.fn(() => 'price_mock_1'),
      createPaymentIntent: jest.fn(() => ({ id: 'pi_mock_1' })),
      simulateWebhookConfirmation: jest.fn(() => ({ status: 'succeeded', externalId: 'ch_mock_1' })),
    };
    const affiliatesService = {
      registerBillingConversionForInvoice: jest.fn(),
    };

    const service = new BillingService(
      productRepo as any,
      priceRepo as any,
      invoiceRepo as any,
      invoiceItemRepo as any,
      subscriptionRepo as any,
      paymentRepo as any,
      contactRepo as any,
      dealRepo as any,
      mockProvider as any,
      affiliatesService as any,
    );

    contactRepo.findOne.mockResolvedValue({ id: 'contact-1', tenantId: 'tenant-1' });
    const invoice = {
      id: 'inv-1',
      tenantId: 'tenant-1',
      total: 129,
      currency: 'USD',
      status: BillingInvoiceStatus.OPEN,
      items: [],
      payments: [],
    };
    invoiceRepo.save.mockImplementation(async (value) => ({ ...invoice, ...value }));
    invoiceRepo.findOne.mockResolvedValue(invoice);
    paymentRepo.save.mockImplementation(async (value) => ({ id: 'pay-1', ...value }));

    await service.createInvoice('tenant-1', {
      contactId: 'contact-1',
      items: [{ description: 'Plan Starter', quantity: 1, unitAmount: 129 }],
    });
    const payment = await service.recordPayment('tenant-1', {
      invoiceId: 'inv-1',
      markSucceeded: true,
    });

    expect(payment.status).toBe(BillingPaymentStatus.SUCCEEDED);
    expect(invoiceRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: BillingInvoiceStatus.PAID,
      }),
    );
  });

  it('campaigns: agenda campaña y la encola', async () => {
    const campaignRepo = repoMock();
    const recipientRepo = repoMock();
    const eventRepo = repoMock();
    const contactRepo = repoMock();
    const campaignsQueue = {
      add: jest.fn().mockResolvedValue(undefined),
      getJobs: jest.fn().mockResolvedValue([]),
    };

    const service = new CampaignsService(
      campaignRepo as any,
      recipientRepo as any,
      eventRepo as any,
      contactRepo as any,
      campaignsQueue as any,
    );

    contactRepo.find.mockResolvedValue([{ id: 'contact-1', email: 'lead@example.com' }]);
    campaignRepo.save.mockImplementation(async (value) => ({
      id: 'camp-1',
      tenantId: 'tenant-1',
      contactIds: ['contact-1'],
      status: value.status || CampaignStatus.SCHEDULED,
      ...value,
    }));
    recipientRepo.count.mockResolvedValue(1);
    campaignRepo.findOne.mockResolvedValue({
      id: 'camp-1',
      tenantId: 'tenant-1',
      contactIds: ['contact-1'],
      status: CampaignStatus.DRAFT,
      scheduledAt: null,
    });

    const scheduledAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const campaign = await service.create('tenant-1', {
      name: 'Recovery',
      channel: CampaignChannel.EMAIL,
      subject: 'Oferta especial',
      body: 'Hola!',
      contactIds: ['contact-1'],
      scheduledAt,
    });

    expect(campaign.status).toBe(CampaignStatus.SCHEDULED);
    expect(campaignsQueue.add).toHaveBeenCalledWith(
      'send-campaign-batch',
      expect.objectContaining({ campaignId: 'camp-1' }),
      expect.any(Object),
    );
  });
});
