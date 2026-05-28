import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BillingService } from './billing.service';
import { BillingInvoiceStatus } from '@/database/entities/billing-invoice.entity';
import { BillingPaymentStatus } from '@/database/entities/billing-payment.entity';
import { BillingPriceInterval } from '@/database/entities/billing-price.entity';
import { BillingSubscriptionStatus } from '@/database/entities/billing-subscription.entity';

const repoMock = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  save: jest.fn(async (value) => ({ id: 'generated-id', ...value })),
  create: jest.fn((value) => value),
  remove: jest.fn(),
  count: jest.fn(),
  createQueryBuilder: jest.fn(),
});

describe('BillingService', () => {
  const mockProvider = {
    isEnabled: jest.fn(() => true),
    createExternalPriceId: jest.fn(() => 'price_mock_test'),
    createPaymentIntent: jest.fn(() => ({ id: 'pi_mock_1', clientSecret: 'secret' })),
    simulateWebhookConfirmation: jest.fn(() => ({ status: 'succeeded' as const, externalId: 'ch_mock_1' })),
  };

  const buildService = () => {
    const productRepo = repoMock();
    const priceRepo = repoMock();
    const invoiceRepo = repoMock();
    const invoiceItemRepo = repoMock();
    const subscriptionRepo = repoMock();
    const paymentRepo = repoMock();
    const contactRepo = repoMock();
    const dealRepo = repoMock();
    const affiliatesService = {
      registerBillingConversionForInvoice: jest.fn(),
    };

    invoiceRepo.create.mockImplementation((v) => v);
    invoiceItemRepo.create.mockImplementation((v) => v);
    paymentRepo.create.mockImplementation((v) => v);

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

    return {
      service,
      productRepo,
      priceRepo,
      invoiceRepo,
      invoiceItemRepo,
      subscriptionRepo,
      paymentRepo,
      contactRepo,
      dealRepo,
    };
  };

  it('calcula MRR y facturas pendientes en métricas', async () => {
    const { service, subscriptionRepo, paymentRepo, invoiceRepo } = buildService();

    subscriptionRepo.find.mockResolvedValue([
      {
        status: BillingSubscriptionStatus.ACTIVE,
        price: { amount: 99, interval: BillingPriceInterval.MONTH },
      },
      {
        status: BillingSubscriptionStatus.ACTIVE,
        price: { amount: 1200, interval: BillingPriceInterval.YEAR },
      },
    ]);

    const qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([{ amount: 50 }, { amount: 25.5 }]),
    };
    paymentRepo.createQueryBuilder.mockReturnValue(qb);
    invoiceRepo.count.mockResolvedValue(3);

    const metrics = await service.getMetrics('tenant-1', 30);

    expect(metrics.mrr).toBe(199);
    expect(metrics.periodRevenue).toBe(75.5);
    expect(metrics.pendingInvoices).toBe(3);
    expect(metrics.activeSubscriptions).toBe(2);
    expect(metrics.mockEnabled).toBe(true);
  });

  it('marca factura como pagada al confirmar webhook', async () => {
    const { service, paymentRepo, invoiceRepo } = buildService();

    paymentRepo.findOne.mockResolvedValue({
      id: 'pay-1',
      invoiceId: 'inv-1',
      status: BillingPaymentStatus.PENDING,
      externalId: 'pi_mock_1',
    });
    invoiceRepo.findOne.mockResolvedValue({
      id: 'inv-1',
      status: BillingInvoiceStatus.OPEN,
    });

    const result = await service.confirmPaymentFromWebhook({ paymentId: 'pay-1' });

    expect(result.payment.status).toBe(BillingPaymentStatus.SUCCEEDED);
    expect(invoiceRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: BillingInvoiceStatus.PAID }),
    );
  });

  it('rechaza factura sin ítems', async () => {
    const { service } = buildService();
    await expect(service.createInvoice('tenant-1', { items: [] })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('falla si el pago del webhook no existe', async () => {
    const { service, paymentRepo } = buildService();
    paymentRepo.findOne.mockResolvedValue(null);
    await expect(service.confirmPaymentFromWebhook({ paymentId: 'missing' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('no genera externalPriceId cuando BILLING_MOCK está desactivado', async () => {
    mockProvider.isEnabled.mockReturnValueOnce(false);
    const { service, productRepo, priceRepo } = buildService();

    productRepo.findOne.mockResolvedValue({ id: 'prod-1', tenantId: 'tenant-1' });

    await service.createPrice('tenant-1', {
      productId: 'prod-1',
      amount: 49,
      currency: 'USD',
      interval: BillingPriceInterval.MONTH,
    });

    expect(priceRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        externalPriceId: null,
      }),
    );
  });
});
