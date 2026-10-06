import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  async list(userId: string) {
    return this.prisma.cartItem.findMany({
      where: { userId },
      include: { product: { include: { merchantProfile: { select: { storeSlug: true, storeName: true, latitude: true, longitude: true, addressText: true } } } } },
    });
  }

  async add(userId: string, productId: string, quantity: number, optionsSnapshot?: object) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product || !product.isAvailable) throw new NotFoundException('Product not found');

    const optKey = optionsSnapshot ? JSON.stringify(this.normalizeOptions(optionsSnapshot)) : '';

    const existingItems = await this.prisma.cartItem.findMany({
      where: { userId, productId },
    });

    const match = existingItems.find((item) => {
      const itemKey = item.optionsSnapshot ? JSON.stringify(this.normalizeOptions(item.optionsSnapshot as object)) : '';
      return itemKey === optKey;
    });

    if (match) {
      return this.prisma.cartItem.update({
        where: { id: match.id },
        data: { quantity: match.quantity + (quantity || 1) },
        include: { product: true },
      });
    }

    return this.prisma.cartItem.create({
      data: { userId, productId, quantity: quantity || 1, optionsSnapshot: optionsSnapshot as never },
      include: { product: true },
    });
  }

  private normalizeOptions(snapshot: object): unknown {
    const s = snapshot as { selectedOptions?: Array<{ id?: string; name?: string }> };
    if (!s.selectedOptions) return [];
    return s.selectedOptions.map((o) => o.id || o.name).sort();
  }

  async update(user: User, itemId: string, quantity: number) {
    const item = await this.prisma.cartItem.findFirst({ where: { id: itemId, userId: user.id } });
    if (!item) throw new NotFoundException('Cart item not found');
    if (quantity <= 0) {
      await this.prisma.cartItem.delete({ where: { id: itemId } });
      return { deleted: true };
    }
    return this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
    });
  }

  async remove(user: User, itemId: string) {
    const item = await this.prisma.cartItem.findFirst({ where: { id: itemId, userId: user.id } });
    if (!item) throw new NotFoundException('Cart item not found');
    await this.prisma.cartItem.delete({ where: { id: itemId } });
    return { success: true };
  }

  async clear(userId: string) {
    await this.prisma.cartItem.deleteMany({ where: { userId } });
    return { success: true };
  }
}
