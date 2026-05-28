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
import { CrmPipeline } from './crm-pipeline.entity';

@Entity('crm_deals')
@Index(['tenantId', 'pipelineId', 'stage'])
export class CrmDeal {
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

  @ManyToOne(() => CrmPipeline, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pipeline_id' })
  pipeline: CrmPipeline;

  @Column({ name: 'pipeline_id' })
  pipelineId: string;

  @Column({ length: 255 })
  title: string;

  @Column({ length: 100 })
  stage: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  amount: number;

  @Column({ type: 'int', default: 0 })
  probability: number;

  @Column({ name: 'owner_user_id', nullable: true })
  ownerUserId: string | null;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
