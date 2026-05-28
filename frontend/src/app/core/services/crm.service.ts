import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CrmService {
  private baseUrl = `${environment.apiUrl}/crm`;

  constructor(private http: HttpClient) {}

  listPipelines() {
    return this.http.get<any[]>(`${this.baseUrl}/pipelines`);
  }

  createPipeline(data: any) {
    return this.http.post<any>(`${this.baseUrl}/pipelines`, data);
  }

  updatePipeline(id: string, data: any) {
    return this.http.patch<any>(`${this.baseUrl}/pipelines/${id}`, data);
  }

  setDefaultPipeline(id: string) {
    return this.http.patch<any>(`${this.baseUrl}/pipelines/${id}/default`, {});
  }

  getPipelineMetrics(id: string) {
    return this.http.get<any>(`${this.baseUrl}/pipelines/${id}/metrics`);
  }

  listDeals(pipelineId?: string) {
    const query = pipelineId ? `?pipelineId=${pipelineId}` : '';
    return this.http.get<any[]>(`${this.baseUrl}/deals${query}`);
  }

  createDeal(data: any) {
    return this.http.post<any>(`${this.baseUrl}/deals`, data);
  }

  updateDeal(id: string, data: any) {
    return this.http.patch<any>(`${this.baseUrl}/deals/${id}`, data);
  }

  deleteDeal(id: string) {
    return this.http.delete<{ success: boolean }>(`${this.baseUrl}/deals/${id}`);
  }

  moveDealStage(id: string, stage: string) {
    return this.http.patch<any>(`${this.baseUrl}/deals/${id}/stage`, { stage });
  }

  listTasks(filters?: { dealId?: string; assigneeUserId?: string; includeCompleted?: boolean }) {
    const params = new URLSearchParams();
    if (filters?.dealId) params.set('dealId', filters.dealId);
    if (filters?.assigneeUserId) params.set('assigneeUserId', filters.assigneeUserId);
    if (filters?.includeCompleted) params.set('includeCompleted', 'true');
    const query = params.toString();
    return this.http.get<any[]>(`${this.baseUrl}/tasks${query ? `?${query}` : ''}`);
  }

  createTask(data: any) {
    return this.http.post<any>(`${this.baseUrl}/tasks`, data);
  }

  updateTask(id: string, data: any) {
    return this.http.patch<any>(`${this.baseUrl}/tasks/${id}`, data);
  }

  completeTask(id: string) {
    return this.http.post<any>(`${this.baseUrl}/tasks/${id}/complete`, {});
  }

  listForms() {
    return this.http.get<any[]>(`${this.baseUrl}/forms`);
  }

  createForm(data: any) {
    return this.http.post<any>(`${this.baseUrl}/forms`, data);
  }

  updateForm(id: string, data: any) {
    return this.http.patch<any>(`${this.baseUrl}/forms/${id}`, data);
  }

  publishForm(id: string, isPublished: boolean) {
    return this.http.patch<any>(`${this.baseUrl}/forms/${id}/publish`, { isPublished });
  }

  listFormSubmissions(formId: string) {
    return this.http.get<any[]>(`${this.baseUrl}/forms/${formId}/submissions`);
  }

  listSubmissions(formId?: string) {
    const query = formId ? `?formId=${formId}` : '';
    return this.http.get<any[]>(`${this.baseUrl}/forms/submissions${query}`);
  }

  listWorkflows() {
    return this.http.get<any[]>(`${this.baseUrl}/workflows`);
  }

  createWorkflow(data: any) {
    return this.http.post<any>(`${this.baseUrl}/workflows`, data);
  }

  listWorkflowRuns() {
    return this.http.get<any[]>(`${this.baseUrl}/workflow-runs`);
  }

  listCalendarEvents() {
    return this.http.get<any[]>(`${this.baseUrl}/calendar/events`);
  }

  createCalendarEvent(data: any) {
    return this.http.post<any>(`${this.baseUrl}/calendar/events`, data);
  }

  updateCalendarEvent(id: string, data: any) {
    return this.http.patch<any>(`${this.baseUrl}/calendar/events/${id}`, data);
  }

  deleteCalendarEvent(id: string) {
    return this.http.delete<any>(`${this.baseUrl}/calendar/events/${id}`);
  }

  listPublicBookingSlots(slug: string) {
    return this.http.get<any[]>(`${this.baseUrl}/calendar/public/slots/${slug}`);
  }

  createPublicBooking(eventId: string, data: any) {
    return this.http.post<any>(`${this.baseUrl}/calendar/public/bookings/${eventId}`, data);
  }
}
