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
import { Contact } from './contact.entity';
import { ReviewRequest } from './review-request.entity';

@Entity('review_links')
@Index(['token'], { unique: true })
@Index(['tenantId', 'reviewRequestId'])
export class ReviewLink {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => ReviewRequest, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'review_request_id' })
  reviewRequest: ReviewRequest;

  @Column({ name: 'review_request_id' })
  reviewRequestId: string;

  @ManyToOne(() => Contact, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'contact_id' })
  contact: Contact | null;

  @Column({ name: 'contact_id', nullable: true })
  contactId: string | null;

  @Column({ length: 64 })
  token: string;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @Column({ name: 'used_at', type: 'timestamptz', nullable: true })
  usedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
