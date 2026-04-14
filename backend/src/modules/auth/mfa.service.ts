import { Injectable } from '@nestjs/common';
import { generateSecret, generateURI, verify } from 'otplib';
import * as qrcode from 'qrcode';

@Injectable()
export class MfaService {
  generateSecret() {
    return generateSecret();
  }

  generateQrCode(email: string, secret: string) {
    const otpauth = generateURI({
      issuer: 'netHylo',
      label: email,
      secret
    });
    return qrcode.toDataURL(otpauth);
  }

  async verifyToken(token: string, secret: string) {
    const result = await verify({ token, secret });
    return result.valid;
  }

  generateEmailCode(): string {
    // Generate a 6-digit random code
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}
