import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Tenant } from './tenant.entity';
import { SitePage } from './site-page.entity';

@Entity('sites')
@Index(['tenantId', 'slug'], { unique: true })
export class Site {
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

  @Column({ type: 'jsonb', default: {} })
  settings: Record<string, any>;

  @Column({ name: 'is_published', default: false })
  isPublished: boolean;

  @Column({ default: 1 })
  version: number;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt: Date | null;

  @OneToMany(() => SitePage, (page) => page.site)
  pages: SitePage[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
