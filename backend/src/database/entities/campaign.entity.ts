import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Tenant } from './tenant.entity';
import { Contact } from './contact.entity';

export enum CampaignChannel {
  EMAIL = 'email',
  SMS = 'sms',
}

export enum CampaignStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  SENDING = 'sending',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum CampaignRecipientStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed',
  BOUNCED = 'bounced',
}

export enum CampaignEventType {
  SENT = 'sent',
  OPENED = 'opened',
  CLICKED = 'clicked',
  BOUNCED = 'bounced',
}

@Entity('campaigns')
@Index(['tenantId', 'status'])
export class Campaign {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 10 })
  channel: CampaignChannel;

  @Column({ type: 'varchar', length: 20, default: CampaignStatus.DRAFT })
  status: CampaignStatus;

  @Column({ length: 255, nullable: true })
  subject: string | null;

  @Column({ type: 'text' })
  body: string;

  @Column({ name: 'scheduled_at', type: 'timestamptz', nullable: true })
  scheduledAt: Date | null;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ name: 'contact_ids', type: 'jsonb', default: [] })
  contactIds: string[];

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @OneToMany(() => CampaignRecipient, (recipient) => recipient.campaign)
  recipients: CampaignRecipient[];

  @OneToMany(() => CampaignEvent, (event) => event.campaign)
  events: CampaignEvent[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('campaign_recipients')
@Index(['campaignId', 'status'])
export class CampaignRecipient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Campaign, (campaign) => campaign.recipients, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'campaign_id' })
  campaign: Campaign;

  @Column({ name: 'campaign_id' })
  campaignId: string;

  @ManyToOne(() => Contact, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'contact_id' })
  contact: Contact | null;

  @Column({ name: 'contact_id', nullable: true })
  contactId: string | null;

  @Column({ name: 'to_email', length: 255, nullable: true })
  toEmail: string | null;

  @Column({ name: 'to_phone', length: 50, nullable: true })
  toPhone: string | null;

  @Column({ type: 'varchar', length: 20, default: CampaignRecipientStatus.PENDING })
  status: CampaignRecipientStatus;

  @Column({ name: 'external_id', length: 255, nullable: true })
  externalId: string | null;

  @Column({ type: 'text', nullable: true })
  error: string | null;

  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
  sentAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('campaign_events')
@Index(['campaignId', 'eventType'])
export class CampaignEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Campaign, (campaign) => campaign.events, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'campaign_id' })
  campaign: Campaign;

  @Column({ name: 'campaign_id' })
  campaignId: string;

  @ManyToOne(() => CampaignRecipient, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipient_id' })
  recipient: CampaignRecipient | null;

  @Column({ name: 'recipient_id', nullable: true })
  recipientId: string | null;

  @Column({ name: 'event_type', type: 'varchar', length: 20 })
  eventType: CampaignEventType;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}
