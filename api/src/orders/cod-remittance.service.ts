import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SettlementReceiptService } from '../settlements/settlement-receipt.service';
import { User, CodStatus, RemittanceStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export interface RemittanceSummary {
  orders: Array<{
    id: string;
    orderNumber: string;
    subtotal: number;
    appFee: number;
    deliveryFee: number;
    total: number;
    deliveredAt: Date;
  }>;
  summary: {
    ordersCount: number;
    subtotalSum: number;
    appFeeSum: number;
    deliveryFeeSum: number;
    amountDueToAdmin: number;
  };
}

@Injectable()
export class CodRemittanceService {
  constructor(
    private prisma: PrismaService,
    private receiptService: SettlementReceiptService,
  ) {}

  private getDateString(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Get COD orders eligible for remittance for a driver on a specific date
   */
  async getEligibleOrdersForRemittance(driverId: string, dateStr: string): Promise<RemittanceSummary> {
    const startOfDay = new Date(dateStr);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const orders = await this.prisma.order.findMany({
      where: {
        driverId,
        paymentMethod: 'cash',
        status: 'delivered',
        deliveredAt: {
          gte: startOfDay,
          lt: endOfDay,
        },
        codStatus: CodStatus.due_to_admin,
        remittanceOrder: null, // Not in any remittance yet
      },
      select: {
        id: true,
        orderNumber: true,
        subtotal: true,
        appFee: true,
        deliveryFee: true,
        total: true,
        deliveredAt: true,
      },
    });

    const summary = {
      ordersCount: orders.length,
      subtotalSum: orders.reduce((sum, o) => sum + Number(o.subtotal), 0),
      appFeeSum: orders.reduce((sum, o) => sum + Number(o.appFee), 0),
      deliveryFeeSum: orders.reduce((sum, o) => sum + Number(o.deliveryFee), 0),
      amountDueToAdmin: orders.reduce((sum, o) => sum + Number(o.subtotal) + Number(o.appFee), 0),
    };

    return {
      orders: orders.map(o => ({
        id: o.id,
        orderNumber: o.orderNumber,
        subtotal: Number(o.subtotal),
        appFee: Number(o.appFee),
        deliveryFee: Number(o.deliveryFee),
        total: Number(o.total),
        deliveredAt: o.deliveredAt!,
      })),
      summary,
    };
  }

  /**
   * Create a remittance (draft then submitted)
   */
  async createRemittance(driverUser: User, dateStr: string): Promise<{ remittanceId: string }> {
    if (driverUser.role !== 'driver') throw new ForbiddenException();

    const eligible = await this.getEligibleOrdersForRemittance(driverUser.id, dateStr);

    if (eligible.orders.length === 0) {
      throw new BadRequestException('لا توجد طلبات مستحقة للتسوية في هذا اليوم');
    }

    // Check if a remittance already exists for this driver+date (ANY status - strict locking)
    const existingRemittance = await this.prisma.driverRemittance.findFirst({
      where: {
        driverId: driverUser.id,
        date: dateStr,
      },
    });

    if (existingRemittance) {
      throw new BadRequestException('يوجد سند تسوية موجود بالفعل لهذا اليوم');
    }

    const remittance = await this.prisma.$transaction(async (tx) => {
      // Create remittance
      const remit = await tx.driverRemittance.create({
        data: {
          driverId: driverUser.id,
          date: dateStr,
          status: RemittanceStatus.submitted,
          ordersCount: eligible.summary.ordersCount,
          subtotalSum: new Decimal(eligible.summary.subtotalSum),
          appFeeSum: new Decimal(eligible.summary.appFeeSum),
          deliveryFeeSum: new Decimal(eligible.summary.deliveryFeeSum),
          amountDueToAdmin: new Decimal(eligible.summary.amountDueToAdmin),
          submittedAt: new Date(),
        },
      });

      // Link orders to remittance and update their COD status
      for (const order of eligible.orders) {
        await tx.driverRemittanceOrder.create({
          data: {
            remittanceId: remit.id,
            orderId: order.id,
          },
        });

        await tx.order.update({
          where: { id: order.id },
          data: { codStatus: CodStatus.in_remittance },
        });
      }

      return remit;
    });

    return { remittanceId: remittance.id };
  }

  /**
   * Get driver's remittances
   */
  async getDriverRemittances(driverUser: User, status?: RemittanceStatus) {
    if (driverUser.role !== 'driver') throw new ForbiddenException();

    const where: { driverId: string; status?: RemittanceStatus } = { driverId: driverUser.id };
    if (status) where.status = status;

    return this.prisma.driverRemittance.findMany({
      where,
      include: {
        orders: {
          include: {
            order: {
              select: {
                id: true,
                orderNumber: true,
                subtotal: true,
                appFee: true,
                deliveryFee: true,
                total: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Admin: List all remittances with filters
   */
  async listRemittances(adminUser: User, filters: {
    date?: string;
    driverId?: string;
    status?: RemittanceStatus;
    page?: number;
    limit?: number;
  }) {
    if (adminUser.role !== 'admin') throw new ForbiddenException();

    const { date, driverId, status, page = 1, limit = 20 } = filters;

    const where: Record<string, unknown> = {};
    if (date) where.date = date;
    if (driverId) where.driverId = driverId;
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.driverRemittance.findMany({
        where,
        include: {
          driver: {
            select: { id: true, fullName: true, phone: true },
          },
          orders: {
            include: {
              order: {
                select: {
                  id: true,
                  orderNumber: true,
                  subtotal: true,
                  appFee: true,
                  deliveryFee: true,
                  total: true,
                },
              },
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.driverRemittance.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  /**
   * Admin: Confirm a remittance (mark as received)
   */
  async confirmRemittance(adminUser: User, remittanceId: string) {
    if (adminUser.role !== 'admin') throw new ForbiddenException();

    const remittance = await this.prisma.driverRemittance.findUnique({
      where: { id: remittanceId },
      include: {
        orders: {
          include: {
            order: {
              select: { id: true, codStatus: true },
            },
          },
        },
      },
    });

    if (!remittance) throw new NotFoundException('Remittance not found');
    if (remittance.status === RemittanceStatus.confirmed) {
      throw new BadRequestException('تم تأكيد هذا السند مسبقاً');
    }

    await this.prisma.$transaction(async (tx) => {
      // Update remittance
      await tx.driverRemittance.update({
        where: { id: remittanceId },
        data: {
          status: RemittanceStatus.confirmed,
          confirmedAt: new Date(),
          confirmedByAdminId: adminUser.id,
        },
      });

      // Update all linked orders to remitted_confirmed
      for (const ro of remittance.orders) {
        if (ro.order.codStatus === CodStatus.in_remittance) {
          await tx.order.update({
            where: { id: ro.order.id },
            data: {
              codStatus: CodStatus.remitted_confirmed,
              codConfirmedAt: new Date(),
              codConfirmedByAdminId: adminUser.id,
            },
          });
        }
      }
    });

    const confirmed = await this.prisma.driverRemittance.findUnique({
      where: { id: remittanceId },
      include: {
        driver: { select: { id: true, fullName: true, phone: true } },
        orders: {
          include: {
            order: {
              select: {
                id: true,
                orderNumber: true,
                subtotal: true,
                appFee: true,
                deliveryFee: true,
                total: true,
                codStatus: true,
                codConfirmedAt: true,
              },
            },
          },
        },
      },
    });

    if (confirmed) {
      try {
        const receipt = await this.receiptService.createForDriverRemittance({
          remittanceId: confirmed.id,
          driverName: confirmed.driver.fullName,
          driverPhone: confirmed.driver.phone,
          driverId: confirmed.driverId,
          amount: Number(confirmed.amountDueToAdmin),
          adminId: adminUser.id,
          snapshot: {
            date: confirmed.date,
            ordersCount: confirmed.ordersCount,
            subtotalSum: Number(confirmed.subtotalSum),
            appFeeSum: Number(confirmed.appFeeSum),
            deliveryFeeSum: Number(confirmed.deliveryFeeSum),
            amountDueToAdmin: Number(confirmed.amountDueToAdmin),
            orders: confirmed.orders.map(ro => ({
              orderNumber: ro.order.orderNumber,
              subtotal: Number(ro.order.subtotal),
              appFee: Number(ro.order.appFee),
              deliveryFee: Number(ro.order.deliveryFee),
              total: Number(ro.order.total),
            })),
          },
        });
        return { ...confirmed, receipt };
      } catch {
        return confirmed;
      }
    }

    return confirmed;
  }

  /**
   * Get remittance details
   */
  async getRemittance(user: User, remittanceId: string) {
    const remittance = await this.prisma.driverRemittance.findUnique({
      where: { id: remittanceId },
      include: {
        driver: {
          select: { id: true, fullName: true, phone: true },
        },
        orders: {
          include: {
            order: {
              select: {
                id: true,
                orderNumber: true,
                subtotal: true,
                appFee: true,
                deliveryFee: true,
                total: true,
                codStatus: true,
                deliveredAt: true,
              },
            },
          },
        },
      },
    });

    if (!remittance) throw new NotFoundException('Remittance not found');

    // Only admin or the driver who owns it can view
    if (user.role !== 'admin' && remittance.driverId !== user.id) {
      throw new ForbiddenException();
    }

    return remittance;
  }
}
