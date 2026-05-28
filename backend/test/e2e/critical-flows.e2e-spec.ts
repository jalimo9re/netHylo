import { CrmService } from '@/modules/crm/crm.service';

const createRepoMock = () => ({
  create: jest.fn((value) => value),
  save: jest.fn(async (value) => value),
  findOne: jest.fn(),
  find: jest.fn(),
  remove: jest.fn(),
  update: jest.fn(),
  createQueryBuilder: jest.fn(),
});

describe('Critical E2E Flow (fallback integration)', () => {
  it('encadena form submission -> deal -> workflow run -> booking -> notification', async () => {
    const contactRepo = createRepoMock();
    const pipelineRepo = createRepoMock();
    const dealRepo = createRepoMock();
    const taskRepo = createRepoMock();
    const formRepo = createRepoMock();
    const submissionRepo = createRepoMock();
    const workflowRepo = createRepoMock();
    const workflowRunRepo = createRepoMock();
    const calendarRepo = createRepoMock();

    const automationQueue = { add: jest.fn().mockResolvedValue(undefined) };
    const mobileNotifications = { createAndDispatch: jest.fn().mockResolvedValue(undefined) };

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
      mobileNotifications as any,
    );

    const form = {
      id: 'form-1',
      tenantId: 'tenant-1',
      slug: 'lead-capture',
      isPublished: true,
      fields: [
        { key: 'email', mapTo: 'contact.email' },
        { key: 'fullName', mapTo: 'contact.name' },
        { key: 'budget', mapTo: 'deal.amount' },
      ],
    };
    const pipeline = {
      id: 'pipeline-1',
      tenantId: 'tenant-1',
      isDefault: true,
      stages: ['New Lead', 'Qualified'],
    };
    const workflow = {
      id: 'wf-1',
      tenantId: 'tenant-1',
      trigger: 'form.submitted',
      isActive: true,
      steps: [{ type: 'send_email' }],
    };
    const runState: any[] = [];
    const events = new Map<string, any>();

    formRepo.findOne.mockResolvedValue(form);
    contactRepo.findOne.mockResolvedValue(null);
    contactRepo.save.mockImplementation(async (value) => ({ id: 'contact-1', ...value }));
    pipelineRepo.findOne.mockImplementation(async ({ where }: any) => {
      if (where?.tenantId === 'tenant-1' && where?.isDefault) return pipeline;
      if (where?.tenantId === 'tenant-1' && where?.id === 'pipeline-1') return pipeline;
      return null;
    });
    dealRepo.save.mockImplementation(async (value) => ({ id: 'deal-1', ...value }));
    submissionRepo.save.mockImplementation(async (value) => ({ id: 'submission-1', ...value }));
    workflowRepo.find.mockResolvedValue([workflow]);
    workflowRunRepo.save.mockImplementation(async (value) => {
      const run = { id: `run-${runState.length + 1}`, ...value };
      runState.push(run);
      return run;
    });
    calendarRepo.save.mockImplementation(async (value) => {
      const event = value.id ? value : { id: `event-${events.size + 1}`, ...value };
      events.set(event.id, event);
      return event;
    });
    calendarRepo.findOne.mockImplementation(async ({ where }: any) => {
      if (where?.id) return events.get(where.id) || null;
      return null;
    });

    const submission = await service.submitForm(
      'lead-capture',
      {
        answers: { email: 'lead@example.com', fullName: 'Lead Demo', budget: 350 },
        metadata: { userAgent: 'jest-e2e' },
      },
      '127.0.0.1',
    );

    expect(submission.contactId).toBe('contact-1');
    expect(submission.dealId).toBe('deal-1');

    const slot = await service.createCalendarEvent('tenant-1', {
      title: 'Demo Call',
      startAt: new Date(Date.now() + 60 * 60 * 1000),
      endAt: new Date(Date.now() + 90 * 60 * 1000),
      metadata: { bookingEnabled: true, bookingSlug: 'demo-call' },
      dealId: submission.dealId,
    });

    const booking = await service.createPublicBooking(slot.id, {
      email: 'lead@example.com',
      name: 'Lead Demo',
      dealId: submission.dealId,
    });

    expect(booking.metadata.bookingStatus).toBe('booked');
    expect(booking.contactId).toBe('contact-1');
    expect(workflowRunRepo.save).toHaveBeenCalled();
    expect(automationQueue.add).toHaveBeenCalledWith(
      'execute-workflow',
      expect.objectContaining({ workflowId: 'wf-1' }),
      expect.any(Object),
    );
    expect(mobileNotifications.createAndDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        type: 'calendar.booking',
      }),
    );
  });
});
