import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionGuard } from './permission.guard';
import { UserRole } from '@/database/entities/user.entity';
import { PermissionsService } from '@/modules/permissions/permissions.service';

describe('PermissionGuard', () => {
  const makeContext = (user?: any, tenantId?: string): ExecutionContext =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user, tenantId }),
      }),
    }) as any;

  it('permite rutas sin permiso requerido', async () => {
    const reflector = {
      getAllAndOverride: jest
        .fn()
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(undefined),
    } as unknown as Reflector;
    const permissionsService = {
      hasPermission: jest.fn(),
    } as unknown as PermissionsService;
    const guard = new PermissionGuard(reflector, permissionsService);

    await expect(guard.canActivate(makeContext({ role: UserRole.AGENT }))).resolves.toBe(
      true,
    );
    expect(permissionsService.hasPermission).not.toHaveBeenCalled();
  });

  it('permite superadmin sin consultar permisos', async () => {
    const reflector = {
      getAllAndOverride: jest
        .fn()
        .mockReturnValueOnce(false)
        .mockReturnValueOnce('crm:write'),
    } as unknown as Reflector;
    const permissionsService = {
      hasPermission: jest.fn(),
    } as unknown as PermissionsService;
    const guard = new PermissionGuard(reflector, permissionsService);

    await expect(
      guard.canActivate(makeContext({ role: UserRole.SUPERADMIN })),
    ).resolves.toBe(true);
    expect(permissionsService.hasPermission).not.toHaveBeenCalled();
  });

  it('rechaza cuando falta el permiso', async () => {
    const reflector = {
      getAllAndOverride: jest
        .fn()
        .mockReturnValueOnce(false)
        .mockReturnValueOnce('crm:write'),
    } as unknown as Reflector;
    const permissionsService = {
      hasPermission: jest.fn().mockResolvedValue(false),
    } as unknown as PermissionsService;
    const guard = new PermissionGuard(reflector, permissionsService);

    await expect(
      guard.canActivate(
        makeContext({ role: UserRole.AGENT, tenantId: 'tenant-1' }, 'tenant-1'),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('permite cuando el servicio concede el permiso', async () => {
    const reflector = {
      getAllAndOverride: jest
        .fn()
        .mockReturnValueOnce(false)
        .mockReturnValueOnce('crm:write'),
    } as unknown as Reflector;
    const permissionsService = {
      hasPermission: jest.fn().mockResolvedValue(true),
    } as unknown as PermissionsService;
    const guard = new PermissionGuard(reflector, permissionsService);

    await expect(
      guard.canActivate(
        makeContext({ role: UserRole.ADMIN, tenantId: 'tenant-1' }, 'tenant-1'),
      ),
    ).resolves.toBe(true);
    expect(permissionsService.hasPermission).toHaveBeenCalledWith(
      'tenant-1',
      UserRole.ADMIN,
      'crm:write',
    );
  });
});
