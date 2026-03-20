import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IntegrationProvider } from '@/database/entities/integration.entity';

export class WhatsAppConfigDto {
  @IsString()
  @IsNotEmpty()
  phoneNumberId: string;

  @IsString()
  @IsNotEmpty()
  phoneDisplay: string;

  @IsString()
  @IsNotEmpty()
  accessToken: string;

  @IsString()
  @IsNotEmpty()
  verifyToken: string;

  @IsString()
  @IsNotEmpty()
  appSecret: string;

  @IsString()
  @IsNotEmpty()
  businessAccountId: string;
}

export class MetaConfigDto {
  @IsString()
  @IsNotEmpty()
  pageId: string;

  @IsString()
  @IsNotEmpty()
  pageName: string;

  @IsString()
  @IsNotEmpty()
  pageAccessToken: string;

  @IsString()
  @IsNotEmpty()
  verifyToken: string;

  @IsString()
  @IsNotEmpty()
  appSecret: string;

  @IsString()
  @IsNotEmpty()
  appId: string;
}

export class InstagramConfigDto {
  @IsString()
  @IsNotEmpty()
  igAccountId: string;

  @IsString()
  @IsNotEmpty()
  igUsername: string;

  @IsString()
  @IsNotEmpty()
  accessToken: string;

  @IsString()
  @IsNotEmpty()
  verifyToken: string;

  @IsString()
  @IsNotEmpty()
  appSecret: string;

  @IsString()
  @IsNotEmpty()
  appId: string;
}

export class TelegramConfigDto {
  @IsString()
  @IsNotEmpty()
  botToken: string;

  @IsString()
  @IsNotEmpty()
  botUsername: string;

  @IsString()
  @IsNotEmpty()
  secretToken: string;
}

export class TikTokConfigDto {
  @IsString()
  @IsNotEmpty()
  businessId: string;

  @IsString()
  @IsNotEmpty()
  accessToken: string;

  @IsString()
  @IsNotEmpty()
  clientKey: string;

  @IsString()
  @IsNotEmpty()
  clientSecret: string;
}

export class CreateIntegrationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(IntegrationProvider)
  provider: IntegrationProvider;

  @IsObject()
  config: WhatsAppConfigDto | MetaConfigDto | InstagramConfigDto | TelegramConfigDto | TikTokConfigDto;
}
