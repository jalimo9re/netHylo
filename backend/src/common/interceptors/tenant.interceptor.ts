import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ForbiddenException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@/database/entities/user.entity';

export const SKIP_TENANT_CHECK = 'skipTenantCheck';
export const SkipTenantCheck = () =>
  import('@nestjs/common').then(({ SetMetadata }) => SetMetadata(SKIP_TENANT_CHECK, true));

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {}

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

    // Superadmins can operate across tenants via X-Tenant-Id header
    if (user.role === UserRole.SUPERADMIN) {
      const headerTenantId = request.headers['x-tenant-id'];
      if (headerTenantId) {
        request.tenantId = headerTenantId;
      }
      return next.handle();
    }

    // Regular users must have a tenantId
    if (!user.tenantId) {
      throw new ForbiddenException('No tenant context available');
    }

    request.tenantId = user.tenantId;
    return next.handle();
  }
}
