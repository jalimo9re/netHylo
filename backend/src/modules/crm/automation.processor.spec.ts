import { Job } from 'bullmq';
import { AutomationProcessor } from './automation.processor';
import { WorkflowRunStatus } from '@/database/entities';

describe('AutomationProcessor', () => {
  it('ejecuta steps y guarda delivery en result', async () => {
    const run: any = {
      id: 'run-1',
      status: WorkflowRunStatus.PENDING,
      error: null,
      result: {},
    };
    const workflowRunRepo = {
      findOne: jest.fn().mockResolvedValue(run),
      save: jest.fn(async (value) => value),
    };
    const workflowChannelService = {
      send: jest.fn().mockResolvedValue({
        status: 'mocked',
        provider: 'mock',
        externalId: 'ext-1',
        error: null,
      }),
    };
    const processor = new AutomationProcessor(
      { findOne: jest.fn(), save: jest.fn() } as any,
      { find: jest.fn() } as any,
      workflowRunRepo as any,
      { add: jest.fn() } as any,
      workflowChannelService as any,
    );

    await processor.process({
      name: 'execute-workflow',
      data: {
        runId: 'run-1',
        context: { toEmail: 'a@b.com', toPhone: '+34123456' },
        steps: [{ type: 'delay', ms: 1 }, { type: 'email' }, { type: 'sms' }],
      },
    } as Job);

    expect(run.status).toBe(WorkflowRunStatus.COMPLETED);
    expect(run.result.stepStates).toHaveLength(3);
    expect(run.result.delivery).toHaveLength(2);
    expect(workflowChannelService.send).toHaveBeenCalledTimes(2);
  });
});
