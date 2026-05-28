import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'nethylo_active_tenant_id';

@Injectable({ providedIn: 'root' })
export class TenantContextService {
  private activeTenantId = signal<string | null>(
    sessionStorage.getItem(STORAGE_KEY),
  );

  getActiveTenantId(): string | null {
    return this.activeTenantId();
  }

  setActiveTenantId(tenantId: string | null) {
    if (tenantId) {
      sessionStorage.setItem(STORAGE_KEY, tenantId);
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
    this.activeTenantId.set(tenantId);
  }

  clear() {
    this.setActiveTenantId(null);
  }
}
