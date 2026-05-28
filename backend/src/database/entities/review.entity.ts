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
import { ReviewRequest } from './review-request.entity';
import { ReviewLink } from './review-link.entity';

@Entity('reviews')
@Index(['tenantId', 'createdAt'])
@Index(['tenantId', 'rating'])
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => ReviewRequest, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'review_request_id' })
  reviewRequest: ReviewRequest | null;

  @Column({ name: 'review_request_id', nullable: true })
  reviewRequestId: string | null;

  @ManyToOne(() => ReviewLink, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'review_link_id' })
  reviewLink: ReviewLink | null;

  @Column({ name: 'review_link_id', nullable: true })
  reviewLinkId: string | null;

  @ManyToOne(() => Contact, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'contact_id' })
  contact: Contact | null;

  @Column({ name: 'contact_id', nullable: true })
  contactId: string | null;

  @Column({ type: 'smallint' })
  rating: number;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @Column({ name: 'reviewer_name', length: 255, nullable: true })
  reviewerName: string | null;

  @Column({ name: 'reviewer_email', length: 255, nullable: true })
  reviewerEmail: string | null;

  @Column({ type: 'text', nullable: true })
  response: string | null;

  @Column({ name: 'responded_at', type: 'timestamptz', nullable: true })
  respondedAt: Date | null;

  @Column({ length: 50, default: 'link' })
  source: string;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
