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

export enum WorkflowRunStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('workflows')
@Index(['tenantId', 'name'], { unique: true })
export class Workflow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ length: 150 })
  name: string;

  @Column({ length: 100 })
  trigger: string;

  @Column({ type: 'jsonb', default: [] })
  steps: Array<Record<string, any>>;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('workflow_runs')
@Index(['tenantId', 'workflowId', 'status'])
export class WorkflowRun {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Workflow, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workflow_id' })
  workflow: Workflow;

  @Column({ name: 'workflow_id' })
  workflowId: string;

  @Column({
    type: 'enum',
    enum: WorkflowRunStatus,
    default: WorkflowRunStatus.PENDING,
  })
  status: WorkflowRunStatus;

  @Column({ type: 'jsonb', default: {} })
  context: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  error: string | null;

  @Column({ type: 'jsonb', default: {} })
  result: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
