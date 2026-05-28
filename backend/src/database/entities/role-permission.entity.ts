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
import { UserRole } from './user.entity';

@Entity('role_permissions')
@Index(['tenantId', 'role', 'permission'], { unique: true })
export class RolePermission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant | null;

  @Column({ name: 'tenant_id', nullable: true })
  tenantId: string | null;

  @Column({ type: 'varchar', length: 50 })
  role: UserRole;

  @Column({ length: 100 })
  permission: string;

  @Column({ default: true })
  granted: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
