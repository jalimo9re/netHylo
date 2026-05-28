import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Tenant } from './tenant.entity';

export enum SocialPlatform {
  META = 'meta',
  INSTAGRAM = 'instagram',
  TIKTOK = 'tiktok',
  LINKEDIN = 'linkedin',
  X = 'x',
}

export enum SocialPostStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  PUBLISHED = 'published',
  FAILED = 'failed',
}

@Entity('social_accounts')
@Index(['tenantId', 'platform'])
export class SocialAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ type: 'varchar', length: 50 })
  platform: SocialPlatform;

  @Column({ length: 120 })
  handle: string;

  @Column({ name: 'display_name', length: 150, nullable: true })
  displayName: string | null;

  @Column({ type: 'varchar', length: 20, default: 'connected' })
  status: string;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @Column({ name: 'last_synced_at', type: 'timestamptz', nullable: true })
  lastSyncedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('social_posts')
@Index(['tenantId', 'status'])
@Index(['tenantId', 'scheduledAt'])
export class SocialPost {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'jsonb', default: [] })
  channels: SocialPlatform[];

  @Column({ type: 'varchar', length: 20, default: SocialPostStatus.DRAFT })
  status: SocialPostStatus;

  @Column({ name: 'scheduled_at', type: 'timestamptz', nullable: true })
  scheduledAt: Date | null;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  error: string | null;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @OneToMany(() => SocialPostLog, (log) => log.post)
  logs: SocialPostLog[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('social_post_logs')
@Index(['postId', 'createdAt'])
export class SocialPostLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => SocialPost, (post) => post.logs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_id' })
  post: SocialPost;

  @Column({ name: 'post_id' })
  postId: string;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ type: 'varchar', length: 20, default: 'info' })
  level: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'jsonb', default: {} })
  payload: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}
