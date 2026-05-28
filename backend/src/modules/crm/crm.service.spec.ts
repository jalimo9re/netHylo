import { BadRequestException } from '@nestjs/common';
import { CrmService } from './crm.service';

const repoMock = () => ({
  findOne: jest.fn(),
  save: jest.fn(async (value) => value),
  create: jest.fn((value) => value),
  find: jest.fn(),
  remove: jest.fn(),
  update: jest.fn(),
  createQueryBuilder: jest.fn(),
});

describe('CrmService', () => {
  it('reserva un slot público y lo marca como booked', async () => {
    const contactRepo = repoMock();
    const pipelineRepo = repoMock();
    const dealRepo = repoMock();
    const taskRepo = repoMock();
    const formRepo = repoMock();
    const submissionRepo = repoMock();
    const workflowRepo = repoMock();
    const workflowRunRepo = repoMock();
    const calendarRepo = repoMock();
    const automationQueue = { add: jest.fn() };
    const service = new CrmService(
      contactRepo as any,
      pipelineRepo as any,
      dealRepo as any,
      taskRepo as any,
      formRepo as any,
      submissionRepo as any,
      workflowRepo as any,
      workflowRunRepo as any,
      calendarRepo as any,
      automationQueue as any,
      { createAndDispatch: jest.fn() } as any,
    );
    jest.spyOn(service, 'fireTrigger').mockResolvedValue(undefined);

    const slot = {
      id: 'evt-1',
      tenantId: 'tenant-1',
      metadata: { bookingEnabled: true, bookingStatus: 'available' },
      contactId: null,
      dealId: null,
    };
    calendarRepo.findOne.mockResolvedValue(slot);
    contactRepo.findOne.mockResolvedValue(null);
    contactRepo.save.mockImplementation(async (value) => ({ id: 'contact-1', ...value }));

    const result = await service.createPublicBooking('evt-1', { email: 'demo@example.com' });

    expect(result.metadata.bookingStatus).toBe('booked');
    expect(result.contactId).toBe('contact-1');
    expect(service.fireTrigger).toHaveBeenCalledWith('tenant-1', 'calendar.booking_created', expect.any(Object));
  });

  it('falla si el slot no está disponible', async () => {
    const service = new CrmService(
      repoMock() as any,
      repoMock() as any,
      repoMock() as any,
      repoMock() as any,
      repoMock() as any,
      repoMock() as any,
      repoMock() as any,
      repoMock() as any,
      {
        ...repoMock(),
        findOne: jest.fn().mockResolvedValue({
          id: 'evt-1',
          metadata: { bookingEnabled: true, bookingStatus: 'booked' },
        }),
      } as any,
      { add: jest.fn() } as any,
      { createAndDispatch: jest.fn() } as any,
    );

    await expect(service.createPublicBooking('evt-1', { email: 'demo@example.com' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('agenda recordatorio automático para task próxima a vencer', async () => {
    const taskRepo = repoMock();
    taskRepo.save.mockImplementation(async (value) => ({ id: 'task-1', ...value }));
    const queue = { add: jest.fn() };

    const service = new CrmService(
      repoMock() as any,
      repoMock() as any,
      repoMock() as any,
      taskRepo as any,
      repoMock() as any,
      repoMock() as any,
      repoMock() as any,
      repoMock() as any,
      repoMock() as any,
      queue as any,
      { createAndDispatch: jest.fn() } as any,
    );

    const dueAt = new Date(Date.now() + 30 * 60 * 1000);
    await service.createTask('tenant-1', { title: 'Llamar lead', dueAt });

    expect(queue.add).toHaveBeenCalledWith(
      'task-due-soon',
      expect.objectContaining({ tenantId: 'tenant-1', taskId: 'task-1' }),
      expect.objectContaining({ delay: 0 }),
    );
  });
});
