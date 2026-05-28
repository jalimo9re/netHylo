import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { TenantContextService } from '../services/tenant-context.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const tenantContext = inject(TenantContextService);
  const token = authService.getToken();
  const headers: Record<string, string> = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const activeTenantId = tenantContext.getActiveTenantId();
  const userTenantId = authService.currentUser()?.tenantId;
  if (
    activeTenantId &&
    (authService.currentUser()?.role === 'superadmin' ||
      (authService.currentUser()?.role === 'admin' && activeTenantId !== userTenantId))
  ) {
    headers['X-Tenant-Id'] = activeTenantId;
  }

  if (Object.keys(headers).length > 0) {
    req = req.clone({ setHeaders: headers });
  }

  return next(req);
};
