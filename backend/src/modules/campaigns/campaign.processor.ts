import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { In, Repository } from 'typeorm';
import {
  Campaign,
  CampaignChannel,
  CampaignEvent,
  CampaignEventType,
  CampaignRecipient,
  CampaignRecipientStatus,
  CampaignStatus,
} from '@/database/entities';
import { AffiliatesService } from '../affiliates/affiliates.service';
import { WorkflowChannelService } from '../crm/workflow-channel.service';
import { CampaignsService } from './campaigns.service';

@Processor('campaigns')
export class CampaignProcessor extends WorkerHost {
  private readonly logger = new Logger(CampaignProcessor.name);

  constructor(
    @InjectRepository(Campaign) private campaignRepo: Repository<Campaign>,
    @InjectRepository(CampaignRecipient)
    private recipientRepo: Repository<CampaignRecipient>,
    @InjectRepository(CampaignEvent) private eventRepo: Repository<CampaignEvent>,
    private workflowChannelService: WorkflowChannelService,
    private affiliatesService: AffiliatesService,
    private campaignsService: CampaignsService,
  ) {
    super();
  }

  async process(job: Job<any>) {
    if (job.name !== 'send-campaign-batch') return;

    const { campaignId, recipientIds, bootstrap } = job.data as {
      campaignId: string;
      recipientIds?: string[];
      bootstrap?: boolean;
    };

    const campaign = await this.campaignRepo.findOne({ where: { id: campaignId } });
    if (!campaign || campaign.status === CampaignStatus.CANCELLED) return;

    if (bootstrap) {
      await this.campaignsService.markCampaignSending(campaignId);
      await this.campaignsService.queueNextBatch(campaignId);
      return;
    }

    const recipients = recipientIds?.length
      ? await this.recipientRepo.find({ where: { id: In(recipientIds) } })
      : [];

    for (const recipient of recipients) {
      if (recipient.status !== CampaignRecipientStatus.PENDING) continue;

      const channel = campaign.channel === CampaignChannel.EMAIL ? 'email' : 'sms';
      const delivery = await this.workflowChannelService.send(channel, {
        toEmail: recipient.toEmail,
        toPhone: recipient.toPhone,
        subject: campaign.subject,
        body: campaign.body,
      });

      const failed = delivery.status === 'failed';
      recipient.status = failed
        ? CampaignRecipientStatus.FAILED
        : CampaignRecipientStatus.SENT;
      recipient.externalId = delivery.externalId;
      recipient.error = delivery.error || null;
      recipient.sentAt = new Date();
      await this.recipientRepo.save(recipient);

      await this.eventRepo.save(
        this.eventRepo.create({
          campaignId: campaign.id,
          recipientId: recipient.id,
          eventType: failed ? CampaignEventType.BOUNCED : CampaignEventType.SENT,
          metadata: {
            provider: delivery.provider,
            externalId: delivery.externalId,
            deliveryStatus: delivery.status,
          },
        }),
      );

      if (!failed) {
        await this.affiliatesService.registerCampaignConversion(campaign.tenantId, {
          campaignId: campaign.id,
          contactId: recipient.contactId,
          referralCode: String((campaign.metadata as any)?.referralCode || ''),
          amount: Number((campaign.metadata as any)?.conversionAmount || 0),
          currency: String((campaign.metadata as any)?.currency || 'USD'),
          metadata: { recipientId: recipient.id, sourceEvent: CampaignEventType.SENT },
        });
      }

      this.logger.log(
        `Campaign ${campaign.id} ${channel} to ${recipient.toEmail || recipient.toPhone} (${delivery.status})`,
      );
    }

    await this.campaignsService.queueNextBatch(campaignId);
  }
}
