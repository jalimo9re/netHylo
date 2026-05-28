import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Tenant } from './tenant.entity';
import { ReferralLink } from './referral-link.entity';
import { ReferralConversion } from './referral-conversion.entity';
import { Payout } from './payout.entity';

export enum AffiliateStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Entity('affiliates')
@Index(['tenantId', 'status'])
export class Affiliate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ length: 140 })
  name: string;

  @Column({ length: 255, nullable: true })
  email: string | null;

  @Column({ type: 'enum', enum: AffiliateStatus, default: AffiliateStatus.ACTIVE })
  status: AffiliateStatus;

  @Column({ name: 'commission_rate', type: 'decimal', precision: 5, scale: 2, default: 10 })
  commissionRate: number;

  @Column({ name: 'total_clicks', type: 'int', default: 0 })
  totalClicks: number;

  @Column({ name: 'total_conversions', type: 'int', default: 0 })
  totalConversions: number;

  @Column({ name: 'pending_commission', type: 'decimal', precision: 12, scale: 2, default: 0 })
  pendingCommission: number;

  @Column({ name: 'paid_commission', type: 'decimal', precision: 12, scale: 2, default: 0 })
  paidCommission: number;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @OneToMany(() => ReferralLink, (link) => link.affiliate)
  links: ReferralLink[];

  @OneToMany(() => ReferralConversion, (conversion) => conversion.affiliate)
  conversions: ReferralConversion[];

  @OneToMany(() => Payout, (payout) => payout.affiliate)
  payouts: Payout[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
