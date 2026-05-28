import { BadRequestException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import {
  Review,
  ReviewLink,
  ReviewRequest,
  ReviewRequestStatus,
} from '@/database/entities';
import { CrmService } from '../crm/crm.service';

@Injectable()
export class ReputationService {
  constructor(
    @InjectRepository(ReviewRequest)
    private requestRepo: Repository<ReviewRequest>,
    @InjectRepository(ReviewLink)
    private linkRepo: Repository<ReviewLink>,
    @InjectRepository(Review)
    private reviewRepo: Repository<Review>,
    @Optional() private crmService?: CrmService,
  ) {}

  async createCampaign(
    tenantId: string,
    data: {
      name: string;
      contactId?: string;
      message?: string;
      channel?: string;
      expiresInDays?: number;
      metadata?: Record<string, any>;
    },
  ) {
    const request = await this.requestRepo.save(
      this.requestRepo.create({
        tenantId,
        name: data.name,
        contactId: data.contactId || null,
        message: data.message || null,
        channel: data.channel || 'link',
        status: ReviewRequestStatus.SENT,
        metadata: data.metadata || {},
      }),
    );

    const expiresAt =
      data.expiresInDays && data.expiresInDays > 0
        ? new Date(Date.now() + data.expiresInDays * 86400000)
        : null;

    const link = await this.linkRepo.save(
      this.linkRepo.create({
        tenantId,
        reviewRequestId: request.id,
        contactId: data.contactId || null,
        token: randomBytes(24).toString('hex'),
        expiresAt,
      }),
    );

    return { request, link, publicUrl: `/api/public/reviews/${link.token}/submit` };
  }

  listRequests(tenantId: string) {
    return this.requestRepo.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  listReviews(tenantId: string) {
    return this.reviewRepo.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  async respondToReview(tenantId: string, reviewId: string, response: string) {
    const review = await this.reviewRepo.findOne({ where: { id: reviewId, tenantId } });
    if (!review) throw new NotFoundException('Review not found');
    if (!response?.trim()) throw new BadRequestException('Response is required');

    review.response = response.trim();
    review.respondedAt = new Date();
    return this.reviewRepo.save(review);
  }

  async getMetrics(tenantId: string) {
    const rows = await this.reviewRepo
      .createQueryBuilder('review')
      .select('review.rating', 'rating')
      .addSelect('COUNT(*)', 'count')
      .where('review.tenant_id = :tenantId', { tenantId })
      .groupBy('review.rating')
      .getRawMany<{ rating: string; count: string }>();

    const countByStars: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalCount = 0;
    let ratingSum = 0;

    for (const row of rows) {
      const rating = Number(row.rating);
      const count = Number(row.count);
      if (rating >= 1 && rating <= 5) {
        countByStars[rating] = count;
        totalCount += count;
        ratingSum += rating * count;
      }
    }

    const avgRating = totalCount > 0 ? Math.round((ratingSum / totalCount) * 100) / 100 : 0;

    return { avgRating, totalCount, countByStars };
  }

  async submitPublicReview(
    token: string,
    data: {
      rating: number;
      comment?: string;
      reviewerName?: string;
      reviewerEmail?: string;
    },
  ) {
    const link = await this.linkRepo.findOne({ where: { token } });
    if (!link) throw new NotFoundException('Review link not found');
    if (link.usedAt) throw new BadRequestException('Review link already used');
    if (link.expiresAt && link.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Review link expired');
    }

    const rating = Number(data.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    const review = await this.reviewRepo.save(
      this.reviewRepo.create({
        tenantId: link.tenantId,
        reviewRequestId: link.reviewRequestId,
        reviewLinkId: link.id,
        contactId: link.contactId,
        rating,
        comment: data.comment?.trim() || null,
        reviewerName: data.reviewerName?.trim() || null,
        reviewerEmail: data.reviewerEmail?.trim() || null,
        source: 'link',
      }),
    );

    link.usedAt = new Date();
    await this.linkRepo.save(link);

    await this.requestRepo.update(
      { id: link.reviewRequestId, tenantId: link.tenantId },
      { status: ReviewRequestStatus.COMPLETED },
    );

    await this.fireReviewReceivedTrigger(link.tenantId, {
      reviewId: review.id,
      rating: review.rating,
      contactId: review.contactId,
      reviewRequestId: review.reviewRequestId,
    });

    return { success: true, reviewId: review.id };
  }

  private async fireReviewReceivedTrigger(tenantId: string, context: Record<string, any>) {
    if (!this.crmService?.fireTrigger) return;
    await this.crmService.fireTrigger(tenantId, 'review.received', context);
  }
}
