import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class MembershipsService {
  private baseUrl = `${environment.apiUrl}/memberships`;

  constructor(private http: HttpClient) {}

  listCourses() {
    return this.http.get<any[]>(`${this.baseUrl}/courses`);
  }

  getCourse(id: string) {
    return this.http.get<any>(`${this.baseUrl}/courses/${id}`);
  }

  createCourse(data: Record<string, unknown>) {
    return this.http.post<any>(`${this.baseUrl}/courses`, data);
  }

  updateCourse(id: string, data: Record<string, unknown>) {
    return this.http.patch<any>(`${this.baseUrl}/courses/${id}`, data);
  }

  deleteCourse(id: string) {
    return this.http.delete<{ success: boolean }>(`${this.baseUrl}/courses/${id}`);
  }

  listLessons(courseId: string) {
    return this.http.get<any[]>(`${this.baseUrl}/courses/${courseId}/lessons`);
  }

  createLesson(courseId: string, data: Record<string, unknown>) {
    return this.http.post<any>(`${this.baseUrl}/courses/${courseId}/lessons`, data);
  }

  updateLesson(courseId: string, lessonId: string, data: Record<string, unknown>) {
    return this.http.patch<any>(`${this.baseUrl}/courses/${courseId}/lessons/${lessonId}`, data);
  }

  deleteLesson(courseId: string, lessonId: string) {
    return this.http.delete<{ success: boolean }>(`${this.baseUrl}/courses/${courseId}/lessons/${lessonId}`);
  }

  listOffers() {
    return this.http.get<any[]>(`${this.baseUrl}/offers`);
  }

  createOffer(data: Record<string, unknown>) {
    return this.http.post<any>(`${this.baseUrl}/offers`, data);
  }

  updateOffer(id: string, data: Record<string, unknown>) {
    return this.http.patch<any>(`${this.baseUrl}/offers/${id}`, data);
  }

  deleteOffer(id: string) {
    return this.http.delete<{ success: boolean }>(`${this.baseUrl}/offers/${id}`);
  }

  enroll(courseId: string, payload: { studentName?: string; studentEmail: string }) {
    return this.http.post<any>(`${this.baseUrl}/courses/${courseId}/enroll`, payload);
  }

  unenroll(enrollmentId: string) {
    return this.http.delete<{ success: boolean }>(`${this.baseUrl}/enrollments/${enrollmentId}`);
  }

  updateProgress(enrollmentId: string, lessonId: string, completed: boolean) {
    return this.http.patch<any>(`${this.baseUrl}/enrollments/${enrollmentId}/progress`, { lessonId, completed });
  }

  listEnrollments(courseId?: string) {
    const query = courseId ? `?courseId=${courseId}` : '';
    return this.http.get<any[]>(`${this.baseUrl}/enrollments${query}`);
  }
}
