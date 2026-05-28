import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import { MobileNotificationsService } from '../mobile/mobile-notifications.service';
import {
  CalendarEvent,
  Contact,
  CrmDeal,
  CrmPipeline,
  CrmTask,
  CrmTaskStatus,
  Form,
  FormSubmission,
  Workflow,
  WorkflowRun,
  WorkflowRunStatus,
} from '@/database/entities';

@Injectable()
export class CrmService {
  private static readonly TASK_DUE_SOON_LEAD_MS = 2 * 60 * 60 * 1000;

  constructor(
    @InjectRepository(Contact) private contactRepo: Repository<Contact>,
    @InjectRepository(CrmPipeline) private pipelineRepo: Repository<CrmPipeline>,
    @InjectRepository(CrmDeal) private dealRepo: Repository<CrmDeal>,
    @InjectRepository(CrmTask) private taskRepo: Repository<CrmTask>,
    @InjectRepository(Form) private formRepo: Repository<Form>,
    @InjectRepository(FormSubmission)
    private submissionRepo: Repository<FormSubmission>,
    @InjectRepository(Workflow) private workflowRepo: Repository<Workflow>,
    @InjectRepository(WorkflowRun) private workflowRunRepo: Repository<WorkflowRun>,
    @InjectRepository(CalendarEvent) private calendarRepo: Repository<CalendarEvent>,
    @InjectQueue('automation') private automationQueue: Queue,
    private mobileNotifications: MobileNotificationsService,
  ) {}

  listPipelines(tenantId: string) {
    return this.pipelineRepo.find({ where: { tenantId }, order: { createdAt: 'ASC' } });
  }

  createPipeline(tenantId: string, data: Partial<CrmPipeline>) {
    return this.pipelineRepo.save(this.pipelineRepo.create({ ...data, tenantId }));
  }

  async updatePipeline(tenantId: string, pipelineId: string, data: Partial<CrmPipeline>) {
    const pipeline = await this.pipelineRepo.findOne({ where: { id: pipelineId, tenantId } });
    if (!pipeline) throw new NotFoundException('Pipeline not found');
    if (Array.isArray(data.stages) && data.stages.length === 0) {
      data.stages = pipeline.stages;
    }
    Object.assign(pipeline, {
      name: data.name ?? pipeline.name,
      stages: Array.isArray(data.stages) ? data.stages : pipeline.stages,
      isDefault: data.isDefault ?? pipeline.isDefault,
    });
    return this.pipelineRepo.save(pipeline);
  }

  async setDefaultPipeline(tenantId: string, pipelineId: string) {
    const target = await this.pipelineRepo.findOne({ where: { id: pipelineId, tenantId } });
    if (!target) throw new NotFoundException('Pipeline not found');
    await this.pipelineRepo.update({ tenantId, isDefault: true }, { isDefault: false });
    target.isDefault = true;
    return this.pipelineRepo.save(target);
  }

  async listDeals(tenantId: string, pipelineId?: string) {
    return this.dealRepo.find({
      where: { tenantId, ...(pipelineId ? { pipelineId } : {}) },
      order: { createdAt: 'DESC' },
    });
  }

  async createDeal(tenantId: string, data: Partial<CrmDeal>) {
    const pipeline = await this.pipelineRepo.findOne({
      where: { id: data.pipelineId, tenantId },
    });
    if (!pipeline) throw new NotFoundException('Pipeline not found');

    const saved = await this.dealRepo.save(
      this.dealRepo.create({
        tenantId,
        title: data.title || 'Untitled deal',
        stage: data.stage || pipeline.stages[0] || 'New Lead',
        amount: data.amount || 0,
        probability: data.probability || 0,
        contactId: data.contactId || null,
        ownerUserId: data.ownerUserId || null,
        pipelineId: pipeline.id,
        metadata: data.metadata || {},
      }),
    );
    await this.fireTrigger(tenantId, 'deal.created', { dealId: saved.id, stage: saved.stage });
    await this.mobileNotifications.createAndDispatch({
      tenantId,
      type: 'crm.new_deal',
      title: 'Nuevo deal creado',
      body: `${saved.title} - ${saved.stage}`,
      payload: { dealId: saved.id, stage: saved.stage },
    });
    return saved;
  }

  async getDeal(tenantId: string, dealId: string) {
    const deal = await this.dealRepo.findOne({ where: { id: dealId, tenantId } });
    if (!deal) throw new NotFoundException('Deal not found');
    return deal;
  }

  async updateDeal(tenantId: string, dealId: string, data: Partial<CrmDeal>) {
    const deal = await this.dealRepo.findOne({ where: { id: dealId, tenantId } });
    if (!deal) throw new NotFoundException('Deal not found');

    const nextPipelineId = data.pipelineId ?? deal.pipelineId;
    if (nextPipelineId !== deal.pipelineId) {
      const exists = await this.pipelineRepo.findOne({ where: { id: nextPipelineId, tenantId } });
      if (!exists) throw new NotFoundException('Pipeline not found');
    }

    Object.assign(deal, {
      title: data.title ?? deal.title,
      stage: data.stage ?? deal.stage,
      amount: data.amount ?? deal.amount,
      probability: data.probability ?? deal.probability,
      contactId: data.contactId ?? deal.contactId,
      ownerUserId: data.ownerUserId ?? deal.ownerUserId,
      metadata: data.metadata ?? deal.metadata,
      pipelineId: nextPipelineId,
    });
    return this.dealRepo.save(deal);
  }

  async deleteDeal(tenantId: string, dealId: string) {
    const deal = await this.dealRepo.findOne({ where: { id: dealId, tenantId } });
    if (!deal) throw new NotFoundException('Deal not found');
    await this.dealRepo.remove(deal);
    return { success: true };
  }

  async moveDealStage(tenantId: string, dealId: string, stage: string, pipelineId?: string) {
    const deal = await this.dealRepo.findOne({ where: { id: dealId, tenantId } });
    if (!deal) throw new NotFoundException('Deal not found');
    if (pipelineId && deal.pipelineId !== pipelineId) throw new NotFoundException('Deal not found in pipeline');

    const pipeline = await this.pipelineRepo.findOne({ where: { id: deal.pipelineId, tenantId } });
    if (!pipeline) throw new NotFoundException('Pipeline not found');
    if (!pipeline.stages.includes(stage)) throw new NotFoundException('Stage not found in pipeline');

    deal.stage = stage;
    const saved = await this.dealRepo.save(deal);
    await this.fireTrigger(tenantId, 'deal.stage_changed', { dealId: saved.id, stage });
    return saved;
  }

  async advanceDealStage(tenantId: string, dealId: string, pipelineId?: string) {
    const deal = await this.getDeal(tenantId, dealId);
    if (pipelineId && deal.pipelineId !== pipelineId) throw new NotFoundException('Deal not found in pipeline');
    const pipeline = await this.pipelineRepo.findOne({ where: { id: deal.pipelineId, tenantId } });
    if (!pipeline) throw new NotFoundException('Pipeline not found');
    const idx = Math.max(0, pipeline.stages.indexOf(deal.stage));
    const next = pipeline.stages[Math.min(idx + 1, pipeline.stages.length - 1)];
    return this.moveDealStage(tenantId, dealId, next, pipelineId);
  }

  async regressDealStage(tenantId: string, dealId: string, pipelineId?: string) {
    const deal = await this.getDeal(tenantId, dealId);
    if (pipelineId && deal.pipelineId !== pipelineId) throw new NotFoundException('Deal not found in pipeline');
    const pipeline = await this.pipelineRepo.findOne({ where: { id: deal.pipelineId, tenantId } });
    if (!pipeline) throw new NotFoundException('Pipeline not found');
    const idx = pipeline.stages.indexOf(deal.stage);
    const prev = pipeline.stages[Math.max((idx < 0 ? 0 : idx) - 1, 0)];
    return this.moveDealStage(tenantId, dealId, prev, pipelineId);
  }

  async markDealAsWon(tenantId: string, dealId: string, pipelineId?: string) {
    const deal = await this.getDeal(tenantId, dealId);
    if (pipelineId && deal.pipelineId !== pipelineId) throw new NotFoundException('Deal not found in pipeline');
    const pipeline = await this.pipelineRepo.findOne({ where: { id: deal.pipelineId, tenantId } });
    if (!pipeline) throw new NotFoundException('Pipeline not found');
    const wonStage =
      pipeline.stages.find((stage) => stage.toLowerCase() === 'won') ||
      pipeline.stages[pipeline.stages.length - 1];
    if (!wonStage) throw new NotFoundException('Pipeline has no stages');
    return this.moveDealStage(tenantId, dealId, wonStage, pipelineId);
  }

  async markDealAsLost(tenantId: string, dealId: string, pipelineId?: string) {
    const deal = await this.getDeal(tenantId, dealId);
    if (pipelineId && deal.pipelineId !== pipelineId) throw new NotFoundException('Deal not found in pipeline');
    const pipeline = await this.pipelineRepo.findOne({ where: { id: deal.pipelineId, tenantId } });
    if (!pipeline) throw new NotFoundException('Pipeline not found');
    const lostStage =
      pipeline.stages.find((stage) => stage.toLowerCase() === 'lost') ||
      pipeline.stages[pipeline.stages.length - 1];
    if (!lostStage) throw new NotFoundException('Pipeline has no stages');
    return this.moveDealStage(tenantId, dealId, lostStage, pipelineId);
  }

  async reopenDeal(tenantId: string, dealId: string, pipelineId?: string) {
    const deal = await this.getDeal(tenantId, dealId);
    if (pipelineId && deal.pipelineId !== pipelineId) throw new NotFoundException('Deal not found in pipeline');
    const pipeline = await this.pipelineRepo.findOne({ where: { id: deal.pipelineId, tenantId } });
    if (!pipeline) throw new NotFoundException('Pipeline not found');
    const firstStage = pipeline.stages[0];
    if (!firstStage) throw new NotFoundException('Pipeline has no stages');
    return this.moveDealStage(tenantId, dealId, firstStage, pipelineId);
  }

  async assignDealOwner(tenantId: string, dealId: string, ownerUserId: string, pipelineId?: string) {
    const deal = await this.getDeal(tenantId, dealId);
    if (pipelineId && deal.pipelineId !== pipelineId) throw new NotFoundException('Deal not found in pipeline');
    deal.ownerUserId = ownerUserId || null;
    return this.dealRepo.save(deal);
  }

  listTasks(tenantId: string, filters?: { dealId?: string; assigneeUserId?: string; includeCompleted?: boolean }) {
    const where: Record<string, any> = {
      tenantId,
      ...(filters?.dealId ? { dealId: filters.dealId } : {}),
      ...(filters?.assigneeUserId ? { assigneeUserId: filters.assigneeUserId } : {}),
    };
    if (!filters?.includeCompleted) {
      where.status = CrmTaskStatus.OPEN;
    }

    return this.taskRepo.find({
      where,
      order: { dueAt: 'ASC', createdAt: 'DESC' },
      take: 200,
    });
  }

  async createTask(tenantId: string, data: Partial<CrmTask>) {
    if (!data.title?.trim()) {
      throw new BadRequestException('title is required');
    }
    if (data.dealId) {
      const deal = await this.dealRepo.findOne({ where: { id: data.dealId, tenantId } });
      if (!deal) throw new NotFoundException('Deal not found');
    }

    const task = await this.taskRepo.save(
      this.taskRepo.create({
        tenantId,
        dealId: data.dealId || null,
        title: data.title.trim(),
        notes: data.notes || null,
        assigneeUserId: data.assigneeUserId || null,
        dueAt: data.dueAt ? new Date(data.dueAt) : null,
        status: data.status || CrmTaskStatus.OPEN,
        metadata: data.metadata || {},
      }),
    );

    await this.scheduleTaskDueSoonReminder(task);
    return task;
  }

  async updateTask(tenantId: string, taskId: string, data: Partial<CrmTask>) {
    const task = await this.taskRepo.findOne({ where: { id: taskId, tenantId } });
    if (!task) throw new NotFoundException('Task not found');

    if (typeof data.dealId !== 'undefined' && data.dealId) {
      const deal = await this.dealRepo.findOne({ where: { id: data.dealId, tenantId } });
      if (!deal) throw new NotFoundException('Deal not found');
    }
    if (typeof data.title === 'string' && !data.title.trim()) {
      throw new BadRequestException('title cannot be empty');
    }

    Object.assign(task, {
      title: typeof data.title === 'string' ? data.title.trim() : task.title,
      notes: typeof data.notes === 'undefined' ? task.notes : data.notes || null,
      assigneeUserId: typeof data.assigneeUserId === 'undefined' ? task.assigneeUserId : data.assigneeUserId || null,
      dealId: typeof data.dealId === 'undefined' ? task.dealId : data.dealId || null,
      dueAt: typeof data.dueAt === 'undefined' ? task.dueAt : data.dueAt ? new Date(data.dueAt) : null,
      status: data.status || task.status,
      metadata: data.metadata ? { ...(task.metadata || {}), ...data.metadata } : task.metadata,
    });

    if (task.status === CrmTaskStatus.COMPLETED && !task.completedAt) {
      task.completedAt = new Date();
    }
    if (task.status !== CrmTaskStatus.COMPLETED) {
      task.completedAt = null;
    }
    if (task.status !== CrmTaskStatus.OPEN) {
      task.dueSoonTriggeredAt = null;
    }

    const saved = await this.taskRepo.save(task);
    await this.scheduleTaskDueSoonReminder(saved);
    return saved;
  }

  async completeTask(tenantId: string, taskId: string) {
    return this.updateTask(tenantId, taskId, {
      status: CrmTaskStatus.COMPLETED,
      completedAt: new Date(),
    });
  }

  listForms(tenantId: string) {
    return this.formRepo.find({ where: { tenantId }, order: { updatedAt: 'DESC' } });
  }

  createForm(tenantId: string, data: Partial<Form>) {
    return this.formRepo.save(
      this.formRepo.create({
        ...data,
        tenantId,
        version: 1,
        fields: Array.isArray(data.fields) ? data.fields : [],
      }),
    );
  }

  async updateForm(tenantId: string, formId: string, data: Partial<Form>) {
    const form = await this.formRepo.findOne({ where: { id: formId, tenantId } });
    if (!form) throw new NotFoundException('Form not found');
    const hasFieldChanges =
      Array.isArray(data.fields) && JSON.stringify(data.fields) !== JSON.stringify(form.fields);
    Object.assign(form, {
      name: data.name ?? form.name,
      slug: data.slug ?? form.slug,
      fields: Array.isArray(data.fields) ? data.fields : form.fields,
      isPublished: data.isPublished ?? form.isPublished,
      version: hasFieldChanges ? form.version + 1 : form.version,
    });
    return this.formRepo.save(form);
  }

  async publishForm(tenantId: string, formId: string, isPublished: boolean) {
    const form = await this.formRepo.findOne({ where: { id: formId, tenantId } });
    if (!form) throw new NotFoundException('Form not found');
    form.isPublished = !!isPublished;
    return this.formRepo.save(form);
  }

  async deleteForm(tenantId: string, formId: string) {
    const form = await this.formRepo.findOne({ where: { id: formId, tenantId } });
    if (!form) throw new NotFoundException('Form not found');
    await this.formRepo.remove(form);
    return { success: true };
  }

  listSubmissions(tenantId: string, formId?: string) {
    return this.submissionRepo.find({
      where: { tenantId, ...(formId ? { formId } : {}) },
      order: { createdAt: 'DESC' },
      take: 200,
    });
  }

  async listFormSubmissions(tenantId: string, formId: string) {
    const form = await this.formRepo.findOne({ where: { id: formId, tenantId } });
    if (!form) throw new NotFoundException('Form not found');
    return this.listSubmissions(tenantId, formId);
  }

  async submitForm(slug: string, payload: any, ipAddress: string | undefined) {
    const form = await this.formRepo.findOne({ where: { slug, isPublished: true } });
    if (!form) throw new NotFoundException('Published form not found');

    const answers =
      payload && typeof payload.answers === 'object' && payload.answers !== null
        ? payload.answers
        : payload || {};
    const email = this.resolveMappedValue(form, answers, 'contact.email', ['email']);
    const phone = this.resolveMappedValue(form, answers, 'contact.phone', ['phone']);
    const name = this.resolveMappedValue(form, answers, 'contact.name', ['name', 'fullName']);
    const dealTitle = this.resolveMappedValue(form, answers, 'deal.title', ['dealTitle']);
    const dealAmountRaw = this.resolveMappedValue(form, answers, 'deal.amount', ['budget', 'amount']);
    const utmFromPayload =
      payload?.utm && typeof payload.utm === 'object' ? payload.utm : this.pickUtmFromAnswers(answers);
    const submissionMetadata = {
      source: 'public_form',
      formSlug: form.slug,
      submittedAt: new Date().toISOString(),
      ipAddress: ipAddress || null,
      userAgent: payload?.metadata?.userAgent || null,
      referrer: payload?.metadata?.referrer || null,
      ...((payload?.metadata && typeof payload.metadata === 'object' ? payload.metadata : {}) as Record<
        string,
        any
      >),
    };
    const existingContact = email || phone
      ? await this.contactRepo.findOne({
          where: {
            tenantId: form.tenantId,
            ...(email ? { email } : {}),
            ...(phone ? { phone } : {}),
          },
        })
      : null;

    const contact =
      existingContact ||
      (await this.contactRepo.save(
        this.contactRepo.create({
          tenantId: form.tenantId,
          name: name || 'New lead',
          email: email || null,
          phone: phone || null,
          metadata: { source: 'form_submission', formSlug: slug },
        }),
      ));
    if (!existingContact) {
      await this.fireTrigger(form.tenantId, 'lead.created', { contactId: contact.id, source: 'form' });
    }

    const defaultPipeline = await this.pipelineRepo.findOne({
      where: { tenantId: form.tenantId, isDefault: true },
    });

    const deal = defaultPipeline
      ? await this.createDeal(form.tenantId, {
          pipelineId: defaultPipeline.id,
          title: dealTitle || `Lead ${contact.name || contact.email || contact.phone || contact.id}`,
          contactId: contact.id,
          amount: Number(dealAmountRaw || 0),
        })
      : null;

    const submission = await this.submissionRepo.save(
      this.submissionRepo.create({
        tenantId: form.tenantId,
        formId: form.id,
        contactId: contact.id,
        dealId: deal?.id || null,
        answers: {
          ...answers,
          __metadata: submissionMetadata,
        },
        utm: utmFromPayload,
        ipAddress: ipAddress || null,
      }),
    );

    await this.fireTrigger(form.tenantId, 'form.submitted', {
      formId: form.id,
      submissionId: submission.id,
      contactId: contact.id,
      dealId: deal?.id || null,
    });

    return submission;
  }

  async getDealsByStage(tenantId: string, pipelineId: string) {
    const pipeline = await this.pipelineRepo.findOne({ where: { id: pipelineId, tenantId } });
    if (!pipeline) throw new NotFoundException('Pipeline not found');
    const deals = await this.listDeals(tenantId, pipelineId);
    const byStage = Object.fromEntries(pipeline.stages.map((stage) => [stage, [] as CrmDeal[]]));
    for (const deal of deals) {
      if (!byStage[deal.stage]) byStage[deal.stage] = [];
      byStage[deal.stage].push(deal);
    }
    return byStage;
  }

  async getDealAgingBuckets(tenantId: string, pipelineId: string) {
    const deals = await this.listDeals(tenantId, pipelineId);
    const buckets = { '0-7': 0, '8-14': 0, '15-30': 0, '31+': 0 };
    for (const deal of deals) {
      const age = this.getAgeDays(deal.createdAt);
      if (age <= 7) buckets['0-7'] += 1;
      else if (age <= 14) buckets['8-14'] += 1;
      else if (age <= 30) buckets['15-30'] += 1;
      else buckets['31+'] += 1;
    }
    return buckets;
  }

  async getPipelineMetrics(tenantId: string, pipelineId: string) {
    const pipeline = await this.pipelineRepo.findOne({ where: { id: pipelineId, tenantId } });
    if (!pipeline) throw new NotFoundException('Pipeline not found');
    const deals = await this.listDeals(tenantId, pipelineId);
    const totalDeals = deals.length;

    const countsByStage = Object.fromEntries(pipeline.stages.map((stage) => [stage, 0]));
    const amountByStage = Object.fromEntries(pipeline.stages.map((stage) => [stage, 0]));
    const agingByStage = Object.fromEntries(
      pipeline.stages.map((stage) => [stage, { totalAgeDays: 0, count: 0, avgAgeDays: 0 }]),
    ) as Record<string, { totalAgeDays: number; count: number; avgAgeDays: number }>;

    for (const deal of deals) {
      if (countsByStage[deal.stage] === undefined) {
        countsByStage[deal.stage] = 0;
        amountByStage[deal.stage] = 0;
        agingByStage[deal.stage] = { totalAgeDays: 0, count: 0, avgAgeDays: 0 };
      }
      countsByStage[deal.stage] += 1;
      amountByStage[deal.stage] += Number(deal.amount || 0);
      const ageDays = this.getAgeDays(deal.createdAt);
      agingByStage[deal.stage].totalAgeDays += ageDays;
      agingByStage[deal.stage].count += 1;
    }

    for (const stage of Object.keys(agingByStage)) {
      const bucket = agingByStage[stage];
      bucket.avgAgeDays = bucket.count ? Number((bucket.totalAgeDays / bucket.count).toFixed(2)) : 0;
    }

    const conversionByStage = pipeline.stages.map((stage, index) => {
      if (index === pipeline.stages.length - 1) {
        return { stage, nextStage: null, conversionRate: 0 };
      }
      const nextStage = pipeline.stages[index + 1];
      const base = countsByStage[stage] || 0;
      const next = countsByStage[nextStage] || 0;
      return {
        stage,
        nextStage,
        conversionRate: base > 0 ? Number(((next / base) * 100).toFixed(2)) : 0,
      };
    });

    const avgAgeDays =
      totalDeals > 0
        ? Number((deals.reduce((sum, deal) => sum + this.getAgeDays(deal.createdAt), 0) / totalDeals).toFixed(2))
        : 0;

    return {
      pipelineId,
      totalDeals,
      countsByStage,
      amountByStage,
      conversionByStage,
      agingByStage,
      avgAgeDays,
    };
  }

  listWorkflows(tenantId: string) {
    return this.workflowRepo.find({ where: { tenantId }, order: { updatedAt: 'DESC' } });
  }

  createWorkflow(tenantId: string, data: Partial<Workflow>) {
    return this.workflowRepo.save(
      this.workflowRepo.create({
        tenantId,
        name: data.name || 'Workflow',
        trigger: data.trigger || 'manual',
        steps: data.steps || [],
        isActive: data.isActive ?? true,
      }),
    );
  }

  listWorkflowRuns(tenantId: string) {
    return this.workflowRunRepo.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async createCalendarEvent(tenantId: string, data: Partial<CalendarEvent>) {
    if (!data.startAt || !data.endAt) {
      throw new BadRequestException('startAt and endAt are required');
    }
    if (new Date(data.endAt).getTime() <= new Date(data.startAt).getTime()) {
      throw new BadRequestException('endAt must be greater than startAt');
    }

    const event = await this.calendarRepo.save(
      this.calendarRepo.create({
        tenantId,
        title: data.title || 'Appointment',
        startAt: data.startAt as Date,
        endAt: data.endAt as Date,
        timezone: data.timezone || 'UTC',
        contactId: data.contactId || null,
        dealId: data.dealId || null,
        metadata: {
          bookingEnabled: data.metadata?.bookingEnabled ?? false,
          bookingSlug: data.metadata?.bookingSlug || null,
          bookingStatus: data.metadata?.bookingEnabled ? 'available' : null,
          ...(data.metadata || {}),
        },
      }),
    );

    await this.fireTrigger(tenantId, 'calendar.event_created', {
      eventId: event.id,
      contactId: event.contactId,
      dealId: event.dealId,
    });
    return event;
  }

  listCalendarEvents(tenantId: string) {
    return this.calendarRepo.find({
      where: { tenantId },
      order: { startAt: 'ASC' },
      take: 200,
    });
  }

  async updateCalendarEvent(tenantId: string, eventId: string, data: Partial<CalendarEvent>) {
    const event = await this.calendarRepo.findOne({ where: { id: eventId, tenantId } });
    if (!event) throw new NotFoundException('Calendar event not found');

    if (data.startAt) event.startAt = data.startAt as Date;
    if (data.endAt) event.endAt = data.endAt as Date;
    if (event.endAt.getTime() <= event.startAt.getTime()) {
      throw new BadRequestException('endAt must be greater than startAt');
    }

    if (typeof data.title === 'string') event.title = data.title;
    if (typeof data.timezone === 'string') event.timezone = data.timezone;
    if (typeof data.contactId !== 'undefined') event.contactId = data.contactId || null;
    if (typeof data.dealId !== 'undefined') event.dealId = data.dealId || null;
    if (data.metadata) event.metadata = { ...(event.metadata || {}), ...data.metadata };

    const saved = await this.calendarRepo.save(event);
    await this.fireTrigger(tenantId, 'calendar.event_updated', { eventId: saved.id });
    return saved;
  }

  async deleteCalendarEvent(tenantId: string, eventId: string) {
    const event = await this.calendarRepo.findOne({ where: { id: eventId, tenantId } });
    if (!event) throw new NotFoundException('Calendar event not found');
    await this.calendarRepo.remove(event);
    await this.fireTrigger(tenantId, 'calendar.event_deleted', { eventId, title: event.title });
    return { success: true };
  }

  async listPublicBookingSlots(slug: string) {
    return this.calendarRepo
      .createQueryBuilder('event')
      .where("event.metadata ->> 'bookingSlug' = :slug", { slug })
      .andWhere("event.metadata ->> 'bookingStatus' = 'available'")
      .andWhere('event.startAt > now()')
      .orderBy('event.startAt', 'ASC')
      .take(100)
      .getMany();
  }

  async createPublicBooking(eventId: string, payload: Record<string, any>) {
    const event = await this.calendarRepo.findOne({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Booking slot not found');

    if (event.metadata?.bookingEnabled !== true || event.metadata?.bookingStatus !== 'available') {
      throw new BadRequestException('Booking slot is not available');
    }

    const email = payload?.email;
    const phone = payload?.phone;
    if (!email && !phone) throw new BadRequestException('email or phone is required');

    const existingContact = await this.contactRepo.findOne({
      where: {
        tenantId: event.tenantId,
        ...(email ? { email } : {}),
        ...(phone ? { phone } : {}),
      },
    });
    const contact =
      existingContact ||
      (await this.contactRepo.save(
        this.contactRepo.create({
          tenantId: event.tenantId,
          name: payload?.name || 'Booking contact',
          email: email || null,
          phone: phone || null,
          metadata: { source: 'public_booking', eventId: event.id },
        }),
      ));

    event.contactId = contact.id;
    if (payload?.dealId) {
      const deal = await this.dealRepo.findOne({ where: { id: payload.dealId, tenantId: event.tenantId } });
      event.dealId = deal?.id || null;
    }
    event.metadata = {
      ...(event.metadata || {}),
      bookingStatus: 'booked',
      bookedAt: new Date().toISOString(),
    };
    const saved = await this.calendarRepo.save(event);
    await this.fireTrigger(event.tenantId, 'calendar.booking_created', {
      eventId: saved.id,
      contactId: saved.contactId,
      dealId: saved.dealId,
    });
    await this.mobileNotifications.createAndDispatch({
      tenantId: event.tenantId,
      type: 'calendar.booking',
      title: 'Nueva reserva confirmada',
      body: `Booking para ${saved.title}`,
      payload: { eventId: saved.id, contactId: saved.contactId },
    });
    return saved;
  }

  async fireTrigger(tenantId: string, trigger: string, context: Record<string, any>) {
    const workflows = await this.workflowRepo.find({
      where: { tenantId, trigger, isActive: true },
    });

    for (const workflow of workflows) {
      const run = await this.workflowRunRepo.save(
        this.workflowRunRepo.create({
          tenantId,
          workflowId: workflow.id,
          status: WorkflowRunStatus.PENDING,
          context,
          result: {
            trigger,
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
          context,
        },
        {
          attempts: 5,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: 200,
          removeOnFail: 500,
        },
      );
    }
  }

  private async scheduleTaskDueSoonReminder(task: CrmTask) {
    if (!task.dueAt || task.status !== CrmTaskStatus.OPEN) return;
    const dueAtMs = new Date(task.dueAt).getTime();
    const runAt = dueAtMs - CrmService.TASK_DUE_SOON_LEAD_MS;
    const delay = Math.max(runAt - Date.now(), 0);
    await this.automationQueue.add(
      'task-due-soon',
      {
        tenantId: task.tenantId,
        taskId: task.id,
        dueAt: task.dueAt,
      },
      {
        delay,
        jobId: `task-due-soon:${task.id}:${dueAtMs}`,
        removeOnComplete: 200,
        removeOnFail: 500,
      },
    );
  }

  private getAgeDays(dateValue: Date | string) {
    const createdAt = new Date(dateValue);
    const diffMs = Date.now() - createdAt.getTime();
    return Math.max(Math.floor(diffMs / 86400000), 0);
  }

  private resolveMappedValue(
    form: Form,
    answers: Record<string, any>,
    mappingKey: string,
    fallbackKeys: string[],
  ): any {
    const field = Array.isArray(form.fields)
      ? form.fields.find((candidate) => candidate?.mapTo === mappingKey || candidate?.mapTo === mappingKey.toLowerCase())
      : null;
    if (field?.key && answers[field.key] !== undefined) return answers[field.key];
    for (const key of fallbackKeys) {
      if (answers[key] !== undefined && answers[key] !== null && answers[key] !== '') return answers[key];
    }
    return null;
  }

  private pickUtmFromAnswers(answers: Record<string, any>) {
    const knownUtmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
    const utm: Record<string, any> = {};
    for (const key of knownUtmKeys) {
      if (answers[key]) utm[key] = answers[key];
    }
    return utm;
  }
}
