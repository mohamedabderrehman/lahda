import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import * as admin from 'firebase-admin';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private firebaseInitialized = false;

  constructor(private prisma: PrismaService) {
    const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (!admin.apps.length) {
      try {
        if (credPath) {
          admin.initializeApp({ credential: admin.credential.cert(credPath) });
          this.firebaseInitialized = true;
          this.logger.log('Firebase Admin initialized (FCM enabled)');
        } else {
          this.logger.log('Push disabled: no explicit Firebase credentials configured');
        }
      } catch (err) {
        this.logger.warn(`Firebase Admin init failed – push notifications disabled. ${credPath ? 'Check service account file.' : 'Set GOOGLE_APPLICATION_CREDENTIALS in .env.'}`, (err as Error)?.message);
      }
    } else {
      this.firebaseInitialized = true;
    }
  }

  async sendToUser(userId: string, title: string, body: string, type = 'general', data?: Record<string, unknown>) {
    const notification = await this.prisma.notification.create({
      data: { userId, title, body, type, data: (data ?? undefined) as Prisma.InputJsonValue | undefined },
    });

    if (!this.firebaseInitialized) {
      this.logger.warn('Firebase Admin not initialized – skipping push');
      return notification;
    }

    // Collect tokens from multi-device table, fall back to legacy field
    const deviceTokens = await this.prisma.userDeviceToken
      .findMany({ where: { userId }, select: { token: true } })
      .then((rows) => rows.map((r) => r.token.trim()).filter(Boolean));

    if (deviceTokens.length === 0) {
      const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { fcmToken: true } });
      const legacy = user?.fcmToken?.trim();
      if (legacy) deviceTokens.push(legacy);
    }

    if (deviceTokens.length === 0) return notification;

    const dataPayload: Record<string, string> = {
      type: String(type),
      notificationId: String(notification.id),
      ...Object.fromEntries(
        Object.entries(data ?? {}).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)]),
      ),
    };

    const sendPromises = deviceTokens.map((token) =>
      admin
        .messaging()
        .send({
          token,
          notification: { title, body },
          data: dataPayload,
          android: { notification: { channelId: 'default', sound: 'default' } },
        })
        .catch((err) => {
          this.logger.error(`Push failed for token ${token.slice(0, 12)}…:`, err);
          if ((err as { code?: string })?.code === 'messaging/registration-token-not-registered') {
            this.prisma.userDeviceToken.deleteMany({ where: { token } }).catch(() => {});
          }
        }),
    );

    await Promise.allSettled(sendPromises);
    return notification;
  }

  async sendToMultipleUsers(userIds: string[], title: string, body: string, type = 'general', data?: Record<string, unknown>) {
    const results = await Promise.allSettled(
      userIds.map((uid) => this.sendToUser(uid, title, body, type, data)),
    );
    return results;
  }

  async sendToRole(role: string, title: string, body: string, type = 'general', data?: Record<string, unknown>) {
    const users = await this.prisma.user.findMany({
      where: { role: role as any, isActive: true },
      select: { id: true },
    });
    return this.sendToMultipleUsers(users.map((u) => u.id), title, body, type, data);
  }

  async getForUser(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markAsRead(userId: string, notificationId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  /** For health check: returns whether FCM can send push notifications */
  isFcmEnabled(): boolean {
    return this.firebaseInitialized;
  }
}
