import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Affiliate,
  AffiliateStatus,
  Payout,
  PayoutStatus,
  ReferralConversion,
  ReferralConversionSource,
  ReferralConversionStatus,
  ReferralLink,
} from '@/database/entities';
import { CrmService } from '../crm/crm.service';

@Injectable()
export class AffiliatesService {
  constructor(
    @InjectRepository(Affiliate) private readonly affiliateRepo: Repository<Affiliate>,
    @InjectRepository(ReferralLink) private readonly linkRepo: Repository<ReferralLink>,
    @InjectRepository(ReferralConversion) private readonly conversionRepo: Repository<ReferralConversion>,
    @InjectRepository(Payout) private readonly payoutRepo: Repository<Payout>,
    private readonly crmService: CrmService,
  ) {}

  listAffiliates(tenantId: string) {
    return this.affiliateRepo.find({ where: { tenantId }, order: { createdAt: 'DESC' } });
  }

  async createAffiliate(tenantId: string, data: Partial<Affiliate>) {
    return this.affiliateRepo.save(
      this.affiliateRepo.create({
        tenantId,
        name: data.name || 'Affiliate',
        email: data.email ?? null,
        status: data.status ?? AffiliateStatus.ACTIVE,
        commissionRate: Number(data.commissionRate ?? 10),
        metadata: data.metadata ?? {},
      }),
    );
  }

  async updateAffiliate(tenantId: string, affiliateId: string, data: Partial<Affiliate>) {
    const affiliate = await this.affiliateRepo.findOne({ where: { id: affiliateId, tenantId } });
    if (!affiliate) throw new NotFoundException('Afiliado no encontrado');
    Object.assign(affiliate, {
      name: data.name ?? affiliate.name,
      email: data.email ?? affiliate.email,
      status: data.status ?? affiliate.status,
      commissionRate: data.commissionRate ?? affiliate.commissionRate,
      metadata: data.metadata ? { ...(affiliate.metadata || {}), ...data.metadata } : affiliate.metadata,
    });
    return this.affiliateRepo.save(affiliate);
  }

  listLinks(tenantId: string, affiliateId?: string) {
    return this.linkRepo.find({
      where: { tenantId, ...(affiliateId ? { affiliateId } : {}) },
      order: { createdAt: 'DESC' },
    });
  }

  async createLink(
    tenantId: string,
    data: { affiliateId: string; code?: string; targetUrl?: string; metadata?: Record<string, any> },
  ) {
    const affiliate = await this.affiliateRepo.findOne({
      where: { id: data.affiliateId, tenantId },
    });
    if (!affiliate) throw new NotFoundException('Afiliado no encontrado');
    const code = (data.code || this.generateCode(affiliate.name)).trim().toLowerCase();
    const exists = await this.linkRepo.findOne({ where: { code } });
    if (exists) throw new BadRequestException('El código de referido ya existe');

    return this.linkRepo.save(
      this.linkRepo.create({
        tenantId,
        affiliateId: affiliate.id,
        code,
        targetUrl: data.targetUrl ?? null,
        metadata: data.metadata ?? {},
      }),
    );
  }

  async updateLink(tenantId: string, linkId: string, data: Partial<ReferralLink>) {
    const link = await this.linkRepo.findOne({ where: { id: linkId, tenantId } });
    if (!link) throw new NotFoundException('Link de referido no encontrado');
    if (typeof data.code === 'string' && data.code.trim()) {
      const code = data.code.trim().toLowerCase();
      const exists = await this.linkRepo.findOne({ where: { code } });
      if (exists && exists.id !== link.id) throw new BadRequestException('El código de referido ya existe');
      link.code = code;
    }
    if (data.targetUrl !== undefined) link.targetUrl = data.targetUrl || null;
    if (typeof data.isActive === 'boolean') link.isActive = data.isActive;
    if (data.metadata) link.metadata = { ...(link.metadata || {}), ...data.metadata };
    return this.linkRepo.save(link);
  }

  listConversions(tenantId: string, affiliateId?: string) {
    return this.conversionRepo.find({
      where: { tenantId, ...(affiliateId ? { affiliateId } : {}) },
      order: { createdAt: 'DESC' },
    });
  }

  async createManualConversion(
    tenantId: string,
    data: {
      affiliateId?: string;
      referralLinkId?: string;
      amount: number;
      currency?: string;
      contactId?: string;
      campaignId?: string;
      metadata?: Record<string, any>;
    },
  ) {
    const linked = await this.resolveAffiliateAndLink(tenantId, data.affiliateId, data.referralLinkId);
    const conversion = await this.createConversionRecord({
      tenantId,
      affiliateId: linked.affiliate.id,
      referralLinkId: linked.link?.id ?? null,
      amount: Number(data.amount || 0),
      currency: data.currency || 'USD',
      source: ReferralConversionSource.MANUAL,
      status: ReferralConversionStatus.APPROVED,
      contactId: data.contactId || null,
      campaignId: data.campaignId || null,
      metadata: data.metadata || {},
      occurredAt: new Date(),
    });
    await this.crmService.fireTrigger(tenantId, 'affiliate.conversion', {
      conversionId: conversion.id,
      affiliateId: conversion.affiliateId,
      amount: conversion.amount,
      commissionAmount: conversion.commissionAmount,
      source: conversion.source,
    });
    return conversion;
  }

  listPayouts(tenantId: string, affiliateId?: string) {
    return this.payoutRepo.find({
      where: { tenantId, ...(affiliateId ? { affiliateId } : {}) },
      order: { createdAt: 'DESC' },
    });
  }

  async createPayout(
    tenantId: string,
    data: { affiliateId: string; amount: number; currency?: string; notes?: string; markPaid?: boolean },
  ) {
    const affiliate = await this.affiliateRepo.findOne({ where: { id: data.affiliateId, tenantId } });
    if (!affiliate) throw new NotFoundException('Afiliado no encontrado');

    const amount = Number(data.amount || 0);
    if (amount <= 0) throw new BadRequestException('El monto del payout debe ser mayor a 0');
    if (amount > Number(affiliate.pendingCommission || 0)) {
      throw new BadRequestException('El payout no puede superar la comisión pendiente');
    }

    const payout = await this.payoutRepo.save(
      this.payoutRepo.create({
        tenantId,
        affiliateId: affiliate.id,
        amount,
        currency: data.currency || 'USD',
        notes: data.notes || null,
        status: data.markPaid ? PayoutStatus.PAID : PayoutStatus.PENDING,
        paidAt: data.markPaid ? new Date() : null,
      }),
    );

    affiliate.pendingCommission = Number(affiliate.pendingCommission || 0) - amount;
    if (payout.status === PayoutStatus.PAID) {
      affiliate.paidCommission = Number(affiliate.paidCommission || 0) + amount;
      await this.conversionRepo.update(
        { tenantId, affiliateId: affiliate.id, status: ReferralConversionStatus.APPROVED },
        { status: ReferralConversionStatus.PAID },
      );
    }
    await this.affiliateRepo.save(affiliate);
    return payout;
  }

  async getMetrics(tenantId: string) {
    const [clicksRow, conversions, pendingRow, paidRow] = await Promise.all([
      this.linkRepo
        .createQueryBuilder('link')
        .select('COALESCE(SUM(link.clicks),0)', 'total')
        .where('link.tenantId = :tenantId', { tenantId })
        .getRawOne<{ total: string }>(),
      this.conversionRepo.count({
        where: {
          tenantId,
          status: ReferralConversionStatus.APPROVED,
        },
      }),
      this.affiliateRepo
        .createQueryBuilder('affiliate')
        .select('COALESCE(SUM(affiliate.pendingCommission),0)', 'total')
        .where('affiliate.tenantId = :tenantId', { tenantId })
        .getRawOne<{ total: string }>(),
      this.affiliateRepo
        .createQueryBuilder('affiliate')
        .select('COALESCE(SUM(affiliate.paidCommission),0)', 'total')
        .where('affiliate.tenantId = :tenantId', { tenantId })
        .getRawOne<{ total: string }>(),
    ]);

    return {
      clicks: Number(clicksRow?.total || 0),
      conversions,
      pendingCommission: Number(pendingRow?.total || 0),
      paidCommission: Number(paidRow?.total || 0),
    };
  }

  async trackClickByCode(code: string, metadata: Record<string, any> = {}) {
    const link = await this.linkRepo.findOne({ where: { code: code.toLowerCase(), isActive: true } });
    if (!link) throw new NotFoundException('Referral code no encontrado');
    const affiliate = await this.affiliateRepo.findOne({ where: { id: link.affiliateId, tenantId: link.tenantId } });
    if (!affiliate) throw new NotFoundException('Afiliado no encontrado');

    link.clicks += 1;
    link.lastClickedAt = new Date();
    link.metadata = { ...(link.metadata || {}), lastClick: metadata };
    await this.linkRepo.save(link);

    affiliate.totalClicks += 1;
    await this.affiliateRepo.save(affiliate);

    return {
      success: true,
      code: link.code,
      targetUrl: link.targetUrl,
      clicks: link.clicks,
    };
  }

  async registerBillingConversionForInvoice(
    invoice: {
      id: string;
      tenantId: string;
      contactId?: string | null;
      total: number;
      currency?: string;
      metadata?: Record<string, any>;
    },
    metadata: Record<string, any> = {},
  ) {
    const referralCode =
      String(invoice.metadata?.referralCode || invoice.metadata?.referralLinkCode || '').trim().toLowerCase() || null;
    if (!referralCode) return null;
    const link = await this.linkRepo.findOne({
      where: { code: referralCode, tenantId: invoice.tenantId, isActive: true },
    });
    if (!link) return null;
    return this.createAutoConversion({
      tenantId: invoice.tenantId,
      referralLink: link,
      amount: Number(invoice.total || 0),
      currency: invoice.currency || 'USD',
      source: ReferralConversionSource.BILLING,
      contactId: invoice.contactId || null,
      invoiceId: invoice.id,
      metadata,
    });
  }

  async registerCampaignConversion(
    tenantId: string,
    data: {
      campaignId: string;
      contactId?: string | null;
      referralCode?: string | null;
      amount?: number;
      currency?: string;
      metadata?: Record<string, any>;
    },
  ) {
    const referralCode = String(data.referralCode || '').trim().toLowerCase();
    if (!referralCode || !Number(data.amount || 0)) return null;
    const link = await this.linkRepo.findOne({ where: { tenantId, code: referralCode, isActive: true } });
    if (!link) return null;
    return this.createAutoConversion({
      tenantId,
      referralLink: link,
      amount: Number(data.amount || 0),
      currency: data.currency || 'USD',
      source: ReferralConversionSource.CAMPAIGN,
      campaignId: data.campaignId,
      contactId: data.contactId || null,
      metadata: data.metadata || {},
    });
  }

  private async createAutoConversion(params: {
    tenantId: string;
    referralLink: ReferralLink;
    amount: number;
    currency: string;
    source: ReferralConversionSource;
    contactId?: string | null;
    campaignId?: string | null;
    invoiceId?: string | null;
    metadata?: Record<string, any>;
  }) {
    const exists =
      params.invoiceId &&
      (await this.conversionRepo.findOne({
        where: { invoiceId: params.invoiceId, tenantId: params.tenantId },
      }));
    if (exists) return exists;

    const conversion = await this.createConversionRecord({
      tenantId: params.tenantId,
      affiliateId: params.referralLink.affiliateId,
      referralLinkId: params.referralLink.id,
      amount: Number(params.amount || 0),
      currency: params.currency,
      source: params.source,
      status: ReferralConversionStatus.APPROVED,
      contactId: params.contactId || null,
      campaignId: params.campaignId || null,
      invoiceId: params.invoiceId || null,
      metadata: params.metadata || {},
      occurredAt: new Date(),
    });

    params.referralLink.conversions += 1;
    await this.linkRepo.save(params.referralLink);
    await this.crmService.fireTrigger(params.tenantId, 'affiliate.conversion', {
      conversionId: conversion.id,
      affiliateId: conversion.affiliateId,
      amount: conversion.amount,
      commissionAmount: conversion.commissionAmount,
      source: conversion.source,
      campaignId: conversion.campaignId,
      invoiceId: conversion.invoiceId,
    });
    return conversion;
  }

  private async createConversionRecord(data: {
    tenantId: string;
    affiliateId: string;
    referralLinkId: string | null;
    amount: number;
    currency: string;
    source: ReferralConversionSource;
    status: ReferralConversionStatus;
    contactId?: string | null;
    campaignId?: string | null;
    invoiceId?: string | null;
    metadata?: Record<string, any>;
    occurredAt?: Date;
  }) {
    const affiliate = await this.affiliateRepo.findOne({
      where: { id: data.affiliateId, tenantId: data.tenantId },
    });
    if (!affiliate) throw new NotFoundException('Afiliado no encontrado');

    const commissionRate = Number(affiliate.commissionRate || 0);
    const commissionAmount = Number(((Number(data.amount || 0) * commissionRate) / 100).toFixed(2));

    const conversion = await this.conversionRepo.save(
      this.conversionRepo.create({
        tenantId: data.tenantId,
        affiliateId: affiliate.id,
        referralLinkId: data.referralLinkId,
        amount: Number(data.amount || 0),
        commissionAmount,
        currency: data.currency || 'USD',
        source: data.source,
        status: data.status,
        contactId: data.contactId || null,
        campaignId: data.campaignId || null,
        invoiceId: data.invoiceId || null,
        metadata: data.metadata || {},
        occurredAt: data.occurredAt || new Date(),
      }),
    );

    affiliate.totalConversions += 1;
    if (data.status === ReferralConversionStatus.PAID) {
      affiliate.paidCommission = Number(affiliate.paidCommission || 0) + commissionAmount;
    } else if (data.status === ReferralConversionStatus.APPROVED) {
      affiliate.pendingCommission = Number(affiliate.pendingCommission || 0) + commissionAmount;
    }
    await this.affiliateRepo.save(affiliate);
    return conversion;
  }

  private async resolveAffiliateAndLink(tenantId: string, affiliateId?: string, referralLinkId?: string) {
    if (!affiliateId && !referralLinkId) {
      throw new BadRequestException('affiliateId o referralLinkId es requerido');
    }
    let link: ReferralLink | null = null;
    if (referralLinkId) {
      link = await this.linkRepo.findOne({ where: { id: referralLinkId, tenantId } });
      if (!link) throw new NotFoundException('Link de referido no encontrado');
    }
    const resolvedAffiliateId = affiliateId || link?.affiliateId;
    const affiliate = await this.affiliateRepo.findOne({
      where: { id: resolvedAffiliateId, tenantId },
    });
    if (!affiliate) throw new NotFoundException('Afiliado no encontrado');
    return { affiliate, link };
  }

  private generateCode(seed: string) {
    const sanitized = seed
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 24);
    return `${sanitized || 'ref'}-${Math.random().toString(36).slice(2, 8)}`;
  }
}
