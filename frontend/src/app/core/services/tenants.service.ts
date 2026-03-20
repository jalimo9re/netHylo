import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  plan: { id: string; name: string; maxUsers: number; maxIntegrations: number; price: number };
  createdAt: string;
  updatedAt: string;
}

export interface CreateTenantDto {
  companyName: string;
  companySlug: string;
  planId: string;
  adminEmail: string;
  adminPassword: string;
  adminFirstName: string;
  adminLastName: string;
}

@Injectable({ providedIn: 'root' })
export class TenantsService {
  private url = `${environment.apiUrl}/tenants`;

  constructor(private http: HttpClient) {}

  findAll() {
    return this.http.get<Tenant[]>(this.url);
  }

  findOne(id: string) {
    return this.http.get<Tenant>(`${this.url}/${id}`);
  }

  create(data: CreateTenantDto) {
    return this.http.post<Tenant>(this.url, data);
  }

  update(id: string, data: Partial<Tenant>) {
    return this.http.patch<Tenant>(`${this.url}/${id}`, data);
  }

  deactivate(id: string) {
    return this.http.patch<Tenant>(`${this.url}/${id}/deactivate`, {});
  }
}
