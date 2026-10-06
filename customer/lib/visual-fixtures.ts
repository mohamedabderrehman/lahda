import type { HomeCategory, HomeSection } from '../api/client';

/** Visual QA only. Enable locally with EXPO_PUBLIC_VISUAL_FIXTURES=true; never used in production. */
export const useVisualFixtures = __DEV__ && process.env.EXPO_PUBLIC_VISUAL_FIXTURES === 'true';

export const visualHome: { categories: HomeCategory[]; sections: HomeSection[] } = {
  categories: [
    { id: 'pizza', nameAr: 'بيتزا', slug: 'pizza' }, { id: 'burger', nameAr: 'برغر', slug: 'burger' },
    { id: 'algerian', nameAr: 'جزائري', slug: 'algerian' }, { id: 'sweets', nameAr: 'حلويات', slug: 'sweets' },
  ],
  sections: [{ id: 'open-now', titleAr: 'مفتوح الآن', merchants: [
    { id: '1', storeName: 'دار البيتزا الإيطالية', storeSlug: 'dar-pizza', coverUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=900&q=80', ratingAvg: 4.8, ratingCount: 126, deliveryFee: 150, isOpen: true, estimatedDeliveryMin: 25, estimatedDeliveryMax: 35, hasOffers: true, discountLabel: 'خصم 15%' },
    { id: '2', storeName: 'برغر الحي', storeSlug: 'burger-hay', coverUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=80', ratingAvg: 4.6, ratingCount: 88, deliveryFee: 100, isOpen: true, estimatedDeliveryMin: 20, estimatedDeliveryMax: 30 },
    { id: '3', storeName: 'مطبخ الدار الجزائري', storeSlug: 'matbakh-dar', coverUrl: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=80', ratingAvg: 4.9, ratingCount: 210, deliveryFee: 0, isOpen: true, estimatedDeliveryMin: 30, estimatedDeliveryMax: 40 },
  ] }],
};
