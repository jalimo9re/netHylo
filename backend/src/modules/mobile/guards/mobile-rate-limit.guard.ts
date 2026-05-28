import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';

type Bucket = { count: number; startedAtMs: number };

@Injectable()
export class MobileRateLimitGuard implements CanActivate {
  private readonly windowMs = 60_000;
  private readonly maxRequests = 120;
  private readonly buckets = new Map<string, Bucket>();

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const now = Date.now();
    const routeKey = request.route?.path ?? request.path ?? 'unknown';
    const identity = `${request.tenantId ?? 'tenant'}:${request.user?.id ?? 'anon'}:${request.ip ?? 'ip'}:${routeKey}`;

    const bucket = this.buckets.get(identity);
    if (!bucket || now - bucket.startedAtMs >= this.windowMs) {
      this.buckets.set(identity, { count: 1, startedAtMs: now });
      return true;
    }

    if (bucket.count >= this.maxRequests) {
      throw new HttpException('Mobile rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
    }

    bucket.count += 1;
    return true;
  }
}
