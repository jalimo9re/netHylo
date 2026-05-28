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
import { BillingProduct } from './billing-product.entity';

export enum BillingPriceInterval {
  ONE_TIME = 'one_time',
  MONTH = 'month',
  YEAR = 'year',
}

@Entity('billing_prices')
@Index(['tenantId', 'productId'])
export class BillingPrice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => BillingProduct, (product) => product.prices, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: BillingProduct;

  @Column({ name: 'product_id' })
  productId: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ length: 3, default: 'USD' })
  currency: string;

  @Column({ type: 'enum', enum: BillingPriceInterval, default: BillingPriceInterval.ONE_TIME })
  interval: BillingPriceInterval;

  @Column({ name: 'external_price_id', length: 255, nullable: true })
  externalPriceId: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
