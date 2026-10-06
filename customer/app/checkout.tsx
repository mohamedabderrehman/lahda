import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, TextInput } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAddresses, createOrder, getCart, getSettings, getStoreBySlug, type PricingConfig, type PricingBand } from '../api/client';
import { validatePromoCode } from '../api/promo';
import { useTheme } from '../contexts/ThemeContext';
import { useCart } from '../contexts/CartContext';
import { PrimaryButton } from '../components/ui';
import { formatPrice } from '../constants/theme';
import { 
  IconArrowForward, 
  IconAddCircleOutline, 
  IconRadioOn, 
  IconRadioOff,
  IconBagOutline,
  IconTruckOutline,
  IconDeviceOutline,
  IconCashOutline,
  IconLocationOutline,
} from '../components/Icons';
type Address = { id: string; addressText: string; label?: string | null; latitude?: number | string | null; longitude?: number | string | null };

type CartItem = {
  id: string;
  quantity: number;
  product?: {
    price: number;
    merchantProfile?: {
      storeSlug?: string;
      storeName?: string;
      latitude?: number | null;
      longitude?: number | null;
      addressText?: string;
    };
  };
  optionsSnapshot?: {
    selectedOptions?: Array<{ name: string; priceModifier: number | string }>;
  } | null;
};

function hasValidCoords(lat?: number | string | null, lng?: number | string | null): { lat: number | null; lng: number | null } {
  return { lat: toNumberOrNull(lat), lng: toNumberOrNull(lng) };
}

function toNumberOrNull(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

// Haversine distance in km
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) *
    Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Calculate delivery fee based on distance bands
function calculateDeliveryFee(distanceKm: number, bands: PricingBand[]): number {
  const sortedBands = [...bands].sort((a, b) => a.minKm - b.minKm);
  for (const band of sortedBands) {
    if (band.maxKm === null) {
      if (distanceKm >= band.minKm) return band.fee;
    } else {
      if (distanceKm >= band.minKm && distanceKm < band.maxKm) return band.fee;
    }
  }
  return sortedBands[sortedBands.length - 1]?.fee || 2500;
}

export default function CheckoutScreen() {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const { refresh: refreshCartCount } = useCart();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const paymentMethod = 'cash' as const;
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cartSubtotal, setCartSubtotal] = useState(0);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [pricingConfig, setPricingConfig] = useState<PricingConfig | null>(null);
  const [merchantCoords, setMerchantCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [promoStatus, setPromoStatus] = useState<'idle' | 'loading' | 'applied' | 'error'>('idle');
  const [promoDiscountAmount, setPromoDiscountAmount] = useState(0);
  const [promoPercent, setPromoPercent] = useState<number | null>(null);
  const [promoMessage, setPromoMessage] = useState<string | null>(null);

  const selectedAddr = addresses.find((a) => a.id === selectedAddressId);
  const { lat: selectedAddrLat, lng: selectedAddrLng } = hasValidCoords(selectedAddr?.latitude, selectedAddr?.longitude);

  const missingCoords = selectedAddr ? (selectedAddrLat == null || selectedAddrLng == null) : false;

  const load = async () => {
    setLoading(true);
    try {
      const [list, cart, settings] = await Promise.all([getAddresses(), getCart(), getSettings()]);
      const arr = Array.isArray(list) ? (list as unknown as Address[]) : [];
      setAddresses(arr);
      if (arr.length && !selectedAddressId) setSelectedAddressId(arr[0].id);

      // Load pricing config from settings
      setPricingConfig(settings.pricingConfig || null);

      // Store cart items for distance calculation
      const items = (Array.isArray(cart.items) ? cart.items : []) as unknown as CartItem[];
      setCartItems(items);

      // Calculate cart subtotal
      const subtotal = items.reduce((sum: number, item) => {
        const price = Number(item.product?.price || 0);
        const qty = item.quantity || 1;
        const addons = (item.optionsSnapshot?.selectedOptions || []).reduce(
          (a: number, opt: any) => a + Number(opt.priceModifier || 0),
          0
        );
        return sum + (price + addons) * qty;
      }, 0);
      setCartSubtotal(subtotal);

      // Resolve merchant coordinates (from cart first, then store endpoint fallback)
      const firstItem = items[0];
      const directLat = toNumberOrNull(firstItem?.product?.merchantProfile?.latitude);
      const directLng = toNumberOrNull(firstItem?.product?.merchantProfile?.longitude);
      if (directLat != null && directLng != null) {
        setMerchantCoords({ latitude: directLat, longitude: directLng });
      } else {
        const slug = firstItem?.product?.merchantProfile?.storeSlug;
        if (slug) {
          const store = await getStoreBySlug(slug).catch(() => null);
          const storeAny = (store ?? {}) as Record<string, any>;
          const fallbackLat =
            toNumberOrNull(storeAny.latitude) ??
            toNumberOrNull(storeAny.lat) ??
            toNumberOrNull(storeAny.merchantProfile?.latitude) ??
            toNumberOrNull(storeAny.merchantProfile?.lat);
          const fallbackLng =
            toNumberOrNull(storeAny.longitude) ??
            toNumberOrNull(storeAny.lng) ??
            toNumberOrNull(storeAny.merchantProfile?.longitude) ??
            toNumberOrNull(storeAny.merchantProfile?.lng);
          if (fallbackLat != null && fallbackLng != null) {
            setMerchantCoords({ latitude: fallbackLat, longitude: fallbackLng });
          } else {
            setMerchantCoords(null);
          }
        } else {
          setMerchantCoords(null);
        }
      }
    } catch {
      setAddresses([]);
      setCartItems([]);
      setCartSubtotal(0);
      setMerchantCoords(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Refetch addresses (and cart) when returning from add-address flow
  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  // Calculate fees using pricingConfig from backend (no hardcoded values)
  const appFee = pricingConfig
    ? (cartSubtotal < pricingConfig.appFee.threshold
        ? pricingConfig.appFee.belowThreshold
        : pricingConfig.appFee.aboveThreshold)
    : 0;

  // Check if we can calculate delivery fee (have all required data)
  const canCalculateDeliveryFee = useMemo(() => {
    const addrLat = toNumberOrNull(selectedAddr?.latitude);
    const addrLng = toNumberOrNull(selectedAddr?.longitude);
    return !!pricingConfig && addrLat != null && addrLng != null && merchantCoords != null;
  }, [selectedAddr, pricingConfig, merchantCoords]);

  const deliveryFeeMessage = useMemo(() => {
    if (!pricingConfig) return 'جاري تحميل الإعدادات...';
    if (!selectedAddr) return 'اختر عنوان توصيل';
    if (toNumberOrNull(selectedAddr.latitude) == null || toNumberOrNull(selectedAddr.longitude) == null) {
      return 'العنوان يحتاج تحديد الموقع على الخريطة';
    }
    if (!merchantCoords) return 'جاري تحديد موقع المتجر...';
    return null;
  }, [pricingConfig, selectedAddr, merchantCoords]);

  // Calculate delivery fee based on distance between merchant and selected address
  const estimatedDeliveryFee = useMemo(() => {
    if (!canCalculateDeliveryFee) return 0;
    const merchantLat = merchantCoords!.latitude;
    const merchantLng = merchantCoords!.longitude;
    const addrLat = toNumberOrNull(selectedAddr!.latitude)!;
    const addrLng = toNumberOrNull(selectedAddr!.longitude)!;
    const distanceKm = haversineKm(merchantLat, merchantLng, addrLat, addrLng);
    return calculateDeliveryFee(distanceKm, pricingConfig!.distanceBands);
  }, [canCalculateDeliveryFee, merchantCoords, selectedAddr, pricingConfig]);

  // Show complete order summary with all fees (apply promo discount if any)
  const estimatedTotal = Math.max(0, cartSubtotal + appFee + estimatedDeliveryFee - promoDiscountAmount);

  const handleApplyPromo = async () => {
    const code = promoCode.trim();
    if (!code) {
      setPromoStatus('error');
      setPromoMessage('أدخل كود الخصم أولاً');
      return;
    }
    if (cartSubtotal <= 0) {
      setPromoStatus('error');
      setPromoMessage('لا يمكن تطبيق كود الخصم على سلة فارغة');
      return;
    }
    try {
      setPromoStatus('loading');
      const res = await validatePromoCode({ code, subtotal: cartSubtotal });
      setPromoDiscountAmount(res.discountAmount);
      setPromoPercent(res.percentage);
      setPromoStatus('applied');
      setPromoMessage(`تم تطبيق خصم ${res.percentage}% على طلبك.`);
    } catch (e: unknown) {
      const msg = (e as Error).message || 'تعذر التحقق من كود الخصم';
      setPromoDiscountAmount(0);
      setPromoPercent(null);
      setPromoStatus('error');
      setPromoMessage(msg);
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      Alert.alert('اختر العنوان', 'يجب اختيار عنوان التوصيل');
      return;
    }
    if (missingCoords) {
      Alert.alert('الموقع غير محدد', 'يجب تحديد موقع العنوان على الخريطة', [
        { text: 'تحديد الموقع', onPress: () => router.push('/addresses/pick-location') },
        { text: 'إلغاء', style: 'cancel' },
      ]);
      return;
    }
    setSubmitting(true);
    try {
      const order = await createOrder({
        addressId: selectedAddressId,
        paymentMethod,
        notes: notes.trim() || undefined,
        promoCode: promoDiscountAmount > 0 ? promoCode.trim() : undefined,
      });
      refreshCartCount();

      const total = Number(order.total ?? 0);
      const orderNum = String(order.orderNumber ?? order.id ?? '');
      router.replace(
        `/thank-you?orderId=${encodeURIComponent(order.id)}&orderNumber=${encodeURIComponent(orderNum)}&total=${encodeURIComponent(String(total))}`
      );
    } catch (e: unknown) {
      const msg = (e as Error).message;
      if (msg.includes('لم يحدد موقعه')) {
        Alert.alert('خطأ', 'المتجر لم يحدد موقعه بعد. يرجى التواصل مع الإدارة.');
      } else if (msg.includes('حدد موقع')) {
        Alert.alert('خطأ', 'يجب تحديد موقع العنوان على الخريطة');
      } else {
        Alert.alert('خطأ', msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.78}>
            <View style={styles.backBtnCircle}>
              <IconArrowForward size={22} color={t.colors.text} />
            </View>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>إتمام الطلب</Text>
          <View style={{ width: 44 }} />
        </View>
        <ActivityIndicator size="large" color={t.colors.primary} style={styles.loader} />
      </SafeAreaView>
    );
  }

  if (addresses.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.78}>
            <View style={styles.backBtnCircle}>
              <IconArrowForward size={22} color={t.colors.text} />
            </View>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>إتمام الطلب</Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>أضف عنوان توصيل أولاً</Text>
          <TouchableOpacity style={styles.addAddrBtn} onPress={() => router.push('/addresses')}>
            <Text style={styles.addAddrBtnText}>عناويني</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.78}>
          <View style={styles.backBtnCircle}>
            <IconArrowForward size={22} color={t.colors.text} />
          </View>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>إتمام الطلب</Text>
        <View style={{ width: 44 }} />
      </View>
      <View style={styles.progressRow}>
        {['العنوان', 'المراجعة', 'التأكيد'].map((label, index) => (
          <View key={label} style={styles.progressItem}>
            <View style={[styles.progressDot, index < 2 && styles.progressDotActive]}>
              <Text style={[styles.progressNumber, index < 2 && styles.progressNumberActive]}>{index + 1}</Text>
            </View>
            <Text style={[styles.progressLabel, index === 1 && styles.progressLabelActive]}>{label}</Text>
          </View>
        ))}
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>عنوان التوصيل</Text>
        {addresses.map((addr) => (
          <TouchableOpacity
            key={addr.id}
            style={[styles.addrCard, selectedAddressId === addr.id && styles.addrCardSelected]}
            onPress={() => setSelectedAddressId(addr.id)}
          >
            {selectedAddressId === addr.id ? (
              <IconRadioOn size={22} color={t.colors.primary} />
            ) : (
              <IconRadioOff size={22} color={t.colors.textMuted} />
            )}
            <View style={styles.addrBody}>
              {addr.label && <Text style={styles.addrLabel}>{addr.label}</Text>}
              <Text style={styles.addrText}>{addr.addressText}</Text>
            </View>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.addAddrLink} onPress={() => router.push('/addresses')}>
          <IconAddCircleOutline size={22} color={t.colors.text} />
          <Text style={styles.addAddrLinkText}>إضافة عنوان</Text>
        </TouchableOpacity>

        {missingCoords && (
          <View style={[styles.zoneBanner, { backgroundColor: t.colors.warning + '18' }]}>
            <Text style={[styles.zoneBannerText, { color: t.colors.warning }]}>
              العنوان المحدد لا يحتوي على إحداثيات. يرجى تحديد الموقع على الخريطة.
            </Text>
            <TouchableOpacity
              style={[styles.addAddrLink, { marginTop: t.spacing.sm }]}
              onPress={() => router.push('/addresses/pick-location')}
            >
              <Text style={[styles.addAddrLinkText, { color: t.colors.warning }]}>تحديد الموقع على الخريطة</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Fee Breakdown */}
        {cartSubtotal > 0 && (
          <>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>ملخص الطلب</Text>
              <View style={styles.itemCountBadge}>
                <Text style={styles.itemCountText}>{cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0)} منتج</Text>
              </View>
            </View>
            <View style={styles.summaryCard}>
              {/* Products row */}
              <View style={styles.feeRowWithIcon}>
                <View style={styles.feeIconWrap}>
                  <IconBagOutline size={20} color={t.colors.primary} />
                </View>
                <View style={styles.feeContent}>
                  <Text style={styles.feeLabelMain}>المجموع الفرعي</Text>
                  <Text style={styles.feeLabelSub}>(المنتجات)</Text>
                </View>
                <Text style={styles.feeValueMain}>{formatPrice(cartSubtotal)}</Text>
              </View>

              {/* Delivery row */}
              <View style={styles.feeRowWithIcon}>
                <View style={[styles.feeIconWrap, { backgroundColor: t.colors.success + '15' }]}>
                  <IconTruckOutline size={20} color={t.colors.success} />
                </View>
                <View style={styles.feeContent}>
                  <Text style={styles.feeLabelMain}>رسوم التوصيل</Text>
                  <Text style={styles.feeLabelSub}>
                    {!canCalculateDeliveryFee ? (deliveryFeeMessage ?? 'جاري الحساب...') : 'حسب المسافة'}
                  </Text>
                </View>
                <Text style={[styles.feeValueMain, canCalculateDeliveryFee && { color: t.colors.success }]}>
                  {!canCalculateDeliveryFee ? '-' : formatPrice(estimatedDeliveryFee)}
                </Text>
              </View>

              {/* App fee row */}
              <View style={styles.feeRowWithIcon}>
                <View style={[styles.feeIconWrap, { backgroundColor: t.colors.warning + '15' }]}>
                  <IconDeviceOutline size={20} color={t.colors.warning} />
                </View>
                <View style={styles.feeContent}>
                  <Text style={styles.feeLabelMain}>رسوم التطبيق</Text>
                  <Text style={styles.feeLabelSub}>(خدمة المنصة)</Text>
                </View>
                <Text style={styles.feeValueMain}>{formatPrice(appFee)}</Text>
              </View>

              {/* Promo code row */}
              <View style={styles.promoContainer}>
                <View style={styles.promoInputRow}>
                  <TextInput
                    style={styles.promoInput}
                    placeholder="أدخل كود الخصم"
                    placeholderTextColor={t.colors.textMuted}
                    value={promoCode}
                    onChangeText={(v) => {
                      setPromoCode(v);
                      if (!v.trim()) {
                        setPromoDiscountAmount(0);
                        setPromoPercent(null);
                        setPromoStatus('idle');
                        setPromoMessage(null);
                      }
                    }}
                  />
                  <TouchableOpacity
                    onPress={handleApplyPromo}
                    disabled={promoStatus === 'loading'}
                    style={[
                      styles.promoButton,
                      promoStatus === 'applied' && { backgroundColor: t.colors.success },
                    ]}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.promoButtonText}>
                      {promoStatus === 'loading' ? 'جاري...' : promoStatus === 'applied' ? 'مُطبّق' : 'تطبيق'}
                    </Text>
                  </TouchableOpacity>
                </View>
                {promoMessage ? <Text style={[styles.promoHint, promoStatus === 'error' && { color: t.colors.error }]}>{promoMessage}{promoDiscountAmount > 0 ? ` بقيمة ${formatPrice(promoDiscountAmount)}` : ''}</Text> : null}
              </View>

              {/* Divider */}
              <View style={styles.summaryDivider} />

              {/* Total row */}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabelMain}>الإجمالي</Text>
                <Text style={styles.totalValueMain}>{estimatedTotal > 0 ? formatPrice(estimatedTotal) : '---'}</Text>
              </View>
            </View>
          </>
        )}

        <Text style={styles.sectionTitle}>طريقة الدفع</Text>
        <View style={[styles.payCard, styles.payCardSelected]}>
          <View style={styles.payIconCircle}>
            <IconCashOutline size={24} color={t.colors.success} />
          </View>
          <View style={styles.payContent}>
            <Text style={styles.payLabelMain}>الدفع عند الاستلام</Text>
            <Text style={styles.payLabelSub}>نقداً عند استلام الطلب</Text>
          </View>
          <View style={styles.selectedIndicator}>
            <IconRadioOn size={22} color={t.colors.primary} />
          </View>
        </View>
        <Text style={styles.sectionTitle}>ملاحظات الطلب</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="مثال: يرجى الاتصال عند الوصول"
          placeholderTextColor={t.colors.textMuted}
          multiline
          textAlignVertical="top"
          style={styles.notesInput}
        />
      </ScrollView>
      
      {/* Fixed Footer */}
      <View style={styles.footer}>
        <View style={styles.footerContent}>
          <View style={styles.footerTotalSection}>
            <Text style={styles.footerTotalLabel}>المجموع الكلي</Text>
            <View style={styles.footerTotalRow}><Text style={styles.footerTotalValue}>{estimatedTotal > 0 ? formatPrice(estimatedTotal) : '---'}</Text></View>
          </View>
          <PrimaryButton
            label="تأكيد الطلب"
            onPress={handlePlaceOrder}
            loading={submitting}
            disabled={submitting || missingCoords}
            style={styles.placeBtn}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (t: ReturnType<typeof useTheme>) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: t.spacing.screenPadding,
    paddingVertical: t.spacing.md,
    backgroundColor: t.colors.background,
    borderBottomWidth: 0,
  },
  backBtn: { padding: 0 },
  backBtnCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: t.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...t.shadow.shadow1,
  },
  headerTitle: { ...t.typography.titleLarge, fontFamily: t.fonts.extraBold, color: t.colors.text, textAlign: 'center' },
  progressRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: t.spacing.xl,
    marginHorizontal: t.spacing.screenPadding, marginBottom: t.spacing.md, paddingVertical: t.spacing.md,
    backgroundColor: t.colors.surface, borderRadius: t.radius.xl,
    borderWidth: StyleSheet.hairlineWidth, borderColor: t.colors.glassBorder, ...t.shadow.shadow1,
  },
  progressItem: { alignItems: 'center', minWidth: 62 },
  progressDot: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: t.colors.backgroundSecondary },
  progressDotActive: { backgroundColor: t.colors.primary },
  progressNumber: { ...t.typography.caption, fontFamily: t.fonts.bold, color: t.colors.textMuted },
  progressNumberActive: { color: t.colors.white },
  progressLabel: { ...t.typography.caption, color: t.colors.textMuted, marginTop: 3 },
  progressLabelActive: { color: t.colors.primaryDark, fontFamily: t.fonts.bold },
  loader: { flex: 1 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: t.spacing.xxl },
  emptyText: { ...t.typography.body, color: t.colors.textSecondary },
  addAddrBtn: { marginTop: t.spacing.xl, height: t.button.primaryHeight, justifyContent: 'center', paddingHorizontal: t.spacing.xxl, backgroundColor: t.colors.primary, borderRadius: t.radius.lg },
  addAddrBtnText: { ...t.typography.body, fontFamily: t.fonts.bold, color: t.colors.white },
  scroll: { flex: 1 },
  scrollContent: { padding: t.spacing.screenPadding, paddingBottom: 180 },

  // Section Headers
  sectionTitle: { ...t.typography.titleMedium, fontFamily: t.fonts.extraBold, color: t.colors.text, marginBottom: t.spacing.lg },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: t.spacing.lg,
    marginTop: t.spacing.xl,
  },
  itemCountBadge: {
    backgroundColor: t.colors.primary + '12',
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.xs,
    borderRadius: t.radius.full,
  },
  itemCountText: { ...t.typography.caption, fontFamily: t.fonts.bold, color: t.colors.primary },

  // Address Cards
  addrCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.cardRadius,
    padding: t.spacing.lg,
    marginBottom: t.spacing.md,
    borderWidth: 1,
    borderColor: t.colors.borderLight,
    ...t.shadow.shadow1,
  },
  addrCardSelected: { borderWidth: 2, borderColor: t.colors.primary, backgroundColor: t.colors.primary + '08' },
  addrBody: { flex: 1, marginHorizontal: t.spacing.md },
  addrLabel: { ...t.typography.caption, fontFamily: t.fonts.bold, color: t.colors.primary, marginBottom: t.spacing.xs },
  addrText: { ...t.typography.body, fontFamily: t.fonts.medium, color: t.colors.text },
  addAddrLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: t.spacing.md,
    gap: t.spacing.sm,
    paddingVertical: t.spacing.md,
    paddingHorizontal: t.spacing.lg,
    backgroundColor: t.colors.backgroundSecondary,
    borderRadius: t.radius.full,
    alignSelf: 'center',
  },
  addAddrLinkText: { ...t.typography.body, fontFamily: t.fonts.bold, color: t.colors.text },

  // Zone Banners
  zoneBanner: {
    backgroundColor: t.colors.warning + '12',
    borderRadius: t.radius.cardRadius,
    padding: t.spacing.lg,
    marginTop: t.spacing.md,
    borderWidth: 1,
    borderColor: t.colors.warning + '30',
  },
  zoneBannerText: { ...t.typography.body, fontFamily: t.fonts.medium, color: t.colors.warning, textAlign: 'center' },

  // Summary Card with Icons
  summaryCard: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.cardRadius,
    padding: t.spacing.lg,
    borderWidth: 1,
    borderColor: t.colors.borderLight,
    ...t.shadow.shadow1,
    gap: t.spacing.md,
  },
  promoContainer: {
    marginTop: t.spacing.sm,
    paddingTop: t.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: t.colors.borderLight,
  },
  promoInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.sm,
  },
  promoInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: t.colors.borderLight,
    borderRadius: t.radius.full,
    paddingHorizontal: t.spacing.md,
    paddingVertical: 8,
    ...t.typography.body,
    color: t.colors.text,
  },
  promoButton: {
    paddingHorizontal: t.spacing.md,
    paddingVertical: 10,
    borderRadius: t.radius.full,
    backgroundColor: t.colors.primary,
  },
  promoButtonText: {
    ...t.typography.caption,
    fontFamily: t.fonts.bold,
    color: t.colors.white,
  },
  promoHint: {
    ...t.typography.caption,
    color: t.colors.textMuted,
    marginTop: t.spacing.xs,
  },
  feeRowWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  feeIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: t.colors.primary + '12',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: t.spacing.md,
  },
  feeContent: {
    flex: 1,
  },
  feeLabelMain: {
    ...t.typography.body,
    fontFamily: t.fonts.bold,
    color: t.colors.text,
  },
  feeLabelSub: {
    ...t.typography.caption,
    color: t.colors.textMuted,
    marginTop: 2,
  },
  feeValueMain: {
    ...t.typography.body,
    fontFamily: t.fonts.extraBold,
    color: t.colors.text,
    fontSize: 16,
  },
  summaryDivider: {
    height: 2,
    backgroundColor: t.colors.borderLight,
    marginVertical: t.spacing.sm,
    borderRadius: 1,
  },

  // Total Row
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: t.spacing.sm,
  },
  totalLabelMain: {
    ...t.typography.titleMedium,
    fontFamily: t.fonts.extraBold,
    color: t.colors.text,
  },
  totalValueWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  totalCurrency: {
    ...t.typography.body,
    fontFamily: t.fonts.bold,
    color: t.colors.primary,
    marginRight: 4,
    marginTop: 4,
  },
  totalValueMain: {
    ...t.typography.titleLarge,
    fontFamily: t.fonts.extraBold,
    color: t.colors.primary,
    fontSize: 28,
  },

  // Payment Card
  payCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: t.spacing.lg,
    borderRadius: t.radius.cardRadius,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.borderLight,
    ...t.shadow.shadow1,
  },
  payCardSelected: { borderWidth: 2, borderColor: t.colors.primary, backgroundColor: t.colors.primary + '08' },
  payIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: t.colors.success + '12',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: t.spacing.md,
  },
  payContent: {
    flex: 1,
  },
  payLabelMain: {
    ...t.typography.body,
    fontFamily: t.fonts.bold,
    color: t.colors.text,
  },
  payLabelSub: {
    ...t.typography.caption,
    color: t.colors.textMuted,
    marginTop: 2,
  },
  notesInput: { minHeight: 88, padding: t.spacing.md, borderWidth: 1, borderColor: t.colors.borderLight, borderRadius: t.radius.md, backgroundColor: t.colors.surface, ...t.typography.body, color: t.colors.text, marginBottom: t.spacing.xl },
  selectedIndicator: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Fixed Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: t.colors.surface,
    borderTopWidth: 1,
    borderTopColor: t.colors.borderLight,
    padding: t.spacing.screenPadding,
    paddingBottom: t.spacing.xxl + 12,
    ...t.shadow.shadow3,
  },
  footerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.lg,
  },
  footerTotalSection: {
    flex: 1,
  },
  footerTotalLabel: {
    ...t.typography.caption,
    color: t.colors.textMuted,
    marginBottom: 2,
  },
  footerTotalRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  footerTotalCurrency: {
    ...t.typography.body,
    fontFamily: t.fonts.bold,
    color: t.colors.text,
    marginRight: 4,
    marginTop: 2,
  },
  footerTotalValue: {
    ...t.typography.titleLarge,
    fontFamily: t.fonts.extraBold,
    color: t.colors.text,
    fontSize: 22,
  },
  placeBtn: {
    flex: 1.4,
    minHeight: t.button.primaryHeight,
  },
});
