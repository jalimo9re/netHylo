import { Processor, WorkerHost } from '@nestjs/bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { Queue } from 'bullmq';
import { Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { CrmTask, CrmTaskStatus, Workflow, WorkflowRun, WorkflowRunStatus } from '@/database/entities';
import { WorkflowChannelService } from './workflow-channel.service';

@Processor('automation')
export class AutomationProcessor extends WorkerHost {
  private readonly logger = new Logger(AutomationProcessor.name);

  constructor(
    @InjectRepository(CrmTask)
    private taskRepo: Repository<CrmTask>,
    @InjectRepository(Workflow)
    private workflowRepo: Repository<Workflow>,
    @InjectRepository(WorkflowRun)
    private workflowRunRepo: Repository<WorkflowRun>,
    @InjectQueue('automation') private automationQueue: Queue,
    private workflowChannelService: WorkflowChannelService,
  ) {
    super();
  }

  async process(job: Job<any>) {
    if (job.name === 'task-due-soon') {
      await this.processTaskDueSoon(job);
      return;
    }
    if (job.name !== 'execute-workflow') return;
    const { runId, steps, context } = job.data as {
      runId: string;
      steps: Array<Record<string, any>>;
      context: Record<string, any>;
    };
    const run = await this.workflowRunRepo.findOne({ where: { id: runId } });
    if (!run) return;

    try {
      run.status = WorkflowRunStatus.RUNNING;
      run.result = {
        startedAt: new Date().toISOString(),
        completedAt: null,
        stepStates: [],
        delivery: [],
      };
      await this.workflowRunRepo.save(run);

      for (let idx = 0; idx < (steps || []).length; idx += 1) {
        const step = steps[idx];
        const stepState: Record<string, any> = {
          index: idx,
          type: step?.type || 'unknown',
          status: 'running',
          startedAt: new Date().toISOString(),
        };
        (run.result.stepStates as Array<Record<string, any>>).push(stepState);
        await this.workflowRunRepo.save(run);

        if (step?.type === 'delay' && typeof step?.ms === 'number' && step.ms > 0) {
          await new Promise((resolve) => setTimeout(resolve, Math.min(step.ms, 10000)));
        } else if (step?.type === 'email' || step?.type === 'sms') {
          const delivery = await this.workflowChannelService.send(step.type, {
            ...context,
            ...step,
          });
          (run.result.delivery as Array<Record<string, any>>).push({
            stepIndex: idx,
            channel: step.type,
            ...delivery,
            at: new Date().toISOString(),
          });
          this.logger.log(`Workflow run ${run.id} executed ${step.type} step (${delivery.status})`);
        }

        stepState.status = 'completed';
        stepState.completedAt = new Date().toISOString();
        await this.workflowRunRepo.save(run);
      }

      run.status = WorkflowRunStatus.COMPLETED;
      run.error = null;
      run.result.completedAt = new Date().toISOString();
      await this.workflowRunRepo.save(run);
    } catch (error) {
      run.status = WorkflowRunStatus.FAILED;
      run.error = (error as Error).message;
      run.result = {
        ...(run.result || {}),
        completedAt: new Date().toISOString(),
      };
      await this.workflowRunRepo.save(run);
      throw error;
    }
  }

  private async processTaskDueSoon(job: Job<any>) {
    const { tenantId, taskId } = job.data as { tenantId: string; taskId: string };
    if (!tenantId || !taskId) return;
    const task = await this.taskRepo.findOne({ where: { id: taskId, tenantId } });
    if (!task) return;
    if (task.status !== CrmTaskStatus.OPEN || !task.dueAt) return;
    if (task.dueSoonTriggeredAt) return;

    const dueInMs = new Date(task.dueAt).getTime() - Date.now();
    if (dueInMs > 2 * 60 * 60 * 1000) return;

    const workflows = await this.workflowRepo.find({
      where: { tenantId, trigger: 'task.due_soon', isActive: true },
    });
    for (const workflow of workflows) {
      const run = await this.workflowRunRepo.save(
        this.workflowRunRepo.create({
          tenantId,
          workflowId: workflow.id,
          status: WorkflowRunStatus.PENDING,
          context: {
            taskId: task.id,
            dealId: task.dealId,
            assigneeUserId: task.assigneeUserId,
            dueAt: task.dueAt,
            title: task.title,
          },
          result: {
            trigger: 'task.due_soon',
            queuedAt: new Date().toISOString(),
            stepStates: [],
            delivery: [],
          },
        }),
      );

      await this.automationQueue.add(
        'execute-workflow',
        {
          tenantId,
          workflowId: workflow.id,
          runId: run.id,
          steps: workflow.steps,
          context: run.context,
        },
        {
          attempts: 5,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: 200,
          removeOnFail: 500,
        },
      );
    }
    task.dueSoonTriggeredAt = new Date();
    await this.taskRepo.save(task);
  }
}
