import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { In, Repository } from 'typeorm';
import {
  Campaign,
  CampaignChannel,
  CampaignEvent,
  CampaignEventType,
  CampaignRecipient,
  CampaignRecipientStatus,
  CampaignStatus,
  Contact,
} from '@/database/entities';

const BATCH_SIZE = 50;
const CAMPAIGN_JOB = 'send-campaign-batch';

@Injectable()
export class CampaignsService {
  constructor(
    @InjectRepository(Campaign) private campaignRepo: Repository<Campaign>,
    @InjectRepository(CampaignRecipient)
    private recipientRepo: Repository<CampaignRecipient>,
    @InjectRepository(CampaignEvent) private eventRepo: Repository<CampaignEvent>,
    @InjectRepository(Contact) private contactRepo: Repository<Contact>,
    @InjectQueue('campaigns') private campaignsQueue: Queue,
  ) {}

  list(tenantId: string) {
    return this.campaignRepo.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const campaign = await this.campaignRepo.findOne({ where: { id, tenantId } });
    if (!campaign) throw new NotFoundException('Campaign not found');
    return campaign;
  }

  async create(
    tenantId: string,
    data: {
      name: string;
      channel: CampaignChannel;
      subject?: string;
      body: string;
      contactIds?: string[];
      scheduledAt?: string;
    },
  ) {
    if (!data.name?.trim()) throw new BadRequestException('Campaign name is required');
    if (!data.body?.trim()) throw new BadRequestException('Campaign body is required');
    if (data.channel === CampaignChannel.EMAIL && !data.subject?.trim()) {
      throw new BadRequestException('Email campaigns require a subject');
    }

    const contactIds = await this.resolveContactIds(tenantId, data.contactIds || []);
    const scheduledAt = data.scheduledAt ? new Date(data.scheduledAt) : null;
    const status =
      scheduledAt && scheduledAt.getTime() > Date.now()
        ? CampaignStatus.SCHEDULED
        : CampaignStatus.DRAFT;

    const campaign = await this.campaignRepo.save(
      this.campaignRepo.create({
        tenantId,
        name: data.name.trim(),
        channel: data.channel,
        subject: data.subject?.trim() || null,
        body: data.body,
        contactIds,
        scheduledAt,
        status,
      }),
    );

    if (contactIds.length) {
      await this.buildRecipients(campaign, contactIds);
    }

    if (status === CampaignStatus.SCHEDULED && scheduledAt) {
      await this.enqueueCampaign(campaign.id, scheduledAt);
    }

    return campaign;
  }

  async update(tenantId: string, id: string, data: Partial<Campaign>) {
    const campaign = await this.findOne(tenantId, id);
    if ([CampaignStatus.SENDING, CampaignStatus.COMPLETED].includes(campaign.status)) {
      throw new BadRequestException('Cannot edit a campaign that is sending or completed');
    }

    if (data.contactIds) {
      campaign.contactIds = await this.resolveContactIds(tenantId, data.contactIds);
      await this.recipientRepo.delete({ campaignId: campaign.id });
      await this.buildRecipients(campaign, campaign.contactIds);
    }

    Object.assign(campaign, {
      name: data.name ?? campaign.name,
      subject: data.subject !== undefined ? data.subject : campaign.subject,
      body: data.body ?? campaign.body,
      metadata: data.metadata ?? campaign.metadata,
    });

    return this.campaignRepo.save(campaign);
  }

  async schedule(tenantId: string, id: string, scheduledAt?: string) {
    const campaign = await this.findOne(tenantId, id);
    if (campaign.status === CampaignStatus.CANCELLED) {
      throw new BadRequestException('Cancelled campaigns cannot be scheduled');
    }
    if (campaign.status === CampaignStatus.COMPLETED) {
      throw new BadRequestException('Completed campaigns cannot be rescheduled');
    }

    const when = scheduledAt ? new Date(scheduledAt) : campaign.scheduledAt || new Date();
    if (Number.isNaN(when.getTime())) throw new BadRequestException('Invalid scheduledAt');

    if (!campaign.contactIds.length) {
      throw new BadRequestException('Campaign has no recipients');
    }

    const count = await this.recipientRepo.count({ where: { campaignId: campaign.id } });
    if (!count) {
      await this.buildRecipients(campaign, campaign.contactIds);
    }

    campaign.scheduledAt = when;
    campaign.status =
      when.getTime() > Date.now() ? CampaignStatus.SCHEDULED : CampaignStatus.SENDING;
    await this.campaignRepo.save(campaign);

    const delay = Math.max(when.getTime() - Date.now(), 0);
    await this.enqueueCampaign(campaign.id, delay > 0 ? when : undefined);

    if (delay === 0) {
      campaign.startedAt = new Date();
      await this.campaignRepo.save(campaign);
    }

    return campaign;
  }

  async cancel(tenantId: string, id: string) {
    const campaign = await this.findOne(tenantId, id);
    if (campaign.status === CampaignStatus.COMPLETED) {
      throw new BadRequestException('Completed campaigns cannot be cancelled');
    }

    const jobs = await this.campaignsQueue.getJobs(['delayed', 'waiting', 'paused']);
    for (const job of jobs) {
      if (job.data?.campaignId === id) await job.remove();
    }

    campaign.status = CampaignStatus.CANCELLED;
    campaign.completedAt = new Date();
    return this.campaignRepo.save(campaign);
  }

  async getStats(tenantId: string, id: string) {
    const campaign = await this.findOne(tenantId, id);
    const [totalRecipients, sent, failed, bounced, opened, clicked] = await Promise.all([
      this.recipientRepo.count({ where: { campaignId: id } }),
      this.recipientRepo.count({
        where: { campaignId: id, status: CampaignRecipientStatus.SENT },
      }),
      this.recipientRepo.count({
        where: { campaignId: id, status: CampaignRecipientStatus.FAILED },
      }),
      this.recipientRepo.count({
        where: { campaignId: id, status: CampaignRecipientStatus.BOUNCED },
      }),
      this.eventRepo.count({ where: { campaignId: id, eventType: CampaignEventType.OPENED } }),
      this.eventRepo.count({ where: { campaignId: id, eventType: CampaignEventType.CLICKED } }),
    ]);

    const delivered = sent;
    const openRate = delivered ? Number(((opened / delivered) * 100).toFixed(2)) : 0;
    const clickRate = delivered ? Number(((clicked / delivered) * 100).toFixed(2)) : 0;

    return {
      campaignId: campaign.id,
      name: campaign.name,
      channel: campaign.channel,
      status: campaign.status,
      scheduledAt: campaign.scheduledAt,
      startedAt: campaign.startedAt,
      completedAt: campaign.completedAt,
      totalRecipients,
      pending: Math.max(totalRecipients - sent - failed - bounced, 0),
      sent,
      failed,
      bounced,
      opened,
      clicked,
      openRate,
      clickRate,
    };
  }

  async markCampaignSending(campaignId: string) {
    await this.campaignRepo.update(
      { id: campaignId, status: In([CampaignStatus.SCHEDULED, CampaignStatus.DRAFT]) },
      { status: CampaignStatus.SENDING, startedAt: new Date() },
    );
  }

  async completeCampaignIfDone(campaignId: string) {
    const pending = await this.recipientRepo.count({
      where: { campaignId, status: CampaignRecipientStatus.PENDING },
    });
    if (pending > 0) return;

    await this.campaignRepo.update(
      { id: campaignId },
      { status: CampaignStatus.COMPLETED, completedAt: new Date() },
    );
  }

  async queueNextBatch(campaignId: string) {
    const recipients = await this.recipientRepo.find({
      where: { campaignId, status: CampaignRecipientStatus.PENDING },
      take: BATCH_SIZE,
      order: { createdAt: 'ASC' },
    });
    if (!recipients.length) {
      await this.completeCampaignIfDone(campaignId);
      return;
    }

    await this.campaignsQueue.add(
      CAMPAIGN_JOB,
      {
        campaignId,
        recipientIds: recipients.map((r) => r.id),
      },
      {
        attempts: 5,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 200,
        removeOnFail: 500,
      },
    );
  }

  private async enqueueCampaign(campaignId: string, runAt?: Date) {
    const jobs = await this.campaignsQueue.getJobs(['delayed', 'waiting']);
    for (const job of jobs) {
      if (job.data?.campaignId === campaignId && job.name === CAMPAIGN_JOB) {
        await job.remove();
      }
    }

    const opts: Record<string, any> = {
      attempts: 5,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: 200,
      removeOnFail: 500,
    };
    if (runAt && runAt.getTime() > Date.now()) {
      opts.delay = runAt.getTime() - Date.now();
    }

    await this.campaignsQueue.add(CAMPAIGN_JOB, { campaignId, bootstrap: true }, opts);
  }

  private async resolveContactIds(tenantId: string, contactIds: string[]) {
    if (!contactIds.length) return [];
    const contacts = await this.contactRepo.find({
      where: { tenantId, id: In(contactIds) },
      select: ['id'],
    });
    return contacts.map((c) => c.id);
  }

  private async buildRecipients(campaign: Campaign, contactIds: string[]) {
    if (!contactIds.length) return;
    const contacts = await this.contactRepo.find({
      where: { tenantId: campaign.tenantId, id: In(contactIds) },
    });

    const rows = contacts
      .map((contact) => {
        const toEmail = contact.email || null;
        const toPhone = contact.phone || null;
        if (campaign.channel === CampaignChannel.EMAIL && !toEmail) return null;
        if (campaign.channel === CampaignChannel.SMS && !toPhone) return null;
        return this.recipientRepo.create({
          campaignId: campaign.id,
          contactId: contact.id,
          toEmail,
          toPhone,
          status: CampaignRecipientStatus.PENDING,
        });
      })
      .filter(Boolean) as CampaignRecipient[];

    if (rows.length) await this.recipientRepo.save(rows);
  }
}
