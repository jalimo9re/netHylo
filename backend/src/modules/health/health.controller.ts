import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { Public } from '@/common/guards/jwt-auth.guard';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @Public()
  @HttpCode(HttpStatus.OK)
  health() {
    return this.healthService.getLiveness();
  }

  @Get('readiness')
  @Public()
  async readiness(@Res({ passthrough: true }) res: Response) {
    const readiness = await this.healthService.getReadiness();
    if (readiness.status !== 'ready') {
      res.status(HttpStatus.SERVICE_UNAVAILABLE);
    }
    return readiness;
  }

  @Get('metrics')
  @Public()
  metrics() {
    return this.healthService.getMetrics();
  }
}
