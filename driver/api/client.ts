// EXPO_PUBLIC_API_URL is set per environment. The fallback keeps Expo Go pointed
// at the current Lahda API if a local .env file has not been loaded yet.
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:8080';

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function getAuthToken() {
  return authToken;
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
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

export async function login(email: string, password: string) {
  return request<{ user: Record<string, unknown>; access_token: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function getProfile() {
  return request<Record<string, unknown>>('/auth/profile');
}

export async function getDriverProfile() {
  return request<Record<string, unknown>>('/driver/profile');
}

export async function setDriverOnline(isOnline: boolean) {
  return request<Record<string, unknown>>('/driver/online', {
    method: 'POST',
    body: JSON.stringify({ isOnline }),
  });
}

export async function updateDriverLocation(latitude: number, longitude: number) {
  return request<Record<string, unknown>>('/driver/location', {
    method: 'POST',
    body: JSON.stringify({ latitude, longitude }),
  });
}

export async function updateDriverProfile(data: { nationalId?: string; vehicleInfo?: string }) {
  return request<Record<string, unknown>>('/driver/profile', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function getDriverEarnings() {
  return request<{
    earnings: Array<Record<string, unknown>>;
    total: number;
    pending: number;
  }>('/driver/earnings');
}

// Reward Challenge
export interface RewardChallengeTier {
  trips: number;
  amount: number;
}

export interface RewardChallengeConfig {
  timeWindowMinutes: number;
  tiers: RewardChallengeTier[];
}

export interface RewardChallengeStatus {
  config: RewardChallengeConfig;
  challenge: {
    startedAt: string;
    timeRemainingSeconds: number;
    deliveriesCount: number;
    eligibleTier: number | null;
    canClaim: boolean;
  } | null;
  usedToday: boolean;
}

export async function getRewardChallengeStatus() {
  return request<RewardChallengeStatus>('/driver/reward-challenge/status');
}

export async function startRewardChallenge() {
  return request<Record<string, unknown>>('/driver/reward-challenge/start', {
    method: 'POST',
  });
}

export async function claimRewardChallenge() {
  return request<Record<string, unknown>>('/driver/reward-challenge/claim', {
    method: 'POST',
  });
}

// COD (Cash on Delivery) Remittances
export interface RemittanceItem {
  id: string;
  orderNumber: string;
  subtotal: number;
  appFee: number;
  deliveryFee: number;
  total: number;
  deliveredAt: string;
}

export interface RemittanceSummary {
  orders: RemittanceItem[];
  summary: {
    ordersCount: number;
    subtotalSum: number;
    appFeeSum: number;
    deliveryFeeSum: number;
    amountDueToAdmin: number;
  };
}

export async function getCodEligibleOrders(date?: string) {
  const q = date ? `?date=${date}` : '';
  return request<RemittanceSummary>(`/driver/cod/orders${q}`);
}

export async function createRemittance(date?: string) {
  return request<{ remittanceId: string }>('/driver/remittances', {
    method: 'POST',
    body: JSON.stringify(date ? { date } : {}),
  });
}

export async function getMyRemittances() {
  return request<Array<{
    id: string;
    date: string;
    status: 'draft' | 'submitted' | 'confirmed';
    ordersCount: number;
    subtotalSum: number;
    appFeeSum: number;
    deliveryFeeSum: number;
    amountDueToAdmin: number;
    submittedAt?: string;
    confirmedAt?: string;
  }>>('/driver/remittances');
}

export async function getRemittanceDetails(remittanceId: string) {
  return request<{
    id: string;
    date: string;
    status: string;
    ordersCount: number;
    subtotalSum: number;
    appFeeSum: number;
    deliveryFeeSum: number;
    amountDueToAdmin: number;
    driver: { fullName: string };
    orders: Array<{
      id: string;
      order: {
        id: string;
        orderNumber: string;
        subtotal: number;
        appFee: number;
        deliveryFee: number;
        total: number;
        codStatus: string;
      };
    }>;
  }>(`/driver/remittances/${remittanceId}`);
}

export async function getMyOrders() {
  return request<Array<Record<string, unknown>>>('/orders');
}

export async function getPendingDeliveries() {
  return request<Array<Record<string, unknown>>>('/orders/pending-deliveries');
}

export interface MyDeliveryOffer {
  offerId: string;
  orderId: string;
  expiresAt: string;
  offeredAt: string;
  offerExpirySeconds: number;
  penaltyAmount: number;
  order: Record<string, unknown>;
}

export async function getMyDeliveryOffer() {
  return request<MyDeliveryOffer | null>('/orders/my-delivery-offer');
}

export async function declineDeliveryOffer(orderId: string) {
  return request<{ success: boolean; message?: string }>(`/orders/${orderId}/decline-delivery`, { method: 'POST' });
}

export async function getOrder(id: string) {
  return request<Record<string, unknown>>(`/orders/${id}`);
}

export async function takeOrder(orderId: string) {
  return request<Record<string, unknown>>(`/orders/${orderId}/take`, { method: 'POST' });
}

export async function updateOrderStatus(orderId: string, status: string, notes?: string) {
  return request<Record<string, unknown>>(`/orders/${orderId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, notes }),
  });
}

// Merchant
export async function getMyStore() {
  return request<Record<string, unknown>>('/merchants/me');
}

export async function updateMyStore(data: Record<string, unknown>) {
  return request<Record<string, unknown>>('/merchants/me', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function getMerchantOrders(status?: string) {
  const path = status ? `/orders?status=${encodeURIComponent(status)}` : '/orders';
  return request<Array<Record<string, unknown>>>(path);
}

// Merchant finance & stats
export async function getMerchantBalance() {
  return request<{ balance: number; credits: number; debits: number; taxPercent: number; taxAmount: number; netAfterTax: number }>('/merchants/me/finance/balance');
}

export async function getMerchantLedger(page = 1, limit = 20) {
  return request<{ items: Array<Record<string, unknown>>; total: number; page: number; limit: number }>(
    `/merchants/me/finance/ledger?page=${page}&limit=${limit}`
  );
}

// Merchant promo codes
export interface MerchantPromoCodeItem {
  id: string;
  code: string;
  description: string | null;
  percentage: number;
  maxDiscount: number | null;
  minSubtotal: number | null;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
}

export async function getMerchantPromoCodes() {
  return request<MerchantPromoCodeItem[]>('/merchants/me/promo-codes');
}

export async function createMerchantPromoCode(data: {
  code: string;
  description?: string;
  percentage: number;
  maxDiscount?: number | null;
  minSubtotal?: number | null;
  expiresAt?: string | null;
  isActive?: boolean;
}) {
  return request<MerchantPromoCodeItem>('/merchants/me/promo-codes', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateMerchantPromoCode(
  id: string,
  data: {
    description?: string;
    percentage?: number;
    maxDiscount?: number | null;
    minSubtotal?: number | null;
    expiresAt?: string | null;
    isActive?: boolean;
  }
) {
  return request<MerchantPromoCodeItem>(`/merchants/me/promo-codes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteMerchantPromoCode(id: string) {
  return request<{ ok: boolean }>(`/merchants/me/promo-codes/${id}`, { method: 'DELETE' });
}

export async function getMerchantStats(from?: string, to?: string) {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const q = params.toString() ? `?${params.toString()}` : '';
  return request<{
    summary: {
      totalOrders: number;
      deliveredCount: number;
      cancelledCount: number;
      cancellationRate: number;
      totalRevenue: number;
      avgOrderValue: number;
      todayOrders: number;
      weekOrders: number;
    };
    dateRange: { from: string; to: string };
    topProducts: Array<{ productId: string; totalQuantity: number; totalRevenue: number }>;
  }>(`/merchants/me/stats${q}`);
}

export async function merchantAcceptOrder(orderId: string, prepTimeMinutes?: number) {
  return request<Record<string, unknown>>(`/orders/${orderId}/accept`, {
    method: 'PATCH',
    body: JSON.stringify(prepTimeMinutes != null ? { prepTimeMinutes } : {}),
  });
}

export async function merchantRejectOrder(orderId: string, notes?: string) {
  return request<Record<string, unknown>>(`/orders/${orderId}/reject`, {
    method: 'PATCH',
    body: JSON.stringify(notes != null ? { notes } : {}),
  });
}

// Merchant products & categories
export async function getMyProductCategories() {
  return request<Array<Record<string, unknown>>>('/products/me/categories');
}

export async function createMyProductCategory(data: { nameAr: string; nameEn?: string; sortOrder?: number; isActive?: boolean }) {
  return request<Record<string, unknown>>('/products/me/categories', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateMyProductCategory(categoryId: string, data: { nameAr?: string; nameEn?: string; sortOrder?: number; isActive?: boolean }) {
  return request<Record<string, unknown>>(`/products/me/categories/${categoryId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteMyProductCategory(categoryId: string) {
  return request<Record<string, unknown>>(`/products/me/categories/${categoryId}`, { method: 'DELETE' });
}

export async function createProduct(data: { merchantProfileId: string; productCategoryId?: string; nameAr: string; nameEn?: string; description?: string; price: number; imageUrl?: string }) {
  return request<Record<string, unknown>>('/products', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateProduct(productId: string, data: { productCategoryId?: string | null; nameAr?: string; nameEn?: string; description?: string; price?: number; imageUrl?: string; isAvailable?: boolean; sortOrder?: number }) {
  return request<Record<string, unknown>>(`/products/${productId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteProduct(productId: string) {
  return request<Record<string, unknown>>(`/products/${productId}`, { method: 'DELETE' });
}

// Product options (addons)
export async function getProductOptions(productId: string) {
  return request<Array<{ id: string; name: string; priceModifier: number | string }>>(`/products/${productId}/options`);
}

export async function createProductOption(productId: string, data: { name: string; priceModifier: number }) {
  return request<Record<string, unknown>>(`/products/${productId}/options`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateProductOption(optionId: string, data: { name?: string; priceModifier?: number }) {
  return request<Record<string, unknown>>(`/products/options/${optionId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteProductOption(optionId: string) {
  return request<Record<string, unknown>>(`/products/options/${optionId}`, { method: 'DELETE' });
}

// Account security (partners)
export async function changeEmail(newEmail: string, currentPassword: string) {
  return request<Record<string, unknown>>('/auth/change-email', {
    method: 'PATCH',
    body: JSON.stringify({ newEmail, currentPassword }),
  });
}

export async function changePassword(currentPassword: string, newPassword: string) {
  return request<Record<string, unknown>>('/auth/change-password', {
    method: 'PATCH',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export async function updateAuthProfile(data: { fullName?: string; phone?: string | null }) {
  return request<Record<string, unknown>>('/auth/profile', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
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
