import { ConsoleLogger, Injectable, LogLevel } from '@nestjs/common';

type StructuredLogPayload = {
  level: LogLevel | 'fatal';
  timestamp: string;
  context?: string;
  message: string;
  trace?: string;
  metadata?: unknown;
};

@Injectable()
export class StructuredLogger extends ConsoleLogger {
  log(message: unknown, context?: string): void {
    this.writeStructuredLog({
      level: 'log',
      message: this.stringifyMessage(message),
      context,
    });
  }

  error(message: unknown, trace?: string, context?: string): void {
    this.writeStructuredLog({
      level: 'error',
      message: this.stringifyMessage(message),
      trace,
      context,
    });
  }

  warn(message: unknown, context?: string): void {
    this.writeStructuredLog({
      level: 'warn',
      message: this.stringifyMessage(message),
      context,
    });
  }

  debug(message: unknown, context?: string): void {
    this.writeStructuredLog({
      level: 'debug',
      message: this.stringifyMessage(message),
      context,
    });
  }

  verbose(message: unknown, context?: string): void {
    this.writeStructuredLog({
      level: 'verbose',
      message: this.stringifyMessage(message),
      context,
    });
  }

  logRequest(message: string, metadata?: unknown, context = 'HTTP'): void {
    this.writeStructuredLog({
      level: 'log',
      message,
      context,
      metadata,
    });
  }

  private writeStructuredLog(payload: Omit<StructuredLogPayload, 'timestamp'>): void {
    const entry: StructuredLogPayload = {
      ...payload,
      timestamp: new Date().toISOString(),
    };

    process.stdout.write(`${JSON.stringify(entry)}\n`);
  }

  protected stringifyMessage(message: unknown): string {
    if (typeof message === 'string') {
      return message;
    }

    try {
      return JSON.stringify(message);
    } catch {
      return String(message);
    }
  }
}
