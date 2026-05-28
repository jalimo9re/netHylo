import { Controller, Get, Param } from '@nestjs/common';
import { Public } from '@/common/guards/jwt-auth.guard';
import { MembershipsService } from './memberships.service';

@Controller('public/memberships')
export class MembershipsPublicController {
  constructor(private readonly membershipsService: MembershipsService) {}

  @Get(':slug')
  @Public()
  getCourseBySlug(@Param('slug') slug: string) {
    return this.membershipsService.getPublicCourseBySlug(slug);
  }
}
