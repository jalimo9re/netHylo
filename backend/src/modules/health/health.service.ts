import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { DataSource } from 'typeorm';
import { readFileSync } from 'fs';
import { join } from 'path';

@Injectable()
export class HealthService {
  private readonly startedAt = Date.now();
  private readonly appVersion: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    @InjectQueue('webhooks') private readonly webhooksQueue: Queue,
    @InjectQueue('automation') private readonly automationQueue: Queue,
  ) {
    this.appVersion =
      this.configService.get<string>('APP_VERSION') ?? this.resolvePackageVersion();
  }

  async getLiveness() {
    return {
      status: 'ok',
      service: 'nethylo-api',
      timestamp: new Date().toISOString(),
      version: this.appVersion,
      uptimeSeconds: Math.round((Date.now() - this.startedAt) / 1000),
    };
  }

  async getReadiness() {
    const [dbReady, redisReady, queueStats] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.getQueueMetrics(),
    ]);

    const queuesReady = queueStats.status === 'ok';
    const ready = dbReady && redisReady && queuesReady;
    const commitSha = this.configService.get<string>('APP_COMMIT_SHA', 'unknown');
    const now = new Date().toISOString();

    return {
      status: ready ? 'ready' : 'degraded',
      service: 'nethylo-api',
      timestamp: now,
      version: this.appVersion,
      commitSha,
      checks: {
        database: dbReady ? 'up' : 'down',
        redis: redisReady ? 'up' : 'down',
        queues: queuesReady ? 'up' : 'down',
      },
      queues: queueStats.queues,
      runtime: {
        node: process.version,
        uptimeSeconds: Math.round(process.uptime()),
      },
    };
  }

  async getMetrics() {
    const [queueStats, redisReady] = await Promise.all([
      this.getQueueMetrics(),
      this.checkRedis(),
    ]);

    return {
      status: queueStats.status,
      queues: queueStats.queues,
      redis: redisReady ? 'up' : 'down',
      version: this.appVersion,
      process: {
        memoryRssBytes: process.memoryUsage().rss,
        uptimeSeconds: Math.round(process.uptime()),
      },
      timestamp: new Date().toISOString(),
    };
  }

  private resolvePackageVersion(): string {
    try {
      const packageJsonPath = join(process.cwd(), 'package.json');
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8')) as {
        version?: string;
      };
      return packageJson.version ?? '0.0.0-dev';
    } catch {
      return '0.0.0-dev';
    }
  }

  private async checkDatabase() {
    try {
      await this.dataSource.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  private async checkRedis() {
    const host = this.configService.get<string>('REDIS_HOST', 'localhost');
    const port = this.configService.get<number>('REDIS_PORT', 6379);
    const redis = new Redis({
      host,
      port,
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
      lazyConnect: true,
    });

    try {
      await redis.connect();
      const pong = await redis.ping();
      return pong === 'PONG';
    } catch {
      return false;
    } finally {
      redis.disconnect();
    }
  }

  private async getQueueMetrics() {
    try {
      const [webhooks, automation] = await Promise.all([
        this.webhooksQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed'),
        this.automationQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed'),
      ]);
      return {
        status: 'ok',
        queues: {
          webhooks,
          automation,
        },
      };
    } catch {
      return {
        status: 'degraded',
        queues: {
          webhooks: null,
          automation: null,
        },
      };
    }
  }
}
