import { MobileNotificationsService } from './mobile-notifications.service';

const createQbMock = (rows: any[] = [], count = 0) => {
  const qb: any = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(rows),
    getCount: jest.fn().mockResolvedValue(count),
  };
  return qb;
};

describe('MobileNotificationsService', () => {
  it('crea evento y despacha push mock', async () => {
    const deviceRepo = {
      findOne: jest.fn(),
      save: jest.fn(async (value) => ({ id: value.id || 'saved', ...value })),
      create: jest.fn((value) => value),
      find: jest.fn().mockResolvedValue([{ token: 'tok-1' }, { token: 'tok-2' }]),
    };
    const eventRepo = {
      save: jest.fn(async (value) => ({ id: value.id || 'evt-1', ...value })),
      create: jest.fn((value) => value),
      find: jest.fn(),
      findOne: jest.fn(),
    };
    const service = new MobileNotificationsService(
      deviceRepo as any,
      eventRepo as any,
      {} as any,
      {} as any,
      {} as any,
      { get: jest.fn().mockReturnValue('true') } as any,
      { send: jest.fn().mockResolvedValue({ delivered: 2, failed: 0, provider: 'mock-fcm-apns' }) } as any,
    );

    const created = await service.createAndDispatch({
      tenantId: 'tenant-1',
      userId: 'user-1',
      type: 'manual.test',
      title: 'Demo',
      body: 'Push de prueba',
      payload: { foo: 'bar' },
    });

    expect(created.status).toBe('delivered');
    expect(created.deliveryCount).toBe(2);
    expect(deviceRepo.find).toHaveBeenCalled();
  });

  it('pagina tasks con cursor en formato compacto', async () => {
    const taskRows = [
      { id: 'deal-3', title: 'A', stage: 'new', amount: 100, probability: 20, updatedAt: new Date('2026-01-03T00:00:00.000Z') },
      { id: 'deal-2', title: 'B', stage: 'won', amount: 200, probability: 90, updatedAt: new Date('2026-01-02T00:00:00.000Z') },
      { id: 'deal-1', title: 'C', stage: 'lost', amount: 50, probability: 0, updatedAt: new Date('2026-01-01T00:00:00.000Z') },
    ];
    const dealQb = createQbMock(taskRows);
    const dealRepo = { createQueryBuilder: jest.fn().mockReturnValue(dealQb) };

    const service = new MobileNotificationsService(
      {} as any,
      {} as any,
      {} as any,
      dealRepo as any,
      {} as any,
      { get: jest.fn().mockReturnValue('true') } as any,
      { send: jest.fn().mockResolvedValue({ delivered: 0, failed: 0, provider: 'mock-fcm-apns' }) } as any,
    );

    const page = await service.getCompactTasksV1('tenant-1', { limit: 2 });
    expect(page.items).toHaveLength(2);
    expect(page.items[0]).toMatchObject({ id: 'deal-3', title: 'A' });
    expect(page.page.hasMore).toBe(true);
    expect(page.page.nextCursor).toBeTruthy();
  });

  it('ejecuta sync incremental por updatedAt para tasks', async () => {
    const syncRows = [
      { id: 'deal-11', title: 'Renewal', stage: 'proposal', updatedAt: new Date('2026-01-03T10:00:00.000Z') },
      { id: 'deal-10', title: 'Upsell', stage: 'new', updatedAt: new Date('2026-01-03T09:00:00.000Z') },
    ];
    const dealQb = createQbMock(syncRows);
    const dealRepo = { createQueryBuilder: jest.fn().mockReturnValue(dealQb) };

    const service = new MobileNotificationsService(
      {} as any,
      {} as any,
      {} as any,
      dealRepo as any,
      {} as any,
      { get: jest.fn().mockReturnValue('true') } as any,
      { send: jest.fn().mockResolvedValue({ delivered: 0, failed: 0, provider: 'mock-fcm-apns' }) } as any,
    );

    const response = await service.getIncrementalSyncV1('tenant-1', 'user-1', {
      since: '2026-01-02T00:00:00.000Z',
      stream: 'tasks',
      limit: 50,
    });

    expect(response.stream).toBe('tasks');
    expect(response.items).toEqual([
      { id: 'deal-11', title: 'Renewal', stage: 'proposal', updatedAt: '2026-01-03T10:00:00.000Z' },
      { id: 'deal-10', title: 'Upsell', stage: 'new', updatedAt: '2026-01-03T09:00:00.000Z' },
    ]);
    expect(response.page.hasMore).toBe(false);
    expect(dealQb.andWhere).toHaveBeenCalled();
  });
});
