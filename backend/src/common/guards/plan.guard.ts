import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SetMetadata } from '@nestjs/common';
import { Tenant } from '@/database/entities/tenant.entity';
import { User, UserRole } from '@/database/entities/user.entity';
import { Integration } from '@/database/entities/integration.entity';

export type PlanResource = 'users' | 'integrations';
export const PLAN_RESOURCE_KEY = 'planResource';
export const CheckPlanLimit = (resource: PlanResource) =>
  SetMetadata(PLAN_RESOURCE_KEY, resource);

@Injectable()
export class PlanGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectRepository(Tenant)
    private tenantRepo: Repository<Tenant>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Integration)
    private integrationRepo: Repository<Integration>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const resource = this.reflector.get<PlanResource>(PLAN_RESOURCE_KEY, context.getHandler());
    if (!resource) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user.role === UserRole.SUPERADMIN) {
      return true;
    }

    const tenant = await this.tenantRepo.findOne({
      where: { id: user.tenantId },
      relations: ['plan'],
    });

    if (!tenant) {
      throw new ForbiddenException('Tenant not found');
    }

    const plan = tenant.plan;

    if (resource === 'users') {
      const currentCount = await this.userRepo.count({
        where: { tenantId: tenant.id },
      });
      if (plan.maxUsers !== -1 && currentCount >= plan.maxUsers) {
        throw new ForbiddenException(
          `Plan "${plan.name}" limit reached: max ${plan.maxUsers} users`,
        );
      }
    }

    if (resource === 'integrations') {
      const currentCount = await this.integrationRepo.count({
        where: { tenantId: tenant.id },
      });
      if (plan.maxIntegrations !== -1 && currentCount >= plan.maxIntegrations) {
        throw new ForbiddenException(
          `Plan "${plan.name}" limit reached: max ${plan.maxIntegrations} integrations`,
        );
      }
    }

    return true;
  }
}
