import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface DashboardStats {
  openConversations: number;
  messagesToday: number;
  contacts: number;
  activeIntegrations: number;
}

export interface ActivityItem {
  id: string;
  type: 'received' | 'sent';
  contactName: string;
  content: string;
  messageType: string;
  createdAt: string;
  senderUser: string | null;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private url = `${environment.apiUrl}/dashboard`;

  constructor(private http: HttpClient) {}

  getStats() {
    return this.http.get<DashboardStats>(`${this.url}/stats`);
  }

  getRecentActivity() {
    return this.http.get<ActivityItem[]>(`${this.url}/activity`);
  }
}
