import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ALLOWED_BLOCK_TYPES } from '../block-schema';

class BlockDto {
  @IsString()
  @IsIn(ALLOWED_BLOCK_TYPES)
  type!: string;

  @IsOptional()
  @IsObject()
  props?: Record<string, unknown>;
}

class FunnelStepDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  stepOrder?: number;

  @IsOptional()
  @IsString()
  pageId?: string | null;

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BlockDto)
  blocks?: BlockDto[];
}

export class CreateSiteDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;
}

export class UpdateSiteDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;
}

export class CreatePageDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BlockDto)
  blocks?: BlockDto[];
}

export class UpdatePageDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BlockDto)
  blocks?: BlockDto[];

  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

export class CreateFunnelDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FunnelStepDto)
  steps?: FunnelStepDto[];
}

export class UpdateFunnelDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FunnelStepDto)
  steps?: FunnelStepDto[];
}
