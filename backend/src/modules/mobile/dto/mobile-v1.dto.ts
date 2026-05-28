import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from 'class-validator';

export class MobileCursorPageQueryDto {
  @IsOptional()
  @IsString()
  @Length(1, 512)
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit = 25;
}

export class MobileSyncQueryDto extends MobileCursorPageQueryDto {
  @IsISO8601()
  since!: string;

  @IsOptional()
  @IsIn(['inbox', 'notifications', 'calendar', 'tasks'])
  stream: 'inbox' | 'notifications' | 'calendar' | 'tasks' = 'notifications';
}

export class RegisterMobileDeviceDto {
  @IsString()
  @Length(8, 1024)
  token!: string;

  @IsIn(['ios', 'android', 'web'])
  platform!: 'ios' | 'android' | 'web';

  @IsOptional()
  @IsString()
  @Length(1, 40)
  appVersion?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class MarkNotificationReadParamsDto {
  @IsUUID('4')
  id!: string;
}

export class AdminMockSendDto {
  @IsOptional()
  @IsUUID('4')
  @Transform(({ value }) => (value === null ? undefined : value))
  userId?: string;

  @IsString()
  @Length(2, 180)
  title!: string;

  @IsString()
  @Length(2, 4000)
  body!: string;

  @IsOptional()
  @IsString()
  @Length(2, 60)
  type?: string;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}
