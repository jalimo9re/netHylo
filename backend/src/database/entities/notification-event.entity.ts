import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Tenant } from './tenant.entity';
import { User } from './user.entity';

export type NotificationEventStatus = 'pending' | 'delivered' | 'failed';

@Entity('notification_events')
@Index(['tenantId', 'createdAt'])
@Index(['tenantId', 'userId', 'readAt'])
export class NotificationEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Column({ name: 'user_id', nullable: true })
  userId: string | null;

  @Column({ type: 'varchar', length: 60 })
  type: string;

  @Column({ type: 'varchar', length: 180 })
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'jsonb', default: {} })
  payload: Record<string, any>;

  @Column({ name: 'is_read', default: false })
  isRead: boolean;

  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt: Date | null;

  @Column({ type: 'varchar', length: 16, default: 'pending' })
  status: NotificationEventStatus;

  @Column({ name: 'delivery_count', type: 'int', default: 0 })
  deliveryCount: number;

  @CreateDateColumn()
  createdAt: Date;
}
