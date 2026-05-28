import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { randomUUID } from 'crypto';
import { StructuredLogger } from '@/common/logging/structured-logger.service';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: StructuredLogger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const start = Date.now();
    const requestId = request.headers['x-request-id'] || randomUUID();
    response.setHeader('x-request-id', requestId);

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.logRequest('Request completed', {
            requestId,
            method: request.method,
            path: request.originalUrl ?? request.url,
            statusCode: response.statusCode,
            durationMs: Date.now() - start,
            tenantId: request.tenantId ?? null,
            userId: request.user?.id ?? null,
            ip: request.ip,
          });
        },
        error: () => {
          this.logger.logRequest('Request failed', {
            requestId,
            method: request.method,
            path: request.originalUrl ?? request.url,
            statusCode: response.statusCode,
            durationMs: Date.now() - start,
            tenantId: request.tenantId ?? null,
            userId: request.user?.id ?? null,
            ip: request.ip,
          });
        },
      }),
    );
  }
}
