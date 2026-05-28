import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ForbiddenException,
} from '@nestjs/common';
import { Observable, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@/database/entities/user.entity';
import { TenantAccessService } from '@/common/services/tenant-access.service';

export const SKIP_TENANT_CHECK = 'skipTenantCheck';
export const SkipTenantCheck = () =>
  import('@nestjs/common').then(({ SetMetadata }) => SetMetadata(SKIP_TENANT_CHECK, true));

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    private tenantAccessService: TenantAccessService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const skipCheck = this.reflector.getAllAndOverride<boolean>(SKIP_TENANT_CHECK, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipCheck) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return next.handle();
    }

    const headerTenantId = request.headers['x-tenant-id'] as string | undefined;

    if (user.role === UserRole.SUPERADMIN) {
      if (headerTenantId) {
        request.tenantId = headerTenantId;
      }
      return next.handle();
    }

    if (!user.tenantId) {
      throw new ForbiddenException('No tenant context available');
    }

    if (!headerTenantId || headerTenantId === user.tenantId) {
      request.tenantId = user.tenantId;
      return next.handle();
    }

    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Cannot switch tenant context');
    }

    return from(
      this.tenantAccessService.canImpersonateTenant(user.tenantId, headerTenantId, {
        requireAgency: true,
      }),
    ).pipe(
      switchMap((allowed) => {
        if (!allowed) {
          throw new ForbiddenException('Cannot access this subaccount');
        }
        request.tenantId = headerTenantId;
        return next.handle();
      }),
    );
  }
}
