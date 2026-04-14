import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '@/database/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from '@/common/interfaces/jwt-payload.interface';
import { MfaService } from './mfa.service';
import { MailService } from './mail.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    private jwtService: JwtService,
    private mfaService: MfaService,
    private mailService: MailService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.userRepo.findOne({
      where: { email: dto.email },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return {
      mfaRequired: true,
      mfaEnabled: user.isTwoFactorEnabled,
      mfaMethod: user.twoFactorMethod,
      tempToken: this.generateTempToken(user),
    };
  }

  async setupMfaInit(userId: string, method: 'authenticator' | 'email') {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    if (method === 'authenticator') {
      const secret = this.mfaService.generateSecret();
      const qrCode = await this.mfaService.generateQrCode(user.email, secret);
      // We store secret temporarily in the user entity (or ideally a redis/cache)
      await this.userRepo.update(userId, { twoFactorSecret: secret, twoFactorMethod: 'authenticator' });
      return { qrCode, secret };
    } else {
      const code = this.mfaService.generateEmailCode();
      await this.userRepo.update(userId, { twoFactorSecret: code, twoFactorMethod: 'email' });
      await this.mailService.sendMfaCode(user.email, code);
      return { message: 'Code sent to email' };
    }
  }

  async setupMfaConfirm(userId: string, code: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user || !user.twoFactorSecret) throw new UnauthorizedException();

    let isValid = false;
    if (user.twoFactorMethod === 'authenticator') {
      isValid = await this.mfaService.verifyToken(code, user.twoFactorSecret);
    } else {
      isValid = user.twoFactorSecret === code;
    }

    if (!isValid) throw new UnauthorizedException('Invalid MFA code');

    await this.userRepo.update(userId, { isTwoFactorEnabled: true });
    return { access_token: this.generateToken(user) };
  }

  async verifyMfa(userId: string, code: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user || !user.isTwoFactorEnabled || !user.twoFactorSecret) {
      throw new UnauthorizedException('MFA not enabled');
    }

    let isValid = false;
    if (user.twoFactorMethod === 'authenticator') {
      isValid = await this.mfaService.verifyToken(code, user.twoFactorSecret);
    } else {
      isValid = user.twoFactorSecret === code;
    }

    if (!isValid) throw new UnauthorizedException('Invalid MFA code');

    return { access_token: this.generateToken(user) };
  }

  async resendEmailCode(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user || user.twoFactorMethod !== 'email') throw new UnauthorizedException();

    const code = this.mfaService.generateEmailCode();
    await this.userRepo.update(userId, { twoFactorSecret: code });
    await this.mailService.sendMfaCode(user.email, code);
    return { message: 'Code resent' };
  }

  generateToken(user: User): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
    };
    return this.jwtService.sign(payload);
  }

  generateTempToken(user: User): string {
    const payload = {
      sub: user.id,
      mfaPending: true,
    };
    return this.jwtService.sign(payload, { expiresIn: '10m' });
  }
}
