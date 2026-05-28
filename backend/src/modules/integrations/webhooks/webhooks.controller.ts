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
  private readonly replayGuard = new Map<string, number>();
  private readonly replayTtlMs = 5 * 60 * 1000;

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
    this.logger.log(
      JSON.stringify({ event: 'webhook.verify.request', provider, queryKeys: Object.keys(query || {}) }),
    );

    const providerInstance = this.providerFactory.getProvider(provider);

    const integrations = await this.integrationRepo.find({
      where: { provider, status: IntegrationStatus.ACTIVE },
    });

    this.logger.log(
      JSON.stringify({ event: 'webhook.verify.candidates', provider, integrations: integrations.length }),
    );

    for (const integration of integrations) {
      const result = providerInstance.handleVerification(query, integration.config);
      if (result.isVerification && result.challenge) {
        this.logger.log(
          JSON.stringify({ event: 'webhook.verify.success', provider, integrationId: integration.id }),
        );
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
    const headers = this.normalizeHeaders(req.headers as Record<string, string | string[] | undefined>);
    const replayKey = this.enforceReplayProtection(provider, headers);

    const providerInstance = this.providerFactory.getProvider(provider);
    const rawBody = req.rawBody;
    const payload = req.body;

    // Find active integrations for this provider
    const integrations = await this.integrationRepo.find({
      where: { provider, status: IntegrationStatus.ACTIVE },
    });

    if (integrations.length === 0) {
      this.logger.warn(JSON.stringify({ event: 'webhook.ignored.no_integrations', provider }));
      return { status: 'ignored' };
    }

    // Verify signature against at least one integration
    let matchedIntegration: Integration | undefined;
    for (const integration of integrations) {
      const secret = integration.config.appSecret || integration.config.clientSecret || integration.config.secretToken || '';
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
      this.logger.warn(JSON.stringify({ event: 'webhook.ignored.no_match', provider }));
      return { status: 'no_match' };
    }

    const eventId = headers['x-event-id'] || headers['x-request-id'] || replayKey;
    const jobId = `${provider}:${matchedIntegration.id}:${eventId}`;
    try {
      await this.webhookQueue.add(
        'process-webhook',
        {
          provider,
          integrationId: matchedIntegration.id,
          tenantId: matchedIntegration.tenantId,
          payload,
        },
        {
          jobId,
          attempts: 5,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: 200,
          removeOnFail: 500,
        },
      );
    } catch (error: any) {
      if (String(error?.message || '').includes('Job') && String(error?.message || '').includes('exists')) {
        this.logger.warn(
          JSON.stringify({ event: 'webhook.duplicate.ignored', provider, integrationId: matchedIntegration.id }),
        );
        return { status: 'duplicate_ignored' };
      }
      throw error;
    }

    this.logger.log(
      JSON.stringify({
        event: 'webhook.queued',
        provider,
        integrationId: matchedIntegration.id,
        tenantId: matchedIntegration.tenantId,
      }),
    );
    return { status: 'queued' };
  }

  private normalizeHeaders(
    rawHeaders: Record<string, string | string[] | undefined>,
  ): Record<string, string> {
    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(rawHeaders || {})) {
      const normalized = key.toLowerCase();
      headers[normalized] = Array.isArray(value) ? value[0] || '' : value || '';
    }
    return headers;
  }

  private enforceReplayProtection(provider: IntegrationProvider, headers: Record<string, string>) {
    const signature = headers['x-hub-signature-256'] || headers['x-signature'] || headers['x-webhook-signature'];
    const timestampHeader = headers['x-webhook-timestamp'];
    const eventHeader = headers['x-event-id'] || headers['x-request-id'];
    const now = Date.now();

    if (timestampHeader) {
      const timestampMs = Number(timestampHeader) * 1000;
      if (!Number.isNaN(timestampMs) && Math.abs(now - timestampMs) > this.replayTtlMs) {
        throw new BadRequestException('Stale webhook timestamp');
      }
    }

    const replayToken = eventHeader || signature;
    if (replayToken) {
      const key = `${provider}:${replayToken}`;
      const found = this.replayGuard.get(key);
      if (found && now - found < this.replayTtlMs) {
        throw new BadRequestException('Webhook replay detected');
      }
      this.replayGuard.set(key, now);
      this.pruneReplayGuard(now);
      return key;
    }

    const fallback = `${provider}:no-token:${now}`;
    this.pruneReplayGuard(now);
    return fallback;
  }

  private pruneReplayGuard(now: number) {
    if (this.replayGuard.size <= 5000) return;
    const expiresBefore = now - 2 * this.replayTtlMs;
    for (const [key, value] of this.replayGuard.entries()) {
      if (value < expiresBefore) this.replayGuard.delete(key);
    }
  }
}
