import { BadRequestException } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { IntegrationProvider } from '@/database/entities/integration.entity';

describe('WebhooksController', () => {
  const makeController = () =>
    new WebhooksController(
      { add: jest.fn() } as any,
      { find: jest.fn() } as any,
      { getProvider: jest.fn() } as any,
    );

  it('bloquea replay para misma firma en ventana TTL', () => {
    const controller = makeController();
    const headers = { 'x-signature': 'sig-1' };

    (controller as any).enforceReplayProtection(IntegrationProvider.WHATSAPP, headers);

    expect(() =>
      (controller as any).enforceReplayProtection(IntegrationProvider.WHATSAPP, headers),
    ).toThrow(BadRequestException);
  });

  it('bloquea webhooks con timestamp stale', () => {
    const controller = makeController();
    const staleTs = Math.floor((Date.now() - 10 * 60 * 1000) / 1000).toString();
    const headers = { 'x-webhook-timestamp': staleTs };

    expect(() =>
      (controller as any).enforceReplayProtection(IntegrationProvider.TELEGRAM, headers),
    ).toThrow(BadRequestException);
  });
});
