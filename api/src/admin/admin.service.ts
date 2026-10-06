import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  private ensureAdmin(user: User) {
    if (user.role !== 'admin') throw new ForbiddenException();
  }

  async getStats(user: User) {
    this.ensureAdmin(user);
    const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
    const [usersCount, merchantsCount, driversCount, ordersCount, ordersToday, revenueResult, ratingsCount] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.merchantProfile.count(),
      this.prisma.driverProfile.count(),
      this.prisma.order.count(),
      this.prisma.order.count({ where: { createdAt: { gte: todayStart } } }),
      this.prisma.order.aggregate({ where: { status: 'delivered' }, _sum: { total: true } }),
      this.prisma.rating.count(),
    ]);
    return {
      usersCount,
      merchantsCount,
      driversCount,
      ordersCount,
      ordersToday,
      totalRevenue: Number(revenueResult._sum.total ?? 0),
      ratingsCount,
    };
  }

  async getOrdersSeries(user: User, from?: string, to?: string) {
    this.ensureAdmin(user);
    const dateFrom = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const dateTo = to ? new Date(to) : new Date();
    dateTo.setHours(23, 59, 59, 999);

    const orders = await this.prisma.order.findMany({
      where: { createdAt: { gte: dateFrom, lte: dateTo } },
      select: { createdAt: true, total: true, status: true },
      orderBy: { createdAt: 'asc' },
    });

    const dayMap = new Map<string, { orders: number; revenue: number }>();
    for (const o of orders) {
      const day = o.createdAt.toISOString().slice(0, 10);
      const entry = dayMap.get(day) || { orders: 0, revenue: 0 };
      entry.orders++;
      if (o.status === 'delivered') entry.revenue += Number(o.total);
      dayMap.set(day, entry);
    }

    return Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, ...v }));
  }

  async getOrdersByStatus(user: User) {
    this.ensureAdmin(user);
    const statuses = ['pending', 'accepted_by_merchant', 'preparing', 'ready_for_pickup', 'picked_up', 'on_the_way', 'delivered', 'cancelled'];
    const counts = await Promise.all(
      statuses.map((s) => this.prisma.order.count({ where: { status: s as never } })),
    );
    return statuses.map((status, i) => ({ status, count: counts[i] }));
  }

  async getTopMerchants(user: User, by: 'orders' | 'revenue' = 'orders', limit = 10) {
    this.ensureAdmin(user);
    if (by === 'revenue') {
      const merchants = await this.prisma.merchantProfile.findMany({
        select: {
          id: true,
          storeName: true,
          ratingAvg: true,
          ratingCount: true,
          orders: { where: { status: 'delivered' }, select: { total: true } },
        },
      });
      return merchants
        .map((m) => ({
          id: m.id,
          storeName: m.storeName,
          ratingAvg: m.ratingAvg,
          ratingCount: m.ratingCount,
          totalRevenue: m.orders.reduce((s, o) => s + Number(o.total), 0),
          ordersCount: m.orders.length,
        }))
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, limit);
    }
    const merchants = await this.prisma.merchantProfile.findMany({
      select: {
        id: true,
        storeName: true,
        ratingAvg: true,
        ratingCount: true,
        _count: { select: { orders: true } },
      },
      orderBy: { orders: { _count: 'desc' } },
      take: limit,
    });
    return merchants.map((m) => ({
      id: m.id,
      storeName: m.storeName,
      ratingAvg: m.ratingAvg,
      ratingCount: m.ratingCount,
      ordersCount: m._count.orders,
    }));
  }

  async getTopDrivers(user: User, limit = 10) {
    this.ensureAdmin(user);
    const drivers = await this.prisma.driverProfile.findMany({
      select: {
        id: true,
        ratingAvg: true,
        ratingCount: true,
        user: { select: { fullName: true } },
        earnings: { select: { amount: true } },
      },
    });
    return drivers
      .map((d) => ({
        id: d.id,
        fullName: d.user.fullName,
        ratingAvg: d.ratingAvg,
        ratingCount: d.ratingCount,
        totalEarnings: d.earnings.reduce((s, e) => s + Number(e.amount), 0),
        deliveries: d.earnings.length,
      }))
      .sort((a, b) => b.deliveries - a.deliveries)
      .slice(0, limit);
  }

  async getRatingsOverview(user: User) {
    this.ensureAdmin(user);
    const [storeAgg, driverAgg, total] = await Promise.all([
      this.prisma.rating.aggregate({ where: { targetType: 'store' }, _avg: { stars: true }, _count: { stars: true } }),
      this.prisma.rating.aggregate({ where: { targetType: 'driver' }, _avg: { stars: true }, _count: { stars: true } }),
      this.prisma.rating.count(),
    ]);
    return {
      total,
      store: { avg: Math.round((storeAgg._avg.stars ?? 0) * 10) / 10, count: storeAgg._count.stars },
      driver: { avg: Math.round((driverAgg._avg.stars ?? 0) * 10) / 10, count: driverAgg._count.stars },
    };
  }

  async exportOrdersCsv(user: User, filters: { from?: string; to?: string; status?: string; merchantId?: string; driverId?: string }) {
    this.ensureAdmin(user);
    const where: Record<string, unknown> = {};
    if (filters.from || filters.to) {
      where.createdAt = {} as Record<string, unknown>;
      if (filters.from) (where.createdAt as Record<string, unknown>).gte = new Date(filters.from);
      if (filters.to) {
        const to = new Date(filters.to);
        to.setHours(23, 59, 59, 999);
        (where.createdAt as Record<string, unknown>).lte = to;
      }
    }
    if (filters.status) where.status = filters.status;
    if (filters.merchantId) where.merchantProfileId = filters.merchantId;
    if (filters.driverId) where.driverId = filters.driverId;

    const orders = await this.prisma.order.findMany({
      where: where as never,
      include: {
        customer: { select: { fullName: true, email: true } },
        merchantProfile: { select: { storeName: true } },
        driver: { select: { fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });

    const header = 'OrderNumber,Date,Customer,Store,Driver,Status,Subtotal,DeliveryFee,Total,PaymentMethod\n';
    const rows = orders.map((o) =>
      [
        o.orderNumber,
        o.createdAt.toISOString().slice(0, 10),
        `"${o.customer.fullName}"`,
        `"${o.merchantProfile.storeName}"`,
        `"${o.driver?.fullName ?? ''}"`,
        o.status,
        Number(o.subtotal),
        Number(o.deliveryFee),
        Number(o.total),
        o.paymentMethod,
      ].join(','),
    );
    return header + rows.join('\n');
  }

  async listUsers(user: User, page = 1, limit = 20) {
    this.ensureAdmin(user);
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        select: { id: true, email: true, fullName: true, phone: true, role: true, isActive: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count(),
    ]);
    return { items, total, page, limit };
  }

  async listMerchants(user: User, page = 1, limit = 20) {
    this.ensureAdmin(user);
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.merchantProfile.findMany({
        skip,
        take: limit,
        include: { user: { select: { email: true, fullName: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.merchantProfile.count(),
    ]);
    return { items, total, page, limit };
  }

  async listMerchantsAll(user: User) {
    this.ensureAdmin(user);
    return this.prisma.merchantProfile.findMany({
      where: { isApproved: true },
      select: { id: true, storeName: true, storeSlug: true, logoUrl: true },
      orderBy: { storeName: 'asc' },
    });
  }

  async listDrivers(user: User, page = 1, limit = 20) {
    this.ensureAdmin(user);
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.driverProfile.findMany({
        skip,
        take: limit,
        include: { user: { select: { id: true, email: true, fullName: true, phone: true, isActive: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.driverProfile.count(),
    ]);
    return { items, total, page, limit };
  }

  async createDriver(
    user: User,
    data: {
      email: string;
      password: string;
      fullName: string;
      phone?: string;
      nationalId?: string;
      vehicleInfo?: string;
      isApproved?: boolean;
    },
  ) {
    this.ensureAdmin(user);
    const passwordHash = await bcrypt.hash(data.password, 10);
    return this.prisma.$transaction(async (tx) => {
      const driverUser = await tx.user.create({
        data: {
          email: data.email,
          passwordHash,
          fullName: data.fullName,
          phone: data.phone,
          role: 'driver',
        },
      });
      const profile = await tx.driverProfile.create({
        data: {
          userId: driverUser.id,
          nationalId: data.nationalId,
          vehicleInfo: data.vehicleInfo,
          isApproved: data.isApproved ?? true,
          isOnline: false,
        },
      });
      return tx.driverProfile.findUnique({
        where: { id: profile.id },
        include: { user: { select: { id: true, email: true, fullName: true, phone: true, isActive: true } } },
      });
    });
  }

  async updateDriver(
    user: User,
    driverId: string,
    data: {
      email?: string;
      fullName?: string;
      phone?: string | null;
      isActive?: boolean;
      nationalId?: string;
      vehicleInfo?: string;
      isApproved?: boolean;
      newPassword?: string;
    },
  ) {
    this.ensureAdmin(user);
    const profile = await this.prisma.driverProfile.findUnique({
      where: { id: driverId },
      include: { user: true },
    });
    if (!profile) throw new NotFoundException('Driver not found');

    const updateUser: Record<string, unknown> = {};
    if (data.email !== undefined) updateUser.email = data.email;
    if (data.fullName !== undefined) updateUser.fullName = data.fullName;
    if (data.phone !== undefined) updateUser.phone = data.phone || null;
    if (data.isActive !== undefined) updateUser.isActive = data.isActive;
    if (data.newPassword !== undefined && data.newPassword.trim()) {
      updateUser.passwordHash = await bcrypt.hash(data.newPassword.trim(), 10);
    }

    const updateProfile: Record<string, unknown> = {};
    if (data.nationalId !== undefined) updateProfile.nationalId = data.nationalId;
    if (data.vehicleInfo !== undefined) updateProfile.vehicleInfo = data.vehicleInfo;
    if (data.isApproved !== undefined) updateProfile.isApproved = data.isApproved;

    return this.prisma.$transaction(async (tx) => {
      if (Object.keys(updateUser).length > 0) {
        await tx.user.update({
          where: { id: profile.userId },
          data: updateUser as never,
        });
      }
      if (Object.keys(updateProfile).length > 0) {
        await tx.driverProfile.update({
          where: { id: driverId },
          data: updateProfile as never,
        });
      }
      return tx.driverProfile.findUnique({
        where: { id: driverId },
        include: { user: { select: { id: true, email: true, fullName: true, phone: true, isActive: true } } },
      });
    });
  }

  async listOrders(user: User, page = 1, limit = 20, status?: string) {
    this.ensureAdmin(user);
    const skip = (page - 1) * limit;
    const where = status ? { status: status as never } : {};
    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        include: {
          customer: { select: { fullName: true, email: true } },
          merchantProfile: { select: { storeName: true } },
          driver: { select: { fullName: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async approveMerchant(user: User, merchantId: string, approved: boolean) {
    this.ensureAdmin(user);
    return this.prisma.merchantProfile.update({
      where: { id: merchantId },
      data: { isApproved: approved },
    });
  }

  async deleteMerchant(user: User, merchantId: string) {
    this.ensureAdmin(user);
    const merchant = await this.prisma.merchantProfile.findUnique({
      where: { id: merchantId },
      include: { user: true },
    });
    if (!merchant) throw new NotFoundException('Merchant not found');

    // Delete related data in transaction
    await this.prisma.$transaction(async (tx) => {
      // 1. Delete ratings related to merchant's orders
      const merchantOrders = await tx.order.findMany({
        where: { merchantProfileId: merchantId },
        select: { id: true },
      });
      const orderIds = merchantOrders.map((o) => o.id);
      if (orderIds.length > 0) {
        await tx.rating.deleteMany({
          where: { orderId: { in: orderIds } },
        });
      }

      // 2. Delete driver remittance orders linked to merchant orders
      if (orderIds.length > 0) {
        await tx.driverRemittanceOrder.deleteMany({
          where: { orderId: { in: orderIds } },
        });
      }

      // 3. Delete driver earnings from merchant orders
      if (orderIds.length > 0) {
        await tx.driverEarning.deleteMany({
          where: { orderId: { in: orderIds } },
        });
      }

      // 4. Delete merchant ledger entries
      await tx.merchantLedgerEntry.deleteMany({
        where: { merchantProfileId: merchantId },
      });

      // 5. Delete payments related to merchant orders
      if (orderIds.length > 0) {
        await tx.payment.deleteMany({
          where: { orderId: { in: orderIds } },
        });
      }

      // 6. Delete order status logs
      if (orderIds.length > 0) {
        await tx.orderStatusLog.deleteMany({
          where: { orderId: { in: orderIds } },
        });
      }

      // 7. Delete order items
      if (orderIds.length > 0) {
        await tx.orderItem.deleteMany({
          where: { orderId: { in: orderIds } },
        });
      }

      // 8. Delete orders
      if (orderIds.length > 0) {
        await tx.order.deleteMany({
          where: { merchantProfileId: merchantId },
        });
      }

      // 9. Delete cart items for merchant products
      const merchantProducts = await tx.product.findMany({
        where: { merchantProfileId: merchantId },
        select: { id: true },
      });
      const productIds = merchantProducts.map((p) => p.id);
      if (productIds.length > 0) {
        await tx.cartItem.deleteMany({
          where: { productId: { in: productIds } },
        });
      }

      // 10. Delete favorites for merchant/products
      await tx.favorite.deleteMany({
        where: {
          OR: [
            { targetType: 'merchant', targetId: merchantId },
            { targetType: 'product', targetId: { in: productIds } },
          ],
        },
      });

      // 11. Delete products
      await tx.product.deleteMany({
        where: { merchantProfileId: merchantId },
      });

      // 12. Delete product categories
      await tx.productCategory.deleteMany({
        where: { merchantProfileId: merchantId },
      });

      // 13. Delete store categories relations
      await tx.storeCategory.deleteMany({
        where: { merchantProfileId: merchantId },
      });

      // 14. Delete home section merchant relations
      await tx.homeSectionMerchant.deleteMany({
        where: { merchantProfileId: merchantId },
      });

      // 15. Delete merchant profile
      await tx.merchantProfile.delete({ where: { id: merchantId } });

      // 16. Delete user account if exists
      if (merchant.userId) {
        // Delete user's addresses (and their orders should be already deleted above)
        const userAddresses = await tx.address.findMany({
          where: { userId: merchant.userId },
          select: { id: true },
        });
        const addressIds = userAddresses.map((a) => a.id);

        // Delete address-related orders (already handled above)
        // Delete user notifications
        await tx.notification.deleteMany({
          where: { userId: merchant.userId },
        });

        // Delete user support tickets
        await tx.supportTicket.deleteMany({
          where: { userId: merchant.userId },
        });

        // Delete addresses
        if (addressIds.length > 0) {
          await tx.address.deleteMany({
            where: { userId: merchant.userId },
          });
        }

        // Delete user cart items
        await tx.cartItem.deleteMany({
          where: { userId: merchant.userId },
        });

        // Finally delete user
        await tx.user.delete({ where: { id: merchant.userId } });
      }
    });

    return { ok: true };
  }

  async approveDriver(user: User, driverId: string, approved: boolean) {
    this.ensureAdmin(user);
    return this.prisma.driverProfile.update({
      where: { id: driverId },
      data: { isApproved: approved },
    });
  }

  async getOneUser(adminUser: User, userId: string) {
    this.ensureAdmin(adminUser);
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, fullName: true, phone: true, role: true, isActive: true, createdAt: true, updatedAt: true },
    });
    if (!u) throw new NotFoundException('User not found');
    return u;
  }

  async updateUser(
    adminUser: User,
    userId: string,
    data: { email?: string; fullName?: string; phone?: string | null; role?: string; isActive?: boolean; newPassword?: string },
  ) {
    this.ensureAdmin(adminUser);
    const existing = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!existing) throw new NotFoundException('User not found');
    const update: Record<string, unknown> = {};
    if (data.email !== undefined) update.email = data.email;
    if (data.fullName !== undefined) update.fullName = data.fullName;
    if (data.phone !== undefined) update.phone = data.phone || null;
    if (data.role !== undefined) update.role = data.role;
    if (data.isActive !== undefined) update.isActive = data.isActive;
    if (data.newPassword !== undefined && data.newPassword.trim()) {
      update.passwordHash = await bcrypt.hash(data.newPassword.trim(), 10);
    }
    return this.prisma.user.update({
      where: { id: userId },
      data: update as never,
      select: { id: true, email: true, fullName: true, phone: true, role: true, isActive: true, createdAt: true, updatedAt: true },
    });
  }

  async setUserActive(user: User, userId: string, isActive: boolean) {
    this.ensureAdmin(user);
    return this.prisma.user.update({
      where: { id: userId },
      data: { isActive },
    });
  }

  async deleteUser(adminUser: User, userId: string) {
    this.ensureAdmin(adminUser);
    const existing = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!existing) throw new NotFoundException('User not found');
    if (existing.role === 'admin') throw new ForbiddenException('Cannot delete admin users');
    await this.prisma.user.delete({ where: { id: userId } });
    return { ok: true };
  }

  async createMerchant(
    user: User,
    data: {
      email: string;
      password: string;
      fullName: string;
      phone?: string;
      storeName: string;
      storeSlug: string;
      logoUrl?: string;
      coverUrl?: string;
      description?: string;
      addressText?: string;
      latitude?: number;
      longitude?: number;
      storePhone?: string;
      storeEmail?: string;
      openingTime?: string;
      closingTime?: string;
      isOpen?: boolean;
      isApproved?: boolean;
      minOrder?: number;
      deliveryFee?: number;
      hasOffers?: boolean;
      ratingAvg?: number;
      ratingCount?: number;
      estimatedDeliveryMin?: number;
      estimatedDeliveryMax?: number;
      discountLabel?: string;
      categoryIds?: string[];
    },
  ) {
    this.ensureAdmin(user);
    const passwordHash = await bcrypt.hash(data.password, 10);
    return this.prisma.$transaction(async (tx) => {
      const merchantUser = await tx.user.create({
        data: {
          email: data.email,
          passwordHash,
          fullName: data.fullName,
          phone: data.phone,
          role: 'merchant',
        },
      });
      const profile = await tx.merchantProfile.create({
        data: {
          userId: merchantUser.id,
          storeName: data.storeName,
          storeSlug: data.storeSlug,
          logoUrl: data.logoUrl,
          coverUrl: data.coverUrl,
          description: data.description,
          addressText: data.addressText,
          latitude: data.latitude,
          longitude: data.longitude,
          phone: data.storePhone,
          email: data.storeEmail,
          openingTime: data.openingTime,
          closingTime: data.closingTime,
          isOpen: data.isOpen ?? true,
          isApproved: data.isApproved ?? true,
          minOrder: data.minOrder,
          deliveryFee: data.deliveryFee,
          hasOffers: data.hasOffers ?? false,
          ratingAvg: data.ratingAvg ?? 0,
          ratingCount: data.ratingCount ?? 0,
          estimatedDeliveryMin: data.estimatedDeliveryMin,
          estimatedDeliveryMax: data.estimatedDeliveryMax,
          discountLabel: data.discountLabel,
        },
      });
      if (data.categoryIds?.length) {
        await tx.storeCategory.createMany({
          data: data.categoryIds.map((categoryId) => ({ merchantProfileId: profile.id, categoryId })),
        });
      }
      return tx.merchantProfile.findUnique({
        where: { id: profile.id },
        include: { user: { select: { id: true, email: true, fullName: true, phone: true } } },
      });
    });
  }

  async updateMerchant(
    user: User,
    merchantId: string,
    data: {
      storeName?: string;
      storeSlug?: string;
      logoUrl?: string;
      coverUrl?: string;
      description?: string;
      addressText?: string;
      latitude?: number;
      longitude?: number;
      storePhone?: string;
      storeEmail?: string;
      openingTime?: string;
      closingTime?: string;
      isOpen?: boolean;
      isApproved?: boolean;
      minOrder?: number;
      deliveryFee?: number;
      hasOffers?: boolean;
      ratingAvg?: number;
      ratingCount?: number;
      estimatedDeliveryMin?: number;
      estimatedDeliveryMax?: number;
      discountLabel?: string;
      categoryIds?: string[];
      taxPercent?: number;
    },
  ) {
    this.ensureAdmin(user);
    const profile = await this.prisma.merchantProfile.findUnique({ where: { id: merchantId } });
    if (!profile) throw new NotFoundException('Merchant not found');
    const update = {
      storeName: data.storeName,
      storeSlug: data.storeSlug,
      logoUrl: data.logoUrl,
      coverUrl: data.coverUrl,
      description: data.description,
      addressText: data.addressText,
      latitude: data.latitude,
      longitude: data.longitude,
      phone: data.storePhone,
      email: data.storeEmail,
      openingTime: data.openingTime,
      closingTime: data.closingTime,
      isOpen: data.isOpen,
      isApproved: data.isApproved,
      minOrder: data.minOrder,
      deliveryFee: data.deliveryFee,
      hasOffers: data.hasOffers,
      ratingAvg: data.ratingAvg,
      ratingCount: data.ratingCount,
      estimatedDeliveryMin: data.estimatedDeliveryMin,
      estimatedDeliveryMax: data.estimatedDeliveryMax,
      discountLabel: data.discountLabel,
      taxPercent: data.taxPercent,
    } as Record<string, unknown>;
    Object.keys(update).forEach((k) => update[k] === undefined && delete update[k]);
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.merchantProfile.update({
        where: { id: merchantId },
        data: update as never,
      });
      if (data.categoryIds) {
        await tx.storeCategory.deleteMany({ where: { merchantProfileId: merchantId } });
        if (data.categoryIds.length) {
          await tx.storeCategory.createMany({
            data: data.categoryIds.map((categoryId) => ({ merchantProfileId: merchantId, categoryId })),
          });
        }
      }
      return updated;
    });
  }

  async listMerchantProducts(user: User, merchantId: string) {
    this.ensureAdmin(user);
    return this.prisma.product.findMany({
      where: { merchantProfileId: merchantId },
      include: { productCategory: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async createMerchantProduct(
    user: User,
    merchantId: string,
    data: { productCategoryId?: string; nameAr: string; nameEn?: string; description?: string; price: number; imageUrl?: string; isAvailable?: boolean; sortOrder?: number },
  ) {
    this.ensureAdmin(user);
    const merchant = await this.prisma.merchantProfile.findUnique({ where: { id: merchantId } });
    if (!merchant) throw new NotFoundException('Merchant not found');
    return this.prisma.product.create({
      data: {
        merchantProfileId: merchantId,
        productCategoryId: data.productCategoryId,
        nameAr: data.nameAr,
        nameEn: data.nameEn,
        description: data.description,
        price: data.price as never,
        imageUrl: data.imageUrl,
        isAvailable: data.isAvailable ?? true,
        sortOrder: data.sortOrder ?? 0,
      },
    });
  }

  async updateProduct(user: User, productId: string, data: { productCategoryId?: string; nameAr?: string; nameEn?: string; description?: string; price?: number; imageUrl?: string; isAvailable?: boolean; sortOrder?: number }) {
    this.ensureAdmin(user);
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');
    return this.prisma.product.update({
      where: { id: productId },
      data: {
        productCategoryId: data.productCategoryId,
        nameAr: data.nameAr,
        nameEn: data.nameEn,
        description: data.description,
        price: data.price as never,
        imageUrl: data.imageUrl,
        isAvailable: data.isAvailable,
        sortOrder: data.sortOrder,
      },
    });
  }

  async deleteProduct(user: User, productId: string) {
    this.ensureAdmin(user);
    await this.prisma.product.delete({ where: { id: productId } });
    return { success: true };
  }

  async listMerchantProductCategories(user: User, merchantId: string) {
    this.ensureAdmin(user);
    return this.prisma.productCategory.findMany({
      where: { merchantProfileId: merchantId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async createMerchantProductCategory(
    user: User,
    merchantId: string,
    data: { nameAr: string; nameEn?: string; sortOrder?: number; isActive?: boolean },
  ) {
    this.ensureAdmin(user);
    const merchant = await this.prisma.merchantProfile.findUnique({ where: { id: merchantId } });
    if (!merchant) throw new NotFoundException('Merchant not found');
    return this.prisma.productCategory.create({
      data: {
        merchantProfileId: merchantId,
        nameAr: data.nameAr,
        nameEn: data.nameEn,
        sortOrder: data.sortOrder ?? 0,
        isActive: data.isActive ?? true,
      },
    });
  }

  async updateMerchantProductCategory(
    user: User,
    id: string,
    data: { nameAr?: string; nameEn?: string; sortOrder?: number; isActive?: boolean },
  ) {
    this.ensureAdmin(user);
    const existing = await this.prisma.productCategory.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Product category not found');
    return this.prisma.productCategory.update({
      where: { id },
      data: {
        nameAr: data.nameAr,
        nameEn: data.nameEn,
        sortOrder: data.sortOrder,
        isActive: data.isActive,
      },
    });
  }

  async deleteMerchantProductCategory(user: User, id: string) {
    this.ensureAdmin(user);
    await this.prisma.productCategory.delete({ where: { id } });
    return { success: true };
  }

  async listHomeSections(user: User) {
    this.ensureAdmin(user);
    return this.prisma.homeSection.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        merchants: {
          orderBy: { sortOrder: 'asc' },
          include: {
            merchantProfile: {
              select: {
                id: true,
                storeName: true,
                storeSlug: true,
                logoUrl: true,
                isApproved: true,
              },
            },
          },
        },
      },
    });
  }

  async createHomeSection(
    user: User,
    data: { titleAr: string; titleEn?: string; slug?: string; sortOrder?: number; isActive?: boolean; merchantIds?: string[] },
  ) {
    this.ensureAdmin(user);
    return this.prisma.$transaction(async (tx) => {
      const section = await tx.homeSection.create({
        data: {
          titleAr: data.titleAr,
          titleEn: data.titleEn,
          slug: data.slug || undefined,
          sortOrder: data.sortOrder ?? 0,
          isActive: data.isActive ?? true,
        },
      });
      if (data.merchantIds?.length) {
        await tx.homeSectionMerchant.createMany({
          data: data.merchantIds.map((merchantProfileId, idx) => ({
            homeSectionId: section.id,
            merchantProfileId,
            sortOrder: idx,
          })),
        });
      }
      return tx.homeSection.findUnique({
        where: { id: section.id },
        include: {
          merchants: {
            orderBy: { sortOrder: 'asc' },
            include: { merchantProfile: { select: { id: true, storeName: true, storeSlug: true, logoUrl: true } } },
          },
        },
      });
    });
  }

  async updateHomeSection(
    user: User,
    id: string,
    data: { titleAr?: string; titleEn?: string; slug?: string; sortOrder?: number; isActive?: boolean; merchantIds?: string[] },
  ) {
    this.ensureAdmin(user);
    const existing = await this.prisma.homeSection.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Home section not found');
    return this.prisma.$transaction(async (tx) => {
      await tx.homeSection.update({
        where: { id },
        data: {
          titleAr: data.titleAr,
          titleEn: data.titleEn,
          slug: data.slug,
          sortOrder: data.sortOrder,
          isActive: data.isActive,
        },
      });
      if (data.merchantIds) {
        await tx.homeSectionMerchant.deleteMany({ where: { homeSectionId: id } });
        if (data.merchantIds.length) {
          await tx.homeSectionMerchant.createMany({
            data: data.merchantIds.map((merchantProfileId, idx) => ({
              homeSectionId: id,
              merchantProfileId,
              sortOrder: idx,
            })),
          });
        }
      }
      return tx.homeSection.findUnique({
        where: { id },
        include: {
          merchants: {
            orderBy: { sortOrder: 'asc' },
            include: { merchantProfile: { select: { id: true, storeName: true, storeSlug: true, logoUrl: true } } },
          },
        },
      });
    });
  }

  async deleteHomeSection(user: User, id: string) {
    this.ensureAdmin(user);
    await this.prisma.homeSection.delete({ where: { id } });
    return { success: true };
  }

  // FAQ methods
  async listFaq() {
    return this.prisma.faq.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async createFaq(data: { questionAr: string; questionEn?: string; answerAr: string; answerEn?: string; sortOrder?: number; isActive?: boolean }) {
    return this.prisma.faq.create({
      data: {
        questionAr: data.questionAr,
        questionEn: data.questionEn,
        answerAr: data.answerAr,
        answerEn: data.answerEn,
        sortOrder: data.sortOrder ?? 0,
        isActive: data.isActive ?? true,
      },
    });
  }

  async updateFaq(id: string, data: { questionAr?: string; questionEn?: string; answerAr?: string; answerEn?: string; sortOrder?: number; isActive?: boolean }) {
    const existing = await this.prisma.faq.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('FAQ not found');
    return this.prisma.faq.update({
      where: { id },
      data: {
        questionAr: data.questionAr,
        questionEn: data.questionEn,
        answerAr: data.answerAr,
        answerEn: data.answerEn,
        sortOrder: data.sortOrder,
        isActive: data.isActive,
      },
    });
  }

  async deleteFaq(id: string) {
    await this.prisma.faq.delete({ where: { id } });
    return { success: true };
  }
}
