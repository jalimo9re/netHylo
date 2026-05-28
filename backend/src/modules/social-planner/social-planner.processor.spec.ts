import { Job } from 'bullmq';
import { SocialPlannerProcessor } from './social-planner.processor';

describe('SocialPlannerProcessor', () => {
  it('publica en modo mock', async () => {
    const service = {
      executeScheduledPost: jest.fn(),
    };
    const config = {
      get: jest.fn().mockReturnValue('true'),
    };
    const processor = new SocialPlannerProcessor(service as any, config as any);

    await processor.process({
      name: 'publish-social-post',
      data: { postId: 'post-1' },
    } as Job);

    expect(service.executeScheduledPost).toHaveBeenCalledWith(
      'post-1',
      true,
      'Published in SOCIAL_MOCK mode',
    );
  });
});
