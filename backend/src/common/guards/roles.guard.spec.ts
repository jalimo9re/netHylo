import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { UserRole } from '@/database/entities/user.entity';

describe('RolesGuard', () => {
  const makeContext = (user?: any): ExecutionContext =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as any;

  it('permite rutas publicas sin usuario', () => {
    const reflector = {
      getAllAndOverride: jest
        .fn()
        .mockReturnValueOnce(true)
        .mockReturnValueOnce([UserRole.ADMIN]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    const canActivate = guard.canActivate(makeContext(undefined));

    expect(canActivate).toBe(true);
  });

  it('rechaza cuando no hay usuario en ruta con roles', () => {
    const reflector = {
      getAllAndOverride: jest
        .fn()
        .mockReturnValueOnce(false)
        .mockReturnValueOnce([UserRole.ADMIN]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    const canActivate = guard.canActivate(makeContext(undefined));

    expect(canActivate).toBe(false);
  });
});
