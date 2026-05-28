import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export type VoiceAgentStatus = 'available' | 'busy' | 'offline';

export interface VoiceQueue {
  id: string;
  name: string;
  strategy: string;
  ringTimeoutSeconds: number;
  isActive: boolean;
  members: Array<{ id: string; userId: string; priority: number }>;
}

export interface VoiceCall {
  id: string;
  fromNumber: string;
  toNumber: string;
  direction: 'inbound' | 'outbound';
  status: string;
  durationSeconds: number | null;
  queueWaitSeconds: number | null;
  createdAt: string;
}

export interface VoiceMetrics {
  total: number;
  answered: number;
  missed: number;
  avgDurationSeconds: number;
  avgQueueWaitSeconds: number;
}

@Injectable({ providedIn: 'root' })
export class VoiceService {
  private url = `${environment.apiUrl}/voice`;

  constructor(private readonly http: HttpClient) {}

  setAgentStatus(status: VoiceAgentStatus) {
    return this.http.patch(`${this.url}/agent/status`, { status });
  }

  listAgentStatuses() {
    return this.http.get<Array<{ userId: string; status: VoiceAgentStatus; updatedAt: string }>>(
      `${this.url}/agent/status`,
    );
  }

  listQueues() {
    return this.http.get<VoiceQueue[]>(`${this.url}/queues`);
  }

  createQueue(payload: { name: string; strategy?: string; ringTimeoutSeconds?: number }) {
    return this.http.post<VoiceQueue>(`${this.url}/queues`, payload);
  }

  createOutboundCall(payload: { toNumber: string; fromNumber?: string }) {
    return this.http.post<VoiceCall>(`${this.url}/calls/outbound`, payload);
  }

  listCalls(filters: { status?: string; direction?: string; from?: string; to?: string }) {
    let params = new HttpParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params = params.set(key, value);
    });
    return this.http.get<VoiceCall[]>(`${this.url}/calls`, { params });
  }

  getMetrics() {
    return this.http.get<VoiceMetrics>(`${this.url}/metrics`);
  }
}
