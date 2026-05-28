import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BillingProduct } from '@/database/entities/billing-product.entity';
import { BillingPrice, BillingPriceInterval } from '@/database/entities/billing-price.entity';
import {
  BillingInvoice,
  BillingInvoiceStatus,
} from '@/database/entities/billing-invoice.entity';
import { BillingInvoiceItem } from '@/database/entities/billing-invoice-item.entity';
import {
  BillingSubscription,
  BillingSubscriptionStatus,
} from '@/database/entities/billing-subscription.entity';
import {
  BillingPayment,
  BillingPaymentStatus,
} from '@/database/entities/billing-payment.entity';
import { Contact } from '@/database/entities/contact.entity';
import { CrmDeal } from '@/database/entities/crm-deal.entity';
import { MockBillingProvider } from './providers/mock-billing.provider';
import { AffiliatesService } from '../affiliates/affiliates.service';

export interface CreateInvoiceItemInput {
  priceId?: string;
  description: string;
  quantity?: number;
  unitAmount?: number;
}

export interface CreateInvoiceInput {
  contactId?: string;
  dealId?: string;
  currency?: string;
  tax?: number;
  dueDate?: string;
  items: CreateInvoiceItemInput[];
  status?: BillingInvoiceStatus;
}

@Injectable()
export class BillingService {
  constructor(
    @InjectRepository(BillingProduct) private readonly productRepo: Repository<BillingProduct>,
    @InjectRepository(BillingPrice) private readonly priceRepo: Repository<BillingPrice>,
    @InjectRepository(BillingInvoice) private readonly invoiceRepo: Repository<BillingInvoice>,
    @InjectRepository(BillingInvoiceItem) private readonly invoiceItemRepo: Repository<BillingInvoiceItem>,
    @InjectRepository(BillingSubscription) private readonly subscriptionRepo: Repository<BillingSubscription>,
    @InjectRepository(BillingPayment) private readonly paymentRepo: Repository<BillingPayment>,
    @InjectRepository(Contact) private readonly contactRepo: Repository<Contact>,
    @InjectRepository(CrmDeal) private readonly dealRepo: Repository<CrmDeal>,
    private readonly mockProvider: MockBillingProvider,
    private readonly affiliatesService: AffiliatesService,
  ) {}

  listProducts(tenantId: string) {
    return this.productRepo.find({
      where: { tenantId },
      relations: ['prices'],
      order: { createdAt: 'DESC' },
    });
  }

  async createProduct(tenantId: string, data: Partial<BillingProduct>) {
    return this.productRepo.save(
      this.productRepo.create({
        tenantId,
        name: data.name || 'Producto',
        description: data.description ?? null,
        isActive: data.isActive ?? true,
        metadata: data.metadata ?? {},
      }),
    );
  }

  async updateProduct(tenantId: string, productId: string, data: Partial<BillingProduct>) {
    const product = await this.productRepo.findOne({ where: { id: productId, tenantId } });
    if (!product) throw new NotFoundException('Producto no encontrado');
    Object.assign(product, data);
    return this.productRepo.save(product);
  }

  async deleteProduct(tenantId: string, productId: string) {
    const product = await this.productRepo.findOne({ where: { id: productId, tenantId } });
    if (!product) throw new NotFoundException('Producto no encontrado');
    await this.productRepo.remove(product);
    return { success: true };
  }

  listPrices(tenantId: string, productId?: string) {
    return this.priceRepo.find({
      where: { tenantId, ...(productId ? { productId } : {}) },
      relations: ['product'],
      order: { createdAt: 'DESC' },
    });
  }

  async createPrice(tenantId: string, data: Partial<BillingPrice> & { productId: string }) {
    const product = await this.productRepo.findOne({ where: { id: data.productId, tenantId } });
    if (!product) throw new NotFoundException('Producto no encontrado');

    const externalPriceId = this.mockProvider.isEnabled()
      ? this.mockProvider.createExternalPriceId()
      : data.externalPriceId ?? null;

    return this.priceRepo.save(
      this.priceRepo.create({
        tenantId,
        productId: data.productId,
        amount: data.amount ?? 0,
        currency: data.currency ?? 'USD',
        interval: data.interval ?? BillingPriceInterval.ONE_TIME,
        isActive: data.isActive ?? true,
        externalPriceId,
      }),
    );
  }

  async updatePrice(tenantId: string, priceId: string, data: Partial<BillingPrice>) {
    const price = await this.priceRepo.findOne({ where: { id: priceId, tenantId } });
    if (!price) throw new NotFoundException('Precio no encontrado');
    Object.assign(price, data);
    return this.priceRepo.save(price);
  }

  async deletePrice(tenantId: string, priceId: string) {
    const price = await this.priceRepo.findOne({ where: { id: priceId, tenantId } });
    if (!price) throw new NotFoundException('Precio no encontrado');
    await this.priceRepo.remove(price);
    return { success: true };
  }

  listInvoices(tenantId: string) {
    return this.invoiceRepo.find({
      where: { tenantId },
      relations: ['items', 'payments'],
      order: { createdAt: 'DESC' },
    });
  }

  async getInvoice(tenantId: string, invoiceId: string) {
    const invoice = await this.invoiceRepo.findOne({
      where: { id: invoiceId, tenantId },
      relations: ['items', 'payments'],
    });
    if (!invoice) throw new NotFoundException('Factura no encontrada');
    return invoice;
  }

  async createInvoice(tenantId: string, input: CreateInvoiceInput) {
    if (!input.items?.length) {
      throw new BadRequestException('La factura requiere al menos un ítem');
    }

    if (input.contactId) {
      const contact = await this.contactRepo.findOne({ where: { id: input.contactId, tenantId } });
      if (!contact) throw new BadRequestException('Contacto inválido');
    }
    if (input.dealId) {
      const deal = await this.dealRepo.findOne({ where: { id: input.dealId, tenantId } });
      if (!deal) throw new BadRequestException('Deal inválido');
    }

    const lineItems: BillingInvoiceItem[] = [];
    let subtotal = 0;

    for (const item of input.items) {
      let unitAmount = Number(item.unitAmount ?? 0);
      let description = item.description;

      if (item.priceId) {
        const price = await this.priceRepo.findOne({
          where: { id: item.priceId, tenantId },
          relations: ['product'],
        });
        if (!price) throw new BadRequestException(`Precio inválido: ${item.priceId}`);
        unitAmount = Number(price.amount);
        description = description || price.product?.name || 'Ítem';
      }

      const quantity = item.quantity ?? 1;
      const amount = unitAmount * quantity;
      subtotal += amount;
      lineItems.push(
        this.invoiceItemRepo.create({
          priceId: item.priceId ?? null,
          description,
          quantity,
          unitAmount,
          amount,
        }),
      );
    }

    const tax = Number(input.tax ?? 0);
    const total = subtotal + tax;
    const status = input.status ?? BillingInvoiceStatus.OPEN;

    const invoice = await this.invoiceRepo.save(
      this.invoiceRepo.create({
        tenantId,
        contactId: input.contactId ?? null,
        dealId: input.dealId ?? null,
        currency: input.currency ?? 'USD',
        subtotal,
        tax,
        total,
        status,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        items: lineItems,
      }),
    );

    return this.getInvoice(tenantId, invoice.id);
  }

  listSubscriptions(tenantId: string) {
    return this.subscriptionRepo.find({
      where: { tenantId },
      relations: ['price', 'price.product', 'contact'],
      order: { createdAt: 'DESC' },
    });
  }

  async createSubscription(
    tenantId: string,
    data: { contactId?: string; priceId: string; cancelAtPeriodEnd?: boolean },
  ) {
    const price = await this.priceRepo.findOne({
      where: { id: data.priceId, tenantId },
      relations: ['product'],
    });
    if (!price) throw new NotFoundException('Precio no encontrado');
    if (price.interval === BillingPriceInterval.ONE_TIME) {
      throw new BadRequestException('El precio debe ser recurrente (month/year)');
    }

    if (data.contactId) {
      const contact = await this.contactRepo.findOne({ where: { id: data.contactId, tenantId } });
      if (!contact) throw new BadRequestException('Contacto inválido');
    }

    const now = new Date();
    const periodEnd = new Date(now);
    if (price.interval === BillingPriceInterval.YEAR) {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    return this.subscriptionRepo.save(
      this.subscriptionRepo.create({
        tenantId,
        contactId: data.contactId ?? null,
        priceId: price.id,
        status: BillingSubscriptionStatus.ACTIVE,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: data.cancelAtPeriodEnd ?? false,
        externalSubscriptionId: this.mockProvider.isEnabled()
          ? `sub_mock_${price.id.slice(0, 8)}`
          : null,
      }),
    );
  }

  async recordPayment(
    tenantId: string,
    data: { invoiceId: string; amount?: number; currency?: string; markSucceeded?: boolean },
  ) {
    const invoice = await this.invoiceRepo.findOne({ where: { id: data.invoiceId, tenantId } });
    if (!invoice) throw new NotFoundException('Factura no encontrada');
    if (invoice.status === BillingInvoiceStatus.PAID) {
      throw new BadRequestException('La factura ya está pagada');
    }
    if (invoice.status === BillingInvoiceStatus.VOID) {
      throw new BadRequestException('La factura está anulada');
    }

    const amount = data.amount ?? Number(invoice.total);
    const currency = data.currency ?? invoice.currency;
    let externalId: string | null = null;
    let status = BillingPaymentStatus.PENDING;

    if (this.mockProvider.isEnabled()) {
      const intent = this.mockProvider.createPaymentIntent(amount, currency);
      externalId = intent.id;
      if (data.markSucceeded) {
        status = BillingPaymentStatus.SUCCEEDED;
      }
    } else if (data.markSucceeded) {
      status = BillingPaymentStatus.SUCCEEDED;
    }

    const payment = await this.paymentRepo.save(
      this.paymentRepo.create({
        tenantId,
        invoiceId: invoice.id,
        amount,
        currency,
        status,
        provider: 'mock_stripe',
        externalId,
        metadata: {},
      }),
    );

    if (status === BillingPaymentStatus.SUCCEEDED) {
      await this.markInvoicePaid(invoice);
    }

    return payment;
  }

  async confirmPaymentFromWebhook(payload: {
    paymentId?: string;
    invoiceId?: string;
    externalId?: string;
    status?: 'succeeded' | 'failed';
  }) {
    let payment: BillingPayment | null = null;

    if (payload.paymentId) {
      payment = await this.paymentRepo.findOne({ where: { id: payload.paymentId } });
    } else if (payload.externalId) {
      payment = await this.paymentRepo.findOne({ where: { externalId: payload.externalId } });
    } else if (payload.invoiceId) {
      const pending = await this.paymentRepo.find({
        where: { invoiceId: payload.invoiceId, status: BillingPaymentStatus.PENDING },
        order: { createdAt: 'DESC' },
        take: 1,
      });
      payment = pending[0] ?? null;
    }

    if (!payment) throw new NotFoundException('Pago no encontrado');

    const mockResult = this.mockProvider.simulateWebhookConfirmation(
      payload.externalId || payment.externalId || '',
    );
    const nextStatus =
      payload.status === 'failed'
        ? BillingPaymentStatus.FAILED
        : mockResult.status === 'succeeded'
          ? BillingPaymentStatus.SUCCEEDED
          : BillingPaymentStatus.FAILED;

    payment.status = nextStatus;
    payment.externalId = mockResult.externalId;
    await this.paymentRepo.save(payment);

    if (nextStatus === BillingPaymentStatus.SUCCEEDED) {
      const invoice = await this.invoiceRepo.findOne({ where: { id: payment.invoiceId } });
      if (invoice) {
        await this.markInvoicePaid(invoice);
        await this.affiliatesService.registerBillingConversionForInvoice(invoice, {
          paymentId: payment.id,
          externalId: payment.externalId,
          webhookStatus: payload.status || 'succeeded',
        });
      }
    }

    return { payment, invoiceId: payment.invoiceId };
  }

  private async markInvoicePaid(invoice: BillingInvoice) {
    invoice.status = BillingInvoiceStatus.PAID;
    invoice.paidAt = new Date();
    await this.invoiceRepo.save(invoice);
  }

  async getMetrics(tenantId: string, periodDays = 30) {
    const since = new Date();
    since.setDate(since.getDate() - periodDays);

    const subscriptions = await this.subscriptionRepo.find({
      where: { tenantId, status: BillingSubscriptionStatus.ACTIVE },
      relations: ['price'],
    });

    let mrr = 0;
    for (const sub of subscriptions) {
      const amount = Number(sub.price?.amount ?? 0);
      if (sub.price?.interval === BillingPriceInterval.YEAR) {
        mrr += amount / 12;
      } else if (sub.price?.interval === BillingPriceInterval.MONTH) {
        mrr += amount;
      }
    }

    const payments = await this.paymentRepo
      .createQueryBuilder('p')
      .where('p.tenantId = :tenantId', { tenantId })
      .andWhere('p.status = :status', { status: BillingPaymentStatus.SUCCEEDED })
      .andWhere('p.createdAt >= :since', { since })
      .getMany();

    const periodRevenue = payments.reduce((sum, p) => sum + Number(p.amount), 0);

    const pendingInvoices = await this.invoiceRepo.count({
      where: { tenantId, status: BillingInvoiceStatus.OPEN },
    });

    return {
      mrr: Math.round(mrr * 100) / 100,
      periodRevenue: Math.round(periodRevenue * 100) / 100,
      pendingInvoices,
      periodDays,
      activeSubscriptions: subscriptions.length,
      mockEnabled: this.mockProvider.isEnabled(),
    };
  }
}
