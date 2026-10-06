import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async search(
    q: string,
    opts: { categoryId?: string; page?: number; limit?: number },
  ) {
    const page = opts.page ?? 1;
    const limit = Math.min(opts.limit ?? 20, 50);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      isAvailable: true,
      merchantProfile: { isApproved: true, isOpen: true },
    };

    if (q?.trim()) {
      where.OR = [
        { nameAr: { contains: q.trim(), mode: 'insensitive' } },
        { nameEn: { contains: q.trim(), mode: 'insensitive' } },
      ];
    }

    if (opts.categoryId) {
      where.merchantProfile = {
        ...(where.merchantProfile as object),
        categories: { some: { categoryId: opts.categoryId } },
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where: where as never,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          nameAr: true,
          nameEn: true,
          price: true,
          imageUrl: true,
          isAvailable: true,
          merchantProfile: {
            select: {
              id: true,
              storeName: true,
              storeSlug: true,
              logoUrl: true,
            },
          },
          productCategory: {
            select: { id: true, nameAr: true },
          },
        },
      }),
      this.prisma.product.count({ where: where as never }),
    ]);

    return { items, total, page, limit };
  }

  async listByStore(storeSlug: string) {
    const store = await this.prisma.merchantProfile.findFirst({
      where: { storeSlug, isApproved: true },
    });
    if (!store) throw new NotFoundException('Store not found');
    return this.prisma.product.findMany({
      where: { merchantProfileId: store.id, isAvailable: true },
      include: {
        options: true,
        productCategory: {
          select: { id: true, nameAr: true, nameEn: true, sortOrder: true, isActive: true },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async getOne(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { options: true, productCategory: true, merchantProfile: { select: { storeSlug: true } } },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  private normalizePrice(price: number | string): Decimal {
    // Ensure price is stored in IQD without extra zeros
    // Accept only valid positive numbers
    const n = Number(price);
    if (!Number.isFinite(n) || n <= 0) {
      throw new BadRequestException('السعر يجب أن يكون رقماً موجباً');
    }
    // Max 2 decimal places (IQD)
    const normalized = Math.round(n * 100) / 100;
    return new Decimal(normalized);
  }

  async create(user: User, merchantProfileId: string, data: { productCategoryId?: string; nameAr: string; nameEn?: string; description?: string; price: number; imageUrl?: string }) {
    if (user.role !== 'merchant') throw new ForbiddenException();
    const store = await this.prisma.merchantProfile.findUnique({ where: { userId: user.id } });
    if (!store || store.id !== merchantProfileId) throw new ForbiddenException();
    return this.prisma.product.create({
      data: {
        merchantProfileId,
        productCategoryId: data.productCategoryId,
        nameAr: data.nameAr,
        nameEn: data.nameEn,
        description: data.description,
        price: this.normalizePrice(data.price),
        imageUrl: data.imageUrl,
      },
    });
  }

  async update(user: User, productId: string, data: Record<string, unknown>) {
    if (user.role !== 'merchant') throw new ForbiddenException();
    const product = await this.prisma.product.findUnique({ where: { id: productId }, include: { merchantProfile: true } });
    if (!product || product.merchantProfile.userId !== user.id) throw new NotFoundException('Product not found');
    const allowed = ['productCategoryId', 'nameAr', 'nameEn', 'description', 'price', 'imageUrl', 'isAvailable', 'sortOrder'];
    const update: Record<string, unknown> = {};
    for (const k of allowed) if (data[k] !== undefined) update[k] = data[k];
    if (update.price !== undefined) update.price = this.normalizePrice(update.price as number);
    return this.prisma.product.update({ where: { id: productId }, data: update as never });
  }

  async delete(user: User, productId: string) {
    if (user.role !== 'merchant') throw new ForbiddenException();
    const product = await this.prisma.product.findUnique({ where: { id: productId }, include: { merchantProfile: true } });
    if (!product || product.merchantProfile.userId !== user.id) throw new NotFoundException('Product not found');
    await this.prisma.product.delete({ where: { id: productId } });
    return { success: true };
  }

  async listMyCategories(user: User) {
    if (user.role !== 'merchant') throw new ForbiddenException();
    const store = await this.prisma.merchantProfile.findUnique({ where: { userId: user.id } });
    if (!store) throw new NotFoundException('Store not found');
    return this.prisma.productCategory.findMany({
      where: { merchantProfileId: store.id },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async createMyCategory(user: User, data: { nameAr: string; nameEn?: string; sortOrder?: number; isActive?: boolean }) {
    if (user.role !== 'merchant') throw new ForbiddenException();
    const store = await this.prisma.merchantProfile.findUnique({ where: { userId: user.id } });
    if (!store) throw new NotFoundException('Store not found');
    return this.prisma.productCategory.create({
      data: {
        merchantProfileId: store.id,
        nameAr: data.nameAr,
        nameEn: data.nameEn,
        sortOrder: data.sortOrder ?? 0,
        isActive: data.isActive ?? true,
      },
    });
  }

  async updateMyCategory(user: User, id: string, data: { nameAr?: string; nameEn?: string; sortOrder?: number; isActive?: boolean }) {
    if (user.role !== 'merchant') throw new ForbiddenException();
    const category = await this.prisma.productCategory.findUnique({
      where: { id },
      include: { merchantProfile: true },
    });
    if (!category || category.merchantProfile.userId !== user.id) throw new NotFoundException('Category not found');
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

  async deleteMyCategory(user: User, id: string) {
    if (user.role !== 'merchant') throw new ForbiddenException();
    const category = await this.prisma.productCategory.findUnique({
      where: { id },
      include: { merchantProfile: true },
    });
    if (!category || category.merchantProfile.userId !== user.id) throw new NotFoundException('Category not found');
    await this.prisma.productCategory.delete({ where: { id } });
    return { success: true };
  }

  // ── ProductOption CRUD ──

  async listOptions(productId: string) {
    return this.prisma.productOption.findMany({
      where: { productId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createOption(user: User, productId: string, data: { name: string; priceModifier: number }) {
    if (user.role !== 'merchant') throw new ForbiddenException();
    const product = await this.prisma.product.findUnique({ where: { id: productId }, include: { merchantProfile: true } });
    if (!product || product.merchantProfile.userId !== user.id) throw new NotFoundException('Product not found');
    if (!data.name?.trim()) throw new BadRequestException('Option name is required');
    return this.prisma.productOption.create({
      data: {
        productId,
        name: data.name.trim(),
        priceModifier: new Decimal(data.priceModifier ?? 0),
      },
    });
  }

  async updateOption(user: User, optionId: string, data: { name?: string; priceModifier?: number }) {
    if (user.role !== 'merchant') throw new ForbiddenException();
    const option = await this.prisma.productOption.findUnique({
      where: { id: optionId },
      include: { product: { include: { merchantProfile: true } } },
    });
    if (!option || option.product.merchantProfile.userId !== user.id) throw new NotFoundException('Option not found');
    const update: Record<string, unknown> = {};
    if (data.name !== undefined) update.name = data.name.trim();
    if (data.priceModifier !== undefined) update.priceModifier = new Decimal(data.priceModifier);
    return this.prisma.productOption.update({ where: { id: optionId }, data: update as never });
  }

  async deleteOption(user: User, optionId: string) {
    if (user.role !== 'merchant') throw new ForbiddenException();
    const option = await this.prisma.productOption.findUnique({
      where: { id: optionId },
      include: { product: { include: { merchantProfile: true } } },
    });
    if (!option || option.product.merchantProfile.userId !== user.id) throw new NotFoundException('Option not found');
    await this.prisma.productOption.delete({ where: { id: optionId } });
    return { success: true };
  }
}
