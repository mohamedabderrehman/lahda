import { Injectable, BadRequestException, ForbiddenException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, CodStatus } from '@prisma/client';
import { OrderStatus, PaymentMethod } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { Prisma } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { SettingsService, PricingConfig, PricingBand } from '../settings/settings.service';
import { PromoCodesService } from '../promo-codes/promo-codes.service';
import { DeliveryOfferService } from './delivery-offer.service';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private settings: SettingsService,
    private promoCodes: PromoCodesService,
    private deliveryOffer: DeliveryOfferService,
  ) {}

  private async nextOrderNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.order.count({
      where: { createdAt: { gte: new Date(year, 0, 1) } },
    });
    return `ORD-${year}-${String(count + 1).padStart(5, '0')}`;
  }

  /**
   * Haversine distance calculation in kilometers
   */
  private haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  async create(user: User, body: { addressId: string; paymentMethod: PaymentMethod; notes?: string; promoCode?: string }) {
    if (user.role !== 'customer') throw new ForbiddenException();
    const address = await this.prisma.address.findFirst({ where: { id: body.addressId, userId: user.id } });
    if (!address) throw new NotFoundException('Address not found');

    if (address.latitude == null || address.longitude == null) {
      throw new BadRequestException('يجب تحديد موقع العنوان على الخريطة');
    }

    const cartItems = await this.prisma.cartItem.findMany({
      where: { userId: user.id },
      include: { product: { include: { merchantProfile: true } } },
    });
    if (!cartItems.length) throw new BadRequestException('Cart is empty');
    const merchantId = cartItems[0].product.merchantProfileId;
    const merchantProfile = cartItems[0].product.merchantProfile;

    // Option A: Enforce coordinates for merchant
    if (merchantProfile.latitude == null || merchantProfile.longitude == null) {
      throw new BadRequestException('المتجر لم يحدد موقعه بعد. يرجى التواصل مع الإدارة.');
    }

    for (const item of cartItems) {
      if (item.product.merchantProfileId !== merchantId) {
        throw new BadRequestException('All cart items must be from the same store');
      }
    }

    let subtotal = new Decimal(0);
    const orderItems: { productId: string; productNameSnapshot: string; priceSnapshot: Decimal; quantity: number; optionsSnapshot: object | null; subtotal: Decimal }[] = [];
    for (const item of cartItems) {
      const basePrice = item.product.price;
      let addonsTotal = new Decimal(0);
      const snapshot = item.optionsSnapshot as { selectedOptions?: Array<{ priceModifier?: number | string }> } | null;
      if (snapshot?.selectedOptions) {
        for (const opt of snapshot.selectedOptions) {
          const mod = Number(opt.priceModifier ?? 0);
          if (mod > 0) addonsTotal = addonsTotal.add(new Decimal(mod));
        }
      }
      const unitPrice = basePrice.add(addonsTotal);
      const qty = item.quantity;
      const itemSubtotal = unitPrice.mul(qty);
      subtotal = subtotal.add(itemSubtotal);
      orderItems.push({
        productId: item.productId,
        productNameSnapshot: item.product.nameAr,
        priceSnapshot: unitPrice,
        quantity: qty,
        optionsSnapshot: item.optionsSnapshot as object | null,
        subtotal: itemSubtotal,
      });
    }

    // Calculate distance using Haversine
    const distanceKm = this.haversineKm(
      merchantProfile.latitude,
      merchantProfile.longitude,
      address.latitude,
      address.longitude,
    );

    // Get pricing config and calculate fees
    const pricingConfig = await this.settings.getPricingConfig();
    const appFee = this.settings.calculateAppFee(Number(subtotal), pricingConfig.appFee);
    const deliveryFee = this.settings.calculateDeliveryFee(distanceKm, pricingConfig.distanceBands);

    // Optional promo code discount
    let promoCodeId: string | null = null;
    let promoDiscountAmount = 0;
    let promoPercent: number | null = null;

    if (body.promoCode) {
      const res = await this.promoCodes.validateForOrder(body.promoCode, {
        subtotal: Number(subtotal),
        merchantProfileId: merchantId,
      });
      promoCodeId = res.promo.id;
      promoDiscountAmount = res.discountAmount;
      promoPercent = res.percentage;
    }

    const totalBeforePromo = Number(subtotal) + appFee + deliveryFee;
    const total = Math.max(0, totalBeforePromo - promoDiscountAmount);

    // Create mandatory pricing snapshot
    const pricingSnapshot = {
      distanceKm,
      distanceBand: this.getDistanceBand(distanceKm, pricingConfig.distanceBands),
      deliveryFee,
      appFee,
      appFeeThreshold: pricingConfig.appFee.threshold,
      subtotal: Number(subtotal),
      totalBeforePromo,
      promo: promoCodeId
        ? {
            code: body.promoCode,
            percentage: promoPercent,
            discountAmount: promoDiscountAmount,
          }
        : null,
      total,
      calculatedAt: new Date().toISOString(),
    };

    const orderNumber = await this.nextOrderNumber();
    const order = await this.prisma.order.create({
      data: {
        orderNumber,
        customerId: user.id,
        merchantProfileId: merchantId,
        addressId: address.id,
        deliveryAddressText: address.addressText,
        deliveryLatitude: address.latitude,
        deliveryLongitude: address.longitude,
        subtotal,
        deliveryFee: new Decimal(deliveryFee),
        appFee: new Decimal(appFee),
        total: new Decimal(total),
        ...(promoCodeId && {
          promoCodeId,
          promoDiscountAmount: new Decimal(promoDiscountAmount),
          promoPercent: promoPercent,
        }),
        distanceKm: new Decimal(distanceKm.toFixed(2)),
        pricingSnapshot: pricingSnapshot as unknown as Prisma.InputJsonValue,
        paymentMethod: body.paymentMethod,
        notes: body.notes,
        status: OrderStatus.pending,
        items: {
          create: orderItems.map((i) => ({
            product: { connect: { id: i.productId } },
            productNameSnapshot: i.productNameSnapshot,
            priceSnapshot: i.priceSnapshot,
            quantity: i.quantity,
            ...(i.optionsSnapshot != null && { optionsSnapshot: i.optionsSnapshot }),
            subtotal: i.subtotal,
          })),
        },
        statusLogs: {
          create: { status: OrderStatus.pending, actorId: user.id },
        },
      },
      include: {
        items: true,
        merchantProfile: { select: { storeName: true } },
        address: true,
      },
    });
    await this.prisma.cartItem.deleteMany({ where: { userId: user.id, productId: { in: cartItems.map((c) => c.productId) } } });

    const merchantUser = await this.prisma.user.findFirst({ where: { merchantProfile: { id: merchantId } } });
    if (merchantUser) {
      this.notifications.sendToUser(merchantUser.id, 'طلب جديد! 🔔', `لديك طلب جديد #${order.orderNumber}`, 'new_order', { orderId: order.id });
    }

    return order;
  }

  private getDistanceBand(distanceKm: number, bands: PricingBand[]) {
    // Ensure deterministic order regardless of input order
    const sortedBands = [...bands].sort((a, b) => a.minKm - b.minKm);
    for (const band of sortedBands) {
      if (band.maxKm === null) {
        if (distanceKm >= band.minKm) return band;
      } else {
        if (distanceKm >= band.minKm && distanceKm < band.maxKm) return band;
      }
    }
    return sortedBands[sortedBands.length - 1];
  }

  async listForCustomer(user: User) {
    if (user.role !== 'customer') throw new ForbiddenException();
    return this.prisma.order.findMany({
      where: { customerId: user.id },
      include: { merchantProfile: { select: { storeName: true, storeSlug: true } }, items: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listForMerchant(user: User, status?: OrderStatus) {
    if (user.role !== 'merchant') throw new ForbiddenException();
    const store = await this.prisma.merchantProfile.findUnique({ where: { userId: user.id } });
    if (!store) throw new NotFoundException('Store not found');
    const where: { merchantProfileId: string; status?: OrderStatus } = { merchantProfileId: store.id };
    if (status) where.status = status;
    return this.prisma.order.findMany({
      where,
      include: { customer: { select: { fullName: true, phone: true } }, address: true, items: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listForDriver(user: User) {
    if (user.role !== 'driver') throw new ForbiddenException();
    return this.prisma.order.findMany({
      where: { driverId: user.id },
      include: { merchantProfile: { select: { storeName: true, addressText: true } }, address: true, items: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOne(orderId: string, user: User) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: { select: { fullName: true, phone: true } },
        merchantProfile: true,
        driver: {
          select: {
            fullName: true,
            phone: true,
            driverProfile: { select: { vehicleInfo: true } },
          },
        },
        address: true,
        items: { include: { product: { select: { nameAr: true, price: true, imageUrl: true } } } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    const isCustomer = order.customerId === user.id;
    const isMerchant = order.merchantProfile.userId === user.id;
    const isAssignedDriver = order.driverId === user.id;
    const driverEligibleStatuses: OrderStatus[] = [OrderStatus.accepted_by_merchant, OrderStatus.preparing, OrderStatus.ready_for_pickup];
    const isDriverViewingAvailable =
      user.role === 'driver' &&
      driverEligibleStatuses.includes(order.status) &&
      order.driverId == null;
    const canAccess =
      isCustomer ||
      isMerchant ||
      isAssignedDriver ||
      isDriverViewingAvailable ||
      user.role === 'admin';
    if (!canAccess) throw new ForbiddenException();
    return {
      ...order,
      driver: order.driver
        ? {
            ...order.driver,
            vehicleInfo: order.driver.driverProfile?.vehicleInfo ?? null,
          }
        : null,
    };
  }

  async merchantAccept(user: User, orderId: string, prepTimeMinutes?: number) {
    if (user.role !== 'merchant') throw new ForbiddenException();
    const store = await this.prisma.merchantProfile.findUnique({ where: { userId: user.id } });
    if (!store) throw new NotFoundException('Store not found');
    const order = await this.prisma.order.findFirst({ where: { id: orderId, merchantProfileId: store.id } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== OrderStatus.pending) throw new BadRequestException('Order cannot be accepted');
    const data: Record<string, unknown> = { status: OrderStatus.accepted_by_merchant };
    if (prepTimeMinutes != null && prepTimeMinutes > 0) data.prepTimeMinutes = prepTimeMinutes;
    await this.prisma.$transaction([
      this.prisma.order.update({ where: { id: orderId }, data: data as never }),
      this.prisma.orderStatusLog.create({
        data: { orderId, status: OrderStatus.accepted_by_merchant, actorId: user.id },
      }),
    ]);

    const prepText = prepTimeMinutes ? ` (وقت التحضير: ${prepTimeMinutes} دقيقة)` : '';
    this.notifications.sendToUser(order.customerId, 'تم قبول طلبك ✅', `طلبك #${order.orderNumber} تم قبوله من المتجر${prepText}`, 'order_accepted', { orderId });

    // Immediately try to assign a driver so they can head to the store
    this.deliveryOffer.tryAssignOrderToOnlineDriver(orderId).catch((err) =>
      console.error('[OrdersService] tryAssignOrderToOnlineDriver after merchantAccept error:', err),
    );

    return this.getOne(orderId, user);
  }

  async merchantReject(user: User, orderId: string, notes?: string) {
    if (user.role !== 'merchant') throw new ForbiddenException();
    const store = await this.prisma.merchantProfile.findUnique({ where: { userId: user.id } });
    if (!store) throw new NotFoundException('Store not found');
    const order = await this.prisma.order.findFirst({ where: { id: orderId, merchantProfileId: store.id } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== OrderStatus.pending) throw new BadRequestException('Order cannot be rejected');
    await this.prisma.$transaction([
      this.prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.cancelled, merchantNotes: notes },
      }),
      this.prisma.orderStatusLog.create({
        data: { orderId, status: OrderStatus.cancelled, actorId: user.id, notes },
      }),
    ]);

    this.notifications.sendToUser(order.customerId, 'تم رفض طلبك', `للأسف تم رفض طلبك #${order.orderNumber}`, 'order_rejected', { orderId });

    return this.getOne(orderId, user);
  }

  async updateStatus(user: User, orderId: string, status: OrderStatus, notes?: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: { merchantProfile: true } });
    if (!order) throw new NotFoundException('Order not found');
    const isMerchant = order.merchantProfile.userId === user.id;
    const isDriver = order.driverId === user.id;
    const allowed: OrderStatus[] = isMerchant
      ? [OrderStatus.preparing, OrderStatus.ready_for_pickup]
      : isDriver
        ? [OrderStatus.picked_up, OrderStatus.on_the_way, OrderStatus.delivered]
        : [];
    if (user.role !== 'admin' && !allowed.includes(status)) throw new ForbiddenException('Cannot set this status');
    if (status === order.status) return this.getOne(orderId, user);
    if (order.status === OrderStatus.delivered || order.status === OrderStatus.cancelled) {
      throw new BadRequestException('Completed orders cannot change status');
    }

    const updateData: { status: OrderStatus; deliveredAt?: Date; codStatus?: CodStatus } = { status };

    // Handle delivered status
    if (status === OrderStatus.delivered) {
      updateData.deliveredAt = new Date();
      // Set COD status for cash orders
      if (order.paymentMethod === 'cash') {
        updateData.codStatus = CodStatus.due_to_admin;
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({ where: { id: orderId }, data: updateData });
      await tx.orderStatusLog.create({ data: { orderId, status, actorId: user.id, notes } });

      // Handle delivered side effects
      if (status === OrderStatus.delivered) {
        const driverProfile = order.driverId
          ? await tx.driverProfile.findUnique({ where: { userId: order.driverId } })
          : null;

        // Create driver earning (only when delivered, not when taking order)
        if (driverProfile && order.deliveryFee && Number(order.deliveryFee) > 0) {
          // Check if earning already exists (idempotency)
          const existingEarning = await tx.driverEarning.findUnique({ where: { orderId } });
          if (!existingEarning) {
            await tx.driverEarning.create({
              data: { driverId: driverProfile.id, orderId, amount: order.deliveryFee },
            });
          }
        }

        // Create merchant ledger credit (idempotent)
        if (order.subtotal && Number(order.subtotal) > 0) {
          const existingLedger = await tx.merchantLedgerEntry.findFirst({
            where: { orderId, type: 'credit' },
          });
          if (!existingLedger) {
            await tx.merchantLedgerEntry.create({
              data: {
                merchantProfileId: order.merchantProfileId,
                orderId,
                type: 'credit',
                amount: order.subtotal,
                note: `طلب #${order.orderNumber} - تم التوصيل`,
              },
            });
          }
        }
      }
    });

    if (status === OrderStatus.preparing) {
      this.notifications.sendToUser(order.customerId, 'جاري تحضير طلبك 🍳', `طلبك #${order.orderNumber} قيد التحضير الآن`, 'order_preparing', { orderId });
    } else if (status === OrderStatus.ready_for_pickup) {
      this.notifications.sendToUser(order.customerId, 'طلبك جاهز! 📦', `طلبك #${order.orderNumber} جاهز وبانتظار السائق`, 'order_ready', { orderId });
      await this.deliveryOffer.tryAssignOrderToOnlineDriver(orderId);
    } else if (status === OrderStatus.picked_up) {
      this.notifications.sendToUser(order.customerId, 'تم استلام طلبك 🏪', `السائق استلم طلبك #${order.orderNumber} من المتجر`, 'order_picked_up', { orderId });
    } else if (status === OrderStatus.on_the_way) {
      this.notifications.sendToUser(order.customerId, 'طلبك في الطريق! 🚗', `السائق في طريقه إليك بطلب #${order.orderNumber}`, 'order_on_the_way', { orderId });
    } else if (status === OrderStatus.delivered) {
      this.notifications.sendToUser(order.customerId, 'تم التوصيل! 🎉', `طلبك #${order.orderNumber} تم توصيله بنجاح`, 'order_delivered', { orderId });
      const merchantUser2 = await this.prisma.user.findFirst({ where: { merchantProfile: { id: order.merchantProfileId } } });
      if (merchantUser2) {
        this.notifications.sendToUser(merchantUser2.id, 'تم توصيل الطلب ✅', `طلب #${order.orderNumber} تم توصيله للعميل`, 'order_delivered', { orderId });
      }
    }

    return this.getOne(orderId, user);
  }

  async listPendingForDriver(user: User) {
    if (user.role !== 'driver') throw new ForbiddenException();
    const offerData = await this.deliveryOffer.getMyActiveOffer(user);
    if (!offerData) return [];
    return [offerData.order];
  }

  async getDriverLocation(orderId: string, user: User) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        customerId: true,
        merchantProfileId: true,
        driverId: true,
        status: true,
        orderNumber: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    const canAccess =
      order.customerId === user.id ||
      user.role === 'admin';
    if (!canAccess) {
      const store = await this.prisma.merchantProfile.findUnique({ where: { id: order.merchantProfileId }, select: { userId: true } });
      if (store?.userId !== user.id) throw new ForbiddenException();
    }
    if (!order.driverId) {
      return { driverId: null, latitude: null, longitude: null, lastLocationUpdatedAt: null, status: order.status };
    }
    const driverProfile = await this.prisma.driverProfile.findUnique({
      where: { userId: order.driverId },
      select: { currentLatitude: true, currentLongitude: true, lastLocationUpdatedAt: true },
    });
    return {
      driverId: order.driverId,
      latitude: driverProfile?.currentLatitude ?? null,
      longitude: driverProfile?.currentLongitude ?? null,
      lastLocationUpdatedAt: driverProfile?.lastLocationUpdatedAt ?? null,
      status: order.status,
    };
  }

  async driverTakeOrder(user: User, orderId: string) {
    await this.deliveryOffer.acceptOffer(user, orderId);
    return this.getOne(orderId, user);
  }

  async getMyDeliveryOffer(user: User) {
    return this.deliveryOffer.getMyActiveOffer(user);
  }

  async declineDeliveryOffer(user: User, orderId: string) {
    return this.deliveryOffer.declineOffer(user, orderId);
  }
}
