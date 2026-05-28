import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MembershipsService } from '../../core/services/memberships.service';

@Component({
  selector: 'app-membership-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatCardModule],
  template: `
    <div class="p-6" *ngIf="courseId">
      <h2 class="text-xl font-semibold mb-4">Curso</h2>

      <mat-card class="p-4 mb-4">
        <div class="font-medium mb-2">{{ course?.title || 'Curso' }}</div>
        <textarea
          class="border rounded px-3 py-2 bg-transparent w-full min-h-[90px] mb-2"
          [(ngModel)]="courseDescription"
          placeholder="Descripción del curso"
        ></textarea>
        <button mat-stroked-button (click)="saveCourse()">Guardar curso</button>
      </mat-card>

      <mat-card class="p-4 mb-4">
        <div class="font-medium mb-2">Lecciones</div>
        <div class="flex flex-wrap gap-2 mb-3">
          <input class="border rounded px-3 py-2 bg-transparent" [(ngModel)]="lessonTitle" placeholder="Título lección" />
          <input class="border rounded px-3 py-2 bg-transparent" [(ngModel)]="lessonSlug" placeholder="Slug" />
          <button mat-flat-button (click)="createLesson()">Crear lección</button>
        </div>

        <div class="mb-3" *ngFor="let lesson of lessons">
          <div class="text-sm font-medium">{{ lesson.title }}</div>
          <textarea
            class="border rounded px-3 py-2 bg-transparent w-full min-h-[80px] mt-1"
            [ngModel]="lessonContent[lesson.id]"
            (ngModelChange)="lessonContent[lesson.id] = $event"
            placeholder="Contenido lección"
          ></textarea>
          <div class="flex gap-2 mt-1">
            <button mat-stroked-button (click)="toggleLessonPublish(lesson)">
              {{ lesson.isPublished ? 'Ocultar' : 'Publicar' }}
            </button>
            <button mat-stroked-button (click)="saveLesson(lesson)">Guardar</button>
            <button mat-stroked-button (click)="deleteLesson(lesson.id)">Eliminar</button>
          </div>
        </div>
      </mat-card>

      <mat-card class="p-4">
        <div class="font-medium mb-2">Inscripciones</div>
        <div class="flex flex-wrap gap-2 mb-3">
          <input class="border rounded px-3 py-2 bg-transparent" [(ngModel)]="studentName" placeholder="Nombre alumno" />
          <input class="border rounded px-3 py-2 bg-transparent" [(ngModel)]="studentEmail" placeholder="Email alumno" />
          <button mat-flat-button (click)="enroll()">Inscribir</button>
        </div>
        <div class="text-sm py-1" *ngFor="let enr of enrollments">
          {{ enr.studentEmail }} · progreso {{ enr.progress || 0 }}%
        </div>
      </mat-card>
    </div>
  `,
})
export class MembershipDetailComponent implements OnInit {
  courseId = '';
  course: any;
  courseDescription = '';
  lessons: any[] = [];
  lessonContent: Record<string, string> = {};
  enrollments: any[] = [];

  lessonTitle = '';
  lessonSlug = '';
  studentName = '';
  studentEmail = '';

  constructor(
    private route: ActivatedRoute,
    private membershipsService: MembershipsService,
  ) {}

  ngOnInit(): void {
    this.courseId = this.route.snapshot.paramMap.get('id') || '';
    if (this.courseId) this.load();
  }

  load() {
    this.membershipsService.getCourse(this.courseId).subscribe((course) => {
      this.course = course;
      this.courseDescription = course.description || '';
    });
    this.membershipsService.listLessons(this.courseId).subscribe((lessons) => {
      this.lessons = lessons;
      this.lessonContent = {};
      for (const lesson of lessons) this.lessonContent[lesson.id] = lesson.content || '';
    });
    this.membershipsService
      .listEnrollments(this.courseId)
      .subscribe((enrollments) => (this.enrollments = enrollments));
  }

  saveCourse() {
    this.membershipsService
      .updateCourse(this.courseId, { description: this.courseDescription })
      .subscribe(() => this.load());
  }

  createLesson() {
    if (!this.lessonTitle.trim()) return;
    this.membershipsService
      .createLesson(this.courseId, {
        title: this.lessonTitle,
        slug: this.lessonSlug || undefined,
      })
      .subscribe(() => {
        this.lessonTitle = '';
        this.lessonSlug = '';
        this.load();
      });
  }

  saveLesson(lesson: any) {
    this.membershipsService
      .updateLesson(this.courseId, lesson.id, {
        content: this.lessonContent[lesson.id] || '',
      })
      .subscribe(() => this.load());
  }

  toggleLessonPublish(lesson: any) {
    this.membershipsService
      .updateLesson(this.courseId, lesson.id, { isPublished: !lesson.isPublished })
      .subscribe(() => this.load());
  }

  deleteLesson(lessonId: string) {
    this.membershipsService.deleteLesson(this.courseId, lessonId).subscribe(() => this.load());
  }

  enroll() {
    if (!this.studentEmail.trim()) return;
    this.membershipsService
      .enroll(this.courseId, {
        studentName: this.studentName || undefined,
        studentEmail: this.studentEmail,
      })
      .subscribe(() => {
        this.studentName = '';
        this.studentEmail = '';
        this.load();
      });
  }
}
