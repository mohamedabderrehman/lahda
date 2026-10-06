import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class SettlementReceiptService {
  constructor(private prisma: PrismaService) {}

  private async nextReceiptNumber(): Promise<string> {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `RCPT-${today}-`;
    const last = await this.prisma.settlementReceipt.findFirst({
      where: { receiptNumber: { startsWith: prefix } },
      orderBy: { receiptNumber: 'desc' },
      select: { receiptNumber: true },
    });
    const seq = last ? parseInt(last.receiptNumber.slice(prefix.length), 10) + 1 : 1;
    return `${prefix}${String(seq).padStart(5, '0')}`;
  }

  async createForDriverRemittance(params: {
    remittanceId: string;
    driverName: string;
    driverPhone: string | null;
    driverId: string;
    amount: number;
    adminId: string;
    snapshot: object;
  }) {
    const receiptNumber = await this.nextReceiptNumber();
    return this.prisma.settlementReceipt.create({
      data: {
        receiptNumber,
        type: 'driver_remittance',
        partyType: 'driver',
        partyId: params.driverId,
        partyName: params.driverName,
        partyPhone: params.driverPhone,
        amount: new Decimal(params.amount),
        method: 'cash',
        issuedByAdminId: params.adminId,
        remittanceId: params.remittanceId,
        snapshotJson: params.snapshot as never,
      },
    });
  }

  async createForMerchantPayout(params: {
    ledgerEntryId: string;
    merchantName: string;
    merchantPhone: string | null;
    merchantId: string;
    amount: number;
    note: string | null;
    adminId: string;
    snapshot: object;
  }) {
    const receiptNumber = await this.nextReceiptNumber();
    return this.prisma.settlementReceipt.create({
      data: {
        receiptNumber,
        type: 'merchant_payout',
        partyType: 'merchant',
        partyId: params.merchantId,
        partyName: params.merchantName,
        partyPhone: params.merchantPhone,
        amount: new Decimal(params.amount),
        method: 'cash',
        reference: params.note,
        issuedByAdminId: params.adminId,
        ledgerEntryId: params.ledgerEntryId,
        snapshotJson: params.snapshot as never,
      },
    });
  }

  async getReceipt(user: User, receiptId: string) {
    if (user.role !== 'admin') throw new ForbiddenException();
    const receipt = await this.prisma.settlementReceipt.findUnique({
      where: { id: receiptId },
    });
    if (!receipt) throw new NotFoundException('Receipt not found');
    return receipt;
  }

  async getReceiptByRemittanceId(remittanceId: string) {
    return this.prisma.settlementReceipt.findUnique({
      where: { remittanceId },
    });
  }

  async getReceiptByLedgerEntryId(ledgerEntryId: string) {
    return this.prisma.settlementReceipt.findUnique({
      where: { ledgerEntryId },
    });
  }

  async listReceipts(user: User, filters: {
    partyType?: string;
    partyId?: string;
    page?: number;
    limit?: number;
  }) {
    if (user.role !== 'admin') throw new ForbiddenException();
    const { partyType, partyId, page = 1, limit = 20 } = filters;
    const where: Record<string, unknown> = {};
    if (partyType) where.partyType = partyType;
    if (partyId) where.partyId = partyId;

    const [items, total] = await Promise.all([
      this.prisma.settlementReceipt.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { issuedAt: 'desc' },
      }),
      this.prisma.settlementReceipt.count({ where }),
    ]);
    return { items, total, page, limit };
  }
}
