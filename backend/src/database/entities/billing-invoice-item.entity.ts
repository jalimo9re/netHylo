import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BillingInvoice } from './billing-invoice.entity';
import { BillingPrice } from './billing-price.entity';

@Entity('billing_invoice_items')
export class BillingInvoiceItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => BillingInvoice, (invoice) => invoice.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invoice_id' })
  invoice: BillingInvoice;

  @Column({ name: 'invoice_id' })
  invoiceId: string;

  @ManyToOne(() => BillingPrice, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'price_id' })
  price: BillingPrice | null;

  @Column({ name: 'price_id', nullable: true })
  priceId: string | null;

  @Column({ length: 500 })
  description: string;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ name: 'unit_amount', type: 'decimal', precision: 12, scale: 2 })
  unitAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @CreateDateColumn()
  createdAt: Date;
}
