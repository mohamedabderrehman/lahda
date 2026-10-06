import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { NotificationsService } from './notifications/notifications.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly notifications: NotificationsService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('health/fcm')
  fcmStatus() {
    return {
      fcmEnabled: this.notifications.isFcmEnabled(),
      message: this.notifications.isFcmEnabled()
        ? 'Firebase FCM initialized – push notifications can be sent'
        : 'Firebase not initialized – set GOOGLE_APPLICATION_CREDENTIALS',
    };
  }
}
