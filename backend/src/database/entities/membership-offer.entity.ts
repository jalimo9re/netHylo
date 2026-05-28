import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Course } from './course.entity';
import { Tenant } from './tenant.entity';

@Entity('membership_offers')
@Index(['tenantId', 'slug'], { unique: true })
export class MembershipOffer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Course, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'course_id' })
  course: Course | null;

  @Column({ name: 'course_id', nullable: true })
  courseId: string | null;

  @Column({ length: 180 })
  name: string;

  @Column({ length: 190 })
  slug: string;

  @Column({ type: 'text', default: '' })
  description: string;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 })
  price: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
