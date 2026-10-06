// Expo inlines EXPO_PUBLIC_* values at bundle time. Keep the deployed API as a
// fallback so the app remains usable if a local .env file has not been loaded.
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://127.0.0.1:8080';

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function getAuthToken() {
  return authToken;
}

export async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (authToken) (headers as Record<string, string>)['Authorization'] = `Bearer ${authToken}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (res.status === 401) {
    authToken = null;
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'Request failed');
  }
  return res.json();
}

// Auth
export async function login(email: string, password: string) {
  return request<{ user: Record<string, unknown>; access_token: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function register(data: { email: string; password: string; fullName: string; phone?: string }) {
  return request<{ user: Record<string, unknown>; access_token: string }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ ...data, role: 'customer' }),
  });
}

export async function getProfile() {
  return request<Record<string, unknown>>('/auth/profile');
}

export async function updateProfile(data: { fullName?: string; phone?: string | null }) {
  return request<Record<string, unknown>>('/auth/profile', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function changeEmail(newEmail: string, password: string) {
  return request<Record<string, unknown>>('/auth/change-email', {
    method: 'PATCH',
    body: JSON.stringify({ newEmail, password }),
  });
}

export async function changePassword(currentPassword: string, newPassword: string) {
  return request<Record<string, unknown>>('/auth/change-password', {
    method: 'PATCH',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export async function updateAvatar(avatarUrl: string | null) {
  return request<Record<string, unknown>>('/auth/avatar', {
    method: 'PATCH',
    body: JSON.stringify({ avatarUrl }),
  });
}

export async function uploadAvatarImage(imageUri: string): Promise<string> {
  // Convert image URI to blob for React Native
  const formData = new FormData();

  // Get filename from URI
  const uriParts = imageUri.split('/');
  const filename = uriParts[uriParts.length - 1];
  const fileExtension = filename.split('.').pop()?.toLowerCase() || 'jpg';

  // Determine mime type
  const mimeType = fileExtension === 'png' ? 'image/png' :
                   fileExtension === 'webp' ? 'image/webp' :
                   fileExtension === 'gif' ? 'image/gif' : 'image/jpeg';

  // For React Native, we need to create a file object
  formData.append('image', {
    uri: imageUri,
    name: filename,
    type: mimeType,
  } as unknown as Blob);

  const headers: HeadersInit = {};
  if (authToken) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${authToken}`;
  }

  const res = await fetch(`${API_URL}/auth/upload-avatar`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'Upload failed');
  }

  const data = await res.json();
  return data.avatarUrl;
}

export interface PricingBand {
  minKm: number;
  maxKm: number | null;
  fee: number;
}

export interface PricingConfig {
  appFee: {
    threshold: number;
    belowThreshold: number;
    aboveThreshold: number;
  };
  distanceBands: PricingBand[];
}

// Public
export async function getSettings() {
  return request<{ appLogoUrl?: string | null; appNameAr?: string | null; appNameEn?: string | null; pricingConfig?: PricingConfig }>('/settings');
}

export async function getCategories() {
  return request<Array<{ id: string; nameAr: string; nameEn: string | null; slug: string; iconUrl?: string | null; isActive: boolean }>>('/categories');
}

export async function getPromoBanners() {
  return request<Array<{ id: string; titleAr: string; titleEn?: string | null; imageUrl?: string | null; linkUrl?: string | null; sortOrder: number }>>('/promo-banners');
}

export type HomeSection = {
  id: string;
  titleAr: string;
  slug?: string | null;
  merchants: Array<{
    id: string;
    storeName: string;
    storeSlug: string;
    logoUrl?: string | null;
    coverUrl?: string | null;
    deliveryFee?: number | null;
    isOpen?: boolean;
    hasOffers?: boolean;
    ratingAvg?: number;
    ratingCount?: number;
    estimatedDeliveryMin?: number | null;
    estimatedDeliveryMax?: number | null;
    discountLabel?: string | null;
  }>;
};

export type HomeCategory = {
  id: string;
  nameAr: string;
  nameEn?: string | null;
  slug: string;
  iconUrl?: string | null;
};

export async function getHome(lat?: number, lng?: number) {
  const params = new URLSearchParams();
  if (lat != null && Number.isFinite(lat)) params.set('lat', String(lat));
  if (lng != null && Number.isFinite(lng)) params.set('lng', String(lng));
  const q = params.toString() ? `?${params.toString()}` : '';
  return request<{ categories: HomeCategory[]; sections: HomeSection[]; nearby?: HomeSection['merchants'] }>(`/home${q}`);
}

export async function getMerchants(categoryId?: string, lat?: number, lng?: number) {
  const params = new URLSearchParams();
  if (categoryId) params.set('categoryId', categoryId);
  if (lat != null && Number.isFinite(lat)) params.set('lat', String(lat));
  if (lng != null && Number.isFinite(lng)) params.set('lng', String(lng));
  const q = params.toString() ? `?${params.toString()}` : '';
  return request<
    Array<{
      id: string;
      storeName: string;
      storeSlug: string;
      logoUrl?: string | null;
      coverUrl?: string | null;
      deliveryFee?: string | number | null;
      isOpen?: boolean;
      hasOffers?: boolean;
      ratingAvg?: number;
      ratingCount?: number;
      estimatedDeliveryMin?: number | null;
      estimatedDeliveryMax?: number | null;
      discountLabel?: string | null;
    }>
  >(`/merchants${q}`);
}

export async function getStoreBySlug(slug: string) {
  return request<Record<string, unknown>>(`/merchants/store/${encodeURIComponent(slug)}`);
}

export async function getProductsByStore(storeSlug: string) {
  return request<Array<{
    id: string;
    nameAr: string;
    nameEn?: string | null;
    description?: string | null;
    price: number;
    imageUrl?: string | null;
    isAvailable?: boolean;
    sortOrder?: number;
    productCategoryId?: string | null;
    productCategory?: {
      id: string;
      nameAr: string;
      nameEn?: string | null;
      sortOrder?: number;
      isActive?: boolean;
    } | null;
  }>>(`/products/store/${encodeURIComponent(storeSlug)}`);
}

export async function getProduct(productId: string) {
  return request<{
    id: string;
    nameAr: string;
    nameEn?: string | null;
    description?: string | null;
    price: number;
    imageUrl?: string | null;
    isAvailable?: boolean;
    options?: Array<{ id: string; name: string; priceModifier: number | string }>;
    merchantProfile?: { storeSlug?: string };
    productCategory?: { id: string; nameAr: string } | null;
  }>(`/products/${productId}`);
}

// Customer (auth required)
export async function getAddresses() {
  return request<Array<Record<string, unknown>>>('/addresses');
}

export async function addAddress(data: { label?: string; addressText: string; latitude?: number; longitude?: number; building?: string; floor?: string; extraNotes?: string; isDefault?: boolean }) {
  return request<Record<string, unknown>>('/addresses', { method: 'POST', body: JSON.stringify(data) });
}

export async function getAddress(id: string) {
  return request<Record<string, unknown>>(`/addresses/${id}`);
}

export async function updateAddress(id: string, data: { label?: string; addressText?: string; latitude?: number; longitude?: number; building?: string; floor?: string; extraNotes?: string; isDefault?: boolean }) {
  return request<Record<string, unknown>>(`/addresses/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function deleteAddress(id: string) {
  return request<{ success?: boolean }>(`/addresses/${id}`, { method: 'DELETE' });
}

/** Backend returns cart items as a direct array, not { items }. We normalize to { items } for callers. */
export async function getCart() {
  const res = await request<Array<Record<string, unknown>> | { items: Array<Record<string, unknown>> }>('/cart');
  const items = Array.isArray(res) ? res : (res?.items ?? []);
  return { items };
}

export async function addToCart(productId: string, quantity?: number, optionsSnapshot?: unknown) {
  return request<Record<string, unknown>>('/cart', {
    method: 'POST',
    body: JSON.stringify({ productId, quantity, optionsSnapshot }),
  });
}

export async function updateCartItem(cartItemId: string, quantity: number) {
  return request(`/cart/${cartItemId}`, { method: 'PATCH', body: JSON.stringify({ quantity }) });
}

export async function removeCartItem(cartItemId: string) {
  return request(`/cart/${cartItemId}`, { method: 'DELETE' });
}

export async function clearCart() {
  return request('/cart', { method: 'DELETE' });
}

export async function createOrder(data: {
  addressId: string;
  paymentMethod: 'cash' | 'card' | 'wallet';
  notes?: string;
  promoCode?: string;
}) {
  return request<{
    id: string;
    orderNumber: string;
    subtotal: number | string;
    deliveryFee: number | string;
    appFee: number | string;
    total: number | string;
    promoDiscountAmount?: number | string;
    promoPercent?: number | null;
    paymentMethod: 'cash' | 'card' | 'wallet';
    status: string;
    pricingSnapshot?: {
      distanceKm?: number;
      distanceBand?: { minKm: number; maxKm: number | null; fee: number };
      deliveryFee?: number;
      appFee?: number;
      subtotal?: number;
      total?: number;
    };
  }>('/orders', { method: 'POST', body: JSON.stringify(data) });
}

export async function getOrders() {
  return request<Array<Record<string, unknown>>>('/orders');
}

export async function getOrder(id: string) {
  return request<Record<string, unknown>>(`/orders/${id}`);
}

export async function getFaq() {
  return request<Array<Record<string, unknown>>>('/faq');
}

export async function getSupportChannels() {
  return request<Array<{ id: string; type: string; label: string; value: string; iconName: string | null; sortOrder: number }>>('/support-channels');
}

export async function registerPushToken(fcmToken: string) {
  return request<Record<string, unknown>>('/auth/fcm-token', {
    method: 'POST',
    body: JSON.stringify({ fcmToken }),
  });
}

export async function getNotifications() {
  return request<Array<{ id: string; title: string; body: string; type: string; data?: Record<string, unknown>; isRead: boolean; createdAt: string }>>('/notifications');
}

export async function getUnreadNotificationCount() {
  return request<number>('/notifications/unread-count');
}

export async function markNotificationRead(id: string) {
  return request<Record<string, unknown>>(`/notifications/${id}/read`, { method: 'PATCH' });
}

export async function markAllNotificationsRead() {
  return request<Record<string, unknown>>('/notifications/read-all', { method: 'PATCH' });
}

export async function getOrderDriverLocation(orderId: string) {
  return request<{
    driverId: string | null;
    latitude: number | null;
    longitude: number | null;
    lastLocationUpdatedAt: string | null;
    status: string;
  }>(`/orders/${orderId}/driver-location`);
}

// Ratings
export async function rateStore(orderId: string, stars: number, comment?: string) {
  return request<Record<string, unknown>>('/ratings/store', {
    method: 'POST',
    body: JSON.stringify({ orderId, stars, comment: comment || undefined }),
  });
}

export async function rateDriver(orderId: string, stars: number, comment?: string) {
  return request<Record<string, unknown>>('/ratings/driver', {
    method: 'POST',
    body: JSON.stringify({ orderId, stars, comment: comment || undefined }),
  });
}

// Favorites
export async function toggleFavorite(targetType: 'store' | 'product', targetId: string) {
  return request<{ favorited: boolean }>('/favorites/toggle', {
    method: 'POST',
    body: JSON.stringify({ targetType, targetId }),
  });
}

export async function getFavorites(type?: string) {
  const q = type ? `?type=${type}` : '';
  return request<{
    stores: Array<{ id: string; storeName: string; storeSlug: string; logoUrl?: string | null; coverUrl?: string | null; deliveryFee?: unknown; isOpen?: boolean; ratingAvg?: number; ratingCount?: number }>;
    products: Array<{ id: string; nameAr: string; price: number; imageUrl?: string | null; isAvailable?: boolean; merchantProfile?: { storeName: string; storeSlug: string; logoUrl?: string | null } }>;
  }>(`/favorites${q}`);
}

export async function getFavoriteIds() {
  return request<Array<{ targetType: string; targetId: string }>>('/favorites/ids');
}

// Product search
export async function searchProducts(q: string, categoryId?: string, page = 1, limit = 20) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (categoryId) params.set('categoryId', categoryId);
  params.set('page', String(page));
  params.set('limit', String(limit));
  return request<{
    items: Array<{
      id: string;
      nameAr: string;
      nameEn?: string | null;
      price: number;
      imageUrl?: string | null;
      isAvailable?: boolean;
      merchantProfile?: { id: string; storeName: string; storeSlug: string; logoUrl?: string | null };
      productCategory?: { id: string; nameAr: string } | null;
    }>;
    total: number;
    page: number;
    limit: number;
  }>(`/products/search?${params.toString()}`);
}
