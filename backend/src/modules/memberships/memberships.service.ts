import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrmService } from '@/modules/crm/crm.service';
import { Course, Enrollment, Lesson, MembershipOffer } from '@/database/entities';

@Injectable()
export class MembershipsService {
  constructor(
    @InjectRepository(Course) private courseRepo: Repository<Course>,
    @InjectRepository(Lesson) private lessonRepo: Repository<Lesson>,
    @InjectRepository(Enrollment) private enrollmentRepo: Repository<Enrollment>,
    @InjectRepository(MembershipOffer) private offerRepo: Repository<MembershipOffer>,
    private crmService: CrmService,
  ) {}

  listCourses(tenantId: string) {
    return this.courseRepo.find({ where: { tenantId }, order: { updatedAt: 'DESC' } });
  }

  async getCourse(tenantId: string, courseId: string) {
    const course = await this.courseRepo.findOne({ where: { id: courseId, tenantId } });
    if (!course) throw new NotFoundException('Course not found');
    return course;
  }

  createCourse(tenantId: string, data: Partial<Course>) {
    return this.courseRepo.save(
      this.courseRepo.create({
        tenantId,
        title: data.title || 'Untitled course',
        slug: data.slug || this.toSlug(data.title || `course-${Date.now()}`),
        description: data.description || '',
        isPublished: data.isPublished ?? false,
        metadata: data.metadata || {},
      }),
    );
  }

  async updateCourse(tenantId: string, courseId: string, data: Partial<Course>) {
    const course = await this.getCourse(tenantId, courseId);
    Object.assign(course, {
      title: data.title ?? course.title,
      slug: data.slug ?? course.slug,
      description: data.description ?? course.description,
      isPublished: data.isPublished ?? course.isPublished,
      metadata: data.metadata ?? course.metadata,
    });
    return this.courseRepo.save(course);
  }

  async deleteCourse(tenantId: string, courseId: string) {
    const course = await this.getCourse(tenantId, courseId);
    await this.courseRepo.remove(course);
    return { success: true };
  }

  async listLessons(tenantId: string, courseId: string) {
    await this.getCourse(tenantId, courseId);
    return this.lessonRepo.find({
      where: { tenantId, courseId },
      order: { position: 'ASC', createdAt: 'ASC' },
    });
  }

  async createLesson(tenantId: string, courseId: string, data: Partial<Lesson>) {
    await this.getCourse(tenantId, courseId);
    const lessons = await this.listLessons(tenantId, courseId);
    const defaultPosition = lessons.length + 1;
    return this.lessonRepo.save(
      this.lessonRepo.create({
        tenantId,
        courseId,
        title: data.title || 'Untitled lesson',
        slug: data.slug || this.toSlug(data.title || `lesson-${Date.now()}`),
        content: data.content || '',
        position: data.position || defaultPosition,
        isPublished: data.isPublished ?? false,
      }),
    );
  }

  async updateLesson(tenantId: string, courseId: string, lessonId: string, data: Partial<Lesson>) {
    await this.getCourse(tenantId, courseId);
    const lesson = await this.lessonRepo.findOne({ where: { id: lessonId, tenantId, courseId } });
    if (!lesson) throw new NotFoundException('Lesson not found');
    Object.assign(lesson, {
      title: data.title ?? lesson.title,
      slug: data.slug ?? lesson.slug,
      content: data.content ?? lesson.content,
      position: data.position ?? lesson.position,
      isPublished: data.isPublished ?? lesson.isPublished,
    });
    return this.lessonRepo.save(lesson);
  }

  async deleteLesson(tenantId: string, courseId: string, lessonId: string) {
    await this.getCourse(tenantId, courseId);
    const lesson = await this.lessonRepo.findOne({ where: { id: lessonId, tenantId, courseId } });
    if (!lesson) throw new NotFoundException('Lesson not found');
    await this.lessonRepo.remove(lesson);
    return { success: true };
  }

  listOffers(tenantId: string) {
    return this.offerRepo.find({ where: { tenantId }, order: { updatedAt: 'DESC' } });
  }

  async createOffer(tenantId: string, data: Partial<MembershipOffer>) {
    if (data.courseId) await this.getCourse(tenantId, data.courseId);
    return this.offerRepo.save(
      this.offerRepo.create({
        tenantId,
        courseId: data.courseId || null,
        name: data.name || 'Untitled offer',
        slug: data.slug || this.toSlug(data.name || `offer-${Date.now()}`),
        description: data.description || '',
        price: Number(data.price || 0),
        isActive: data.isActive ?? true,
      }),
    );
  }

  async updateOffer(tenantId: string, offerId: string, data: Partial<MembershipOffer>) {
    const offer = await this.offerRepo.findOne({ where: { id: offerId, tenantId } });
    if (!offer) throw new NotFoundException('Membership offer not found');
    if (data.courseId) await this.getCourse(tenantId, data.courseId);
    Object.assign(offer, {
      courseId: data.courseId ?? offer.courseId,
      name: data.name ?? offer.name,
      slug: data.slug ?? offer.slug,
      description: data.description ?? offer.description,
      price: data.price ?? offer.price,
      isActive: data.isActive ?? offer.isActive,
    });
    return this.offerRepo.save(offer);
  }

  async deleteOffer(tenantId: string, offerId: string) {
    const offer = await this.offerRepo.findOne({ where: { id: offerId, tenantId } });
    if (!offer) throw new NotFoundException('Membership offer not found');
    await this.offerRepo.remove(offer);
    return { success: true };
  }

  async listEnrollments(tenantId: string, courseId?: string) {
    return this.enrollmentRepo.find({
      where: { tenantId, ...(courseId ? { courseId } : {}) },
      order: { updatedAt: 'DESC' },
    });
  }

  async enroll(tenantId: string, courseId: string, payload: Record<string, any>) {
    const course = await this.getCourse(tenantId, courseId);
    const studentEmail = String(payload.studentEmail || '').trim().toLowerCase();
    if (!studentEmail) throw new NotFoundException('studentEmail is required');

    const existing = await this.enrollmentRepo.findOne({ where: { tenantId, courseId, studentEmail } });
    if (existing) return existing;

    const enrollment = await this.enrollmentRepo.save(
      this.enrollmentRepo.create({
        tenantId,
        courseId,
        studentName: payload.studentName || null,
        studentEmail,
        completedLessonIds: [],
        progress: 0,
      }),
    );

    await this.crmService.fireTrigger(tenantId, 'membership.enrolled', {
      courseId: course.id,
      courseTitle: course.title,
      enrollmentId: enrollment.id,
      studentEmail: enrollment.studentEmail,
      studentName: enrollment.studentName,
    });

    return enrollment;
  }

  async unenroll(tenantId: string, enrollmentId: string) {
    const enrollment = await this.enrollmentRepo.findOne({ where: { id: enrollmentId, tenantId } });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    await this.enrollmentRepo.remove(enrollment);
    return { success: true };
  }

  async markLessonCompleted(tenantId: string, enrollmentId: string, lessonId: string, completed: boolean) {
    const enrollment = await this.enrollmentRepo.findOne({ where: { id: enrollmentId, tenantId } });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    const lesson = await this.lessonRepo.findOne({ where: { id: lessonId, tenantId, courseId: enrollment.courseId } });
    if (!lesson) throw new NotFoundException('Lesson not found');

    const completedIds = new Set(enrollment.completedLessonIds || []);
    if (completed) completedIds.add(lessonId);
    else completedIds.delete(lessonId);
    enrollment.completedLessonIds = Array.from(completedIds);

    const totalLessons = await this.lessonRepo.count({ where: { tenantId, courseId: enrollment.courseId } });
    const percentage = totalLessons > 0 ? (enrollment.completedLessonIds.length / totalLessons) * 100 : 0;
    enrollment.progress = Number(percentage.toFixed(2));
    return this.enrollmentRepo.save(enrollment);
  }

  async getPublicCourseBySlug(slug: string) {
    const course = await this.courseRepo.findOne({ where: { slug, isPublished: true } });
    if (!course) throw new NotFoundException('Published course not found');
    const lessons = await this.lessonRepo.find({
      where: { courseId: course.id, isPublished: true },
      order: { position: 'ASC', createdAt: 'ASC' },
    });
    return { ...course, lessons };
  }

  private toSlug(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }
}
