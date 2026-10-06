import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';

@Injectable()
export class MerchantsService {
  constructor(private prisma: PrismaService) {}

  async listPublic(lat?: number, lng?: number, categoryId?: string) {
    const where: { isApproved: boolean; isOpen?: boolean; categories?: { some: { categoryId: string } } } = {
      isApproved: true,
    };
    if (categoryId) where.categories = { some: { categoryId } };
    const list = await this.prisma.merchantProfile.findMany({
      where,
      include: {
        categories: { include: { category: true } },
        _count: { select: { products: true } },
      },
      orderBy: { storeName: 'asc' },
    });
    if (lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)) {
      const withDistance = list.map((m) => ({
        ...m,
        _distance: this.haversineKm(lat, lng, m.latitude ?? 0, m.longitude ?? 0),
      }));
      withDistance.sort((a, b) => a._distance - b._distance);
      return withDistance.map(({ _distance, ...rest }) => rest);
    }
    return list;
  }

  private haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  async getOnePublic(storeSlug: string) {
    const store = await this.prisma.merchantProfile.findFirst({
      where: { storeSlug, isApproved: true },
      include: {
        categories: { include: { category: true } },
        products: { where: { isAvailable: true }, orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!store) throw new NotFoundException('Store not found');
    return store;
  }

  async getMyStore(user: User) {
    if (user.role !== 'merchant') throw new ForbiddenException();
    const store = await this.prisma.merchantProfile.findUnique({
      where: { userId: user.id },
      include: { categories: { include: { category: true } }, products: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!store) throw new NotFoundException('Store not found');
    return store;
  }

  async updateMyStore(user: User, data: Record<string, unknown>) {
    if (user.role !== 'merchant') throw new ForbiddenException();
    const profile = await this.prisma.merchantProfile.findUnique({ where: { userId: user.id } });
    if (!profile) throw new NotFoundException('Store not found');
    // Merchants cannot modify deliveryFee as it's now centrally managed via pricingConfig
    const allowed = [
      'storeName', 'storeSlug', 'logoUrl', 'coverUrl', 'description', 'addressText', 'latitude', 'longitude',
      'phone', 'email', 'openingTime', 'closingTime', 'isOpen', 'minOrder',
      'hasOffers', 'ratingAvg', 'ratingCount', 'estimatedDeliveryMin', 'estimatedDeliveryMax', 'discountLabel',
    ];
    const update: Record<string, unknown> = {};
    for (const k of allowed) if (data[k] !== undefined) update[k] = data[k];
    return this.prisma.merchantProfile.update({
      where: { id: profile.id },
      data: update as never,
    });
  }

  async setStoreCategories(user: User, categoryIds: string[]) {
    if (user.role !== 'merchant') throw new ForbiddenException();
    const profile = await this.prisma.merchantProfile.findUnique({ where: { userId: user.id } });
    if (!profile) throw new NotFoundException('Store not found');
    await this.prisma.storeCategory.deleteMany({ where: { merchantProfileId: profile.id } });
    if (categoryIds.length)
      await this.prisma.storeCategory.createMany({
        data: categoryIds.map((categoryId) => ({ merchantProfileId: profile.id, categoryId })),
      });
    return this.getMyStore(user);
  }

  async getMyStats(user: User, from?: string, to?: string) {
    if (user.role !== 'merchant') throw new ForbiddenException();
    const profile = await this.prisma.merchantProfile.findUnique({ where: { userId: user.id } });
    if (!profile) throw new NotFoundException('Store not found');

    // Default to last 30 days if no range provided
    const toDate = to ? new Date(to) : new Date();
    const fromDate = from ? new Date(from) : new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    const where = {
      merchantProfileId: profile.id,
      createdAt: { gte: fromDate, lte: toDate },
    };

    const [
      totalOrders,
      deliveredOrdersAgg,
      cancelledOrdersAgg,
      revenueAgg,
      todayOrdersAgg,
      weekOrdersAgg,
      topProducts,
    ] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.aggregate({
        where: { ...where, status: 'delivered' },
        _count: { id: true },
      }),
      this.prisma.order.aggregate({
        where: { ...where, status: 'cancelled' },
        _count: { id: true },
      }),
      this.prisma.order.aggregate({
        where: { ...where, status: 'delivered' },
        _sum: { subtotal: true },
      }),
      this.prisma.order.count({
        where: {
          merchantProfileId: profile.id,
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
      this.prisma.order.count({
        where: {
          merchantProfileId: profile.id,
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
      this.prisma.orderItem.groupBy({
        by: ['productId'],
        where: { order: { merchantProfileId: profile.id, status: 'delivered' } },
        _sum: { quantity: true, subtotal: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),
    ]);

    const deliveredCount = deliveredOrdersAgg._count.id ?? 0;
    const cancelledCount = cancelledOrdersAgg._count.id ?? 0;
    const totalRevenue = Number(revenueAgg._sum.subtotal ?? 0);
    const avgOrderValue = deliveredCount > 0 ? Math.round(totalRevenue / deliveredCount) : 0;
    const cancellationRate = totalOrders > 0 ? Math.round((cancelledCount / totalOrders) * 100) : 0;

    return {
      summary: {
        totalOrders,
        deliveredCount,
        cancelledCount,
        cancellationRate,
        totalRevenue,
        avgOrderValue,
        todayOrders: todayOrdersAgg,
        weekOrders: weekOrdersAgg,
      },
      dateRange: { from: fromDate, to: toDate },
      topProducts: topProducts.map((p) => ({
        productId: p.productId,
        totalQuantity: p._sum.quantity ?? 0,
        totalRevenue: Number(p._sum.subtotal ?? 0),
      })),
    };
  }
}
