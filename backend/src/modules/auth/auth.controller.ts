import { Controller, Post, Body, UnauthorizedException, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Public } from '@/common/guards/jwt-auth.guard';
import { JwtService } from '@nestjs/jwt';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private jwtService: JwtService
  ) {}

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('mfa/verify')
  async verifyMfa(@Body() body: { tempToken: string; code: string }) {
    const payload = this.verifyTempToken(body.tempToken);
    return this.authService.verifyMfa(payload.sub, body.code);
  }

  @Public()
  @Post('mfa/setup-init')
  async setupInit(@Body() body: { tempToken: string; method: 'authenticator' | 'email' }) {
    const payload = this.verifyTempToken(body.tempToken);
    return this.authService.setupMfaInit(payload.sub, body.method);
  }

  @Public()
  @Post('mfa/setup-confirm')
  async setupConfirm(@Body() body: { tempToken: string; code: string }) {
    const payload = this.verifyTempToken(body.tempToken);
    return this.authService.setupMfaConfirm(payload.sub, body.code);
  }

  @Public()
  @Post('mfa/resend')
  async resend(@Body() body: { tempToken: string }) {
    const payload = this.verifyTempToken(body.tempToken);
    return this.authService.resendEmailCode(payload.sub);
  }

  private verifyTempToken(token: string) {
    try {
      const payload = this.jwtService.verify(token);
      if (!payload.mfaPending) throw new Error();
      return payload;
    } catch {
      throw new UnauthorizedException('Invalid or expired temporary token');
    }
  }
}
