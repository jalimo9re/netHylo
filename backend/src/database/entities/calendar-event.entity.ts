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
import { CrmDeal } from './crm-deal.entity';

@Entity('calendar_events')
@Index(['tenantId', 'startAt'])
export class CalendarEvent {
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

  @ManyToOne(() => CrmDeal, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'deal_id' })
  deal: CrmDeal | null;

  @Column({ name: 'deal_id', nullable: true })
  dealId: string | null;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'timestamp' })
  startAt: Date;

  @Column({ type: 'timestamp' })
  endAt: Date;

  @Column({ name: 'timezone', length: 80, default: 'UTC' })
  timezone: string;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
