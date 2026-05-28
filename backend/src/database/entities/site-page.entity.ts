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
import { Site } from './site.entity';

@Entity('site_pages')
@Index(['siteId', 'slug'], { unique: true })
export class SitePage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Site, (site) => site.pages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'site_id' })
  site: Site;

  @Column({ name: 'site_id' })
  siteId: string;

  @Column({ length: 150 })
  name: string;

  @Column({ length: 160 })
  slug: string;

  @Column({ type: 'jsonb', default: [] })
  blocks: Array<Record<string, any>>;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @Column({ name: 'is_published', default: false })
  isPublished: boolean;

  @Column({ default: 1 })
  version: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
