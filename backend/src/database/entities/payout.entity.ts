import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Tenant } from './tenant.entity';
import { Affiliate } from './affiliate.entity';

export enum PayoutStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
}

@Entity('affiliate_payouts')
@Index(['tenantId', 'status'])
export class Payout {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Affiliate, (affiliate) => affiliate.payouts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'affiliate_id' })
  affiliate: Affiliate;

  @Column({ name: 'affiliate_id' })
  affiliateId: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  amount: number;

  @Column({ length: 3, default: 'USD' })
  currency: string;

  @Column({ type: 'enum', enum: PayoutStatus, default: PayoutStatus.PENDING })
  status: PayoutStatus;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt: Date | null;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
