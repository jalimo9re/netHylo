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

export enum ReviewRequestStatus {
  PENDING = 'pending',
  SENT = 'sent',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('review_requests')
@Index(['tenantId', 'createdAt'])
export class ReviewRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ length: 150 })
  name: string;

  @ManyToOne(() => Contact, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'contact_id' })
  contact: Contact | null;

  @Column({ name: 'contact_id', nullable: true })
  contactId: string | null;

  @Column({ length: 50, default: ReviewRequestStatus.PENDING })
  status: ReviewRequestStatus;

  @Column({ type: 'text', nullable: true })
  message: string | null;

  @Column({ length: 50, default: 'link' })
  channel: string;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
