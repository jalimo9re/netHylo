import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolePermission } from '@/database/entities/role-permission.entity';
import { PermissionsService } from './permissions.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([RolePermission])],
  providers: [PermissionsService],
  exports: [PermissionsService],
})
export class PermissionsModule {}
