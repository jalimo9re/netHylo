import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ReputationService } from './reputation.service';
import { ReviewRequestStatus } from '@/database/entities';

const repoMock = () => ({
  findOne: jest.fn(),
  save: jest.fn(async (value) => value),
  create: jest.fn((value) => value),
  find: jest.fn(),
  update: jest.fn(),
  createQueryBuilder: jest.fn(),
});

describe('ReputationService', () => {
  it('registra una reseña pública y dispara review.received', async () => {
    const requestRepo = repoMock();
    const linkRepo = repoMock();
    const reviewRepo = repoMock();
    const crmService = { fireTrigger: jest.fn().mockResolvedValue(undefined) };
    const service = new ReputationService(
      requestRepo as any,
      linkRepo as any,
      reviewRepo as any,
      crmService as any,
    );

    const link = {
      id: 'link-1',
      tenantId: 'tenant-1',
      reviewRequestId: 'req-1',
      contactId: 'contact-1',
      token: 'abc123',
      usedAt: null,
      expiresAt: null,
    };
    linkRepo.findOne.mockResolvedValue(link);
    reviewRepo.save.mockImplementation(async (value) => ({ id: 'review-1', ...value }));

    const result = await service.submitPublicReview('abc123', {
      rating: 5,
      comment: 'Excelente servicio',
      reviewerName: 'Ana',
    });

    expect(result.success).toBe(true);
    expect(link.usedAt).toBeInstanceOf(Date);
    expect(requestRepo.update).toHaveBeenCalledWith(
      { id: 'req-1', tenantId: 'tenant-1' },
      { status: ReviewRequestStatus.COMPLETED },
    );
    expect(crmService.fireTrigger).toHaveBeenCalledWith(
      'tenant-1',
      'review.received',
      expect.objectContaining({ reviewId: 'review-1', rating: 5 }),
    );
  });

  it('rechaza enlaces ya usados', async () => {
    const linkRepo = repoMock();
    linkRepo.findOne.mockResolvedValue({
      token: 'used-token',
      usedAt: new Date(),
      expiresAt: null,
    });
    const service = new ReputationService(
      repoMock() as any,
      linkRepo as any,
      repoMock() as any,
    );

    await expect(
      service.submitPublicReview('used-token', { rating: 4 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('falla si el enlace no existe', async () => {
    const linkRepo = repoMock();
    linkRepo.findOne.mockResolvedValue(null);
    const service = new ReputationService(
      repoMock() as any,
      linkRepo as any,
      repoMock() as any,
    );

    await expect(
      service.submitPublicReview('missing', { rating: 3 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
