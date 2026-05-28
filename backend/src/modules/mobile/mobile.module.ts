import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CalendarEvent, CrmDeal, Message, NotificationDevice, NotificationEvent } from '@/database/entities';
import { MobileController } from './mobile.controller';
import { MobileNotificationsService } from './mobile-notifications.service';
import { MockPushProvider } from './providers/mock-push.provider';
import { MobileRateLimitGuard } from './guards/mobile-rate-limit.guard';
import { MobileDeviceSignatureGuard } from './guards/mobile-device-signature.guard';

@Module({
  imports: [TypeOrmModule.forFeature([NotificationDevice, NotificationEvent, Message, CrmDeal, CalendarEvent])],
  controllers: [MobileController],
  providers: [MobileNotificationsService, MockPushProvider, MobileRateLimitGuard, MobileDeviceSignatureGuard],
  exports: [MobileNotificationsService],
})
export class MobileModule {}
