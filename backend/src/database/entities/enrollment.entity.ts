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

@Entity('enrollments')
@Index(['tenantId', 'courseId', 'studentEmail'], { unique: true })
export class Enrollment {
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

  @Column({ name: 'student_name', length: 160, nullable: true })
  studentName: string | null;

  @Column({ name: 'student_email', length: 255 })
  studentEmail: string;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  completedLessonIds: string[];

  @Column({ type: 'numeric', precision: 5, scale: 2, default: 0 })
  progress: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
