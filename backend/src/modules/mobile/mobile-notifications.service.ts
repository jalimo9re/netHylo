import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, IsNull, Repository } from 'typeorm';
import { CalendarEvent, CrmDeal, Message, NotificationDevice, NotificationEvent } from '@/database/entities';
import { MockPushProvider } from './providers/mock-push.provider';
import { PushProvider } from './providers/push-provider.interface';
import { MobileCursorPageQueryDto, MobileSyncQueryDto } from './dto/mobile-v1.dto';

type CursorPayload = {
  ts: string;
  id: string;
};

@Injectable()
export class MobileNotificationsService {
  private readonly pushProvider: PushProvider;

  constructor(
    @InjectRepository(NotificationDevice)
    private readonly deviceRepo: Repository<NotificationDevice>,
    @InjectRepository(NotificationEvent)
    private readonly eventRepo: Repository<NotificationEvent>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    @InjectRepository(CrmDeal)
    private readonly dealRepo: Repository<CrmDeal>,
    @InjectRepository(CalendarEvent)
    private readonly calendarRepo: Repository<CalendarEvent>,
    configService: ConfigService,
    mockPushProvider: MockPushProvider,
  ) {
    const useMock = configService.get<string>('MOBILE_PUSH_MOCK', 'true') === 'true';
    this.pushProvider = useMock ? mockPushProvider : mockPushProvider;
  }

  private normalizeLimit(limit: number | undefined, fallback = 25): number {
    const value = Number.isFinite(limit) ? Number(limit) : fallback;
    return Math.max(1, Math.min(value, 100));
  }

  private encodeCursor(ts: Date, id: string): string {
    return Buffer.from(JSON.stringify({ ts: ts.toISOString(), id } satisfies CursorPayload)).toString('base64url');
  }

  private decodeCursor(cursor?: string): CursorPayload | null {
    if (!cursor) return null;
    try {
      const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as CursorPayload;
      if (!parsed?.ts || !parsed?.id) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  async registerDevice(input: {
    tenantId: string;
    userId: string;
    token: string;
    platform: 'ios' | 'android' | 'web';
    appVersion?: string;
    metadata?: Record<string, any>;
  }) {
    const existing = await this.deviceRepo.findOne({ where: { token: input.token } });
    const now = new Date();

    if (existing) {
      existing.tenantId = input.tenantId;
      existing.userId = input.userId;
      existing.platform = input.platform;
      existing.appVersion = input.appVersion || null;
      existing.metadata = { ...(existing.metadata || {}), ...(input.metadata || {}) };
      existing.isActive = true;
      existing.lastSeenAt = now;
      return this.deviceRepo.save(existing);
    }

    return this.deviceRepo.save(
      this.deviceRepo.create({
        tenantId: input.tenantId,
        userId: input.userId,
        token: input.token,
        platform: input.platform,
        appVersion: input.appVersion || null,
        metadata: input.metadata || {},
        isActive: true,
        lastSeenAt: now,
      }),
    );
  }

  async listNotifications(tenantId: string, userId: string, limit = 30) {
    return this.eventRepo.find({
      where: [
        { tenantId, userId },
        { tenantId, userId: IsNull() },
      ],
      order: { createdAt: 'DESC' },
      take: Math.max(1, Math.min(limit, 100)),
    });
  }

  async markAsRead(tenantId: string, userId: string, notificationId: string) {
    const event = await this.eventRepo.findOne({
      where: [
        { id: notificationId, tenantId, userId },
        { id: notificationId, tenantId, userId: IsNull() },
      ],
    });
    if (!event) return null;
    event.isRead = true;
    event.readAt = new Date();
    return this.eventRepo.save(event);
  }

  async createAndDispatch(input: {
    tenantId: string;
    userId?: string | null;
    type: string;
    title: string;
    body: string;
    payload?: Record<string, any>;
  }) {
    const event = await this.eventRepo.save(
      this.eventRepo.create({
        tenantId: input.tenantId,
        userId: input.userId ?? null,
        type: input.type,
        title: input.title,
        body: input.body,
        payload: input.payload || {},
        isRead: false,
        readAt: null,
        status: 'pending',
      }),
    );

    const devices = await this.deviceRepo.find({
      where: {
        tenantId: input.tenantId,
        ...(input.userId ? { userId: input.userId } : {}),
        isActive: true,
      },
    });
    const tokens = devices.map((d) => d.token).filter(Boolean);
    const pushResult = await this.pushProvider.send(tokens, {
      title: input.title,
      body: input.body,
      data: {
        notificationId: event.id,
        type: input.type,
        ...(input.payload || {}),
      },
    });

    event.deliveryCount = pushResult.delivered;
    event.status = pushResult.failed > 0 ? 'failed' : 'delivered';
    await this.eventRepo.save(event);
    return event;
  }

  async getCompactInboxV1(tenantId: string, query: MobileCursorPageQueryDto) {
    const limit = this.normalizeLimit(query.limit, 20);
    const cursor = this.decodeCursor(query.cursor);

    const qb = this.messageRepo.createQueryBuilder('message').where('message.tenantId = :tenantId', { tenantId });
    if (cursor) {
      qb.andWhere(
        '(message.createdAt < :cursorTs OR (message.createdAt = :cursorTs AND message.id < :cursorId))',
        { cursorTs: cursor.ts, cursorId: cursor.id },
      );
    }
    const entities = await qb.orderBy('message.createdAt', 'DESC').addOrderBy('message.id', 'DESC').take(limit + 1).getMany();

    const hasMore = entities.length > limit;
    const slice = entities.slice(0, limit);
    const nextCursor =
      hasMore && slice.length > 0
        ? this.encodeCursor(slice[slice.length - 1].createdAt, slice[slice.length - 1].id)
        : null;

    return {
      items: slice.map((item) => ({
        id: item.id,
        conversationId: item.conversationId,
        direction: item.direction,
        type: item.type,
        status: item.status,
        content: item.content,
        updatedAt: item.createdAt.toISOString(),
      })),
      page: { nextCursor, hasMore, limit },
    };
  }

  async getCompactTasksV1(tenantId: string, query: MobileCursorPageQueryDto) {
    const limit = this.normalizeLimit(query.limit, 20);
    const cursor = this.decodeCursor(query.cursor);
    const qb = this.dealRepo.createQueryBuilder('deal').where('deal.tenantId = :tenantId', { tenantId });
    if (cursor) {
      qb.andWhere('(deal.updatedAt < :cursorTs OR (deal.updatedAt = :cursorTs AND deal.id < :cursorId))', {
        cursorTs: cursor.ts,
        cursorId: cursor.id,
      });
    }
    const entities = await qb.orderBy('deal.updatedAt', 'DESC').addOrderBy('deal.id', 'DESC').take(limit + 1).getMany();
    const hasMore = entities.length > limit;
    const slice = entities.slice(0, limit);
    const nextCursor =
      hasMore && slice.length > 0
        ? this.encodeCursor(slice[slice.length - 1].updatedAt, slice[slice.length - 1].id)
        : null;

    return {
      items: slice.map((item) => ({
        id: item.id,
        title: item.title,
        stage: item.stage,
        amount: item.amount,
        probability: item.probability,
        updatedAt: item.updatedAt.toISOString(),
      })),
      page: { nextCursor, hasMore, limit },
    };
  }

  async getCompactCalendarV1(tenantId: string, query: MobileCursorPageQueryDto) {
    const limit = this.normalizeLimit(query.limit, 20);
    const cursor = this.decodeCursor(query.cursor);
    const qb = this.calendarRepo.createQueryBuilder('event').where('event.tenantId = :tenantId', { tenantId });
    if (cursor) {
      qb.andWhere('(event.updatedAt < :cursorTs OR (event.updatedAt = :cursorTs AND event.id < :cursorId))', {
        cursorTs: cursor.ts,
        cursorId: cursor.id,
      });
    }
    const entities = await qb.orderBy('event.updatedAt', 'DESC').addOrderBy('event.id', 'DESC').take(limit + 1).getMany();
    const hasMore = entities.length > limit;
    const slice = entities.slice(0, limit);
    const nextCursor =
      hasMore && slice.length > 0
        ? this.encodeCursor(slice[slice.length - 1].updatedAt, slice[slice.length - 1].id)
        : null;

    return {
      items: slice.map((item) => ({
        id: item.id,
        title: item.title,
        startAt: item.startAt.toISOString(),
        endAt: item.endAt.toISOString(),
        timezone: item.timezone,
        updatedAt: item.updatedAt.toISOString(),
      })),
      page: { nextCursor, hasMore, limit },
    };
  }

  async getNotificationsV1(tenantId: string, userId: string, query: MobileCursorPageQueryDto) {
    const limit = this.normalizeLimit(query.limit, 30);
    const cursor = this.decodeCursor(query.cursor);

    const qb = this.eventRepo
      .createQueryBuilder('event')
      .where('event.tenantId = :tenantId', { tenantId })
      .andWhere(
        new Brackets((scope) => {
          scope.where('event.userId = :userId', { userId }).orWhere('event.userId IS NULL');
        }),
      );

    if (cursor) {
      qb.andWhere('(event.createdAt < :cursorTs OR (event.createdAt = :cursorTs AND event.id < :cursorId))', {
        cursorTs: cursor.ts,
        cursorId: cursor.id,
      });
    }

    const entities = await qb.orderBy('event.createdAt', 'DESC').addOrderBy('event.id', 'DESC').take(limit + 1).getMany();
    const hasMore = entities.length > limit;
    const slice = entities.slice(0, limit);
    const nextCursor =
      hasMore && slice.length > 0
        ? this.encodeCursor(slice[slice.length - 1].createdAt, slice[slice.length - 1].id)
        : null;

    return {
      items: slice.map((item) => ({
        id: item.id,
        type: item.type,
        title: item.title,
        body: item.body,
        status: item.status,
        isRead: item.isRead,
        updatedAt: item.readAt?.toISOString() ?? item.createdAt.toISOString(),
      })),
      page: { nextCursor, hasMore, limit },
    };
  }

  async getCompactNotificationFeedV1(tenantId: string, userId: string, query: MobileCursorPageQueryDto) {
    const [page, unread] = await Promise.all([
      this.getNotificationsV1(tenantId, userId, query),
      this.eventRepo
        .createQueryBuilder('event')
        .where('event.tenantId = :tenantId', { tenantId })
        .andWhere(
          new Brackets((scope) => {
            scope.where('event.userId = :userId', { userId }).orWhere('event.userId IS NULL');
          }),
        )
        .andWhere('event.isRead = false')
        .getCount(),
    ]);
    return {
      unread,
      items: page.items.map((item) => ({
        id: item.id,
        type: item.type,
        title: item.title,
        body: item.body,
        isRead: item.isRead,
        updatedAt: item.updatedAt,
      })),
      page: page.page,
    };
  }

  async getIncrementalSyncV1(tenantId: string, userId: string, query: MobileSyncQueryDto) {
    const since = new Date(query.since);
    const limit = this.normalizeLimit(query.limit, 50);
    const cursor = this.decodeCursor(query.cursor);

    if (query.stream === 'tasks') {
      const qb = this.dealRepo
        .createQueryBuilder('deal')
        .where('deal.tenantId = :tenantId', { tenantId })
        .andWhere('deal.updatedAt > :since', { since });
      if (cursor) {
        qb.andWhere('(deal.updatedAt < :cursorTs OR (deal.updatedAt = :cursorTs AND deal.id < :cursorId))', {
          cursorTs: cursor.ts,
          cursorId: cursor.id,
        });
      }
      const rows = await qb.orderBy('deal.updatedAt', 'DESC').addOrderBy('deal.id', 'DESC').take(limit + 1).getMany();
      return this.buildSyncResponse(
        'tasks',
        rows,
        limit,
        (item) => ({ id: item.id, title: item.title, stage: item.stage, updatedAt: item.updatedAt.toISOString() }),
        (item) => ({ ts: item.updatedAt, id: item.id }),
      );
    }

    if (query.stream === 'calendar') {
      const qb = this.calendarRepo
        .createQueryBuilder('event')
        .where('event.tenantId = :tenantId', { tenantId })
        .andWhere('event.updatedAt > :since', { since });
      if (cursor) {
        qb.andWhere('(event.updatedAt < :cursorTs OR (event.updatedAt = :cursorTs AND event.id < :cursorId))', {
          cursorTs: cursor.ts,
          cursorId: cursor.id,
        });
      }
      const rows = await qb.orderBy('event.updatedAt', 'DESC').addOrderBy('event.id', 'DESC').take(limit + 1).getMany();
      return this.buildSyncResponse(
        'calendar',
        rows,
        limit,
        (item) => ({
          id: item.id,
          title: item.title,
          startAt: item.startAt.toISOString(),
          endAt: item.endAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
        }),
        (item) => ({ ts: item.updatedAt, id: item.id }),
      );
    }

    if (query.stream === 'inbox') {
      const qb = this.messageRepo
        .createQueryBuilder('message')
        .where('message.tenantId = :tenantId', { tenantId })
        .andWhere('message.createdAt > :since', { since });
      if (cursor) {
        qb.andWhere(
          '(message.createdAt < :cursorTs OR (message.createdAt = :cursorTs AND message.id < :cursorId))',
          {
            cursorTs: cursor.ts,
            cursorId: cursor.id,
          },
        );
      }
      const rows = await qb
        .orderBy('message.createdAt', 'DESC')
        .addOrderBy('message.id', 'DESC')
        .take(limit + 1)
        .getMany();
      return this.buildSyncResponse(
        'inbox',
        rows,
        limit,
        (item) => ({
          id: item.id,
          conversationId: item.conversationId,
          content: item.content,
          type: item.type,
          updatedAt: item.createdAt.toISOString(),
        }),
        (item) => ({ ts: item.createdAt, id: item.id }),
      );
    }

    const qb = this.eventRepo
      .createQueryBuilder('event')
      .where('event.tenantId = :tenantId', { tenantId })
      .andWhere(
        new Brackets((scope) => {
          scope.where('event.userId = :userId', { userId }).orWhere('event.userId IS NULL');
        }),
      )
      .andWhere('(COALESCE(event.readAt, event.createdAt) > :since)', { since });

    if (cursor) {
      qb.andWhere('(event.createdAt < :cursorTs OR (event.createdAt = :cursorTs AND event.id < :cursorId))', {
        cursorTs: cursor.ts,
        cursorId: cursor.id,
      });
    }
    const rows = await qb.orderBy('event.createdAt', 'DESC').addOrderBy('event.id', 'DESC').take(limit + 1).getMany();
    return this.buildSyncResponse(
      'notifications',
      rows,
      limit,
      (item) => ({
        id: item.id,
        type: item.type,
        title: item.title,
        body: item.body,
        isRead: item.isRead,
        updatedAt: item.readAt?.toISOString() ?? item.createdAt.toISOString(),
      }),
      (item) => ({ ts: item.createdAt, id: item.id }),
    );
  }

  private buildSyncResponse<T extends { id: string }>(
    stream: MobileSyncQueryDto['stream'],
    rows: T[],
    limit: number,
    mapper: (row: T) => Record<string, unknown>,
    cursorFactory: (row: T) => { ts: Date; id: string },
  ) {
    const hasMore = rows.length > limit;
    const slice = rows.slice(0, limit);
    const nextCursor =
      hasMore && slice.length > 0
        ? this.encodeCursor(cursorFactory(slice[slice.length - 1]).ts, cursorFactory(slice[slice.length - 1]).id)
        : null;

    return {
      stream,
      items: slice.map(mapper),
      page: { nextCursor, hasMore, limit },
    };
  }
}
