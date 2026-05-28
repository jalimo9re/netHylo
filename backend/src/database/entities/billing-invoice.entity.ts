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
import { CrmDeal } from './crm-deal.entity';
import { BillingInvoiceItem } from './billing-invoice-item.entity';
import { BillingPayment } from './billing-payment.entity';

export enum BillingInvoiceStatus {
  DRAFT = 'draft',
  OPEN = 'open',
  PAID = 'paid',
  VOID = 'void',
}

@Entity('billing_invoices')
@Index(['tenantId', 'status'])
export class BillingInvoice {
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

  @ManyToOne(() => CrmDeal, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'deal_id' })
  deal: CrmDeal | null;

  @Column({ name: 'deal_id', nullable: true })
  dealId: string | null;

  @Column({ type: 'enum', enum: BillingInvoiceStatus, default: BillingInvoiceStatus.DRAFT })
  status: BillingInvoiceStatus;

  @Column({ length: 3, default: 'USD' })
  currency: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  tax: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total: number;

  @Column({ name: 'due_date', type: 'timestamptz', nullable: true })
  dueDate: Date | null;

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt: Date | null;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;

  @OneToMany(() => BillingInvoiceItem, (item) => item.invoice, { cascade: true })
  items: BillingInvoiceItem[];

  @OneToMany(() => BillingPayment, (payment) => payment.invoice)
  payments: BillingPayment[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
