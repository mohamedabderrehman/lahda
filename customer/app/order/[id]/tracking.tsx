import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Dimensions, Modal } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconArrowForward, IconCheckmarkOutline, IconCloseOutline } from '../../../components/Icons';
import { PrimaryButton } from '../../../components/ui';
import { getOrder, getOrderDriverLocation } from '../../../api/client';
import { useTheme } from '../../../contexts/ThemeContext';
import { OrderTrackingMap } from '../../../components/OrderTrackingMap';
import { getOrderStatus } from '../../../lib/order-status';

type LatLng = { latitude: number; longitude: number };

const POLL_INTERVAL = 10_000;

export default function OrderTrackingScreen() {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const { id } = useLocalSearchParams<{ id: string }>();

  const [merchantLoc, setMerchantLoc] = useState<LatLng | null>(null);
  const [customerLoc, setCustomerLoc] = useState<LatLng | null>(null);
  const [driverLoc, setDriverLoc] = useState<LatLng | null>(null);
  const [orderStatus, setOrderStatus] = useState<string>('');
  const [storeName, setStoreName] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [loadingOrder, setLoadingOrder] = useState(true);
  const [ended, setEnded] = useState(false);
  const [mapModalVisible, setMapModalVisible] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const order = await getOrder(id) as Record<string, unknown>;
        const mp = order.merchantProfile as Record<string, unknown> | null;
        if (mp && mp.latitude != null && mp.longitude != null) {
          setMerchantLoc({ latitude: Number(mp.latitude), longitude: Number(mp.longitude) });
        }
        if (order.deliveryLatitude != null && order.deliveryLongitude != null) {
          setCustomerLoc({ latitude: Number(order.deliveryLatitude), longitude: Number(order.deliveryLongitude) });
        }
        setOrderStatus(String(order.status || ''));
        setStoreName(String((mp as Record<string, unknown>)?.storeName || ''));
        setOrderNumber(String(order.orderNumber || ''));
        if (order.status === 'delivered' || order.status === 'cancelled') {
          setEnded(true);
        }
      } catch { /* ignore */ }
      setLoadingOrder(false);
    })();
  }, [id]);

  const fetchDriverLoc = useCallback(async () => {
    if (!id || ended) return;
    try {
      const res = await getOrderDriverLocation(id);
      if (res.latitude != null && res.longitude != null) {
        setDriverLoc({ latitude: Number(res.latitude), longitude: Number(res.longitude) });
      }
      if (res.status) setOrderStatus(res.status);
      if (res.status === 'delivered' || res.status === 'cancelled') {
        setEnded(true);
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      }
    } catch { /* ignore */ }
  }, [id, ended]);

  useEffect(() => {
    if (loadingOrder || ended) return;
    fetchDriverLoc();
    pollRef.current = setInterval(fetchDriverLoc, POLL_INTERVAL);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [loadingOrder, ended, fetchDriverLoc]);

  if (loadingOrder) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <IconArrowForward size={24} color={t.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>تتبع الطلب</Text>
        </View>
        <ActivityIndicator size="large" color={t.colors.primary} style={styles.loader} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <IconArrowForward size={24} color={t.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>تتبع الطلب {orderNumber ? `#${orderNumber}` : ''}</Text>
      </View>

      {ended ? (
        <View style={styles.endedCard}>
          <View style={styles.endedIconContainer}>
            {orderStatus === 'delivered' ? (
              <IconCheckmarkOutline size={64} color={t.colors.success} />
            ) : (
              <IconCloseOutline size={64} color={t.colors.error} />
            )}
          </View>
          <Text style={styles.endedTitle}>
            {orderStatus === 'delivered' ? 'تم التوصيل بنجاح!' : 'تم إلغاء الطلب'}
          </Text>
          <Text style={styles.endedSub}>انتهى التتبع</Text>
          <PrimaryButton label="العودة" onPress={() => router.back()} style={styles.goBackBtn} />
        </View>
      ) : (
        <View style={styles.body}>
          <View style={styles.statusBar}>
            <View style={[styles.statusDot, { backgroundColor: orderStatus === 'delivered' ? t.colors.success : orderStatus === 'on_the_way' ? t.colors.primary : t.colors.textSecondary }]} />
            <Text style={styles.statusText}>{getOrderStatus(orderStatus).label}</Text>
            {storeName ? <Text style={styles.storeText}>{storeName}</Text> : null}
          </View>

          <TouchableOpacity style={styles.mapPreview} onPress={() => setMapModalVisible(true)} activeOpacity={0.9}>
            <OrderTrackingMap
              driverLocation={driverLoc}
              merchantLocation={merchantLoc}
              customerLocation={customerLoc}
              style={{ width: Dimensions.get('window').width - t.spacing.screenPadding * 2, height: 260 }}
              driverColor={t.colors.primary}
              merchantColor={t.colors.discount}
              customerColor={t.colors.success}
              routeColor={t.colors.primary}
            />
            <View style={styles.mapPreviewOverlay}>
              <Text style={styles.mapPreviewOverlayText}>اضغط لتكبير الخريطة</Text>
            </View>
          </TouchableOpacity>

          {!driverLoc && (
            <View style={styles.waitingCard}>
              <ActivityIndicator size="small" color={t.colors.primary} />
              <Text style={styles.waitingText}>بانتظار موقع السائق...</Text>
            </View>
          )}

          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: t.colors.primary }]} />
              <Text style={styles.legendLabel}>السائق</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: t.colors.discount }]} />
              <Text style={styles.legendLabel}>المتجر</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: t.colors.success }]} />
              <Text style={styles.legendLabel}>موقعك</Text>
            </View>
          </View>

          <Text style={styles.refreshNote}>يتم تحديث موقع السائق كل 10 ثوانٍ</Text>
        </View>
      )}
      <Modal
        visible={mapModalVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setMapModalVisible(false)}
      >
        <SafeAreaView style={styles.modalSafe} edges={['top']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setMapModalVisible(false)}>
              <IconCloseOutline size={24} color={t.colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>تتبع الطلب على الخريطة</Text>
            <View style={{ width: 40 }} />
          </View>
          <OrderTrackingMap
            driverLocation={driverLoc}
            merchantLocation={merchantLoc}
            customerLocation={customerLoc}
            style={{ width: Dimensions.get('window').width, height: Dimensions.get('window').height - 150 }}
            driverColor={t.colors.primary}
            merchantColor={t.colors.discount}
            customerColor={t.colors.success}
            routeColor={t.colors.primary}
          />
          <View style={styles.modalFooter}>
            <Text style={styles.modalStatus}>{getOrderStatus(orderStatus).label}</Text>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const makeStyles = (t: ReturnType<typeof useTheme>) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: t.spacing.sm,
    paddingVertical: t.spacing.lg,
    backgroundColor: t.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.borderLight,
  },
  backBtn: { padding: t.spacing.md },
  headerTitle: { flex: 1, ...t.typography.titleLarge, color: t.colors.text, textAlign: 'center', marginHorizontal: t.spacing.lg },
  loader: { flex: 1 },
  body: { flex: 1, padding: t.spacing.screenPadding },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.cardRadius,
    padding: t.spacing.md,
    marginBottom: t.spacing.md,
    borderWidth: 0,
    ...t.shadow.shadow2,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginLeft: t.spacing.sm },
  statusText: { flex: 1, ...t.typography.body, fontFamily: t.fonts.medium, color: t.colors.text, textAlign: 'right' },
  storeText: { ...t.typography.caption, color: t.colors.textSecondary, marginRight: t.spacing.sm },
  mapPreview: { borderRadius: t.radius.cardRadius, overflow: 'hidden' },
  mapPreviewOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingVertical: 8,
    alignItems: 'center',
  },
  mapPreviewOverlayText: { color: '#fff', fontSize: 12, fontFamily: t.fonts.medium },
  waitingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: t.spacing.sm,
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.cardRadius,
    padding: t.spacing.md,
    marginTop: t.spacing.md,
    borderWidth: 0,
    ...t.shadow.shadow2,
  },
  waitingText: { ...t.typography.body, color: t.colors.textSecondary },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: t.spacing.xl,
    marginTop: t.spacing.md,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendLabel: { ...t.typography.caption, color: t.colors.textSecondary },
  refreshNote: {
    textAlign: 'center',
    ...t.typography.caption,
    fontSize: 11,
    color: t.colors.textSecondary,
    marginTop: t.spacing.sm,
    opacity: 0.7,
  },
  endedCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: t.spacing.xxl,
  },
  endedIconContainer: { marginBottom: t.spacing.md },
  endedTitle: { ...t.typography.titleLarge, fontSize: 22, color: t.colors.text, marginTop: t.spacing.lg },
  endedSub: { ...t.typography.body, color: t.colors.textSecondary, marginTop: t.spacing.sm },
  goBackBtn: {
    marginTop: t.spacing.xxl,
    minHeight: t.button.primaryHeight,
    paddingHorizontal: t.spacing.xxl + t.spacing.lg,
  },
  modalSafe: { flex: 1, backgroundColor: t.colors.background },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: t.spacing.screenPadding,
    paddingVertical: t.spacing.md,
    backgroundColor: t.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.borderLight,
  },
  modalCloseBtn: { padding: 8, borderRadius: 20 },
  modalTitle: { fontSize: 17, fontFamily: t.fonts.bold, color: t.colors.text },
  modalFooter: {
    backgroundColor: t.colors.surface,
    borderTopWidth: 1,
    borderTopColor: t.colors.borderLight,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalStatus: { ...t.typography.body, color: t.colors.textSecondary, fontFamily: t.fonts.medium },
});
