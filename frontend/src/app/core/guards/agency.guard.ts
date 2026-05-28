import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, catchError, of } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { TenantsService } from '../services/tenants.service';

export const agencyGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const tenantsService = inject(TenantsService);
  const router = inject(Router);
  const user = authService.currentUser();

  if (!user) {
    return router.createUrlTree(['/login']);
  }

  if (user.role === 'superadmin') {
    return true;
  }

  if (user.role !== 'admin') {
    return router.createUrlTree(['/dashboard']);
  }

  return tenantsService.findMe().pipe(
    map((tenant) => (tenant.isAgency ? true : router.createUrlTree(['/dashboard']))),
    catchError(() => of(router.createUrlTree(['/dashboard']))),
  );
};
