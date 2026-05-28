import { Body, Controller, Post, Param } from '@nestjs/common';
import { ReputationService } from './reputation.service';
import { Public } from '@/common/guards/jwt-auth.guard';

@Controller('public/reviews')
export class ReputationPublicController {
  constructor(private readonly reputationService: ReputationService) {}

  @Post(':token/submit')
  @Public()
  submitReview(@Param('token') token: string, @Body() data: any) {
    return this.reputationService.submitPublicReview(token, data);
  }
}
