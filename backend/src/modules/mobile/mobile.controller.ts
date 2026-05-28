import { Body, Controller, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { UserRole } from '@/database/entities/user.entity';
import { MobileNotificationsService } from './mobile-notifications.service';
import {
  AdminMockSendDto,
  MarkNotificationReadParamsDto,
  MobileCursorPageQueryDto,
  MobileSyncQueryDto,
  RegisterMobileDeviceDto,
} from './dto/mobile-v1.dto';
import { MobileRateLimitGuard } from './guards/mobile-rate-limit.guard';
import { MobileDeviceSignatureGuard } from './guards/mobile-device-signature.guard';

@Controller('mobile/v1')
@UseGuards(RolesGuard, MobileRateLimitGuard, MobileDeviceSignatureGuard)
@Roles(UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.AGENT)
export class MobileController {
  constructor(private readonly mobileService: MobileNotificationsService) {}

  @Get('inbox')
  inbox(@Request() req: any, @Query() query: MobileCursorPageQueryDto) {
    return this.mobileService.getCompactInboxV1(req.tenantId, query);
  }

  @Get('tasks')
  tasks(@Request() req: any, @Query() query: MobileCursorPageQueryDto) {
    return this.mobileService.getCompactTasksV1(req.tenantId, query);
  }

  @Get('calendar')
  calendar(@Request() req: any, @Query() query: MobileCursorPageQueryDto) {
    return this.mobileService.getCompactCalendarV1(req.tenantId, query);
  }

  @Get('sync')
  sync(@Request() req: any, @Query() query: MobileSyncQueryDto) {
    return this.mobileService.getIncrementalSyncV1(req.tenantId, req.user.id, query);
  }

  @Get('notifications/feed')
  notificationsFeed(@Request() req: any, @Query() query: MobileCursorPageQueryDto) {
    return this.mobileService.getCompactNotificationFeedV1(req.tenantId, req.user.id, query);
  }

  @Post('devices')
  registerDevice(@Request() req: any, @Body() body: RegisterMobileDeviceDto) {
    return this.mobileService.registerDevice({
      tenantId: req.tenantId,
      userId: req.user.id,
      token: body.token,
      platform: body.platform,
      appVersion: body.appVersion,
      metadata: body.metadata,
    });
  }

  @Get('notifications')
  listNotifications(@Request() req: any, @Query() query: MobileCursorPageQueryDto) {
    return this.mobileService.getNotificationsV1(req.tenantId, req.user.id, query);
  }

  @Patch('notifications/:id/read')
  async markRead(@Request() req: any, @Param() params: MarkNotificationReadParamsDto) {
    const notification = await this.mobileService.markAsRead(req.tenantId, req.user.id, params.id);
    return { success: !!notification, notification };
  }

  @Post('admin/mock-send')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  async mockSend(@Request() req: any, @Body() body: AdminMockSendDto) {
    return this.mobileService.createAndDispatch({
      tenantId: req.tenantId,
      userId: body.userId ?? null,
      type: body.type || 'manual.test',
      title: body.title,
      body: body.body,
      payload: body.payload || {},
    });
  }
}
