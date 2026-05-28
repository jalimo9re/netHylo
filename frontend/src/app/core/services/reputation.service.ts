import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface ReviewMetrics {
  avgRating: number;
  totalCount: number;
  countByStars: Record<number, number>;
}

@Injectable({ providedIn: 'root' })
export class ReputationService {
  private baseUrl = `${environment.apiUrl}/reputation`;

  constructor(private http: HttpClient) {}

  createCampaign(data: {
    name: string;
    contactId?: string;
    message?: string;
    channel?: string;
    expiresInDays?: number;
  }) {
    return this.http.post<any>(`${this.baseUrl}/campaigns`, data);
  }

  listRequests() {
    return this.http.get<any[]>(`${this.baseUrl}/requests`);
  }

  listReviews() {
    return this.http.get<any[]>(`${this.baseUrl}/reviews`);
  }

  respondToReview(id: string, response: string) {
    return this.http.post<any>(`${this.baseUrl}/reviews/${id}/respond`, { response });
  }

  getMetrics() {
    return this.http.get<ReviewMetrics>(`${this.baseUrl}/metrics`);
  }
}
