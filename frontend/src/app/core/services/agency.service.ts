import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Tenant } from './tenants.service';

export interface TenantBranding {
  logoUrl?: string | null;
  primaryColor?: string | null;
  customDomain?: string | null;
}

export interface CreateSubaccountDto {
  name: string;
  slug: string;
  planId: string;
  adminEmail: string;
  adminPassword: string;
  adminFirstName: string;
  adminLastName: string;
}

@Injectable({ providedIn: 'root' })
export class AgencyService {
  private url = `${environment.apiUrl}/agency`;

  constructor(private http: HttpClient) {}

  getProfile(parentTenantId?: string) {
    const params = parentTenantId
      ? new HttpParams().set('parentTenantId', parentTenantId)
      : undefined;
    return this.http.get<Tenant>(`${this.url}/profile`, { params });
  }

  listSubaccounts(parentTenantId?: string) {
    const params = parentTenantId
      ? new HttpParams().set('parentTenantId', parentTenantId)
      : undefined;
    return this.http.get<Tenant[]>(`${this.url}/subaccounts`, { params });
  }

  createSubaccount(data: CreateSubaccountDto, parentTenantId?: string) {
    const params = parentTenantId
      ? new HttpParams().set('parentTenantId', parentTenantId)
      : undefined;
    return this.http.post<Tenant>(`${this.url}/subaccounts`, data, { params });
  }

  updateBranding(branding: TenantBranding, parentTenantId?: string) {
    const params = parentTenantId
      ? new HttpParams().set('parentTenantId', parentTenantId)
      : undefined;
    return this.http.patch<Tenant>(`${this.url}/branding`, branding, { params });
  }

  updateSubaccountBranding(
    subaccountId: string,
    branding: TenantBranding,
    parentTenantId?: string,
  ) {
    const params = parentTenantId
      ? new HttpParams().set('parentTenantId', parentTenantId)
      : undefined;
    return this.http.patch<Tenant>(
      `${this.url}/subaccounts/${subaccountId}/branding`,
      branding,
      { params },
    );
  }

  assignPlan(subaccountId: string, planId: string, parentTenantId?: string) {
    const params = parentTenantId
      ? new HttpParams().set('parentTenantId', parentTenantId)
      : undefined;
    return this.http.patch<Tenant>(
      `${this.url}/subaccounts/${subaccountId}/plan`,
      { planId },
      { params },
    );
  }
}
