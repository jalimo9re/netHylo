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
import { Funnel } from './funnel.entity';
import { SitePage } from './site-page.entity';

@Entity('funnel_steps')
@Index(['funnelId', 'stepOrder'], { unique: true })
export class FunnelStep {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Funnel, (funnel) => funnel.steps, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'funnel_id' })
  funnel: Funnel;

  @Column({ name: 'funnel_id' })
  funnelId: string;

  @Column({ length: 150 })
  name: string;

  @Column({ name: 'step_order', type: 'int' })
  stepOrder: number;

  @ManyToOne(() => SitePage, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'page_id' })
  page: SitePage | null;

  @Column({ name: 'page_id', nullable: true })
  pageId: string | null;

  @Column({ type: 'jsonb', default: {} })
  config: Record<string, any>;

  @Column({ name: 'is_published', default: false })
  isPublished: boolean;

  @Column({ default: 1 })
  version: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
