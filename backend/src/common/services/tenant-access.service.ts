import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '@/database/entities/tenant.entity';

@Injectable()
export class TenantAccessService {
  constructor(
    @InjectRepository(Tenant)
    private tenantRepo: Repository<Tenant>,
  ) {}

  async canImpersonateTenant(
    actorTenantId: string,
    targetTenantId: string,
    options?: { requireAgency?: boolean },
  ): Promise<boolean> {
    if (actorTenantId === targetTenantId) {
      return true;
    }

    const actor = await this.tenantRepo.findOne({ where: { id: actorTenantId } });
    if (!actor) {
      return false;
    }
    if (options?.requireAgency && !actor.isAgency) {
      return false;
    }

    const target = await this.tenantRepo.findOne({ where: { id: targetTenantId } });
    return target?.parentTenantId === actorTenantId;
  }
}
