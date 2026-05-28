import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator';
import { IS_PUBLIC_KEY } from './jwt-auth.guard';
import { PermissionsService } from '@/modules/permissions/permissions.service';
import { UserRole } from '@/database/entities/user.entity';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const requiredPermission = this.reflector.getAllAndOverride<string>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredPermission) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user?.role) {
      return false;
    }

    if (user.role === UserRole.SUPERADMIN) {
      return true;
    }

    const tenantId = context.switchToHttp().getRequest().tenantId ?? user.tenantId;
    const allowed = await this.permissionsService.hasPermission(
      tenantId,
      user.role,
      requiredPermission,
    );

    if (!allowed) {
      throw new ForbiddenException(`Missing permission: ${requiredPermission}`);
    }

    return true;
  }
}
