import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { StructuredLogger } from '@/common/logging/structured-logger.service';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: StructuredLogger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse = isHttpException ? exception.getResponse() : null;
    const message = this.extractMessage(exceptionResponse);
    const error = isHttpException ? exception.name : 'InternalServerError';

    const payload = {
      statusCode: status,
      error,
      message,
      path: request.originalUrl ?? request.url,
      method: request.method,
      timestamp: new Date().toISOString(),
      requestId: String((request.headers['x-request-id'] as string) ?? ''),
    };

    if (status >= 500) {
      this.logger.error(
        `Unhandled exception at ${payload.method} ${payload.path}`,
        exception instanceof Error ? exception.stack : undefined,
        'GlobalExceptionFilter',
      );
    } else {
      this.logger.warn(
        `Handled exception (${status}) at ${payload.method} ${payload.path}`,
        'GlobalExceptionFilter',
      );
    }

    response.status(status).json(payload);
  }

  private extractMessage(response: unknown): string | string[] {
    if (typeof response === 'string') {
      return response;
    }

    if (
      response &&
      typeof response === 'object' &&
      'message' in response
    ) {
      return (response as { message: string | string[] }).message;
    }

    return 'Internal server error';
  }
}
