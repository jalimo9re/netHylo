import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Funnel,
  FunnelAnalytics,
  FunnelAnalyticsEventType,
  FunnelStep,
  Site,
  SitePage,
} from '@/database/entities';
import { sanitizeBlocks } from './block-schema';

type FunnelStepInput = {
  name?: string;
  stepOrder?: number;
  pageId?: string | null;
  config?: Record<string, unknown>;
  blocks?: unknown[];
};

const MAX_FUNNEL_STEPS = 40;

@Injectable()
export class SitesService {
  constructor(
    @InjectRepository(Site) private readonly siteRepo: Repository<Site>,
    @InjectRepository(SitePage) private readonly pageRepo: Repository<SitePage>,
    @InjectRepository(Funnel) private readonly funnelRepo: Repository<Funnel>,
    @InjectRepository(FunnelStep) private readonly stepRepo: Repository<FunnelStep>,
    @InjectRepository(FunnelAnalytics)
    private readonly analyticsRepo: Repository<FunnelAnalytics>,
  ) {}

  private slugify(value: string): string {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 160);
  }

  private sanitizePlainObject(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    const safe: Record<string, unknown> = {};
    for (const [key, entryValue] of Object.entries(value as Record<string, unknown>)) {
      if (key === '__proto__' || key === 'prototype' || key === 'constructor') continue;
      safe[key] = entryValue;
    }
    return safe;
  }

  // --- Sites ---

  listSites(tenantId: string) {
    return this.siteRepo.find({
      where: { tenantId },
      order: { updatedAt: 'DESC' },
      relations: ['pages'],
    });
  }

  async getSite(tenantId: string, id: string) {
    const site = await this.siteRepo.findOne({
      where: { id, tenantId },
      relations: ['pages'],
    });
    if (!site) throw new NotFoundException('Site not found');
    return site;
  }

  async createSite(tenantId: string, data: Partial<Site>) {
    const slug = this.slugify(data.slug || data.name || 'site');
    const site = this.siteRepo.create({
      tenantId,
      name: data.name?.trim() || 'Untitled Site',
      slug,
      settings: data.settings || {},
      isPublished: false,
      version: 1,
    });
    return this.siteRepo.save(site);
  }

  async updateSite(tenantId: string, id: string, data: Partial<Site>) {
    const site = await this.getSite(tenantId, id);
    if (data.name !== undefined) site.name = data.name.trim();
    if (data.slug !== undefined) site.slug = this.slugify(data.slug);
    if (data.settings !== undefined) site.settings = data.settings;
    return this.siteRepo.save(site);
  }

  async deleteSite(tenantId: string, id: string) {
    const site = await this.getSite(tenantId, id);
    await this.siteRepo.remove(site);
    return { success: true };
  }

  async publishSite(tenantId: string, id: string, isPublished: boolean) {
    const site = await this.getSite(tenantId, id);
    site.isPublished = isPublished;
    if (isPublished) {
      site.version += 1;
      site.publishedAt = new Date();
      const pages = await this.pageRepo.find({ where: { siteId: id, tenantId } });
      for (const page of pages) {
        page.isPublished = true;
        page.version += 1;
        await this.pageRepo.save(page);
      }
    }
    return this.siteRepo.save(site);
  }

  // --- Pages ---

  listPages(tenantId: string, siteId: string) {
    return this.pageRepo.find({
      where: { tenantId, siteId },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  async createPage(tenantId: string, siteId: string, data: Partial<SitePage>) {
    await this.getSite(tenantId, siteId);
    const slug = this.slugify(data.slug || data.name || 'page');
    const page = this.pageRepo.create({
      tenantId,
      siteId,
      name: data.name?.trim() || 'Untitled Page',
      slug,
      blocks: Array.isArray(data.blocks) ? sanitizeBlocks(data.blocks) : [],
      sortOrder: data.sortOrder ?? 0,
      isPublished: false,
      version: 1,
    });
    return this.pageRepo.save(page);
  }

  async updatePage(tenantId: string, siteId: string, pageId: string, data: Partial<SitePage>) {
    const page = await this.pageRepo.findOne({ where: { id: pageId, siteId, tenantId } });
    if (!page) throw new NotFoundException('Page not found');
    if (data.name !== undefined) page.name = data.name.trim();
    if (data.slug !== undefined) page.slug = this.slugify(data.slug);
    if (data.blocks !== undefined) page.blocks = sanitizeBlocks(data.blocks);
    if (data.sortOrder !== undefined) page.sortOrder = data.sortOrder;
    if (data.isPublished !== undefined) page.isPublished = data.isPublished;
    return this.pageRepo.save(page);
  }

  async deletePage(tenantId: string, siteId: string, pageId: string) {
    const page = await this.pageRepo.findOne({ where: { id: pageId, siteId, tenantId } });
    if (!page) throw new NotFoundException('Page not found');
    await this.pageRepo.remove(page);
    return { success: true };
  }

  // --- Funnels ---

  listFunnels(tenantId: string) {
    return this.funnelRepo.find({
      where: { tenantId },
      order: { updatedAt: 'DESC' },
      relations: ['steps'],
    });
  }

  async getFunnel(tenantId: string, id: string) {
    const funnel = await this.funnelRepo.findOne({
      where: { id, tenantId },
      relations: ['steps', 'steps.page'],
    });
    if (!funnel) throw new NotFoundException('Funnel not found');
    funnel.steps = (funnel.steps || []).sort((a, b) => a.stepOrder - b.stepOrder);
    return funnel;
  }

  async createFunnel(
    tenantId: string,
    data: {
      name?: string;
      slug?: string;
      settings?: Record<string, unknown>;
      steps?: FunnelStepInput[];
    },
  ) {
    const slug = this.slugify(data.slug || data.name || 'funnel');
    const funnel = await this.funnelRepo.save(
      this.funnelRepo.create({
        tenantId,
        name: data.name?.trim() || 'Untitled Funnel',
        slug,
        settings: data.settings || {},
        isPublished: false,
        version: 1,
      }),
    );
    if (Array.isArray(data.steps) && data.steps.length) {
      await this.replaceFunnelSteps(tenantId, funnel.id, data.steps);
    }
    return this.getFunnel(tenantId, funnel.id);
  }

  async updateFunnel(
    tenantId: string,
    id: string,
    data: {
      name?: string;
      slug?: string;
      settings?: Record<string, unknown>;
      steps?: FunnelStepInput[];
    },
  ) {
    const funnel = await this.getFunnel(tenantId, id);
    if (data.name !== undefined) funnel.name = data.name.trim();
    if (data.slug !== undefined) funnel.slug = this.slugify(data.slug);
    if (data.settings !== undefined) funnel.settings = data.settings;
    await this.funnelRepo.save(funnel);
    if (Array.isArray(data.steps)) {
      await this.replaceFunnelSteps(tenantId, id, data.steps);
    }
    return this.getFunnel(tenantId, id);
  }

  async deleteFunnel(tenantId: string, id: string) {
    const funnel = await this.getFunnel(tenantId, id);
    await this.funnelRepo.remove(funnel);
    return { success: true };
  }

  async publishFunnel(tenantId: string, id: string, isPublished: boolean) {
    const funnel = await this.getFunnel(tenantId, id);
    funnel.isPublished = isPublished;
    if (isPublished) {
      funnel.version += 1;
      funnel.publishedAt = new Date();
      await this.stepRepo.update({ funnelId: id, tenantId }, { isPublished: true });
      const steps = await this.stepRepo.find({ where: { funnelId: id, tenantId } });
      for (const step of steps) {
        step.version += 1;
        await this.stepRepo.save(step);
      }
    }
    return this.funnelRepo.save(funnel);
  }

  private async replaceFunnelSteps(
    tenantId: string,
    funnelId: string,
    steps: FunnelStepInput[],
  ) {
    if (steps.length > MAX_FUNNEL_STEPS) {
      throw new BadRequestException(`funnel steps exceeds max items (${MAX_FUNNEL_STEPS})`);
    }
    const existing = await this.stepRepo.find({ where: { funnelId, tenantId } });
    if (existing.length) await this.stepRepo.remove(existing);

    const normalized = steps.map((step, index) => {
      const sourceConfig = this.sanitizePlainObject(step.config);

      // Backward compatible: blocks can come in config.blocks or top-level step.blocks.
      const blocksSource = Array.isArray((step as { blocks?: unknown[] }).blocks)
        ? (step as { blocks: unknown[] }).blocks
        : sourceConfig.blocks;
      const sanitizedBlocks = Array.isArray(blocksSource) ? sanitizeBlocks(blocksSource) : [];

      return this.stepRepo.create({
        tenantId,
        funnelId,
        name: step.name?.trim() || `Step ${index + 1}`,
        stepOrder: step.stepOrder ?? index,
        pageId: step.pageId || null,
        config: { ...sourceConfig, blocks: sanitizedBlocks },
        isPublished: false,
        version: 1,
      });
    });
    if (normalized.length) await this.stepRepo.save(normalized);
  }

  async getFunnelMetrics(tenantId: string, funnelId: string) {
    await this.getFunnel(tenantId, funnelId);
    const rows = await this.analyticsRepo
      .createQueryBuilder('a')
      .select('a.step_id', 'stepId')
      .addSelect('a.event_type', 'eventType')
      .addSelect('COUNT(*)', 'count')
      .where('a.funnel_id = :funnelId', { funnelId })
      .andWhere('a.tenant_id = :tenantId', { tenantId })
      .groupBy('a.step_id')
      .addGroupBy('a.event_type')
      .getRawMany();

    const byStep: Record<string, { visits: number; conversions: number }> = {};
    for (const row of rows) {
      const key = row.stepId || 'funnel';
      if (!byStep[key]) byStep[key] = { visits: 0, conversions: 0 };
      const count = Number(row.count);
      if (row.eventType === FunnelAnalyticsEventType.VISIT) byStep[key].visits = count;
      if (row.eventType === FunnelAnalyticsEventType.CONVERSION) byStep[key].conversions = count;
    }
    return { funnelId, byStep };
  }

  // --- Public ---

  async getPublicSite(slug: string) {
    const site = await this.siteRepo.findOne({
      where: { slug, isPublished: true },
      relations: ['pages'],
    });
    if (!site) throw new NotFoundException('Published site not found');

    const pages = (site.pages || [])
      .filter((p) => p.isPublished)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        blocks: p.blocks,
        version: p.version,
      }));

    return {
      id: site.id,
      name: site.name,
      slug: site.slug,
      version: site.version,
      settings: site.settings,
      pages,
      publishedAt: site.publishedAt,
    };
  }

  async getPublicSitePage(siteSlug: string, pageSlug: string) {
    const site = await this.siteRepo.findOne({
      where: { slug: siteSlug, isPublished: true },
      relations: ['pages'],
    });
    if (!site) throw new NotFoundException('Published site not found');

    const page = (site.pages || []).find((p) => p.slug === pageSlug && p.isPublished);
    if (!page) throw new NotFoundException('Published page not found');

    return {
      site: {
        id: site.id,
        name: site.name,
        slug: site.slug,
        version: site.version,
      },
      page: {
        id: page.id,
        name: page.name,
        slug: page.slug,
        blocks: page.blocks,
        version: page.version,
      },
    };
  }

  async getPublicFunnel(slug: string) {
    const funnel = await this.funnelRepo.findOne({
      where: { slug, isPublished: true },
      relations: ['steps', 'steps.page'],
    });
    if (!funnel) throw new NotFoundException('Published funnel not found');

    const steps = (funnel.steps || [])
      .filter((s) => s.isPublished)
      .sort((a, b) => a.stepOrder - b.stepOrder)
      .map((s) => ({
        id: s.id,
        name: s.name,
        stepOrder: s.stepOrder,
        pageId: s.pageId,
        config: s.config,
        version: s.version,
        page: s.page
          ? {
              id: s.page.id,
              slug: s.page.slug,
              blocks: s.page.blocks,
            }
          : null,
      }));

    return {
      id: funnel.id,
      name: funnel.name,
      slug: funnel.slug,
      version: funnel.version,
      settings: funnel.settings,
      steps,
      publishedAt: funnel.publishedAt,
    };
  }

  async getPublicFunnelStep(slug: string, stepOrder: number) {
    const funnel = await this.funnelRepo.findOne({
      where: { slug, isPublished: true },
      relations: ['steps', 'steps.page'],
    });
    if (!funnel) throw new NotFoundException('Published funnel not found');

    const step = (funnel.steps || [])
      .filter((s) => s.isPublished)
      .sort((a, b) => a.stepOrder - b.stepOrder)
      .find((s) => s.stepOrder === stepOrder);
    if (!step) throw new NotFoundException('Published funnel step not found');

    return {
      funnel: {
        id: funnel.id,
        name: funnel.name,
        slug: funnel.slug,
        version: funnel.version,
      },
      step: {
        id: step.id,
        name: step.name,
        stepOrder: step.stepOrder,
        config: step.config,
        page: step.page
          ? {
              id: step.page.id,
              slug: step.page.slug,
              blocks: step.page.blocks,
              version: step.page.version,
            }
          : null,
      },
    };
  }

  async trackFunnelEvent(
    slug: string,
    payload: {
      stepId?: string;
      eventType?: string;
      sessionId?: string;
      metadata?: Record<string, any>;
    },
  ) {
    const funnel = await this.funnelRepo.findOne({ where: { slug, isPublished: true } });
    if (!funnel) throw new NotFoundException('Published funnel not found');

    const eventType =
      payload.eventType === FunnelAnalyticsEventType.CONVERSION
        ? FunnelAnalyticsEventType.CONVERSION
        : FunnelAnalyticsEventType.VISIT;

    let stepId: string | null = payload.stepId || null;
    if (stepId) {
      const step = await this.stepRepo.findOne({
        where: { id: stepId, funnelId: funnel.id, isPublished: true },
      });
      if (!step) throw new BadRequestException('Invalid funnel step');
    }

    const event = this.analyticsRepo.create({
      tenantId: funnel.tenantId,
      funnelId: funnel.id,
      stepId,
      eventType,
      sessionId: payload.sessionId?.slice(0, 120) || null,
      metadata: payload.metadata || {},
    });
    await this.analyticsRepo.save(event);
    return { success: true, eventId: event.id };
  }
}
