import { Processor, WorkerHost } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { SocialPlannerService } from './social-planner.service';

@Processor('social-planner')
export class SocialPlannerProcessor extends WorkerHost {
  constructor(
    private readonly socialPlannerService: SocialPlannerService,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  async process(job: Job<any>) {
    if (job.name !== 'publish-social-post') return;
    const postId = String(job.data?.postId || '');
    if (!postId) return;

    const mockMode = (this.configService.get<string>('SOCIAL_MOCK', 'true') || 'true').toLowerCase();
    const isMock = ['true', '1', 'yes', 'on'].includes(mockMode);

    if (isMock) {
      await this.socialPlannerService.executeScheduledPost(
        postId,
        true,
        'Published in SOCIAL_MOCK mode',
      );
      return;
    }

    try {
      await this.socialPlannerService.executeScheduledPost(postId, true, 'Published');
    } catch (error) {
      await this.socialPlannerService.executeScheduledPost(
        postId,
        false,
        (error as Error).message || 'Publishing failed',
      );
    }
  }
}
