import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { UserRole } from '@/database/entities/user.entity';
import { IntegrationTestingService } from './integration-testing.service';

@Controller('integrations/testing')
@UseGuards(RolesGuard)
@Roles(UserRole.SUPERADMIN)
export class IntegrationTestingController {
  constructor(private testingService: IntegrationTestingService) {}

  @Get('suites')
  getTestSuites() {
    return this.testingService.getTestSuites();
  }

  @Get('integrations')
  getAllIntegrations() {
    return this.testingService.getAllIntegrations();
  }

  @Post(':integrationId/run')
  runTest(
    @Param('integrationId') integrationId: string,
    @Body() body: { testKey: string; params?: Record<string, any> },
  ) {
    return this.testingService.runTest(integrationId, body.testKey, body.params);
  }
}
