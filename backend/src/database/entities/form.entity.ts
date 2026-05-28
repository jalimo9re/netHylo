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

@Entity('forms')
@Index(['tenantId', 'slug'], { unique: true })
export class Form {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ length: 150 })
  name: string;

  @Column({ length: 160 })
  slug: string;

  @Column({ type: 'jsonb', default: [] })
  fields: Array<Record<string, any>>;

  @Column({ name: 'is_published', default: false })
  isPublished: boolean;

  @Column({ name: 'version', default: 1 })
  version: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
