import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { RolePermission } from '@/database/entities/role-permission.entity';
import { UserRole } from '@/database/entities/user.entity';

const DEFAULT_MATRIX: Record<UserRole, string[]> = {
  [UserRole.SUPERADMIN]: [],
  [UserRole.ADMIN]: [
    'crm:read',
    'crm:write',
    'campaigns:read',
    'campaigns:write',
    'billing:read',
    'billing:write',
    'integrations:read',
    'integrations:write',
    'users:read',
    'users:write',
    'agency:read',
    'agency:write',
  ],
  [UserRole.AGENT]: [
    'crm:read',
    'campaigns:read',
    'integrations:read',
    'users:read',
  ],
};

@Injectable()
export class PermissionsService implements OnModuleInit {
  constructor(
    @InjectRepository(RolePermission)
    private permissionRepo: Repository<RolePermission>,
  ) {}

  async onModuleInit() {
    await this.ensureDefaultMatrix();
  }

  async ensureDefaultMatrix() {
    for (const [role, permissions] of Object.entries(DEFAULT_MATRIX)) {
      if (role === UserRole.SUPERADMIN) continue;
      for (const permission of permissions) {
        const exists = await this.permissionRepo.findOne({
          where: { tenantId: IsNull(), role: role as UserRole, permission },
        });
        if (!exists) {
          await this.permissionRepo.save(
            this.permissionRepo.create({
              tenantId: null,
              role: role as UserRole,
              permission,
              granted: true,
            }),
          );
        }
      }
    }
  }

  async hasPermission(
    tenantId: string | null | undefined,
    role: UserRole,
    permission: string,
  ): Promise<boolean> {
    if (role === UserRole.SUPERADMIN) {
      return true;
    }

    if (tenantId) {
      const tenantOverride = await this.permissionRepo.findOne({
        where: { tenantId, role, permission },
      });
      if (tenantOverride) {
        return tenantOverride.granted;
      }
    }

    const globalRule = await this.permissionRepo.findOne({
      where: { tenantId: IsNull(), role, permission },
    });
    return globalRule?.granted ?? false;
  }

  async listForTenant(tenantId: string | null) {
    return this.permissionRepo.find({
      where: tenantId ? { tenantId } : { tenantId: IsNull() },
      order: { role: 'ASC', permission: 'ASC' },
    });
  }

  async setTenantPermission(
    tenantId: string,
    role: UserRole,
    permission: string,
    granted: boolean,
  ) {
    let row = await this.permissionRepo.findOne({
      where: { tenantId, role, permission },
    });
    if (!row) {
      row = this.permissionRepo.create({ tenantId, role, permission, granted });
    } else {
      row.granted = granted;
    }
    return this.permissionRepo.save(row);
  }
}
