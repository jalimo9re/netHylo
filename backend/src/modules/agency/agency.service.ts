import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Tenant } from '@/database/entities/tenant.entity';
import { Plan } from '@/database/entities/plan.entity';
import { User, UserRole } from '@/database/entities/user.entity';

export interface TenantBrandingDto {
  logoUrl?: string | null;
  primaryColor?: string | null;
  customDomain?: string | null;
}

const toBrandingPayload = (branding: TenantBrandingDto) => ({
  logoUrl: branding.logoUrl ?? null,
  primaryColor: branding.primaryColor ?? null,
  customDomain: branding.customDomain ?? null,
});

export interface CreateSubaccountDto {
  name: string;
  slug: string;
  planId: string;
  adminEmail: string;
  adminPassword: string;
  adminFirstName: string;
  adminLastName: string;
}

@Injectable()
export class AgencyService {
  constructor(
    @InjectRepository(Tenant) private tenantRepo: Repository<Tenant>,
    @InjectRepository(Plan) private planRepo: Repository<Plan>,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  async resolveAgencyTenantId(
    user: { role: UserRole; tenantId: string | null },
    requestedAgencyId?: string,
  ): Promise<string> {
    if (user.role === UserRole.SUPERADMIN) {
      if (!requestedAgencyId) {
        throw new BadRequestException('parentTenantId is required for superadmin');
      }
      const agency = await this.tenantRepo.findOne({ where: { id: requestedAgencyId } });
      if (!agency?.isAgency) {
        throw new ForbiddenException('Target tenant is not an agency');
      }
      return requestedAgencyId;
    }

    if (!user.tenantId) {
      throw new ForbiddenException('No agency context');
    }

    const agency = await this.tenantRepo.findOne({ where: { id: user.tenantId } });
    if (!agency?.isAgency) {
      throw new ForbiddenException('Tenant is not an agency');
    }
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Agency admin role required');
    }
    return user.tenantId;
  }

  async canAccessSubaccount(agencyTenantId: string, targetTenantId: string): Promise<boolean> {
    if (agencyTenantId === targetTenantId) {
      return true;
    }
    const target = await this.tenantRepo.findOne({ where: { id: targetTenantId } });
    return target?.parentTenantId === agencyTenantId;
  }

  async listSubaccounts(agencyTenantId: string) {
    return this.tenantRepo.find({
      where: { parentTenantId: agencyTenantId },
      relations: ['plan'],
      order: { createdAt: 'DESC' },
    });
  }

  async getAgencyProfile(agencyTenantId: string) {
    const agency = await this.tenantRepo.findOne({
      where: { id: agencyTenantId },
      relations: ['plan'],
    });
    if (!agency) {
      throw new NotFoundException('Agency not found');
    }
    return agency;
  }

  async createSubaccount(agencyTenantId: string, dto: CreateSubaccountDto) {
    const agency = await this.getAgencyProfile(agencyTenantId);
    if (!agency.isAgency) {
      throw new ForbiddenException('Tenant is not an agency');
    }

    const existingTenant = await this.tenantRepo.findOne({ where: { slug: dto.slug } });
    if (existingTenant) {
      throw new ConflictException('Subaccount slug already taken');
    }

    const existingUser = await this.userRepo.findOne({ where: { email: dto.adminEmail } });
    if (existingUser) {
      throw new ConflictException('Admin email already registered');
    }

    const plan = await this.planRepo.findOne({ where: { id: dto.planId } });
    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    const subaccount = this.tenantRepo.create({
      name: dto.name,
      slug: dto.slug,
      planId: dto.planId,
      parentTenantId: agencyTenantId,
      isAgency: false,
      logoUrl: agency.logoUrl,
      primaryColor: agency.primaryColor,
      customDomain: agency.customDomain,
      branding: toBrandingPayload({
        logoUrl: agency.logoUrl,
        primaryColor: agency.primaryColor,
        customDomain: agency.customDomain,
      }),
    });
    await this.tenantRepo.save(subaccount);

    const passwordHash = await bcrypt.hash(dto.adminPassword, 12);
    const admin = this.userRepo.create({
      email: dto.adminEmail,
      passwordHash,
      firstName: dto.adminFirstName,
      lastName: dto.adminLastName,
      role: UserRole.ADMIN,
      tenantId: subaccount.id,
    });
    await this.userRepo.save(admin);

    return this.tenantRepo.findOne({
      where: { id: subaccount.id },
      relations: ['plan'],
    });
  }

  async updateBranding(
    tenantId: string,
    agencyTenantId: string,
    branding: TenantBrandingDto,
    isSuperadmin: boolean,
  ) {
    if (!isSuperadmin && tenantId !== agencyTenantId) {
      const allowed = await this.canAccessSubaccount(agencyTenantId, tenantId);
      if (!allowed) {
        throw new ForbiddenException('Cannot update branding for this subaccount');
      }
    }

    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    if (branding.logoUrl !== undefined) tenant.logoUrl = branding.logoUrl;
    if (branding.primaryColor !== undefined) tenant.primaryColor = branding.primaryColor;
    if (branding.customDomain !== undefined) tenant.customDomain = branding.customDomain;
    tenant.branding = toBrandingPayload({
      logoUrl: tenant.logoUrl,
      primaryColor: tenant.primaryColor,
      customDomain: tenant.customDomain,
    });

    await this.tenantRepo.save(tenant);
    return this.tenantRepo.findOne({ where: { id: tenantId }, relations: ['plan'] });
  }

  async assignPlan(
    subaccountId: string,
    planId: string,
    agencyTenantId: string,
    isSuperadmin: boolean,
  ) {
    if (!isSuperadmin) {
      const allowed = await this.canAccessSubaccount(agencyTenantId, subaccountId);
      if (!allowed) {
        throw new ForbiddenException('Cannot assign plan to this subaccount');
      }
    }

    const subaccount = await this.tenantRepo.findOne({ where: { id: subaccountId } });
    if (!subaccount) {
      throw new NotFoundException('Subaccount not found');
    }

    const plan = await this.planRepo.findOne({ where: { id: planId } });
    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    subaccount.planId = planId;
    await this.tenantRepo.save(subaccount);
    return this.tenantRepo.findOne({ where: { id: subaccountId }, relations: ['plan'] });
  }

  async listAllSubaccounts() {
    return this.tenantRepo.find({
      where: {},
      relations: ['plan', 'parentTenant'],
      order: { createdAt: 'DESC' },
    }).then((rows) => rows.filter((t) => t.parentTenantId));
  }
}
