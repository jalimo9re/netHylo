import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Tenant } from './tenant.entity';
import { Contact } from './contact.entity';
import { BillingPrice } from './billing-price.entity';

export enum BillingSubscriptionStatus {
  ACTIVE = 'active',
  CANCELED = 'canceled',
  PAST_DUE = 'past_due',
  TRIALING = 'trialing',
}

@Entity('billing_subscriptions')
@Index(['tenantId', 'status'])
export class BillingSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Contact, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'contact_id' })
  contact: Contact | null;

  @Column({ name: 'contact_id', nullable: true })
  contactId: string | null;

  @ManyToOne(() => BillingPrice, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'price_id' })
  price: BillingPrice;

  @Column({ name: 'price_id' })
  priceId: string;

  @Column({ type: 'enum', enum: BillingSubscriptionStatus, default: BillingSubscriptionStatus.ACTIVE })
  status: BillingSubscriptionStatus;

  @Column({ name: 'current_period_start', type: 'timestamptz' })
  currentPeriodStart: Date;

  @Column({ name: 'current_period_end', type: 'timestamptz' })
  currentPeriodEnd: Date;

  @Column({ name: 'cancel_at_period_end', default: false })
  cancelAtPeriodEnd: boolean;

  @Column({ name: 'external_subscription_id', length: 255, nullable: true })
  externalSubscriptionId: string | null;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
