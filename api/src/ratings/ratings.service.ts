import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, OrderStatus } from '@prisma/client';

@Injectable()
export class RatingsService {
  constructor(private prisma: PrismaService) {}

  async rateStore(
    user: User,
    data: { orderId: string; stars: number; comment?: string },
  ) {
    if (user.role !== 'customer') throw new ForbiddenException();
    if (!data.stars || data.stars < 1 || data.stars > 5)
      throw new BadRequestException('Stars must be between 1 and 5');

    const order = await this.prisma.order.findUnique({
      where: { id: data.orderId },
      include: { merchantProfile: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.customerId !== user.id) throw new ForbiddenException();
    if (order.status !== OrderStatus.delivered)
      throw new BadRequestException('Order must be delivered');
    if (order.storeRatedAt)
      throw new ConflictException('Store already rated for this order');

    return this.prisma.$transaction(async (tx) => {
      const rating = await tx.rating.create({
        data: {
          orderId: data.orderId,
          raterId: user.id,
          targetType: 'store',
          targetId: order.merchantProfileId,
          stars: data.stars,
          comment: data.comment?.trim() || null,
        },
      });

      await tx.order.update({
        where: { id: data.orderId },
        data: { storeRatedAt: new Date() },
      });

      const agg = await tx.rating.aggregate({
        where: { targetType: 'store', targetId: order.merchantProfileId },
        _avg: { stars: true },
        _count: { stars: true },
      });

      await tx.merchantProfile.update({
        where: { id: order.merchantProfileId },
        data: {
          ratingAvg: Math.round((agg._avg.stars ?? 0) * 10) / 10,
          ratingCount: agg._count.stars ?? 0,
        },
      });

      return rating;
    });
  }

  async rateDriver(
    user: User,
    data: { orderId: string; stars: number; comment?: string },
  ) {
    if (user.role !== 'customer') throw new ForbiddenException();
    if (!data.stars || data.stars < 1 || data.stars > 5)
      throw new BadRequestException('Stars must be between 1 and 5');

    const order = await this.prisma.order.findUnique({
      where: { id: data.orderId },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.customerId !== user.id) throw new ForbiddenException();
    if (order.status !== OrderStatus.delivered)
      throw new BadRequestException('Order must be delivered');
    if (!order.driverId)
      throw new BadRequestException('No driver assigned to this order');
    if (order.driverRatedAt)
      throw new ConflictException('Driver already rated for this order');

    const driverProfile = await this.prisma.driverProfile.findUnique({
      where: { userId: order.driverId },
    });
    if (!driverProfile) throw new NotFoundException('Driver profile not found');

    return this.prisma.$transaction(async (tx) => {
      const rating = await tx.rating.create({
        data: {
          orderId: data.orderId,
          raterId: user.id,
          targetType: 'driver',
          targetId: driverProfile.id,
          stars: data.stars,
          comment: data.comment?.trim() || null,
        },
      });

      await tx.order.update({
        where: { id: data.orderId },
        data: { driverRatedAt: new Date() },
      });

      const agg = await tx.rating.aggregate({
        where: { targetType: 'driver', targetId: driverProfile.id },
        _avg: { stars: true },
        _count: { stars: true },
      });

      await tx.driverProfile.update({
        where: { id: driverProfile.id },
        data: {
          ratingAvg: Math.round((agg._avg.stars ?? 0) * 10) / 10,
          ratingCount: agg._count.stars ?? 0,
        },
      });

      return rating;
    });
  }

  async listRatings(
    user: User,
    query: { targetType?: string; page?: number; limit?: number },
  ) {
    if (user.role !== 'admin') throw new ForbiddenException();
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const where = query.targetType ? { targetType: query.targetType } : {};

    const [items, total] = await Promise.all([
      this.prisma.rating.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          order: {
            select: { orderNumber: true },
          },
        },
      }),
      this.prisma.rating.count({ where }),
    ]);

    return { items, total, page, limit };
  }
}
