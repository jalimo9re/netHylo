import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { User } from '@/database/entities/user.entity';
import { MfaService } from './mfa.service';
import { MailService } from './mail.service';
import { SystemConfigModule } from '../system-config/system-config.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET')!,
        signOptions: { expiresIn: config.get<string>('JWT_EXPIRATION', '24h')! as any },
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([User]),
    SystemConfigModule,
  ],
  providers: [AuthService, JwtStrategy, MfaService, MailService],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
