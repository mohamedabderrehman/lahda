import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SettlementReceiptService } from '../settlements/settlement-receipt.service';
import { User } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class MerchantLedgerService {
  constructor(
    private prisma: PrismaService,
    private receiptService: SettlementReceiptService,
  ) {}

  /**
   * Calculate merchant balance (credits - debits) and tax at settlement
   */
  async getMerchantBalance(merchantId: string): Promise<{
    balance: number;
    credits: number;
    debits: number;
    taxPercent: number;
    taxAmount: number;
    netAfterTax: number;
  }> {
    const [creditsAgg, debitsAgg, profile] = await Promise.all([
      this.prisma.merchantLedgerEntry.aggregate({
        where: { merchantProfileId: merchantId, type: 'credit' },
        _sum: { amount: true },
      }),
      this.prisma.merchantLedgerEntry.aggregate({
        where: { merchantProfileId: merchantId, type: 'debit' },
        _sum: { amount: true },
      }),
      this.prisma.merchantProfile.findUnique({
        where: { id: merchantId },
        select: { taxPercent: true },
      }),
    ]);

    const credits = Number(creditsAgg._sum.amount ?? 0);
    const debits = Number(debitsAgg._sum.amount ?? 0);
    const balance = credits - debits;
    const taxPercent = profile?.taxPercent ?? 5;
    const taxAmount = Math.round(balance * (taxPercent / 100) * 100) / 100;
    const netAfterTax = Math.round((balance - taxAmount) * 100) / 100;

    return {
      balance,
      credits,
      debits,
      taxPercent,
      taxAmount,
      netAfterTax,
    };
  }

  /**
   * Get merchant ledger entries with pagination
   */
  async getMerchantLedger(
    merchantId: string,
    page = 1,
    limit = 50,
  ) {
    const [items, total] = await Promise.all([
      this.prisma.merchantLedgerEntry.findMany({
        where: { merchantProfileId: merchantId },
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
              deliveredAt: true,
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.merchantLedgerEntry.count({ where: { merchantProfileId: merchantId } }),
    ]);

    return { items, total, page, limit };
  }

  /**
   * Admin: Get all merchants with their balances
   */
  async getAllMerchantsWithBalances(adminUser: User, page = 1, limit = 20) {
    if (adminUser.role !== 'admin') throw new ForbiddenException();

    const [merchants, total] = await Promise.all([
      this.prisma.merchantProfile.findMany({
        include: {
          user: {
            select: { fullName: true, email: true, phone: true },
          },
          _count: {
            select: { orders: true },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.merchantProfile.count(),
    ]);

    // Calculate balance and tax for each merchant
    const merchantsWithBalances = await Promise.all(
      merchants.map(async (m) => {
        const balance = await this.getMerchantBalance(m.id);
        return {
          ...m,
          balance: balance.balance,
          totalCredits: balance.credits,
          totalDebits: balance.debits,
          taxPercent: balance.taxPercent,
          taxAmount: balance.taxAmount,
          netAfterTax: balance.netAfterTax,
        };
      }),
    );

    return { items: merchantsWithBalances, total, page, limit };
  }

  /**
   * Admin: Create a payout (debit entry) for a merchant
   */
  async createPayout(
    adminUser: User,
    merchantId: string,
    amount: number,
    note?: string,
  ) {
    if (adminUser.role !== 'admin') throw new ForbiddenException();

    const merchant = await this.prisma.merchantProfile.findUnique({
      where: { id: merchantId },
    });
    if (!merchant) throw new NotFoundException('Merchant not found');

    if (amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    const balance = await this.getMerchantBalance(merchantId);
    if (amount > balance.balance) {
      throw new BadRequestException(`Insufficient balance. Available: ${balance.balance}, Requested: ${amount}`);
    }

    const entry = await this.prisma.merchantLedgerEntry.create({
      data: {
        merchantProfileId: merchantId,
        type: 'debit',
        amount: new Decimal(amount),
        note: note || 'تسوية رصيد من الإدارة',
      },
    });

    let receipt = null;
    try {
      receipt = await this.receiptService.createForMerchantPayout({
        ledgerEntryId: entry.id,
        merchantName: merchant.storeName,
        merchantPhone: merchant.phone,
        merchantId: merchant.id,
        amount,
        note: note || null,
        adminId: adminUser.id,
        snapshot: {
          storeName: merchant.storeName,
          balanceBefore: balance.balance,
          balanceAfter: balance.balance - amount,
          taxPercent: balance.taxPercent,
          taxAmount: balance.taxAmount,
          netAfterTax: balance.netAfterTax,
          payoutAmount: amount,
          note: note || null,
        },
      });
    } catch { /* receipt generation failure should not block the payout */ }

    return {
      entry,
      newBalance: balance.balance - amount,
      receipt,
    };
  }

  /**
   * Admin: Get merchant details with balance and ledger
   */
  async getMerchantDetails(adminUser: User, merchantId: string) {
    if (adminUser.role !== 'admin') throw new ForbiddenException();

    const merchant = await this.prisma.merchantProfile.findUnique({
      where: { id: merchantId },
      include: {
        user: {
          select: { fullName: true, email: true, phone: true },
        },
      },
    });

    if (!merchant) throw new NotFoundException('Merchant not found');

    const [balanceWithTax, recentLedger] = await Promise.all([
      this.getMerchantBalance(merchantId),
      this.prisma.merchantLedgerEntry.findMany({
        where: { merchantProfileId: merchantId },
        include: {
          order: {
            select: { id: true, orderNumber: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    return {
      merchant,
      balance: balanceWithTax,
      recentLedger,
    };
  }
}
