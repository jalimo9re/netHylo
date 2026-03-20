import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import { IntegrationStatus } from '@/database/entities/integration.entity';

export class UpdateIntegrationDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsObject()
  @IsOptional()
  config?: Record<string, any>;

  @IsEnum(IntegrationStatus)
  @IsOptional()
  status?: IntegrationStatus;
}
