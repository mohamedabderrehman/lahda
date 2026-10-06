import { Injectable, OnModuleInit, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';
import { OrderStatus, DeliveryOfferStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { NotificationsService } from '../notifications/notifications.service';

const OFFER_EXPIRY_SECONDS = 30;
const PENALTY_AMOUNT = 250;
const EXPIRE_CRON_INTERVAL_MS = 15_000;

@Injectable()
export class DeliveryOfferService implements OnModuleInit {
  private expireInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  onModuleInit() {
    this.expireInterval = setInterval(() => {
      this.expireOffers().catch((err) => console.error('[DeliveryOffer] expireOffers error:', err));
    }, EXPIRE_CRON_INTERVAL_MS);
  }

  private static readonly DRIVER_ELIGIBLE_STATUSES: OrderStatus[] = [
    OrderStatus.accepted_by_merchant,
    OrderStatus.preparing,
    OrderStatus.ready_for_pickup,
  ];

  /**
   * Call when order is accepted by merchant (or later). If any driver is
   * online, create/update offer for the nearest one.
   * @param excludeDriverUserId — skip this driver (just penalized for this order)
   */
  async tryAssignOrderToOnlineDriver(orderId: string, excludeDriverUserId?: string): Promise<boolean> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { merchantProfile: { select: { storeName: true, latitude: true, longitude: true } } },
    });
    if (!order || order.driverId) return false;
    if (!DeliveryOfferService.DRIVER_ELIGIBLE_STATUSES.includes(order.status)) return false;

    const existing = await this.prisma.orderDeliveryOffer.findUnique({
      where: { orderId },
    });
    if (existing && existing.status === DeliveryOfferStatus.pending) return false;

    // Collect all drivers who already declined/expired for this order to avoid re-offering
    const penalizedDriverIds = await this.prisma.driverLedgerEntry
      .findMany({
        where: { orderId, type: { in: ['penalty_decline', 'penalty_timeout'] } },
        select: { driver: { select: { userId: true } } },
      })
      .then((rows) => rows.map((r) => r.driver.userId));
    if (excludeDriverUserId) penalizedDriverIds.push(excludeDriverUserId);
    const excludeSet = new Set(penalizedDriverIds);

    const onlineDrivers = await this.prisma.driverProfile.findMany({
      where: { isOnline: true, isApproved: true },
      select: { id: true, userId: true, currentLatitude: true, currentLongitude: true },
    });
    const eligibleDrivers = onlineDrivers.filter((d) => !excludeSet.has(d.userId));
    if (eligibleDrivers.length === 0) return false;

    const merchantProfile = order.merchantProfile as { latitude?: number | null; longitude?: number | null } | null;
    const merchantLat = order.deliveryLatitude ?? merchantProfile?.latitude;
    const merchantLng = order.deliveryLongitude ?? merchantProfile?.longitude;
    let chosen = eligibleDrivers[0];
    if (merchantLat != null && merchantLng != null) {
      let bestDist = Infinity;
      for (const d of eligibleDrivers) {
        if (d.currentLatitude != null && d.currentLongitude != null) {
          const dist = this.haversineKm(merchantLat, merchantLng, d.currentLatitude, d.currentLongitude);
          if (dist < bestDist) {
            bestDist = dist;
            chosen = d;
          }
        }
      }
    }

    const expiresAt = new Date(Date.now() + OFFER_EXPIRY_SECONDS * 1000);
    await this.prisma.orderDeliveryOffer.upsert({
      where: { orderId },
      update: {
        driverId: chosen.userId,
        expiresAt,
        status: DeliveryOfferStatus.pending,
        offeredAt: new Date(),
      },
      create: {
        orderId,
        driverId: chosen.userId,
        expiresAt,
        status: DeliveryOfferStatus.pending,
      },
    });

    this.notifications.sendToUser(
      chosen.userId,
      'طلب توصيل متاح 🚗',
      `طلب #${order.orderNumber} جاهز – لديك ${OFFER_EXPIRY_SECONDS} ثانية لقبوله`,
      'delivery_offer',
      { orderId, expiresAt: expiresAt.toISOString() },
    );
    return true;
  }

  /**
   * Call when driver goes online. Assign first waiting order (no active offer) to this driver.
   */
  async tryAssignWaitingOrderToDriver(driverUserId: string): Promise<boolean> {
    const profile = await this.prisma.driverProfile.findUnique({
      where: { userId: driverUserId, isOnline: true, isApproved: true },
    });
    if (!profile) return false;

    const offeredOrderIds = await this.prisma.orderDeliveryOffer
      .findMany({ where: { status: DeliveryOfferStatus.pending }, select: { orderId: true } })
      .then((rows) => rows.map((r) => r.orderId));

    // Exclude orders this driver was already penalized for
    const penalizedOrderIds = await this.prisma.driverLedgerEntry
      .findMany({
        where: { driverId: profile.id, type: { in: ['penalty_decline', 'penalty_timeout'] } },
        select: { orderId: true },
      })
      .then((rows) => rows.map((r) => r.orderId).filter(Boolean) as string[]);

    const excludeOrderIds = [...new Set([...offeredOrderIds, ...penalizedOrderIds])];

    const order = await this.prisma.order.findFirst({
      where: {
        status: { in: DeliveryOfferService.DRIVER_ELIGIBLE_STATUSES },
        driverId: null,
        id: { notIn: excludeOrderIds },
      },
      include: { merchantProfile: { select: { storeName: true } } },
      orderBy: { createdAt: 'asc' },
    });
    if (!order) return false;

    const expiresAt = new Date(Date.now() + OFFER_EXPIRY_SECONDS * 1000);
    await this.prisma.orderDeliveryOffer.upsert({
      where: { orderId: order.id },
      update: {
        driverId: driverUserId,
        expiresAt,
        status: DeliveryOfferStatus.pending,
        offeredAt: new Date(),
      },
      create: {
        orderId: order.id,
        driverId: driverUserId,
        expiresAt,
        status: DeliveryOfferStatus.pending,
      },
    });

    this.notifications.sendToUser(
      driverUserId,
      'طلب توصيل متاح 🚗',
      `طلب #${order.orderNumber} جاهز – لديك ${OFFER_EXPIRY_SECONDS} ثانية لقبوله`,
      'delivery_offer',
      { orderId: order.id, expiresAt: expiresAt.toISOString() },
    );
    return true;
  }

  /**
   * Get the current active delivery offer for this driver (if any).
   */
  async getMyActiveOffer(user: User) {
    if (user.role !== 'driver') throw new ForbiddenException();
    const offer = await this.prisma.orderDeliveryOffer.findFirst({
      where: {
        driverId: user.id,
        status: DeliveryOfferStatus.pending,
        expiresAt: { gt: new Date() },
      },
      include: {
        order: {
          include: {
            merchantProfile: { select: { storeName: true, addressText: true, latitude: true, longitude: true } },
            address: true,
          },
        },
      },
    });
    if (!offer) return null;
    return {
      offerId: offer.id,
      orderId: offer.orderId,
      expiresAt: offer.expiresAt,
      offeredAt: offer.offeredAt,
      offerExpirySeconds: this.getOfferExpirySeconds(),
      penaltyAmount: this.getPenaltyAmount(),
      order: offer.order,
    };
  }

  /**
   * Driver accepts the offer. Assigns order to driver.
   */
  async acceptOffer(user: User, orderId: string) {
    if (user.role !== 'driver') throw new ForbiddenException();
    const profile = await this.prisma.driverProfile.findUnique({ where: { userId: user.id } });
    if (!profile?.isOnline || !profile.isApproved) throw new BadRequestException('Driver not available');

    const offer = await this.prisma.orderDeliveryOffer.findUnique({
      where: { orderId },
      include: { order: true },
    });
    if (!offer) throw new NotFoundException('Offer not found');
    if (offer.driverId !== user.id) throw new ForbiddenException('This offer is not for you');
    if (offer.status !== DeliveryOfferStatus.pending) throw new BadRequestException('Offer no longer valid');
    if (new Date() > offer.expiresAt) {
      await this.applyPenaltyAndRelease(offer, 'timeout');
      throw new BadRequestException('انتهى وقت قبول العرض');
    }

    await this.prisma.$transaction([
      this.prisma.order.update({
        where: { id: orderId },
        data: { driverId: user.id },
      }),
      this.prisma.orderDeliveryOffer.update({
        where: { orderId },
        data: { status: DeliveryOfferStatus.accepted },
      }),
    ]);

    this.notifications.sendToUser(
      offer.order.customerId,
      'تم تعيين سائق 🚗',
      `سائق في طريقه لاستلام طلبك #${offer.order.orderNumber}`,
      'driver_assigned',
      { orderId },
    );
    const merchantUser = await this.prisma.user.findFirst({
      where: { merchantProfile: { id: offer.order.merchantProfileId } },
      select: { id: true },
    });
    if (merchantUser) {
      this.notifications.sendToUser(
        merchantUser.id,
        'تم تعيين سائق للطلب 🚗',
        `تم تعيين سائق للطلب #${offer.order.orderNumber}`,
        'driver_assigned',
        { orderId },
      );
    }

    return { success: true, orderId };
  }

  /**
   * Driver declines the offer. Apply 250 IQD penalty and release order.
   */
  async declineOffer(user: User, orderId: string) {
    if (user.role !== 'driver') throw new ForbiddenException();

    const offer = await this.prisma.orderDeliveryOffer.findUnique({
      where: { orderId },
      include: { order: true },
    });
    if (!offer) throw new NotFoundException('Offer not found');
    if (offer.driverId !== user.id) throw new ForbiddenException('This offer is not for you');
    if (offer.status !== DeliveryOfferStatus.pending) throw new BadRequestException('Offer no longer valid');

    await this.applyPenaltyAndRelease(offer, 'decline');
    return { success: true, message: 'تم رفض العرض وخصم ٢٥٠ دينار' };
  }

  /**
   * Apply 250 IQD penalty and release the order. Try to assign to another online driver if any.
   */
  private async applyPenaltyAndRelease(offer: { orderId: string; driverId: string }, reason: 'decline' | 'timeout') {
    const profile = await this.prisma.driverProfile.findUnique({ where: { userId: offer.driverId } });
    if (profile) {
      await this.prisma.driverLedgerEntry.create({
        data: {
          driverId: profile.id,
          amount: new Decimal(-PENALTY_AMOUNT),
          orderId: offer.orderId,
          type: reason === 'decline' ? 'penalty_decline' : 'penalty_timeout',
          note: reason === 'decline' ? 'رفض عرض التوصيل' : 'انتهى وقت قبول العرض',
        },
      });
    }

    await this.prisma.orderDeliveryOffer.update({
      where: { orderId: offer.orderId },
      data: { status: reason === 'decline' ? DeliveryOfferStatus.declined : DeliveryOfferStatus.expired },
    });

    // Try to assign to another online driver, excluding the one who just declined/expired
    await this.tryAssignOrderToOnlineDriver(offer.orderId, offer.driverId);
  }

  /**
   * Cron: Expire offers that passed expiresAt. Apply penalty and release.
   */
  async expireOffers() {
    const expired = await this.prisma.orderDeliveryOffer.findMany({
      where: { status: DeliveryOfferStatus.pending, expiresAt: { lt: new Date() } },
    });
    for (const offer of expired) {
      await this.applyPenaltyAndRelease(offer, 'timeout');
    }
    return expired.length;
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

  /** Get penalty amount for display (e.g. in driver app warning) */
  getPenaltyAmount(): number {
    return PENALTY_AMOUNT;
  }

  /** Get offer expiry seconds for display */
  getOfferExpirySeconds(): number {
    return OFFER_EXPIRY_SECONDS;
  }
}
