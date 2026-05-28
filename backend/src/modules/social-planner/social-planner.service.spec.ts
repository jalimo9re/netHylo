import { SocialPlatform, SocialPostStatus } from '@/database/entities';
import { SocialPlannerService } from './social-planner.service';

describe('SocialPlannerService', () => {
  it('crea post scheduled y lo encola', async () => {
    const savedPost: any = { id: 'p1', tenantId: 't1', status: SocialPostStatus.SCHEDULED };
    const postRepo = {
      create: jest.fn((value) => value),
      save: jest.fn().mockResolvedValue(savedPost),
      findOne: jest.fn(),
      find: jest.fn(),
      delete: jest.fn(),
    };
    const accountRepo = { find: jest.fn(), findOne: jest.fn(), create: jest.fn(), save: jest.fn(), delete: jest.fn() };
    const logRepo = {
      create: jest.fn((value) => value),
      save: jest.fn(),
      find: jest.fn(),
    };
    const queue = {
      getJobs: jest.fn().mockResolvedValue([]),
      add: jest.fn(),
    };

    const service = new SocialPlannerService(
      accountRepo as any,
      postRepo as any,
      logRepo as any,
      queue as any,
    );

    const future = new Date(Date.now() + 60_000).toISOString();
    const result = await service.createPost('t1', {
      content: 'Post test',
      channels: [SocialPlatform.META],
      status: SocialPostStatus.SCHEDULED,
      scheduledAt: future,
    });

    expect(result.status).toBe(SocialPostStatus.SCHEDULED);
    expect(queue.add).toHaveBeenCalledWith(
      'publish-social-post',
      expect.objectContaining({ postId: 'p1' }),
      expect.any(Object),
    );
  });
});
