import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Tenant } from './tenant.entity';
import { Affiliate } from './affiliate.entity';
import { ReferralLink } from './referral-link.entity';

export enum ReferralConversionSource {
  MANUAL = 'manual',
  BILLING = 'billing',
  CAMPAIGN = 'campaign',
}

export enum ReferralConversionStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  PAID = 'paid',
  REJECTED = 'rejected',
}

@Entity('referral_conversions')
@Index(['tenantId', 'status'])
@Index(['tenantId', 'source'])
@Index(['invoiceId'], { unique: true, where: '"invoice_id" IS NOT NULL' })
export class ReferralConversion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Affiliate, (affiliate) => affiliate.conversions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'affiliate_id' })
  affiliate: Affiliate;

  @Column({ name: 'affiliate_id' })
  affiliateId: string;

  @ManyToOne(() => ReferralLink, (referralLink) => referralLink.referralConversions, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'referral_link_id' })
  referralLink: ReferralLink | null;

  @Column({ name: 'referral_link_id', nullable: true })
  referralLinkId: string | null;

  @Column({ name: 'contact_id', nullable: true })
  contactId: string | null;

  @Column({ name: 'campaign_id', nullable: true })
  campaignId: string | null;

  @Column({ name: 'invoice_id', nullable: true })
  invoiceId: string | null;

  @Column({ type: 'enum', enum: ReferralConversionSource, default: ReferralConversionSource.MANUAL })
  source: ReferralConversionSource;

  @Column({ type: 'enum', enum: ReferralConversionStatus, default: ReferralConversionStatus.PENDING })
  status: ReferralConversionStatus;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  amount: number;

  @Column({ name: 'commission_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  commissionAmount: number;

  @Column({ length: 3, default: 'USD' })
  currency: string;

  @Column({ name: 'occurred_at', type: 'timestamptz', nullable: true })
  occurredAt: Date | null;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}
