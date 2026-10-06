import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const NEARBY_LIMIT = 8;

@Injectable()
export class HomeService {
  constructor(private prisma: PrismaService) {}

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

  private toMerchantDto(m: {
    id: string;
    storeName: string;
    storeSlug: string;
    logoUrl: string | null;
    coverUrl: string | null;
    deliveryFee: unknown;
    isOpen: boolean;
    hasOffers: boolean;
    ratingAvg: number;
    ratingCount: number;
    estimatedDeliveryMin: number | null;
    estimatedDeliveryMax: number | null;
    discountLabel: string | null;
  }) {
    return {
      id: m.id,
      storeName: m.storeName,
      storeSlug: m.storeSlug,
      logoUrl: m.logoUrl,
      coverUrl: m.coverUrl,
      deliveryFee: m.deliveryFee != null ? Number(m.deliveryFee) : null,
      isOpen: m.isOpen,
      hasOffers: m.hasOffers,
      ratingAvg: m.ratingAvg,
      ratingCount: m.ratingCount,
      estimatedDeliveryMin: m.estimatedDeliveryMin,
      estimatedDeliveryMax: m.estimatedDeliveryMax,
      discountLabel: m.discountLabel,
    };
  }

  async getHome(lat?: number, lng?: number) {
    const categories = await this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        nameAr: true,
        nameEn: true,
        slug: true,
        iconUrl: true,
      },
    });

    const homeSectionsRaw = await this.prisma.homeSection.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        merchants: {
          orderBy: { sortOrder: 'asc' },
          include: {
            merchantProfile: {
              select: {
                id: true,
                storeName: true,
                storeSlug: true,
                logoUrl: true,
                coverUrl: true,
                deliveryFee: true,
                isOpen: true,
                hasOffers: true,
                ratingAvg: true,
                ratingCount: true,
                estimatedDeliveryMin: true,
                estimatedDeliveryMax: true,
                discountLabel: true,
                isApproved: true,
              },
            },
          },
        },
      },
    });

    const sections = homeSectionsRaw
      .map((sec) => ({
        id: sec.id,
        titleAr: sec.titleAr,
        titleEn: sec.titleEn,
        slug: sec.slug,
        merchants: sec.merchants
          .map((m) => m.merchantProfile)
          .filter((m) => m.isApproved)
          .map((m) => this.toMerchantDto(m as never)),
      }))
      .filter((s) => s.merchants.length > 0);

    let nearby: ReturnType<typeof this.toMerchantDto>[] | undefined;
    if (lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)) {
      const all = await this.prisma.merchantProfile.findMany({
        where: { isApproved: true },
        select: {
          id: true,
          storeName: true,
          storeSlug: true,
          logoUrl: true,
          coverUrl: true,
          deliveryFee: true,
          isOpen: true,
          hasOffers: true,
          ratingAvg: true,
          ratingCount: true,
          estimatedDeliveryMin: true,
          estimatedDeliveryMax: true,
          discountLabel: true,
          latitude: true,
          longitude: true,
        },
      });
      const withDistance = all.map((m) => ({
        ...m,
        _distance: this.haversineKm(lat, lng, m.latitude ?? 0, m.longitude ?? 0),
      }));
      withDistance.sort((a, b) => a._distance - b._distance);
      nearby = withDistance.slice(0, NEARBY_LIMIT).map(({ _distance, latitude, longitude, ...rest }) => this.toMerchantDto(rest as never));
    }

    return { categories, sections, nearby };
  }
}
