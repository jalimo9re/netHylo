import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from '@/database/entities/tenant.entity';
import { TenantAccessService } from './services/tenant-access.service';
import { StructuredLogger } from './logging/structured-logger.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Tenant])],
  providers: [TenantAccessService, StructuredLogger],
  exports: [TenantAccessService, StructuredLogger],
})
export class CommonModule {}
