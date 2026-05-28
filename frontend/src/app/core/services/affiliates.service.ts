import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AffiliatesService {
  private baseUrl = `${environment.apiUrl}/affiliates`;

  constructor(private http: HttpClient) {}

  getMetrics() {
    return this.http.get<any>(`${this.baseUrl}/metrics`);
  }

  listAffiliates() {
    return this.http.get<any[]>(`${this.baseUrl}`);
  }

  createAffiliate(data: { name: string; email?: string; commissionRate?: number }) {
    return this.http.post<any>(`${this.baseUrl}`, data);
  }

  listLinks(affiliateId?: string) {
    const query = affiliateId ? `?affiliateId=${affiliateId}` : '';
    return this.http.get<any[]>(`${this.baseUrl}/links/list${query}`);
  }

  createLink(data: { affiliateId: string; code?: string; targetUrl?: string }) {
    return this.http.post<any>(`${this.baseUrl}/links`, data);
  }

  listConversions(affiliateId?: string) {
    const query = affiliateId ? `?affiliateId=${affiliateId}` : '';
    return this.http.get<any[]>(`${this.baseUrl}/conversions${query}`);
  }

  createConversion(data: {
    affiliateId?: string;
    referralLinkId?: string;
    amount: number;
    currency?: string;
    contactId?: string;
  }) {
    return this.http.post<any>(`${this.baseUrl}/conversions`, data);
  }
}
