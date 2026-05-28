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

@Entity('lessons')
@Index(['tenantId', 'courseId', 'position'])
@Index(['courseId', 'slug'], { unique: true })
export class Lesson {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'tenant_id' })
  tenantId: string;

  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @Column({ name: 'course_id' })
  courseId: string;

  @Column({ length: 160 })
  title: string;

  @Column({ length: 180 })
  slug: string;

  @Column({ type: 'text', default: '' })
  content: string;

  @Column({ default: 1 })
  position: number;

  @Column({ name: 'is_published', default: false })
  isPublished: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
