import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SitesService {
  private baseUrl = `${environment.apiUrl}/sites`;

  constructor(private http: HttpClient) {}

  list() {
    return this.http.get<any[]>(this.baseUrl);
  }

  get(id: string) {
    return this.http.get<any>(`${this.baseUrl}/${id}`);
  }

  create(data: { name: string; slug?: string; settings?: Record<string, unknown> }) {
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

  listPages(siteId: string) {
    return this.http.get<any[]>(`${this.baseUrl}/${siteId}/pages`);
  }

  createPage(siteId: string, data: Record<string, unknown>) {
    return this.http.post<any>(`${this.baseUrl}/${siteId}/pages`, data);
  }

  updatePage(siteId: string, pageId: string, data: Record<string, unknown>) {
    return this.http.patch<any>(`${this.baseUrl}/${siteId}/pages/${pageId}`, data);
  }

  deletePage(siteId: string, pageId: string) {
    return this.http.delete<{ success: boolean }>(`${this.baseUrl}/${siteId}/pages/${pageId}`);
  }

  getPublic(slug: string) {
    return this.http.get<any>(`${environment.apiUrl}/public/sites/${slug}`);
  }
}
