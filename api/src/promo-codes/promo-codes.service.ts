import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

interface ValidateOptions {
  subtotal: number;
  merchantProfileId?: string | null;
  now?: Date;
}

@Injectable()
export class PromoCodesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.promoCode.findMany({
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  async findByMerchant(merchantProfileId: string) {
    return this.prisma.promoCode.findMany({
      where: { merchantProfileId },
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  async create(data: {
    code: string;
    description?: string;
    percentage: number;
    maxDiscount?: number | null;
    minSubtotal?: number | null;
    expiresAt?: Date | string | null;
    isActive?: boolean;
    merchantProfileId?: string | null;
  }) {
    const percentage = Number(data.percentage);
    if (!Number.isFinite(percentage) || percentage <= 0 || percentage > 100) {
      throw new BadRequestException('النسبة يجب أن تكون بين 1 و 100');
    }

    const maxDiscount = data.maxDiscount != null ? new Decimal(data.maxDiscount) : null;
    const minSubtotal = data.minSubtotal != null ? new Decimal(data.minSubtotal) : null;

    const expiresAt =
      data.expiresAt != null
        ? new Date(typeof data.expiresAt === 'string' ? data.expiresAt : data.expiresAt)
        : null;

    return this.prisma.promoCode.create({
      data: {
        code: data.code.toUpperCase(),
        description: data.description ?? null,
        percentage,
        maxDiscount,
        minSubtotal,
        expiresAt,
        isActive: data.isActive ?? true,
        merchantProfileId: data.merchantProfileId ?? null,
      },
    });
  }

  async update(
    id: string,
    data: {
      description?: string;
      percentage?: number;
      maxDiscount?: number | null;
      minSubtotal?: number | null;
      expiresAt?: Date | string | null;
      isActive?: boolean;
    },
  ) {
    const existing = await this.prisma.promoCode.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Promo code not found');

    const updateData: Record<string, unknown> = {};

    if (data.description !== undefined) updateData.description = data.description;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    if (data.percentage !== undefined) {
      const percentage = Number(data.percentage);
      if (!Number.isFinite(percentage) || percentage <= 0 || percentage > 100) {
        throw new BadRequestException('النسبة يجب أن تكون بين 1 و 100');
      }
      updateData.percentage = percentage;
    }

    if (data.maxDiscount !== undefined) {
      updateData.maxDiscount =
        data.maxDiscount != null ? new Decimal(data.maxDiscount) : null;
    }

    if (data.minSubtotal !== undefined) {
      updateData.minSubtotal =
        data.minSubtotal != null ? new Decimal(data.minSubtotal) : null;
    }

    if (data.expiresAt !== undefined) {
      updateData.expiresAt =
        data.expiresAt != null
          ? new Date(typeof data.expiresAt === 'string' ? data.expiresAt : data.expiresAt)
          : null;
    }

    return this.prisma.promoCode.update({
      where: { id },
      data: updateData,
    });
  }

  async delete(id: string) {
    await this.prisma.promoCode.delete({ where: { id } });
    return { ok: true };
  }

  async updateForMerchant(
    id: string,
    merchantProfileId: string,
    data: {
      description?: string;
      percentage?: number;
      maxDiscount?: number | null;
      minSubtotal?: number | null;
      expiresAt?: Date | string | null;
      isActive?: boolean;
    },
  ) {
    const existing = await this.prisma.promoCode.findFirst({
      where: { id, merchantProfileId },
    });
    if (!existing) throw new NotFoundException('Promo code not found');
    return this.update(id, data);
  }

  async deleteForMerchant(id: string, merchantProfileId: string) {
    const existing = await this.prisma.promoCode.findFirst({
      where: { id, merchantProfileId },
    });
    if (!existing) throw new NotFoundException('Promo code not found');
    await this.prisma.promoCode.delete({ where: { id } });
    return { ok: true };
  }

  private ensureUsable(promo: { isActive: boolean; expiresAt: Date | null }, now: Date) {
    if (!promo.isActive) {
      throw new BadRequestException('هذا الكود غير مُفعّل حالياً');
    }
    if (promo.expiresAt && promo.expiresAt.getTime() < now.getTime()) {
      throw new BadRequestException('انتهت صلاحية هذا الكود');
    }
  }

  /**
   * Validate promo code for a given subtotal.
   * Used by both public /promo-codes/validate endpoint and OrdersService.create.
   */
  async validateForOrder(code: string, opts: ValidateOptions) {
    const now = opts.now ?? new Date();
    const normalized = code.trim().toUpperCase();
    if (!normalized) throw new BadRequestException('أدخل كود الخصم');

    const promo = await this.prisma.promoCode.findUnique({
      where: { code: normalized },
    });
    if (!promo) throw new BadRequestException('كود الخصم غير صالح');

    // If promo code is scoped to a specific merchant, ensure it matches current merchant
    if (promo.merchantProfileId && opts.merchantProfileId && promo.merchantProfileId !== opts.merchantProfileId) {
      throw new BadRequestException('هذا الكود خاص بمتجر آخر ولا يمكن استخدامه هنا');
    }

    this.ensureUsable(promo, now);

    const subtotal = Number(opts.subtotal);
    if (!Number.isFinite(subtotal) || subtotal <= 0) {
      throw new BadRequestException('لا يمكن تطبيق الخصم على سلة فارغة');
    }

    if (promo.minSubtotal != null) {
      const min = Number(promo.minSubtotal);
      if (subtotal < min) {
        throw new BadRequestException(
          `قيمة الطلب أقل من الحد الأدنى لتطبيق الكود (${min.toLocaleString('ar-IQ')} د.ع)`,
        );
      }
    }

    let discount = (subtotal * promo.percentage) / 100;
    if (promo.maxDiscount != null) {
      const max = Number(promo.maxDiscount);
      if (discount > max) discount = max;
    }

    if (discount <= 0) {
      throw new BadRequestException('لا يمكن تطبيق خصم على هذا الطلب');
    }

    return {
      promo,
      code: promo.code,
      percentage: promo.percentage,
      discountAmount: discount,
    };
  }
}

