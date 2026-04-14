import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '@/database/entities/user.entity';
import { Tenant } from '@/database/entities/tenant.entity';

interface CreateUserDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Tenant) private tenantRepo: Repository<Tenant>,
  ) {}

  async findAllByTenant(tenantId: string) {
    return this.userRepo.find({ where: { tenantId } });
  }

  async findAllGlobal() {
    return this.userRepo.find({ relations: ['tenant'], order: { createdAt: 'DESC' } });
  }

  async findOne(id: string, tenantId: string) {
    const user = await this.userRepo.findOne({
      where: { id, tenantId },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findOneGlobal(id: string) {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['tenant'],
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(tenantId: string, dto: CreateUserDto) {
    const tenant = await this.tenantRepo.findOne({
      where: { id: tenantId },
      relations: ['plan'],
    });

    if (tenant && tenant.plan && tenant.plan.maxUsers !== -1) {
      const count = await this.userRepo.count({ where: { tenantId } });
      if (count >= tenant.plan.maxUsers) {
        throw new ForbiddenException(
          `Tu plan permite un máximo de ${tenant.plan.maxUsers} usuarios.`,
        );
      }
    }

    const existing = await this.userRepo.findOne({
      where: { email: dto.email, tenantId },
    });
    if (existing) throw new ConflictException('Email already in use in this tenant');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = this.userRepo.create({
      ...dto,
      passwordHash,
      tenantId,
    });
    return this.userRepo.save(user);
  }

  async update(id: string, tenantId: string, data: Partial<User>) {
    await this.findOne(id, tenantId);
    await this.userRepo.update(id, data);
    return this.findOne(id, tenantId);
  }

  async updateGlobal(id: string, data: Partial<User>) {
    await this.findOneGlobal(id);
    await this.userRepo.update(id, data);
    return this.findOneGlobal(id);
  }

  async resetPassword(id: string, newPassword: string) {
    const user = await this.findOneGlobal(id);
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.userRepo.update(id, { passwordHash });
    return { message: `Password reset for ${user.email}` };
  }
}
