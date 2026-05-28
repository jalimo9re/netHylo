import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface AnalyticsKpi {
  key: string;
  label: string;
  value: number;
  icon: string;
}

export interface AnalyticsOverview {
  generatedAt: string;
  inbox: {
    openConversations: number;
    messagesToday: number;
    contacts: number;
    activeIntegrations: number;
  };
  crm: {
    totalDeals: number;
    pipelineValue: number;
    wonDeals: number;
    pipelines: Array<{ pipelineId: string; name: string; totalDeals: number; value: number }>;
  };
  forms: { submissionsTotal: number; submissionsToday: number };
  campaigns: {
    total: number;
    completed: number;
    scheduled: number;
    sending: number;
    avgOpenRate: number;
  };
  revenue: {
    wonAmount: number;
    billingRevenue: number;
    totalRevenue: number;
    billingAvailable: boolean;
  };
  kpis: AnalyticsKpi[];
}

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private baseUrl = `${environment.apiUrl}/analytics`;

  constructor(private http: HttpClient) {}

  getOverview() {
    return this.http.get<AnalyticsOverview>(`${this.baseUrl}/overview`);
  }
}
