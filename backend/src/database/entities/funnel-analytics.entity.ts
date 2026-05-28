import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Tenant } from './tenant.entity';
import { Funnel } from './funnel.entity';
import { FunnelStep } from './funnel-step.entity';

export enum FunnelAnalyticsEventType {
  VISIT = 'visit',
  CONVERSION = 'conversion',
}

@Entity('funnel_analytics')
@Index(['funnelId', 'stepId', 'eventType'])
@Index(['tenantId', 'createdAt'])
export class FunnelAnalytics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Funnel, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'funnel_id' })
  funnel: Funnel;

  @Column({ name: 'funnel_id' })
  funnelId: string;

  @ManyToOne(() => FunnelStep, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'step_id' })
  step: FunnelStep | null;

  @Column({ name: 'step_id', nullable: true })
  stepId: string | null;

  @Column({ name: 'event_type', length: 30 })
  eventType: FunnelAnalyticsEventType;

  @Column({ name: 'session_id', length: 120, nullable: true })
  sessionId: string | null;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}
