import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from '@/database/entities/user.entity';
import { Tenant } from '@/database/entities/tenant.entity';
import { Integration } from '@/database/entities/integration.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Tenant, Integration])],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
