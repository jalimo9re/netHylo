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
import { Form } from './form.entity';
import { Contact } from './contact.entity';
import { CrmDeal } from './crm-deal.entity';

@Entity('form_submissions')
@Index(['tenantId', 'formId', 'createdAt'])
export class FormSubmission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Form, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'form_id' })
  form: Form;

  @Column({ name: 'form_id' })
  formId: string;

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

  @Column({ type: 'jsonb', default: {} })
  answers: Record<string, any>;

  @Column({ type: 'jsonb', default: {} })
  utm: Record<string, string>;

  @Column({ name: 'ip_address', nullable: true })
  ipAddress: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
