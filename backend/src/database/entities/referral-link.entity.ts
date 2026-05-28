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
import { Affiliate } from './affiliate.entity';
import { ReferralConversion } from './referral-conversion.entity';

@Entity('referral_links')
@Index(['tenantId', 'affiliateId'])
@Index(['code'], { unique: true })
export class ReferralLink {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Affiliate, (affiliate) => affiliate.links, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'affiliate_id' })
  affiliate: Affiliate;

  @Column({ name: 'affiliate_id' })
  affiliateId: string;

  @Column({ length: 120 })
  code: string;

  @Column({ name: 'target_url', length: 500, nullable: true })
  targetUrl: string | null;

  @Column({ type: 'int', default: 0 })
  clicks: number;

  @Column({ type: 'int', default: 0 })
  conversions: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'last_clicked_at', type: 'timestamptz', nullable: true })
  lastClickedAt: Date | null;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @OneToMany(() => ReferralConversion, (conversion) => conversion.referralLink)
  referralConversions: ReferralConversion[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
