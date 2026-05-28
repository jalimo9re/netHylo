import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('expone readiness delegando en el servicio', async () => {
    const readinessPayload = {
      status: 'ready',
      checks: { database: 'up', queues: 'ok' },
      queues: { webhooks: { waiting: 0 }, automation: { waiting: 0 } },
      timestamp: new Date().toISOString(),
    };
    const healthService = {
      getLiveness: jest.fn(),
      getReadiness: jest.fn().mockResolvedValue(readinessPayload),
      getMetrics: jest.fn(),
    };

    const controller = new HealthController(healthService as any);
    const response = { status: jest.fn() };
    const result = await controller.readiness(response as any);

    expect(healthService.getReadiness).toHaveBeenCalledTimes(1);
    expect(response.status).not.toHaveBeenCalled();
    expect(result).toEqual(readinessPayload);
  });
});
