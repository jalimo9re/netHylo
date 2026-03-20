import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Tenant } from '@/database/entities/tenant.entity';
import { Plan } from '@/database/entities/plan.entity';
import { User, UserRole } from '@/database/entities/user.entity';

interface CreateTenantDto {
  companyName: string;
  companySlug: string;
  planId: string;
  adminEmail: string;
  adminPassword: string;
  adminFirstName: string;
  adminLastName: string;
}

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant) private tenantRepo: Repository<Tenant>,
    @InjectRepository(Plan) private planRepo: Repository<Plan>,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  async create(dto: CreateTenantDto) {
    const existingTenant = await this.tenantRepo.findOne({
      where: { slug: dto.companySlug },
    });
    if (existingTenant) {
      throw new ConflictException('Company slug already taken');
    }

    const existingUser = await this.userRepo.findOne({
      where: { email: dto.adminEmail },
    });
    if (existingUser) {
      throw new ConflictException('Admin email already registered');
    }

    const plan = await this.planRepo.findOne({ where: { id: dto.planId } });
    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    const tenant = this.tenantRepo.create({
      name: dto.companyName,
      slug: dto.companySlug,
      planId: dto.planId,
    });
    await this.tenantRepo.save(tenant);

    const passwordHash = await bcrypt.hash(dto.adminPassword, 12);
    const admin = this.userRepo.create({
      email: dto.adminEmail,
      passwordHash,
      firstName: dto.adminFirstName,
      lastName: dto.adminLastName,
      role: UserRole.ADMIN,
      tenantId: tenant.id,
    });
    await this.userRepo.save(admin);

    return this.findOne(tenant.id);
  }

  async findAll() {
    return this.tenantRepo.find({ relations: ['plan'] });
  }

  async findOne(id: string) {
    const tenant = await this.tenantRepo.findOne({
      where: { id },
      relations: ['plan'],
    });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  async update(id: string, data: Partial<Tenant>) {
    await this.findOne(id);
    await this.tenantRepo.update(id, data);
    return this.findOne(id);
  }

  async deactivate(id: string) {
    return this.update(id, { isActive: false });
  }
}
