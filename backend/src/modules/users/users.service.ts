import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '@/database/entities/user.entity';

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
  ) {}

  async findAllByTenant(tenantId: string) {
    return this.userRepo.find({ where: { tenantId } });
  }

  async findOne(id: string, tenantId: string) {
    const user = await this.userRepo.findOne({
      where: { id, tenantId },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(tenantId: string, dto: CreateUserDto) {
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
}
