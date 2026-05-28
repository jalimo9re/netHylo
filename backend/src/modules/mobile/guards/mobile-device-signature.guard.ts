import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';

@Injectable()
export class MobileDeviceSignatureGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const deviceId = request.headers['x-device-id'] as string | undefined;
    const signature = request.headers['x-device-signature'] as string | undefined;
    const timestampHeader = request.headers['x-device-timestamp'] as string | undefined;

    // Signature is optional; if headers are omitted we allow the request.
    if (!deviceId && !signature && !timestampHeader) {
      return true;
    }

    if (!deviceId || !signature || !timestampHeader) {
      throw new UnauthorizedException('Incomplete mobile device signature headers');
    }

    const timestampMs = Number(timestampHeader);
    if (!Number.isFinite(timestampMs)) {
      throw new UnauthorizedException('Invalid mobile signature timestamp');
    }

    const maxSkewMs = 5 * 60 * 1000;
    if (Math.abs(Date.now() - timestampMs) > maxSkewMs) {
      throw new UnauthorizedException('Expired mobile signature timestamp');
    }

    const secret = this.configService.get<string>('MOBILE_DEVICE_SIGNATURE_SECRET', '').trim();
    if (!secret) {
      throw new UnauthorizedException('Device signature secret not configured');
    }

    const path = request.originalUrl?.split('?')[0] ?? request.path ?? '';
    const payload = `${deviceId}.${timestampHeader}.${request.method}.${path}`;
    const expectedSignature = createHmac('sha256', secret).update(payload).digest('hex');

    const signatureBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    if (
      signatureBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
      throw new UnauthorizedException('Invalid mobile device signature');
    }

    return true;
  }
}
