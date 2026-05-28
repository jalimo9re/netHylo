import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface MobileNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class MobileService {
  private baseUrl = '/api/mobile';

  constructor(private http: HttpClient) {}

  registerDevice(payload: {
    token: string;
    platform: 'ios' | 'android' | 'web';
    appVersion?: string;
    metadata?: Record<string, any>;
  }): Observable<any> {
    return this.http.post(`${this.baseUrl}/devices`, payload);
  }

  listNotifications(limit = 30): Observable<MobileNotification[]> {
    return this.http.get<MobileNotification[]>(`${this.baseUrl}/notifications?limit=${limit}`);
  }

  markRead(id: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/notifications/${id}/read`, {});
  }

  sendMock(payload: {
    title: string;
    body: string;
    type?: string;
    userId?: string;
    payload?: Record<string, any>;
  }): Observable<any> {
    return this.http.post(`${this.baseUrl}/admin/mock-send`, payload);
  }
}
