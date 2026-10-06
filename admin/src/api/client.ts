const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:2007';

function getToken(): string | null {
  return localStorage.getItem('lahda_admin_token');
}

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (res.status === 401) {
    localStorage.removeItem('lahda_admin_token');
    localStorage.removeItem('lahda_admin_user');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'Request failed');
  }
  return res.json();
}

export async function login(email: string, password: string) {
  const data = await api<{ user: { role: string }; access_token: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (data.user.role !== 'admin') throw new Error('Access denied. Admin only.');
  return data;
}

export async function getStats() {
  return api<{ usersCount: number; merchantsCount: number; driversCount: number; ordersCount: number; ordersToday: number; totalRevenue: number; ratingsCount: number }>('/admin/stats');
}

export async function getOrdersSeries(from?: string, to?: string) {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const q = params.toString() ? `?${params.toString()}` : '';
  return api<Array<{ date: string; orders: number; revenue: number }>>(`/admin/stats/orders-series${q}`);
}

export async function getOrdersByStatus() {
  return api<Array<{ status: string; count: number }>>('/admin/stats/orders-by-status');
}

export async function getTopMerchants(by: 'orders' | 'revenue' = 'orders', limit = 10) {
  return api<Array<{ id: string; storeName: string; ratingAvg: number; ratingCount: number; ordersCount: number; totalRevenue?: number }>>(`/admin/stats/top-merchants?by=${by}&limit=${limit}`);
}

export async function getTopDrivers(limit = 10) {
  return api<Array<{ id: string; fullName: string; ratingAvg: number; ratingCount: number; deliveries: number; totalEarnings: number }>>(`/admin/stats/top-drivers?limit=${limit}`);
}

export async function getRatingsOverview() {
  return api<{ total: number; store: { avg: number; count: number }; driver: { avg: number; count: number } }>('/admin/stats/ratings-overview');
}

export async function getRatings(targetType?: string, page = 1, limit = 20) {
  const params = new URLSearchParams();
  if (targetType) params.set('targetType', targetType);
  params.set('page', String(page));
  params.set('limit', String(limit));
  return api<{ items: Array<{ id: string; orderId: string; raterId: string; targetType: string; targetId: string; stars: number; comment: string | null; createdAt: string; order?: { orderNumber: string } }>; total: number; page: number; limit: number }>(`/ratings?${params.toString()}`);
}

export function getExportOrdersCsvUrl(filters: { from?: string; to?: string; status?: string; merchantId?: string; driverId?: string }) {
  const params = new URLSearchParams();
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  if (filters.status) params.set('status', filters.status);
  if (filters.merchantId) params.set('merchantId', filters.merchantId);
  if (filters.driverId) params.set('driverId', filters.driverId);
  const token = localStorage.getItem('lahda_admin_token');
  const base = import.meta.env.VITE_API_URL || 'http://127.0.0.1:2007';
  return `${base}/admin/reports/orders.csv?${params.toString()}&token=${token}`;
}

export async function getUsers(page = 1, limit = 20) {
  return api<{ items: Array<Record<string, unknown>>; total: number; page: number; limit: number }>(`/admin/users?page=${page}&limit=${limit}`);
}

export async function getUser(userId: string) {
  return api<{ id: string; email: string; fullName: string; phone: string | null; role: string; isActive: boolean; createdAt: string; updatedAt: string }>(
    `/admin/users/${userId}`
  );
}

export async function updateUser(
  userId: string,
  data: { email?: string; fullName?: string; phone?: string | null; role?: string; isActive?: boolean; newPassword?: string }
) {
  return api<{ id: string; email: string; fullName: string; phone: string | null; role: string; isActive: boolean; createdAt: string; updatedAt: string }>(
    `/admin/users/${userId}`,
    { method: 'PATCH', body: JSON.stringify(data) }
  );
}

export async function getMerchants(page = 1, limit = 20) {
  return api<{ items: Array<Record<string, unknown>>; total: number; page: number; limit: number }>(`/admin/merchants?page=${page}&limit=${limit}`);
}

export async function getMerchantsAll() {
  return api<Array<{ id: string; storeName: string; storeSlug: string; logoUrl?: string | null }>>('/admin/merchants/all');
}

export async function getDrivers(page = 1, limit = 20) {
  return api<{ items: Array<Record<string, unknown>>; total: number; page: number; limit: number }>(`/admin/drivers?page=${page}&limit=${limit}`);
}

export async function getOrders(page = 1, limit = 20, status?: string) {
  const q = status ? `&status=${encodeURIComponent(status)}` : '';
  return api<{ items: Array<Record<string, unknown>>; total: number; page: number; limit: number }>(`/admin/orders?page=${page}&limit=${limit}${q}`);
}

export async function setUserActive(userId: string, isActive: boolean) {
  return api(`/admin/users/${userId}/active`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  });
}

export async function deleteUser(userId: string) {
  return api<{ ok: boolean }>(`/admin/users/${userId}`, {
    method: 'DELETE',
  });
}

export async function setMerchantApproved(merchantId: string, approved: boolean) {
  return api(`/admin/merchants/${merchantId}/approve`, {
    method: 'PATCH',
    body: JSON.stringify({ approved }),
  });
}

export async function createMerchant(data: {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  storeName: string;
  storeSlug: string;
  logoUrl?: string;
  coverUrl?: string;
  description?: string;
  addressText?: string;
  openingTime?: string;
  closingTime?: string;
  isOpen?: boolean;
  isApproved?: boolean;
  minOrder?: number;
  deliveryFee?: number;
  hasOffers?: boolean;
  ratingAvg?: number;
  ratingCount?: number;
  estimatedDeliveryMin?: number;
  estimatedDeliveryMax?: number;
  discountLabel?: string;
}) {
  return api('/admin/merchants', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateMerchant(id: string, data: {
  storeName?: string;
  storeSlug?: string;
  logoUrl?: string;
  coverUrl?: string;
  description?: string;
  addressText?: string;
  openingTime?: string;
  closingTime?: string;
  isOpen?: boolean;
  isApproved?: boolean;
  minOrder?: number;
  deliveryFee?: number;
  hasOffers?: boolean;
  ratingAvg?: number;
  ratingCount?: number;
  estimatedDeliveryMin?: number;
  estimatedDeliveryMax?: number;
  discountLabel?: string;
  taxPercent?: number;
}) {
  return api(`/admin/merchants/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteMerchant(merchantId: string) {
  return api<{ ok: boolean }>(`/admin/merchants/${merchantId}`, {
    method: 'DELETE',
  });
}

export async function getMerchantProducts(merchantId: string) {
  return api<Array<{ id: string; nameAr: string; nameEn?: string | null; description?: string | null; price: number; imageUrl?: string | null; isAvailable: boolean; sortOrder: number; productCategoryId?: string | null; productCategory?: { id: string; nameAr: string; nameEn?: string | null } | null }>>(
    `/admin/merchants/${merchantId}/products`,
  );
}

export async function createMerchantProduct(merchantId: string, data: {
  productCategoryId?: string;
  nameAr: string;
  nameEn?: string;
  description?: string;
  price: number;
  imageUrl?: string;
  isAvailable?: boolean;
  sortOrder?: number;
}) {
  return api(`/admin/merchants/${merchantId}/products`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateProductAdmin(productId: string, data: {
  productCategoryId?: string;
  nameAr?: string;
  nameEn?: string;
  description?: string;
  price?: number;
  imageUrl?: string;
  isAvailable?: boolean;
  sortOrder?: number;
}) {
  return api(`/admin/products/${productId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteProductAdmin(productId: string) {
  return api(`/admin/products/${productId}`, { method: 'DELETE' });
}

export async function getMerchantProductCategories(merchantId: string) {
  return api<Array<{ id: string; nameAr: string; nameEn?: string | null; sortOrder: number; isActive: boolean }>>(
    `/admin/merchants/${merchantId}/product-categories`,
  );
}

export async function createMerchantProductCategory(
  merchantId: string,
  data: { nameAr: string; nameEn?: string; sortOrder?: number; isActive?: boolean },
) {
  return api(`/admin/merchants/${merchantId}/product-categories`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateMerchantProductCategory(
  categoryId: string,
  data: { nameAr?: string; nameEn?: string; sortOrder?: number; isActive?: boolean },
) {
  return api(`/admin/product-categories/${categoryId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteMerchantProductCategory(categoryId: string) {
  return api(`/admin/product-categories/${categoryId}`, { method: 'DELETE' });
}

export async function setDriverApproved(driverId: string, approved: boolean) {
  return api(`/admin/drivers/${driverId}/approve`, {
    method: 'PATCH',
    body: JSON.stringify({ approved }),
  });
}

export async function createDriver(data: {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  nationalId?: string;
  vehicleInfo?: string;
  isApproved?: boolean;
}) {
  return api('/admin/drivers', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateDriver(
  driverId: string,
  data: {
    email?: string;
    fullName?: string;
    phone?: string | null;
    isActive?: boolean;
    nationalId?: string;
    vehicleInfo?: string;
    isApproved?: boolean;
    newPassword?: string;
  }
) {
  return api(`/admin/drivers/${driverId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
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

export interface RewardChallengeTier {
  trips: number;
  amount: number;
}

export interface RewardChallengeConfig {
  timeWindowMinutes: number;
  tiers: RewardChallengeTier[];
}

export async function getSettings() {
  return api<{
    appLogoUrl: string | null;
    appNameAr: string;
    appNameEn: string;
    pricingConfig?: PricingConfig;
    rewardChallengeConfig?: RewardChallengeConfig;
  }>('/settings');
}

export async function patchSettings(data: {
  appLogoUrl?: string;
  appNameAr?: string;
  appNameEn?: string;
  pricingConfig?: PricingConfig;
  rewardChallengeConfig?: RewardChallengeConfig;
}) {
  return api<{
    appLogoUrl: string | null;
    appNameAr: string | null;
    appNameEn: string | null;
    pricingConfig?: PricingConfig;
    rewardChallengeConfig?: RewardChallengeConfig;
  }>('/admin/settings', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// COD Remittances
export type RemittanceStatus = 'draft' | 'submitted' | 'confirmed';

export interface RemittanceItem {
  id: string;
  driverId: string;
  date: string;
  status: RemittanceStatus;
  ordersCount: number;
  subtotalSum: number;
  appFeeSum: number;
  deliveryFeeSum: number;
  amountDueToAdmin: number;
  createdAt: string;
  submittedAt?: string;
  confirmedAt?: string;
  confirmedByAdminId?: string;
  driver?: { id: string; fullName: string; phone: string | null };
}

export async function getRemittances(params: {
  date?: string;
  driverId?: string;
  status?: RemittanceStatus;
  page?: number;
  limit?: number;
} = {}) {
  const { date, driverId, status, page = 1, limit = 20 } = params;
  const query = new URLSearchParams();
  if (date) query.set('date', date);
  if (driverId) query.set('driverId', driverId);
  if (status) query.set('status', status);
  query.set('page', String(page));
  query.set('limit', String(limit));
  return api<{ items: RemittanceItem[]; total: number; page: number; limit: number }>(`/admin/remittances?${query.toString()}`);
}

export async function confirmRemittance(remittanceId: string) {
  return api<RemittanceItem>(`/admin/remittances/${remittanceId}/confirm`, { method: 'POST' });
}

export async function getRemittanceDetails(remittanceId: string) {
  return api<RemittanceItem & { orders: Array<{ id: string; order: { id: string; orderNumber: string; subtotal: number; appFee: number; deliveryFee: number; total: number; codStatus: string } }> }>(`/admin/remittances/${remittanceId}`);
}

// Merchant Ledger / Balances
export interface MerchantBalance {
  id: string;
  storeName: string;
  user?: { fullName: string; email: string; phone: string | null };
  balance: number;
  totalCredits: number;
  totalDebits: number;
  taxPercent: number;
  taxAmount: number;
  netAfterTax: number;
}

export interface LedgerEntry {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  note: string | null;
  createdAt: string;
  order?: { id: string; orderNumber: string } | null;
}

export async function getMerchantsWithBalances(page = 1, limit = 20) {
  return api<{ items: MerchantBalance[]; total: number; page: number; limit: number }>(`/admin/merchants/balances?page=${page}&limit=${limit}`);
}

export async function getMerchantBalance(merchantId: string) {
  return api<{ balance: number; credits: number; debits: number; taxPercent: number; taxAmount: number; netAfterTax: number }>(`/admin/merchants/${merchantId}/balance`);
}

export async function getMerchantLedger(merchantId: string, page = 1, limit = 50) {
  return api<{ items: LedgerEntry[]; total: number; page: number; limit: number }>(`/admin/merchants/${merchantId}/ledger?page=${page}&limit=${limit}`);
}

export async function createMerchantPayout(merchantId: string, amount: number, note?: string) {
  return api<{ entry: LedgerEntry; newBalance: number }>(`/admin/merchants/${merchantId}/payout`, {
    method: 'POST',
    body: JSON.stringify({ amount, note }),
  });
}

export async function getMerchantDetails(merchantId: string) {
  return api<{
    merchant: Record<string, unknown>;
    balance: { balance: number; credits: number; debits: number; taxPercent: number; taxAmount: number; netAfterTax: number };
    recentLedger: LedgerEntry[];
  }>(`/admin/merchants/${merchantId}/details`);
}

export async function getCategories() {
  return api<Array<{ id: string; nameAr: string; nameEn: string | null; slug: string; iconUrl: string | null; sortOrder: number; isActive: boolean }>>('/admin/categories');
}

export async function createCategory(data: { nameAr: string; nameEn?: string; slug: string; iconUrl?: string; sortOrder?: number }) {
  return api('/admin/categories', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateCategory(id: string, data: { nameAr?: string; nameEn?: string; slug?: string; iconUrl?: string; sortOrder?: number; isActive?: boolean }) {
  return api(`/admin/categories/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function deleteCategory(id: string) {
  return api(`/admin/categories/${id}`, { method: 'DELETE' });
}

export async function getPromoBanners() {
  return api<Array<{ id: string; titleAr: string; titleEn: string | null; imageUrl: string | null; linkUrl: string | null; sortOrder: number; isActive: boolean }>>('/admin/promo-banners');
}

export async function createPromoBanner(data: { titleAr: string; titleEn?: string; imageUrl?: string; linkUrl?: string; sortOrder?: number }) {
  return api('/admin/promo-banners', { method: 'POST', body: JSON.stringify(data) });
}

export async function updatePromoBanner(id: string, data: { titleAr?: string; titleEn?: string; imageUrl?: string; linkUrl?: string; sortOrder?: number; isActive?: boolean }) {
  return api(`/admin/promo-banners/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function deletePromoBanner(id: string) {
  return api(`/admin/promo-banners/${id}`, { method: 'DELETE' });
}

export async function getHomeSections() {
  return api<Array<Record<string, unknown>>>('/admin/home-sections');
}

export async function createHomeSection(data: {
  titleAr: string;
  titleEn?: string;
  slug?: string;
  sortOrder?: number;
  isActive?: boolean;
  merchantIds?: string[];
}) {
  return api('/admin/home-sections', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateHomeSection(id: string, data: {
  titleAr?: string;
  titleEn?: string;
  slug?: string;
  sortOrder?: number;
  isActive?: boolean;
  merchantIds?: string[];
}) {
  return api(`/admin/home-sections/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function deleteHomeSection(id: string) {
  return api(`/admin/home-sections/${id}`, { method: 'DELETE' });
}

// FAQ
export async function getFaq() {
  return api<Array<{ id: string; questionAr: string; questionEn?: string | null; answerAr: string; answerEn?: string | null; sortOrder: number; isActive: boolean }>>('/faq');
}

export async function createFaq(data: { questionAr: string; questionEn?: string; answerAr: string; answerEn?: string; sortOrder?: number; isActive?: boolean }) {
  return api('/admin/faq', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateFaq(id: string, data: { questionAr?: string; questionEn?: string; answerAr?: string; answerEn?: string; sortOrder?: number; isActive?: boolean }) {
  return api(`/admin/faq/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function deleteFaq(id: string) {
  return api(`/admin/faq/${id}`, { method: 'DELETE' });
}

export async function getSupportChannels() {
  return api<Array<{ id: string; type: string; label: string; value: string; iconName: string | null; sortOrder: number; isActive: boolean }>>('/admin/support-channels');
}

export async function createSupportChannel(data: { type: string; label: string; value: string; iconName?: string; sortOrder?: number; isActive?: boolean }) {
  return api('/admin/support-channels', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateSupportChannel(id: string, data: { type?: string; label?: string; value?: string; iconName?: string; sortOrder?: number; isActive?: boolean }) {
  return api(`/admin/support-channels/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export async function deleteSupportChannel(id: string) {
  return api(`/admin/support-channels/${id}`, { method: 'DELETE' });
}

// Promo codes
export async function getPromoCodes() {
  return api<
    Array<{
      id: string;
      code: string;
      description: string | null;
      percentage: number;
      maxDiscount: number | null;
      minSubtotal: number | null;
      expiresAt: string | null;
      isActive: boolean;
    }>
  >('/admin/promo-codes');
}

export async function createPromoCode(data: {
  code: string;
  description?: string;
  percentage: number;
  maxDiscount?: number | null;
  minSubtotal?: number | null;
  expiresAt?: string | null;
  isActive?: boolean;
}) {
  return api('/admin/promo-codes', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// Settlement Receipts
export interface SettlementReceipt {
  id: string;
  receiptNumber: string;
  type: 'driver_remittance' | 'merchant_payout';
  partyType: 'driver' | 'merchant';
  partyId: string;
  partyName: string;
  partyPhone: string | null;
  amount: number;
  currency: string;
  method: string | null;
  reference: string | null;
  issuedByAdminId: string;
  issuedAt: string;
  snapshotJson: Record<string, unknown>;
  remittanceId: string | null;
  ledgerEntryId: string | null;
}

export async function getSettlementReceipts(params: {
  partyType?: string;
  partyId?: string;
  page?: number;
  limit?: number;
} = {}) {
  const { partyType, partyId, page = 1, limit = 20 } = params;
  const query = new URLSearchParams();
  if (partyType) query.set('partyType', partyType);
  if (partyId) query.set('partyId', partyId);
  query.set('page', String(page));
  query.set('limit', String(limit));
  return api<{ items: SettlementReceipt[]; total: number; page: number; limit: number }>(`/admin/settlements/receipts?${query.toString()}`);
}

export async function getSettlementReceipt(receiptId: string) {
  return api<SettlementReceipt>(`/admin/settlements/receipts/${receiptId}`);
}

