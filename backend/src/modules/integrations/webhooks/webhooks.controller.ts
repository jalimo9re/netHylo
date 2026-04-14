import {
  Controller,
  Post,
  Get,
  Param,
  Req,
  Query,
  RawBodyRequest,
  HttpCode,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Request } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Public } from '@/common/guards/jwt-auth.guard';
import { Integration, IntegrationProvider, IntegrationStatus } from '@/database/entities/integration.entity';
import { ProviderFactory } from '../providers/provider.factory';

@Controller('webhooks')
@Public()
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    @InjectQueue('webhooks') private webhookQueue: Queue,
    @InjectRepository(Integration) private integrationRepo: Repository<Integration>,
    private providerFactory: ProviderFactory,
  ) {}

  @Get(':provider')
  async verifyWebhook(
    @Param('provider') provider: IntegrationProvider,
    @Query() query: Record<string, string>,
  ) {
    this.logger.log(`Webhook verification request for ${provider}: ${JSON.stringify(query)}`);

    const providerInstance = this.providerFactory.getProvider(provider);

    const integrations = await this.integrationRepo.find({
      where: { provider, status: IntegrationStatus.ACTIVE },
    });

    this.logger.log(`Found ${integrations.length} active integrations for ${provider}`);

    for (const integration of integrations) {
      const result = providerInstance.handleVerification(query, integration.config);
      if (result.isVerification && result.challenge) {
        this.logger.log(`Webhook verified for integration ${integration.id}`);
        return result.challenge;
      }
    }

    throw new BadRequestException('Webhook verification failed');
  }

  @Post(':provider')
  @HttpCode(200)
  async receiveWebhook(
    @Param('provider') provider: IntegrationProvider,
    @Req() req: RawBodyRequest<Request>,
  ) {
    const providerInstance = this.providerFactory.getProvider(provider);
    const rawBody = req.rawBody;
    const headers = req.headers as Record<string, string>;
    const payload = req.body;

    // Find active integrations for this provider
    const integrations = await this.integrationRepo.find({
      where: { provider, status: IntegrationStatus.ACTIVE },
    });

    if (integrations.length === 0) {
      this.logger.warn(`No active integrations for provider ${provider}`);
      return { status: 'ignored' };
    }

    // Verify signature against at least one integration
    let matchedIntegration: Integration | undefined;
    for (const integration of integrations) {
      const secret = integration.config.appSecret || integration.config.clientSecret || '';
      if (secret && rawBody) {
        if (providerInstance.verifySignature(rawBody, headers, secret)) {
          matchedIntegration = integration;
          break;
        }
      } else {
        // If no secret configured, match by external ID from payload
        const parsed = providerInstance.parseWebhookEvent(payload, headers);
        const externalId = providerInstance.getExternalIdFromConfig(integration.config);
        if (parsed.integrationExternalId === externalId) {
          matchedIntegration = integration;
          break;
        }
      }
    }

    if (!matchedIntegration) {
      this.logger.warn(`No matching integration found for webhook from ${provider}`);
      return { status: 'no_match' };
    }

    // Queue for async processing
    await this.webhookQueue.add('process-webhook', {
      provider,
      integrationId: matchedIntegration.id,
      tenantId: matchedIntegration.tenantId,
      payload,
    });

    this.logger.log(`Webhook queued for integration ${matchedIntegration.id}`);
    return { status: 'queued' };
  }
}
