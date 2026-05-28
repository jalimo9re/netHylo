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

@Entity('crm_pipelines')
@Index(['tenantId', 'name'], { unique: true })
export class CrmPipeline {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ length: 150 })
  name: string;

  @Column({ type: 'jsonb', default: ['New Lead', 'Qualified', 'Proposal', 'Won', 'Lost'] })
  stages: string[];

  @Column({ name: 'is_default', default: false })
  isDefault: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
