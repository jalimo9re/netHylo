import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SitesService } from './sites.service';
import { FunnelAnalyticsEventType } from '@/database/entities';

const repoMock = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  save: jest.fn(async (value) => value),
  create: jest.fn((value) => value),
  remove: jest.fn(),
  update: jest.fn(),
  createQueryBuilder: jest.fn(),
});

describe('SitesService', () => {
  const buildService = () => {
    const siteRepo = repoMock();
    const pageRepo = repoMock();
    const funnelRepo = repoMock();
    const stepRepo = repoMock();
    const analyticsRepo = repoMock();
    analyticsRepo.create = jest.fn((value) => value);
    const service = new SitesService(
      siteRepo as any,
      pageRepo as any,
      funnelRepo as any,
      stepRepo as any,
      analyticsRepo as any,
    );
    return { service, siteRepo, pageRepo, funnelRepo, stepRepo, analyticsRepo };
  };

  it('devuelve un sitio publicado con páginas publicadas', async () => {
    const { service, siteRepo } = buildService();
    siteRepo.findOne.mockResolvedValue({
      id: 'site-1',
      name: 'Landing',
      slug: 'landing',
      version: 2,
      settings: { theme: 'dark' },
      publishedAt: new Date(),
      pages: [
        { id: 'p1', name: 'Home', slug: 'home', blocks: [{ type: 'hero' }], version: 1, isPublished: true, sortOrder: 0 },
        { id: 'p2', name: 'Draft', slug: 'draft', blocks: [], version: 1, isPublished: false, sortOrder: 1 },
      ],
    });

    const result = await service.getPublicSite('landing');

    expect(result.slug).toBe('landing');
    expect(result.pages).toHaveLength(1);
    expect(result.pages[0].slug).toBe('home');
  });

  it('devuelve una página publicada por slug', async () => {
    const { service, siteRepo } = buildService();
    siteRepo.findOne.mockResolvedValue({
      id: 'site-1',
      name: 'Landing',
      slug: 'landing',
      version: 2,
      pages: [
        { id: 'p1', name: 'Home', slug: 'home', blocks: [{ type: 'hero' }], version: 2, isPublished: true },
        { id: 'p2', name: 'Draft', slug: 'draft', blocks: [], version: 1, isPublished: false },
      ],
    });

    const result = await service.getPublicSitePage('landing', 'home');

    expect(result.site.slug).toBe('landing');
    expect(result.page.slug).toBe('home');
    expect(result.page.blocks).toEqual([{ type: 'hero' }]);
  });

  it('registra visita en funnel publicado', async () => {
    const { service, funnelRepo, stepRepo, analyticsRepo } = buildService();
    funnelRepo.findOne.mockResolvedValue({
      id: 'funnel-1',
      tenantId: 'tenant-1',
      slug: 'offer',
      isPublished: true,
    });
    stepRepo.findOne.mockResolvedValue({ id: 'step-1', funnelId: 'funnel-1', isPublished: true });

    const result = await service.trackFunnelEvent('offer', {
      stepId: 'step-1',
      eventType: FunnelAnalyticsEventType.VISIT,
      sessionId: 'sess-abc',
    });

    expect(result.success).toBe(true);
    expect(analyticsRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        funnelId: 'funnel-1',
        stepId: 'step-1',
        eventType: FunnelAnalyticsEventType.VISIT,
      }),
    );
  });

  it('falla si el funnel publicado no existe', async () => {
    const { service, funnelRepo } = buildService();
    funnelRepo.findOne.mockResolvedValue(null);

    await expect(service.getPublicFunnel('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('sanitiza blocks inválidos al actualizar página', async () => {
    const { service, pageRepo } = buildService();
    pageRepo.findOne.mockResolvedValue({
      id: 'page-1',
      siteId: 'site-1',
      tenantId: 'tenant-1',
      blocks: [],
      name: 'Home',
      slug: 'home',
      sortOrder: 0,
      isPublished: false,
    });

    await service.updatePage('tenant-1', 'site-1', 'page-1', {
      blocks: [
        {
          type: 'hero',
          props: { title: 'Title', unknown: 'remove-me' },
        },
      ] as any,
    });

    expect(pageRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        blocks: [{ type: 'hero', props: { title: 'Title' } }],
      }),
    );
  });

  it('rechaza payload de blocks cuando excede el límite', async () => {
    const { service, pageRepo } = buildService();
    pageRepo.findOne.mockResolvedValue({
      id: 'page-1',
      siteId: 'site-1',
      tenantId: 'tenant-1',
      blocks: [],
      name: 'Home',
      slug: 'home',
      sortOrder: 0,
      isPublished: false,
    });
    const oversizedBlocks = Array.from({ length: 101 }).map(() => ({ type: 'text', props: { content: 'x' } }));

    await expect(
      service.updatePage('tenant-1', 'site-1', 'page-1', { blocks: oversizedBlocks as any }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
