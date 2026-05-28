import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class FunnelsService {
  private baseUrl = `${environment.apiUrl}/funnels`;

  constructor(private http: HttpClient) {}

  list() {
    return this.http.get<any[]>(this.baseUrl);
  }

  get(id: string) {
    return this.http.get<any>(`${this.baseUrl}/${id}`);
  }

  create(data: Record<string, unknown>) {
    return this.http.post<any>(this.baseUrl, data);
  }

  update(id: string, data: Record<string, unknown>) {
    return this.http.patch<any>(`${this.baseUrl}/${id}`, data);
  }

  remove(id: string) {
    return this.http.delete<{ success: boolean }>(`${this.baseUrl}/${id}`);
  }

  publish(id: string, isPublished: boolean) {
    return this.http.patch<any>(`${this.baseUrl}/${id}/publish`, { isPublished });
  }

  metrics(id: string) {
    return this.http.get<any>(`${this.baseUrl}/${id}/metrics`);
  }

  getPublic(slug: string) {
    return this.http.get<any>(`${environment.apiUrl}/public/funnels/${slug}`);
  }

  track(slug: string, payload: Record<string, unknown>) {
    return this.http.post<any>(`${environment.apiUrl}/public/funnels/${slug}/track`, payload);
  }
}
