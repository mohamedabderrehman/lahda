import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';
import { DeliveryOfferService } from '../orders/delivery-offer.service';

@Injectable()
export class DriverService {
  constructor(
    private prisma: PrismaService,
    private deliveryOffer: DeliveryOfferService,
  ) {}

  async setOnline(user: User, isOnline: boolean) {
    if (user.role !== 'driver') throw new ForbiddenException();
    const profile = await this.prisma.driverProfile.findUnique({ where: { userId: user.id } });
    if (!profile) throw new ForbiddenException('Driver profile not found');
    const updated = await this.prisma.driverProfile.update({
      where: { id: profile.id },
      data: { isOnline },
    });
    if (isOnline) {
      this.deliveryOffer.tryAssignWaitingOrderToDriver(user.id).catch((err) =>
        console.error('[DriverService] tryAssignWaitingOrderToDriver error:', err),
      );
    }
    return updated;
  }

  async updateLocation(user: User, latitude: number, longitude: number) {
    if (user.role !== 'driver') throw new ForbiddenException();
    const profile = await this.prisma.driverProfile.findUnique({ where: { userId: user.id } });
    if (!profile) throw new ForbiddenException('Driver profile not found');
    return this.prisma.driverProfile.update({
      where: { id: profile.id },
      data: {
        currentLatitude: latitude,
        currentLongitude: longitude,
        lastLocationUpdatedAt: new Date(),
      },
    });
  }

  async getEarnings(user: User) {
    if (user.role !== 'driver') throw new ForbiddenException();
    const profile = await this.prisma.driverProfile.findUnique({ where: { userId: user.id } });
    if (!profile) throw new ForbiddenException('Driver profile not found');
    const [earnings, totalAgg, pendingAgg, ledgerSum] = await Promise.all([
      this.prisma.driverEarning.findMany({
        where: { driverId: profile.id },
        include: { order: { select: { orderNumber: true, deliveredAt: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.driverEarning.aggregate({ where: { driverId: profile.id }, _sum: { amount: true } }),
      this.prisma.driverEarning.aggregate({ where: { driverId: profile.id, status: 'pending' }, _sum: { amount: true } }),
      this.prisma.driverLedgerEntry.aggregate({ where: { driverId: profile.id }, _sum: { amount: true } }),
    ]);
    const totalEarnings = Number(totalAgg._sum.amount ?? 0);
    const pendingEarnings = Number(pendingAgg._sum.amount ?? 0);
    const ledgerDelta = Number(ledgerSum._sum.amount ?? 0); // positive = rewards, negative = penalties
    const totalPenalties = Math.max(0, -ledgerDelta); // display penalties (negative ledger only)
    return {
      earnings,
      total: totalEarnings + ledgerDelta, // rewards add, penalties subtract
      pending: pendingEarnings + ledgerDelta,
      totalPenalties,
    };
  }

  async getProfile(user: User) {
    if (user.role !== 'driver') throw new ForbiddenException();
    return this.prisma.driverProfile.findUnique({
      where: { userId: user.id },
      include: { user: { select: { fullName: true, email: true, phone: true } } },
    });
  }

  async updateProfile(user: User, data: { nationalId?: string; vehicleInfo?: string }) {
    if (user.role !== 'driver') throw new ForbiddenException();
    const profile = await this.prisma.driverProfile.findUnique({ where: { userId: user.id } });
    if (!profile) throw new ForbiddenException('Driver profile not found');
    // Drivers cannot update nationalId or vehicleInfo - these are managed by admin only
    throw new ForbiddenException('Profile updates are restricted. Contact admin to update vehicle or ID information.');
  }
}
