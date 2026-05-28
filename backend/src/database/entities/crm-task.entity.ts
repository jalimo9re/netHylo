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
import { CrmDeal } from './crm-deal.entity';

export enum CrmTaskStatus {
  OPEN = 'open',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('crm_tasks')
@Index(['tenantId', 'dealId', 'status'])
@Index(['tenantId', 'assigneeUserId', 'dueAt'])
export class CrmTask {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => CrmDeal, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'deal_id' })
  deal: CrmDeal | null;

  @Column({ name: 'deal_id', nullable: true })
  dealId: string | null;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'assignee_user_id', nullable: true })
  assigneeUserId: string | null;

  @Column({ name: 'due_at', type: 'timestamptz', nullable: true })
  dueAt: Date | null;

  @Column({
    type: 'enum',
    enum: CrmTaskStatus,
    default: CrmTaskStatus.OPEN,
  })
  status: CrmTaskStatus;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ name: 'due_soon_triggered_at', type: 'timestamptz', nullable: true })
  dueSoonTriggeredAt: Date | null;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
