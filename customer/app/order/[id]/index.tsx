import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Modal, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import {
  IconArrowForward,
  IconCheckmarkOutline,
  IconRepeatOutline,
  IconStarOutline,
  IconCarOutline,
  IconBagOutline,
  IconTruckOutline,
  IconDeviceOutline,
  IconStoreOutline,
  IconCashOutline,
  IconCallOutline,
} from '../../../components/Icons';
import { Badge } from '../../../components/Badge';
import { getOrder, rateStore, rateDriver, addToCart, clearCart } from '../../../api/client';
import { formatPrice } from '../../../constants/theme';
import { useTheme } from '../../../contexts/ThemeContext';
import { useCart } from '../../../contexts/CartContext';
import { addNotificationListener } from '../../../hooks/useNotifications';
import { getOrderStatus } from '../../../lib/order-status';

function StarPicker({ value, onChange, filledColor, emptyColor }: { value: number; onChange: (v: number) => void; filledColor: string; emptyColor: string }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: t.spacing.sm, marginVertical: t.spacing.md }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <TouchableOpacity key={s} onPress={() => onChange(s)} activeOpacity={0.7}>
          <Text style={{ fontSize: 36, color: s <= value ? filledColor : emptyColor }}>
            {s <= value ? '\u2605' : '\u2606'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function OrderDetailScreen() {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  const { refresh: refreshCart } = useCart();
  const [ratingModal, setRatingModal] = useState<'store' | 'driver' | null>(null);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [ratingSaving, setRatingSaving] = useState(false);
  const [reordering, setReordering] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!id) return;
    if (!silent) setLoading(true);
    try {
      setOrder(await getOrder(id));
    } catch {
      setOrder(null);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);
  useFocusEffect(
    useCallback(() => {
      load(true);
    }, [load]),
  );

  useEffect(() => {
    const status = (order?.status as string) || '';
    if (status === 'delivered' || status === 'cancelled') return;
    const intervalId = setInterval(() => {
      load(true);
    }, 10000);
    return () => clearInterval(intervalId);
  }, [load, order?.status]);

  // Reload on relevant notifications
  useEffect(() => {
    const unsubscribe = addNotificationListener((payload) => {
      // Reload on notifications for this order or general order updates
      const orderTypes = ['order_accepted', 'order_rejected', 'order_preparing', 'order_ready', 'driver_assigned', 'order_picked_up', 'order_on_the_way', 'order_delivered'];
      if (payload.type && orderTypes.includes(payload.type)) {
        // If notification is for this specific order, or if it's a general update, reload
        if (!payload.orderId || payload.orderId === id) {
          load(true);
        }
      }
    });
    return () => { unsubscribe(); };
  }, [load, id]);

  const handleRate = useCallback(async () => {
    if (!ratingModal || stars < 1 || !id) return;
    setRatingSaving(true);
    try {
      if (ratingModal === 'store') {
        await rateStore(id, stars, comment);
      } else {
        await rateDriver(id, stars, comment);
      }
      Alert.alert('شكراً!', 'تم إرسال تقييمك بنجاح');
      setRatingModal(null);
      setStars(0);
      setComment('');
      load();
    } catch (e: unknown) {
      Alert.alert('خطأ', (e as Error).message || 'فشل إرسال التقييم');
    } finally {
      setRatingSaving(false);
    }
  }, [ratingModal, stars, comment, id, load]);

  const handleReorder = useCallback(async () => {
    if (!order || reordering) return;
    setReordering(true);
    try {
      await clearCart();
      const orderItems = (order.items as Array<Record<string, unknown>>) || [];
      for (const item of orderItems) {
        await addToCart(
          item.productId as string,
          (item.quantity as number) || 1,
          item.optionsSnapshot || undefined,
        );
      }
      await refreshCart();
      Alert.alert('تم!', 'تمت إضافة المنتجات إلى السلة', [
        { text: 'ذهاب للسلة', onPress: () => router.push('/(tabs)/cart') },
        { text: 'حسناً' },
      ]);
    } catch (e: unknown) {
      Alert.alert('خطأ', (e as Error).message || 'فشل إعادة الطلب');
    } finally {
      setReordering(false);
    }
  }, [order, reordering, refreshCart]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <IconArrowForward size={24} color={t.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>تفاصيل الطلب</Text>
        </View>
        <ActivityIndicator size="large" color={t.colors.primary} style={styles.loader} />
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <IconArrowForward size={24} color={t.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>تفاصيل الطلب</Text>
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>الطلب غير موجود</Text>
        </View>
      </SafeAreaView>
    );
  }

  const status = (order.status as string) || '';
  const statusVariant = status === 'delivered' ? 'success' : status === 'cancelled' ? 'error' : 'neutral';
  const items = (order.items as Array<Record<string, unknown>>) || [];
  const isDelivered = status === 'delivered';
  const canRateStore = isDelivered && !order.storeRatedAt;
  const canRateDriver = Boolean(isDelivered && order.driverId && !order.driverRatedAt);
  const prepTime = order.prepTimeMinutes as number | null;
  const storeName = (order.merchantProfile as Record<string, unknown>)?.storeName as string || '';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <View style={styles.backBtnCircle}>
            <IconArrowForward size={22} color={t.colors.text} />
          </View>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>طلب #{String(order.orderNumber || id)}</Text>
          <Badge variant={statusVariant}>{getOrderStatus(status).label}</Badge>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Store Card */}
        <View style={styles.storeCard}>
          <View style={styles.storeCardHeader}>
            <View style={styles.storeLogoPlaceholder}>
              <IconStoreOutline size={28} color="#fff" />
            </View>
            <View style={styles.storeInfo}>
              <Text style={styles.storeNameMain}>{storeName || 'متجر'}</Text>
              <Text style={styles.storeAddress}>الحلة - محافظة بابل</Text>
            </View>
          </View>
        </View>

        {/* Driver Card - shown when driver is assigned */}
        {Boolean(order.driverId && order.driver) && (
          <View style={[styles.storeCard, { borderColor: t.colors.primary + '40', borderWidth: 2 }]}>
            <View style={styles.storeCardHeader}>
              <View style={[styles.storeLogoPlaceholder, { backgroundColor: t.colors.primary }]}>
                <IconCarOutline size={28} color="#fff" />
              </View>
              <View style={styles.storeInfo}>
                <Text style={styles.storeNameMain}>{(order.driver as { fullName?: string })?.fullName || 'السائق'}</Text>
                <Text style={styles.storeAddress}>
                  {(order.driver as { vehicleInfo?: string })?.vehicleInfo || 'معلومات المركبة غير متوفرة'}
                </Text>
              </View>
            </View>
            {(order.driver as { phone?: string })?.phone && (
              <React.Fragment>
                <View style={styles.summaryDivider} />
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}
                  onPress={() => {
                    const phone = (order.driver as { phone?: string })?.phone;
                    if (phone) {
                      Linking.openURL(`tel:${phone}`).catch(() => {});
                    }
                  }}
                  activeOpacity={0.85}
                >
                  <View style={[styles.iconCircle, { backgroundColor: t.colors.success + '15' }]}>
                    <IconCallOutline size={18} color={t.colors.success} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ ...t.typography.body, fontFamily: t.fonts.bold, color: t.colors.text }}>
                      الاتصال بالسائق
                    </Text>
                    <Text style={{ ...t.typography.caption, color: t.colors.textMuted }}>
                      {(order.driver as { phone?: string })?.phone}
                    </Text>
                  </View>
                  <IconArrowForward size={20} color={t.colors.textMuted} style={{ transform: [{ rotate: '180deg' }] }} />
                </TouchableOpacity>
              </React.Fragment>
            )}
          </View>
        )}

        {/* Timeline for active orders */}
        {(status === 'preparing' || status === 'ready_for_pickup' || status === 'picked_up' || status === 'on_the_way') && (
          <View style={styles.timelineCard}>
            <View style={styles.timelineRow}>
              <View style={[styles.timelineStep, styles.timelineCompleted]}>
                <IconCheckmarkOutline size={16} color="#fff" />
              </View>
              <View style={styles.timelineLine} />
              <View style={[styles.timelineStep, styles.timelineCompleted]}>
                <IconBagOutline size={16} color="#fff" />
              </View>
              <View style={styles.timelineLine} />
              <View style={[styles.timelineStep, status !== 'preparing' ? styles.timelineCompleted : styles.timelineActive]}>
                <IconTruckOutline size={16} color={status !== 'preparing' ? '#fff' : t.colors.primary} />
              </View>
              <View style={styles.timelineLine} />
              <View style={[styles.timelineStep, status === 'on_the_way' ? styles.timelineActive : styles.timelinePending]}>
                <IconCheckmarkOutline size={16} color={status === 'on_the_way' ? t.colors.primary : t.colors.textMuted} />
              </View>
            </View>
            <View style={styles.timelineLabels}>
              <Text style={styles.timelineLabel}>تم الطلب</Text>
              <Text style={styles.timelineLabel}>قيد التحضير</Text>
              <Text style={styles.timelineLabel}>في الطريق</Text>
              <Text style={styles.timelineLabel}>التوصيل</Text>
            </View>
          </View>
        )}

        {/* Fee Breakdown Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryTitle}>تفاصيل الرسوم</Text>
          </View>
          
          {/* Products row */}
          <View style={styles.breakdownRow}>
            <View style={styles.breakdownIconWrap}>
              <IconBagOutline size={20} color={t.colors.primary} />
            </View>
            <View style={styles.breakdownContent}>
              <Text style={styles.breakdownLabel}>المجموع الفرعي</Text>
              <Text style={styles.breakdownSub}>({items.length} منتجات)</Text>
            </View>
            <Text style={styles.breakdownValue}>{order.subtotal != null ? formatPrice(Number(order.subtotal)) : '-'}</Text>
          </View>

          {/* Delivery row */}
          <View style={styles.breakdownRow}>
            <View style={[styles.breakdownIconWrap, { backgroundColor: t.colors.success + '15' }]}>
              <IconTruckOutline size={20} color={t.colors.success} />
            </View>
            <View style={styles.breakdownContent}>
              <Text style={styles.breakdownLabel}>رسوم التوصيل</Text>
            </View>
            <Text style={[styles.breakdownValue, { color: t.colors.success }]}>
              {order.deliveryFee != null ? formatPrice(Number(order.deliveryFee)) : '-'}
            </Text>
          </View>

          {/* App fee row */}
          <View style={styles.breakdownRow}>
            <View style={[styles.breakdownIconWrap, { backgroundColor: t.colors.warning + '15' }]}>
              <IconDeviceOutline size={20} color={t.colors.warning} />
            </View>
            <View style={styles.breakdownContent}>
              <Text style={styles.breakdownLabel}>رسوم التطبيق</Text>
              <Text style={styles.breakdownSub}>(خدمة المنصة)</Text>
            </View>
            <Text style={styles.breakdownValue}>{order.appFee != null ? formatPrice(Number(order.appFee)) : '-'}</Text>
          </View>

          <View style={styles.summaryDivider} />

          {/* Total row */}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabelMain}>الإجمالي</Text>
            <Text style={styles.totalValueMain}>{order.total != null ? formatPrice(Number(order.total)) : '-'}</Text>
          </View>
        </View>

        {/* Payment Method */}
        <View style={styles.paymentCard}>
          <View style={styles.paymentIconCircle}>
            <IconCashOutline size={24} color={t.colors.success} />
          </View>
          <View style={styles.paymentContent}>
            <Text style={styles.paymentLabel}>طريقة الدفع</Text>
            <Text style={styles.paymentValue}>نقداً عند الاستلام</Text>
          </View>
        </View>

        {/* Products Section */}
        {items.length > 0 && (
          <View style={styles.productsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>المنتجات</Text>
              <View style={styles.itemCountBadge}>
                <Text style={styles.itemCountText}>{items.length} منتج</Text>
              </View>
            </View>
            
            {items.map((item: Record<string, unknown>, idx: number) => {
              const opts = item.optionsSnapshot as { selectedOptions?: Array<{ name?: string; priceModifier?: number }> } | null;
              const unitPrice = item.unitPriceSnapshot as number || 0;
              const quantity = (item.quantity as number) || 1;
              return (
                <View key={idx} style={styles.productCard}>
                  <View style={styles.productMainRow}>
                    <View style={styles.productImagePlaceholder}>
                      <Text style={styles.productInitial}>{(item.productNameSnapshot as string || 'P').charAt(0)}</Text>
                    </View>
                    <View style={styles.productInfo}>
                      <Text style={styles.productName}>{String(item.productNameSnapshot || 'منتج')}</Text>
                      <View style={styles.productPriceRow}>
                        <Text style={styles.productUnitPrice}>{formatPrice(unitPrice)}</Text>
                        <Text style={styles.productQuantity}>× {quantity}</Text>
                      </View>
                    </View>
                    <Text style={styles.productSubtotal}>{item.subtotal != null ? formatPrice(Number(item.subtotal)) : ''}</Text>
                  </View>
                  {opts?.selectedOptions && opts.selectedOptions.length > 0 && (
                    <View style={styles.addonsContainer}>
                      {opts.selectedOptions.map((o, oi) => (
                        <View key={oi} style={styles.addonTag}>
                          <Text style={styles.addonTagText}>
                            + {o.name}
                            {Number(o.priceModifier) > 0 && (
                              <Text style={styles.addonPrice}> ({formatPrice(o.priceModifier)})</Text>
                            )}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Rating Section */}
        {(canRateStore || canRateDriver) && (
          <View style={styles.ratingSection}>
            <Text style={styles.ratingTitle}>قيّم تجربتك</Text>
            <View style={styles.ratingButtonsRow}>
              {canRateStore && (
                <TouchableOpacity
                  style={styles.ratingBtn}
                  activeOpacity={0.85}
                  onPress={() => { setRatingModal('store'); setStars(0); setComment(''); }}
                >
                  <View style={styles.ratingIconWrap}>
                    <IconStarOutline size={22} color={t.colors.warning} />
                  </View>
                  <Text style={styles.ratingBtnText}>قيّم المتجر</Text>
                </TouchableOpacity>
              )}
              {canRateDriver && (
                <TouchableOpacity
                  style={styles.ratingBtn}
                  activeOpacity={0.85}
                  onPress={() => { setRatingModal('driver'); setStars(0); setComment(''); }}
                >
                  <View style={styles.ratingIconWrap}>
                    <IconCarOutline size={22} color={t.colors.primary} />
                  </View>
                  <Text style={styles.ratingBtnText}>قيّم السائق</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Completed badges */}
        {Boolean(isDelivered && (order.storeRatedAt || order.driverRatedAt)) && (
          <View style={styles.completedSection}>
            {Boolean(order.storeRatedAt) && (
              <View style={styles.completedBadge}>
                <View style={styles.completedIcon}>
                  <IconCheckmarkOutline size={16} color={t.colors.success} />
                </View>
                <Text style={styles.completedText}>تم تقييم المتجر</Text>
              </View>
            )}
            {Boolean(order.driverRatedAt) && (
              <View style={styles.completedBadge}>
                <View style={styles.completedIcon}>
                  <IconCheckmarkOutline size={16} color={t.colors.success} />
                </View>
                <Text style={styles.completedText}>تم تقييم السائق</Text>
              </View>
            )}
          </View>
        )}

        {/* Reorder Button */}
        {isDelivered && items.length > 0 && (
          <TouchableOpacity
            style={styles.reorderBtn}
            activeOpacity={0.85}
            onPress={handleReorder}
            disabled={reordering}
          >
            {reordering ? (
              <ActivityIndicator size="small" color={t.colors.white} />
            ) : (
              <>
                <View style={styles.reorderIconWrap}>
                  <IconRepeatOutline size={20} color={t.colors.white} />
                </View>
                <Text style={styles.reorderText}>طلب مرة أخرى</Text>
              </>
            )}
          </TouchableOpacity>
        )}
        
        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={ratingModal !== null} transparent animationType="slide" onRequestClose={() => setRatingModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {ratingModal === 'store' ? 'قيّم المتجر' : 'قيّم السائق'}
            </Text>
            <StarPicker value={stars} onChange={setStars} filledColor={t.colors.warning} emptyColor={t.colors.borderLight} />
            <TextInput
              style={styles.modalInput}
              placeholder="تعليق اختياري..."
              placeholderTextColor={t.colors.textMuted}
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setRatingModal(null)} activeOpacity={0.85}>
                <Text style={styles.modalCancelText}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSave, stars < 1 && { opacity: 0.5 }]}
                onPress={handleRate}
                disabled={ratingSaving || stars < 1}
                activeOpacity={0.85}
              >
                {ratingSaving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.modalSaveText}>إرسال</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (t: ReturnType<typeof useTheme>) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.colors.background },
  
  // Header
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: t.spacing.screenPadding, 
    paddingVertical: t.spacing.md, 
    backgroundColor: t.colors.background,
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
  headerCenter: {
    alignItems: 'center',
    gap: t.spacing.xs,
  },
  headerTitle: { 
    ...t.typography.titleLarge, 
    fontFamily: t.fonts.extraBold,
    color: t.colors.text,
  },
  loader: { flex: 1 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { ...t.typography.body, color: t.colors.textSecondary },
  scroll: { flex: 1 },
  scrollContent: { padding: t.spacing.screenPadding, paddingBottom: t.spacing.xxl },

  // Store Card
  storeCard: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.cardRadius,
    padding: t.spacing.lg,
    marginBottom: t.spacing.lg,
    borderWidth: 0,
    ...t.shadow.shadow2,
  },
  storeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  storeLogoPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: t.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storeInfo: {
    marginLeft: t.spacing.md,
    flex: 1,
  },
  storeNameMain: {
    ...t.typography.body,
    fontFamily: t.fonts.bold,
    color: t.colors.text,
    fontSize: 17,
  },
  storeAddress: {
    ...t.typography.caption,
    color: t.colors.textMuted,
    marginTop: 2,
  },

  // Timeline
  timelineCard: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.cardRadius,
    padding: t.spacing.lg,
    marginBottom: t.spacing.lg,
    borderWidth: 0,
    ...t.shadow.shadow2,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: t.spacing.md,
  },
  timelineStep: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineCompleted: {
    backgroundColor: t.colors.success,
  },
  timelineActive: {
    backgroundColor: t.colors.primary + '15',
    borderWidth: 2,
    borderColor: t.colors.primary,
  },
  timelinePending: {
    backgroundColor: t.colors.backgroundSecondary,
  },
  timelineLine: {
    flex: 1,
    height: 2,
    backgroundColor: t.colors.borderLight,
    marginHorizontal: 4,
  },
  timelineLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: t.spacing.sm,
    paddingHorizontal: t.spacing.xs,
  },
  timelineLabel: {
    ...t.typography.caption,
    fontSize: 11,
    color: t.colors.textMuted,
    textAlign: 'center',
    flex: 1,
  },

  // Summary Card
  summaryCard: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.cardRadius,
    padding: t.spacing.lg,
    marginBottom: t.spacing.lg,
    borderWidth: 0,
    ...t.shadow.shadow2,
  },
  summaryHeader: {
    marginBottom: t.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.borderLight,
    paddingBottom: t.spacing.md,
  },
  summaryTitle: {
    ...t.typography.body,
    fontFamily: t.fonts.bold,
    color: t.colors.text,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: t.spacing.md,
  },
  breakdownIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: t.colors.primary + '12',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: t.spacing.md,
  },
  breakdownContent: {
    flex: 1,
  },
  breakdownLabel: {
    ...t.typography.body,
    fontFamily: t.fonts.bold,
    color: t.colors.text,
  },
  breakdownSub: {
    ...t.typography.caption,
    color: t.colors.textMuted,
    marginTop: 2,
  },
  breakdownValue: {
    ...t.typography.body,
    fontFamily: t.fonts.extraBold,
    color: t.colors.text,
    fontSize: 16,
  },
  summaryDivider: {
    height: 2,
    backgroundColor: t.colors.borderLight,
    marginVertical: t.spacing.md,
    borderRadius: 1,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.cardRadius,
    padding: t.spacing.lg,
    marginBottom: t.spacing.lg,
    borderWidth: 0,
    ...t.shadow.shadow1,
  },
  paymentIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: t.colors.success + '12',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: t.spacing.md,
  },
  paymentContent: {
    flex: 1,
  },
  paymentLabel: {
    ...t.typography.caption,
    color: t.colors.textMuted,
    marginBottom: 2,
  },
  paymentValue: {
    ...t.typography.body,
    fontFamily: t.fonts.bold,
    color: t.colors.text,
  },

  // Products Section
  productsSection: {
    marginBottom: t.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: t.spacing.md,
  },
  sectionTitle: {
    ...t.typography.titleMedium,
    fontFamily: t.fonts.extraBold,
    color: t.colors.text,
  },
  itemCountBadge: {
    backgroundColor: t.colors.primary + '12',
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.xs,
    borderRadius: t.radius.full,
  },
  itemCountText: {
    ...t.typography.caption,
    fontFamily: t.fonts.bold,
    color: t.colors.primary,
  },
  productCard: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.lg,
    padding: t.spacing.md,
    marginBottom: t.spacing.md,
    borderWidth: 0,
    ...t.shadow.shadow1,
  },
  productMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productImagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: t.colors.primary + '12',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInitial: {
    ...t.typography.titleMedium,
    fontFamily: t.fonts.bold,
    color: t.colors.primary,
  },
  productInfo: {
    flex: 1,
    marginLeft: t.spacing.md,
  },
  productName: {
    ...t.typography.body,
    fontFamily: t.fonts.bold,
    color: t.colors.text,
  },
  productPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.sm,
    marginTop: 2,
  },
  productUnitPrice: {
    ...t.typography.caption,
    color: t.colors.textMuted,
  },
  productQuantity: {
    ...t.typography.caption,
    fontFamily: t.fonts.bold,
    color: t.colors.textSecondary,
  },
  productSubtotal: {
    ...t.typography.body,
    fontFamily: t.fonts.extraBold,
    color: t.colors.text,
  },
  addonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: t.spacing.xs,
    marginTop: t.spacing.sm,
    paddingTop: t.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: t.colors.borderLight,
  },
  addonTag: {
    backgroundColor: t.colors.backgroundSecondary,
    paddingHorizontal: t.spacing.sm,
    paddingVertical: 4,
    borderRadius: t.radius.sm,
  },
  addonTagText: {
    ...t.typography.caption,
    color: t.colors.textSecondary,
  },
  addonPrice: {
    ...t.typography.caption,
    fontFamily: t.fonts.bold,
    color: t.colors.text,
  },

  // Rating Section
  ratingSection: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.cardRadius,
    padding: t.spacing.lg,
    marginBottom: t.spacing.lg,
    borderWidth: 0,
    ...t.shadow.shadow2,
  },
  ratingTitle: {
    ...t.typography.body,
    fontFamily: t.fonts.bold,
    color: t.colors.text,
    marginBottom: t.spacing.md,
  },
  ratingButtonsRow: {
    flexDirection: 'row',
    gap: t.spacing.md,
  },
  ratingBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: t.spacing.sm,
    paddingVertical: t.spacing.md,
    backgroundColor: t.colors.backgroundSecondary,
    borderRadius: t.radius.lg,
  },
  ratingIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: t.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingBtnText: {
    ...t.typography.body,
    fontFamily: t.fonts.medium,
    color: t.colors.text,
  },

  // Completed Section
  completedSection: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.cardRadius,
    padding: t.spacing.lg,
    marginBottom: t.spacing.lg,
    borderWidth: 0,
    ...t.shadow.shadow1,
    gap: t.spacing.md,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.sm,
  },
  completedIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: t.colors.success + '12',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completedText: {
    ...t.typography.body,
    fontFamily: t.fonts.medium,
    color: t.colors.success,
  },

  // Reorder Button
  reorderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: t.spacing.sm,
    height: 56,
    backgroundColor: t.colors.primary,
    borderRadius: t.radius.full,
    marginTop: t.spacing.lg,
    ...t.shadow.shadow2,
  },
  reorderIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reorderText: { 
    ...t.typography.body, 
    fontFamily: t.fonts.extraBold, 
    color: t.colors.white,
    fontSize: 16,
  },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: t.colors.overlay, justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: t.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: t.spacing.xl,
    paddingBottom: t.spacing.xxl + t.spacing.lg,
    ...t.shadow.shadow3,
  },
  modalTitle: { 
    ...t.typography.titleMedium, 
    fontFamily: t.fonts.extraBold,
    color: t.colors.text, 
    textAlign: 'center', 
    marginBottom: t.spacing.md,
  },
  modalInput: {
    backgroundColor: t.colors.background,
    borderWidth: 1,
    borderColor: t.colors.borderLight,
    borderRadius: t.radius.lg,
    paddingHorizontal: t.spacing.lg,
    paddingVertical: t.spacing.md,
    ...t.typography.body,
    color: t.colors.text,
    textAlign: 'right',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalActions: { flexDirection: 'row', gap: t.spacing.md, marginTop: t.spacing.lg },
  modalCancel: { 
    flex: 1, 
    paddingVertical: t.spacing.md, 
    borderRadius: t.radius.lg, 
    backgroundColor: t.colors.backgroundSecondary, 
    alignItems: 'center',
  },
  modalCancelText: { 
    ...t.typography.body, 
    fontFamily: t.fonts.medium, 
    color: t.colors.textSecondary,
  },
  modalSave: { 
    flex: 1, 
    height: t.button.primaryHeight, 
    justifyContent: 'center', 
    borderRadius: t.radius.lg, 
    backgroundColor: t.colors.primary, 
    alignItems: 'center',
  },
  modalSaveText: { 
    ...t.typography.body, 
    fontFamily: t.fonts.extraBold, 
    color: t.colors.white,
  },
});
