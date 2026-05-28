import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export type CampaignChannel = 'email' | 'sms';
export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'completed' | 'cancelled';

export interface Campaign {
  id: string;
  name: string;
  channel: CampaignChannel;
  status: CampaignStatus;
  subject?: string | null;
  body: string;
  scheduledAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  contactIds: string[];
  createdAt: string;
}

export interface CampaignStats {
  campaignId: string;
  name: string;
  channel: CampaignChannel;
  status: CampaignStatus;
  totalRecipients: number;
  pending: number;
  sent: number;
  failed: number;
  bounced: number;
  opened: number;
  clicked: number;
  openRate: number;
  clickRate: number;
}

@Injectable({ providedIn: 'root' })
export class CampaignsService {
  private baseUrl = `${environment.apiUrl}/campaigns`;

  constructor(private http: HttpClient) {}

  list() {
    return this.http.get<Campaign[]>(this.baseUrl);
  }

  get(id: string) {
    return this.http.get<Campaign>(`${this.baseUrl}/${id}`);
  }

  getStats(id: string) {
    return this.http.get<CampaignStats>(`${this.baseUrl}/${id}/stats`);
  }

  create(data: {
    name: string;
    channel: CampaignChannel;
    subject?: string;
    body: string;
    contactIds?: string[];
    scheduledAt?: string;
  }) {
    return this.http.post<Campaign>(this.baseUrl, data);
  }

  update(id: string, data: Partial<Campaign>) {
    return this.http.patch<Campaign>(`${this.baseUrl}/${id}`, data);
  }

  schedule(id: string, scheduledAt?: string) {
    return this.http.post<Campaign>(`${this.baseUrl}/${id}/schedule`, { scheduledAt });
  }

  cancel(id: string) {
    return this.http.post<Campaign>(`${this.baseUrl}/${id}/cancel`, {});
  }
}
