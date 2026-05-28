import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { Between, Repository } from 'typeorm';
import {
  SocialAccount,
  SocialPlatform,
  SocialPost,
  SocialPostLog,
  SocialPostStatus,
} from '@/database/entities';

const SOCIAL_POST_JOB = 'publish-social-post';
const SUPPORTED_CHANNELS = new Set(Object.values(SocialPlatform));

@Injectable()
export class SocialPlannerService {
  constructor(
    @InjectRepository(SocialAccount) private accountRepo: Repository<SocialAccount>,
    @InjectRepository(SocialPost) private postRepo: Repository<SocialPost>,
    @InjectRepository(SocialPostLog) private logRepo: Repository<SocialPostLog>,
    @InjectQueue('social-planner') private socialQueue: Queue,
  ) {}

  listAccounts(tenantId: string) {
    return this.accountRepo.find({ where: { tenantId }, order: { createdAt: 'DESC' } });
  }

  async createAccount(tenantId: string, data: any) {
    if (!SUPPORTED_CHANNELS.has(data.platform)) {
      throw new BadRequestException('Unsupported platform');
    }
    if (!data.handle?.trim()) throw new BadRequestException('Handle is required');

    return this.accountRepo.save(
      this.accountRepo.create({
        tenantId,
        platform: data.platform,
        handle: data.handle.trim(),
        displayName: data.displayName?.trim() || null,
        status: data.status || 'connected',
        metadata: data.metadata || {},
      }),
    );
  }

  async updateAccount(tenantId: string, id: string, data: any) {
    const account = await this.accountRepo.findOne({ where: { id, tenantId } });
    if (!account) throw new NotFoundException('Social account not found');
    if (data.platform && !SUPPORTED_CHANNELS.has(data.platform)) {
      throw new BadRequestException('Unsupported platform');
    }
    Object.assign(account, {
      platform: data.platform ?? account.platform,
      handle: data.handle?.trim() ?? account.handle,
      displayName: data.displayName !== undefined ? data.displayName : account.displayName,
      status: data.status ?? account.status,
      metadata: data.metadata ?? account.metadata,
    });
    return this.accountRepo.save(account);
  }

  async deleteAccount(tenantId: string, id: string) {
    const account = await this.accountRepo.findOne({ where: { id, tenantId } });
    if (!account) throw new NotFoundException('Social account not found');
    await this.accountRepo.delete({ id, tenantId });
    return { ok: true };
  }

  listPosts(tenantId: string) {
    return this.postRepo.find({ where: { tenantId }, order: { createdAt: 'DESC' } });
  }

  async getPost(tenantId: string, id: string) {
    const post = await this.postRepo.findOne({ where: { id, tenantId } });
    if (!post) throw new NotFoundException('Social post not found');
    const logs = await this.logRepo.find({ where: { postId: post.id }, order: { createdAt: 'DESC' } });
    return { ...post, logs };
  }

  async createPost(tenantId: string, data: any) {
    const channels = this.normalizeChannels(data.channels);
    const status = this.resolveStatus(data.status, data.scheduledAt);
    const scheduledAt = data.scheduledAt ? new Date(data.scheduledAt) : null;
    if (!data.content?.trim()) throw new BadRequestException('Content is required');

    const post = await this.postRepo.save(
      this.postRepo.create({
        tenantId,
        content: data.content.trim(),
        channels,
        status,
        scheduledAt,
        metadata: data.metadata || {},
      }),
    );

    await this.log(post, 'info', `Post created with status ${status}`, {
      channels,
      scheduledAt,
    });

    if (status === SocialPostStatus.SCHEDULED) {
      await this.enqueuePost(post.id, scheduledAt);
    }

    return post;
  }

  async updatePost(tenantId: string, id: string, data: any) {
    const post = await this.postRepo.findOne({ where: { id, tenantId } });
    if (!post) throw new NotFoundException('Social post not found');
    if (data.channels) {
      post.channels = this.normalizeChannels(data.channels);
    }
    if (data.content !== undefined) {
      if (!data.content?.trim()) throw new BadRequestException('Content is required');
      post.content = data.content.trim();
    }
    if (data.status !== undefined || data.scheduledAt !== undefined) {
      post.status = this.resolveStatus(data.status ?? post.status, data.scheduledAt ?? post.scheduledAt);
    }
    if (data.scheduledAt !== undefined) {
      post.scheduledAt = data.scheduledAt ? new Date(data.scheduledAt) : null;
    }
    if (data.metadata !== undefined) {
      post.metadata = data.metadata ?? {};
    }
    const saved = await this.postRepo.save(post);
    await this.log(saved, 'info', 'Post updated', {});
    if (saved.status === SocialPostStatus.SCHEDULED) {
      await this.enqueuePost(saved.id, saved.scheduledAt);
    }
    return saved;
  }

  async deletePost(tenantId: string, id: string) {
    const post = await this.postRepo.findOne({ where: { id, tenantId } });
    if (!post) throw new NotFoundException('Social post not found');
    await this.postRepo.delete({ id, tenantId });
    return { ok: true };
  }

  async contentCalendar(tenantId: string, start: string, end: string) {
    const startAt = new Date(start);
    const endAt = new Date(end);
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      throw new BadRequestException('Invalid date range');
    }
    return this.postRepo.find({
      where: { tenantId, scheduledAt: Between(startAt, endAt) },
      order: { scheduledAt: 'ASC', createdAt: 'ASC' },
    });
  }

  async metrics(tenantId: string, start: string, end: string) {
    const startAt = new Date(start);
    const endAt = new Date(end);
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      throw new BadRequestException('Invalid date range');
    }
    const rows = await this.postRepo.find({
      where: { tenantId, createdAt: Between(startAt, endAt) },
      select: ['status'],
    });
    return {
      scheduled: rows.filter((item) => item.status === SocialPostStatus.SCHEDULED).length,
      published: rows.filter((item) => item.status === SocialPostStatus.PUBLISHED).length,
      failed: rows.filter((item) => item.status === SocialPostStatus.FAILED).length,
      total: rows.length,
    };
  }

  async executeScheduledPost(postId: string, success: boolean, detail: string) {
    const post = await this.postRepo.findOne({ where: { id: postId } });
    if (!post) return;

    if (success) {
      post.status = SocialPostStatus.PUBLISHED;
      post.publishedAt = new Date();
      post.error = null;
      await this.postRepo.save(post);
      await this.log(post, 'info', detail, { status: SocialPostStatus.PUBLISHED });
      return;
    }

    post.status = SocialPostStatus.FAILED;
    post.error = detail;
    await this.postRepo.save(post);
    await this.log(post, 'error', detail, { status: SocialPostStatus.FAILED });
  }

  private normalizeChannels(channels: unknown): SocialPlatform[] {
    if (!Array.isArray(channels) || channels.length === 0) {
      throw new BadRequestException('At least one channel is required');
    }
    const parsed = Array.from(new Set(channels.map((item) => String(item))));
    for (const channel of parsed) {
      if (!SUPPORTED_CHANNELS.has(channel as SocialPlatform)) {
        throw new BadRequestException(`Unsupported channel "${channel}"`);
      }
    }
    return parsed as SocialPlatform[];
  }

  private resolveStatus(status: string | undefined, scheduledAt: string | Date | null | undefined) {
    if (!status) {
      return scheduledAt ? SocialPostStatus.SCHEDULED : SocialPostStatus.DRAFT;
    }
    if (!Object.values(SocialPostStatus).includes(status as SocialPostStatus)) {
      throw new BadRequestException('Invalid post status');
    }
    if (status === SocialPostStatus.SCHEDULED && !scheduledAt) {
      throw new BadRequestException('scheduledAt is required for scheduled posts');
    }
    return status as SocialPostStatus;
  }

  private async enqueuePost(postId: string, runAt: Date | null) {
    const jobs = await this.socialQueue.getJobs(['delayed', 'waiting']);
    for (const job of jobs) {
      if (job.name === SOCIAL_POST_JOB && job.data?.postId === postId) {
        await job.remove();
      }
    }
    const options: Record<string, any> = {
      removeOnComplete: 200,
      removeOnFail: 500,
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    };
    if (runAt && runAt.getTime() > Date.now()) {
      options.delay = runAt.getTime() - Date.now();
    }
    await this.socialQueue.add(SOCIAL_POST_JOB, { postId }, options);
  }

  private async log(post: SocialPost, level: string, message: string, payload: Record<string, any>) {
    await this.logRepo.save(
      this.logRepo.create({
        postId: post.id,
        tenantId: post.tenantId,
        level,
        message,
        payload,
      }),
    );
  }
}
