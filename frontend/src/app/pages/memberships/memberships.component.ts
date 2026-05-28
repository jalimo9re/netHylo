import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MembershipsService } from '../../core/services/memberships.service';

@Component({
  selector: 'app-memberships',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatButtonModule, MatCardModule],
  template: `
    <div class="p-6">
      <h2 class="text-xl font-semibold mb-4">Memberships & Courses</h2>

      <div class="flex flex-wrap gap-2 mb-4">
        <input class="border rounded px-3 py-2 bg-transparent" [(ngModel)]="title" placeholder="Título curso" />
        <input class="border rounded px-3 py-2 bg-transparent" [(ngModel)]="slug" placeholder="Slug" />
        <button mat-flat-button (click)="createCourse()">Crear curso</button>
      </div>

      <div class="grid gap-3">
        <mat-card class="p-4" *ngFor="let course of courses">
          <div class="font-medium">{{ course.title }}</div>
          <div class="text-sm opacity-70 mb-3">/{{ course.slug }} · {{ course.isPublished ? 'Publicado' : 'Borrador' }}</div>
          <div class="flex gap-2">
            <button mat-stroked-button [routerLink]="['/memberships', course.id]">Abrir</button>
            <button mat-stroked-button (click)="togglePublish(course)">
              {{ course.isPublished ? 'Despublicar' : 'Publicar' }}
            </button>
            <button mat-stroked-button (click)="removeCourse(course.id)">Eliminar</button>
          </div>
        </mat-card>
      </div>
    </div>
  `,
})
export class MembershipsComponent implements OnInit {
  courses: any[] = [];
  title = '';
  slug = '';

  constructor(private membershipsService: MembershipsService) {}

  ngOnInit(): void {
    this.load();
  }

  load() {
    this.membershipsService.listCourses().subscribe((data) => (this.courses = data));
  }

  createCourse() {
    if (!this.title.trim()) return;
    this.membershipsService
      .createCourse({
        title: this.title,
        slug: this.slug || undefined,
      })
      .subscribe(() => {
        this.title = '';
        this.slug = '';
        this.load();
      });
  }

  togglePublish(course: any) {
    this.membershipsService.updateCourse(course.id, { isPublished: !course.isPublished }).subscribe(() => this.load());
  }

  removeCourse(courseId: string) {
    this.membershipsService.deleteCourse(courseId).subscribe(() => this.load());
  }
}
