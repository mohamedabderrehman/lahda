import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';

@Injectable()
export class FavoritesService {
  constructor(private prisma: PrismaService) {}

  async toggle(user: User, targetType: string, targetId: string) {
    if (user.role !== 'customer') throw new ForbiddenException();
    if (!['store', 'product'].includes(targetType))
      throw new BadRequestException('targetType must be store or product');

    const existing = await this.prisma.favorite.findUnique({
      where: { userId_targetType_targetId: { userId: user.id, targetType, targetId } },
    });

    if (existing) {
      await this.prisma.favorite.delete({ where: { id: existing.id } });
      return { favorited: false };
    }

    await this.prisma.favorite.create({
      data: { userId: user.id, targetType, targetId },
    });
    return { favorited: true };
  }

  async list(user: User, targetType?: string) {
    if (user.role !== 'customer') throw new ForbiddenException();
    const where: Record<string, unknown> = { userId: user.id };
    if (targetType) where.targetType = targetType;

    const favs = await this.prisma.favorite.findMany({
      where: where as never,
      orderBy: { createdAt: 'desc' },
    });

    const storeIds = favs.filter((f) => f.targetType === 'store').map((f) => f.targetId);
    const productIds = favs.filter((f) => f.targetType === 'product').map((f) => f.targetId);

    const [stores, products] = await Promise.all([
      storeIds.length
        ? this.prisma.merchantProfile.findMany({
            where: { id: { in: storeIds } },
            select: {
              id: true,
              storeName: true,
              storeSlug: true,
              logoUrl: true,
              coverUrl: true,
              deliveryFee: true,
              isOpen: true,
              ratingAvg: true,
              ratingCount: true,
            },
          })
        : [],
      productIds.length
        ? this.prisma.product.findMany({
            where: { id: { in: productIds } },
            select: {
              id: true,
              nameAr: true,
              price: true,
              imageUrl: true,
              isAvailable: true,
              merchantProfile: {
                select: { storeName: true, storeSlug: true, logoUrl: true },
              },
            },
          })
        : [],
    ]);

    return { stores, products };
  }

  async getIds(user: User) {
    if (user.role !== 'customer') throw new ForbiddenException();
    const favs = await this.prisma.favorite.findMany({
      where: { userId: user.id },
      select: { targetType: true, targetId: true },
    });
    return favs;
  }
}
