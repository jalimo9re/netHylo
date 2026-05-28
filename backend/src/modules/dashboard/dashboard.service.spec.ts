import { DashboardService } from './dashboard.service';

const repoMock = () => ({
  count: jest.fn(),
  find: jest.fn(),
  createQueryBuilder: jest.fn(),
});

describe('DashboardService', () => {
  it('agrega métricas de rendimiento por agente', async () => {
    const conversationRepo = repoMock();
    const messageRepo = repoMock();
    const contactRepo = repoMock();
    const integrationRepo = repoMock();
    const dealRepo = repoMock();
    const taskRepo = repoMock();
    const userRepo = repoMock();

    const qb = (rows: any[]) => ({
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue(rows),
    });

    messageRepo.createQueryBuilder.mockReturnValueOnce(
      qb([{ userId: 'u1', responsesInbox: 12 }]),
    );
    dealRepo.createQueryBuilder.mockReturnValueOnce(qb([{ userId: 'u1', dealsWon: 3 }]));
    taskRepo.createQueryBuilder.mockReturnValueOnce(qb([{ userId: 'u1', overdueTasks: 1 }]));
    userRepo.find.mockResolvedValue([{ id: 'u1', firstName: 'Ana', lastName: 'Perez', email: 'ana@test.com' }]);

    const service = new DashboardService(
      conversationRepo as any,
      messageRepo as any,
      contactRepo as any,
      integrationRepo as any,
      dealRepo as any,
      taskRepo as any,
      userRepo as any,
    );

    const result = await service.getAgentPerformance('tenant-1');
    expect(result.totals).toEqual({ responsesInbox: 12, dealsWon: 3, overdueTasks: 1 });
    expect(result.agents[0]).toEqual(
      expect.objectContaining({ userId: 'u1', responsesInbox: 12, dealsWon: 3, overdueTasks: 1 }),
    );
  });
});
