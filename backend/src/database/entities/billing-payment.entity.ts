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
import { BillingInvoice } from './billing-invoice.entity';

export enum BillingPaymentStatus {
  PENDING = 'pending',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
}

@Entity('billing_payments')
@Index(['tenantId', 'status'])
export class BillingPayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => BillingInvoice, (invoice) => invoice.payments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invoice_id' })
  invoice: BillingInvoice;

  @Column({ name: 'invoice_id' })
  invoiceId: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ length: 3, default: 'USD' })
  currency: string;

  @Column({ type: 'enum', enum: BillingPaymentStatus, default: BillingPaymentStatus.PENDING })
  status: BillingPaymentStatus;

  @Column({ length: 50, default: 'mock_stripe' })
  provider: string;

  @Column({ name: 'external_id', length: 255, nullable: true })
  externalId: string | null;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
