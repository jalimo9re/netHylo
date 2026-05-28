import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Tenant } from './tenants.service';

@Injectable({ providedIn: 'root' })
export class TenantBrandingService {
  branding = signal<Pick<Tenant, 'logoUrl' | 'primaryColor' | 'name'> | null>(null);

  constructor(private http: HttpClient) {}

  loadFromTenant(tenant: Tenant | null) {
    if (!tenant) {
      this.branding.set(null);
      return;
    }
    this.branding.set({
      name: tenant.name,
      logoUrl: tenant.logoUrl ?? null,
      primaryColor: tenant.primaryColor ?? null,
    });
    if (tenant.primaryColor) {
      document.documentElement.style.setProperty('--brand-primary', tenant.primaryColor);
    } else {
      document.documentElement.style.removeProperty('--brand-primary');
    }
  }

  refresh() {
    return this.http.get<Tenant>(`${environment.apiUrl}/tenants/me`).subscribe({
      next: (tenant) => this.loadFromTenant(tenant),
      error: () => this.branding.set(null),
    });
  }
}
