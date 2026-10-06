import { useCallback, useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { getDriverProfile, setDriverOnline, getPendingDeliveries, getMyOrders, updateDriverLocation } from '../../api/client';
import { theme, formatPrice } from '../../constants/theme';
import { DriverDashboardStats } from '../../components/DriverDashboardStats';
import { EarningsChart } from '../../components/EarningsChart';
import {
  IconCarOutline,
  IconReceiptOutline,
  IconCashOutline,
  IconLocationOutline,
  IconArrowForward,
  IconClockOutline,
  IconCheckmarkOutline,
  IconBoxOutline,
  IconWalletOutline,
  IconStarOutline,
} from '../../components/Icons';
import * as Location from 'expo-location';
import { addNotificationListener } from '../../hooks/useNotifications';

type DriverProfile = {
  id: string;
  isOnline?: boolean;
  isApproved?: boolean;
  ratingAvg?: number;
  ratingCount?: number;
  user?: { fullName?: string; email?: string; phone?: string };
};

type OrderItem = {
  id: string;
  orderNumber: string;
  status: string;
  total: number | string;
  merchantProfile?: { storeName?: string; addressText?: string };
  address?: { addressText?: string };
  deliveryAddressText?: string;
  createdAt?: string;
};

const STATUS_LABELS: Record<string, string> = {
  ready_for_pickup: 'جاهز للاستلام',
  picked_up: 'تم الاستلام',
  on_the_way: 'في الطريق',
};

const STATUS_COLORS: Record<string, string> = {
  ready_for_pickup: '#f59e0b',
  picked_up: '#3b82f6',
  on_the_way: '#8b5cf6',
};

export default function DriverHomeScreen() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [pendingOrders, setPendingOrders] = useState<OrderItem[]>([]);
  const [activeOrder, setActiveOrder] = useState<OrderItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [locationStatus, setLocationStatus] = useState<'granted' | 'denied' | 'unknown'>('unknown');
  const locationWatcher = useRef<Location.LocationSubscription | null>(null);
  const statsRef = useRef<{ reload: () => void } | null>(null);
  const chartRef = useRef<{ reload: () => void } | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [profRes, pendingRes, myOrdersRes] = await Promise.all([
        getDriverProfile(),
        getPendingDeliveries(), // Returns [order] from active offer, or []
        getMyOrders(),
      ]);
      setProfile(profRes as DriverProfile);
      const pending = Array.isArray(pendingRes) ? (pendingRes as OrderItem[]) : [];
      setPendingOrders(pending);
      const myOrders = Array.isArray(myOrdersRes) ? (myOrdersRes as OrderItem[]) : [];
      const active = myOrders.find((o) => ['ready_for_pickup', 'picked_up', 'on_the_way'].includes(o.status));
      setActiveOrder(active ?? null);
    } catch {
      setProfile(null);
      setPendingOrders([]);
      setActiveOrder(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const unsub = addNotificationListener((payload) => {
      if (payload.type === 'delivery_offer' || payload.type === 'delivery_available') load(true);
    });
    return () => unsub();
  }, [load]);

  useEffect(() => {
    (async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      setLocationStatus(status === 'granted' ? 'granted' : 'denied');
    })();
  }, []);

  const startLocationTracking = useCallback(async () => {
    if (locationWatcher.current) return;
    const { status } = await Location.requestForegroundPermissionsAsync();
    setLocationStatus(status === 'granted' ? 'granted' : 'denied');
    if (status !== 'granted') {
      Alert.alert('إذن الموقع', 'يجب السماح بالوصول إلى موقعك لاستقبال الطلبات');
      return;
    }
    locationWatcher.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, timeInterval: 15000, distanceInterval: 40 },
      (loc) => {
        updateDriverLocation(loc.coords.latitude, loc.coords.longitude).catch(() => {});
      },
    );
  }, []);

  const stopLocationTracking = useCallback(() => {
    if (locationWatcher.current) {
      locationWatcher.current.remove();
      locationWatcher.current = null;
    }
  }, []);

  useEffect(() => {
    if (profile?.isOnline) startLocationTracking();
    else stopLocationTracking();
    return () => stopLocationTracking();
  }, [profile?.isOnline, startLocationTracking, stopLocationTracking]);

  const handleToggleOnline = async () => {
    if (!profile || toggling) return;
    const next = !profile.isOnline;
    if (!profile.isApproved && next) {
      Alert.alert('تنبيه', 'حسابك قيد المراجعة. سيتم تفعيلك من قبل الإدارة قريبا.');
      return;
    }
    if (next) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationStatus(status === 'granted' ? 'granted' : 'denied');
      if (status !== 'granted') {
        Alert.alert('إذن الموقع', 'يجب السماح بالوصول إلى موقعك لاستقبال الطلبات');
        return;
      }
    }
    setToggling(true);
    try {
      await setDriverOnline(next);
      setProfile((p) => (p ? { ...p, isOnline: next } : null));
      if (!next) load(true);
    } catch (e: unknown) {
      Alert.alert('خطأ', (e as Error).message);
    } finally {
      setToggling(false);
    }
  };

  const displayName = (profile?.user as { fullName?: string })?.fullName ?? (user as { fullName?: string })?.fullName ?? (user as { email?: string })?.email ?? 'سائق';

  if (loading && !profile) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>لوحة السائق</Text>
        </View>
        <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerGreeting}>مرحبا</Text>
          <Text style={styles.headerName}>{displayName}</Text>
        </View>
        <View style={styles.headerRight}>
          {profile?.ratingAvg != null && (
            <View style={styles.ratingBadge}>
              <IconStarOutline size={14} color={theme.colors.accentAmber} />
              <Text style={styles.ratingText}>{profile.ratingAvg.toFixed(1)}</Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={theme.colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Approval Warning */}
        {!profile?.isApproved && (
          <View style={styles.warningCard}>
            <View style={styles.warningIcon}>
              <IconClockOutline size={20} color={theme.colors.accentAmber} />
            </View>
            <Text style={styles.warningText}>حسابك قيد المراجعة. سيتم إعلامك عند الموافقة.</Text>
          </View>
        )}

        {/* Online Toggle - Prominent */}
        <TouchableOpacity
          style={[styles.onlineToggleCard, profile?.isOnline ? styles.onlineToggleCardOn : styles.onlineToggleCardOff]}
          onPress={handleToggleOnline}
          disabled={toggling}
          activeOpacity={0.9}
        >
          <View style={styles.onlineToggleContent}>
            <View style={[styles.onlineIconContainer, profile?.isOnline ? styles.onlineIconContainerOn : styles.onlineIconContainerOff]}>
              <IconCarOutline size={32} color={profile?.isOnline ? theme.colors.success : theme.colors.textMuted} />
            </View>
            <View style={styles.onlineToggleInfo}>
              <Text style={[styles.onlineToggleStatus, profile?.isOnline ? styles.onlineToggleStatusOn : styles.onlineToggleStatusOff]}>
                {profile?.isOnline ? 'متصل - جاهز للطلبات' : 'غير متصل'}
              </Text>
              <Text style={styles.onlineToggleHint}>
                {profile?.isOnline
                  ? 'سيتم إرسال الطلبات المتاحة لك'
                  : 'اضغط للتفعيل واستقبال الطلبات'}
              </Text>
            </View>
          </View>
          <View style={[styles.onlineToggleButton, profile?.isOnline ? styles.onlineToggleButtonOn : styles.onlineToggleButtonOff]}>
            <View style={[styles.toggleIndicator, profile?.isOnline ? styles.toggleIndicatorOn : styles.toggleIndicatorOff]} />
          </View>
          {profile?.isOnline && locationStatus === 'granted' && (
            <View style={styles.gpsBadge}>
              <IconLocationOutline size={12} color={theme.colors.success} />
              <Text style={styles.gpsText}>GPS</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Stats Section */}
        <View style={styles.section}>
          <SectionHeader title="إحصائياتي" />
          <DriverDashboardStats />
        </View>

        {/* Weekly Chart */}
        <View style={styles.section}>
          <EarningsChart />
        </View>

        {/* Active Order - Priority Section */}
        {activeOrder && (
          <View style={styles.section}>
            <SectionHeader title="طلبي الحالي" />
            <TouchableOpacity
              style={styles.activeCard}
              onPress={() => router.push(`/order/${activeOrder.id}`)}
              activeOpacity={0.85}
            >
              <View style={styles.activeTop}>
                <View style={[styles.activeBadge, { backgroundColor: STATUS_COLORS[activeOrder.status] ?? theme.colors.primary }]}>
                  <Text style={styles.activeBadgeText}>{STATUS_LABELS[activeOrder.status] ?? activeOrder.status}</Text>
                </View>
                <Text style={styles.activeNumber}>#{activeOrder.orderNumber}</Text>
              </View>
              <View style={styles.activeStoreRow}>
                <IconBoxOutline size={18} color={theme.colors.textSecondary} />
                <Text style={styles.activeStore}>{activeOrder.merchantProfile?.storeName ?? '—'}</Text>
              </View>
              <View style={styles.activeFooter}>
                <Text style={styles.activeTotal}>{formatPrice(activeOrder.total)}</Text>
                <View style={styles.activeAction}>
                  <Text style={styles.activeActionText}>إدارة الطلب</Text>
                  <IconArrowForward size={16} color={theme.colors.primary} style={{ transform: [{ rotate: '180deg' }] }} />
                </View>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Available Orders */}
        {profile?.isOnline && pendingOrders.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title={`طلبات متاحة (${pendingOrders.length})`} />
            <View style={styles.ordersList}>
              {pendingOrders.slice(0, 3).map((order) => (
                <TouchableOpacity
                  key={order.id}
                  style={styles.orderRow}
                  onPress={() => router.push(`/order/${order.id}`)}
                  activeOpacity={0.85}
                >
                  <View style={styles.orderLeft}>
                    <Text style={styles.orderStore}>{order.merchantProfile?.storeName ?? '—'}</Text>
                    <Text style={styles.orderAddr} numberOfLines={1}>
                      {order.deliveryAddressText || order.address?.addressText || '—'}
                    </Text>
                  </View>
                  <View style={styles.orderRight}>
                    <Text style={styles.orderPrice}>{formatPrice(order.total)}</Text>
                    <View style={styles.orderBtn}>
                      <Text style={styles.orderBtnText}>قبول</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
            {pendingOrders.length > 3 && (
              <TouchableOpacity style={styles.seeAllBtn} onPress={() => router.push('/(driver)/orders')}>
                <Text style={styles.seeAllText}>عرض الكل ({pendingOrders.length})</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Empty State */}
        {profile?.isOnline && pendingOrders.length === 0 && !activeOrder && (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <IconReceiptOutline size={40} color={theme.colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>لا توجد طلبات متاحة</Text>
            <Text style={styles.emptySub}>سيتم إعلامك فور وصول طلب جديد</Text>
          </View>
        )}

        {/* Quick Links */}
        <View style={styles.linksSection}>
          <SectionHeader title="الروابط السريعة" />
          <View style={styles.linksGrid}>
            <QuickLink
              icon={<IconReceiptOutline size={22} color={theme.colors.primary} />}
              label="سجل الطلبات"
              onPress={() => router.push('/(driver)/orders')}
            />
            <QuickLink
              icon={<IconWalletOutline size={22} color={theme.colors.success} />}
              label="المستحقات"
              onPress={() => router.push('/(driver)/earnings')}
            />
            <QuickLink
              icon={<IconStarOutline size={22} color={theme.colors.accentAmber} />}
              label="تقييماتي"
              onPress={() => router.push('/(driver)/account')}
              badge={profile?.ratingCount ? `${profile.ratingAvg?.toFixed(1)}/5` : undefined}
            />
            <QuickLink
              icon={<IconCarOutline size={22} color={theme.colors.accentPurple} />}
              label="حسابي"
              onPress={() => router.push('/(driver)/account')}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function QuickLink({
  icon,
  label,
  onPress,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  badge?: string;
}) {
  return (
    <TouchableOpacity style={styles.quickLink} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.quickLinkIcon}>{icon}</View>
      <Text style={styles.quickLinkText}>{label}</Text>
      {badge && (
        <View style={styles.quickLinkBadge}>
          <Text style={styles.quickLinkBadgeText}>{badge}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.screenPadding,
    paddingVertical: 16,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  headerLeft: {},
  headerGreeting: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: theme.colors.textSecondary },
  headerName: { fontSize: 20, fontFamily: 'Cairo_700Bold', fontWeight: '700', color: theme.colors.text },
  headerTitle: { fontSize: 20, fontFamily: 'Cairo_700Bold', fontWeight: '700', color: theme.colors.text, textAlign: 'center' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.accentAmber + '15',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  ratingText: {
    fontSize: 13,
    fontFamily: 'Cairo_600SemiBold',
    fontWeight: '600',
    color: theme.colors.accentAmber,
    marginLeft: 4,
  },

  loader: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: theme.spacing.screenPadding, paddingBottom: 32, gap: theme.spacing.lg },

  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: '#F59E0B40',
    gap: 10,
  },
  warningIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningText: { flex: 1, fontSize: 14, fontFamily: 'Cairo_500Medium', color: '#92400e', textAlign: 'right' },

  // New Online Toggle Design
  onlineToggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    borderWidth: 2,
    borderColor: theme.colors.borderLight,
    ...theme.shadow.card,
  },
  onlineToggleCardOn: {
    borderColor: theme.colors.success + '50',
    backgroundColor: '#F0FDF4',
  },
  onlineToggleCardOff: {
    borderColor: theme.colors.error + '30',
  },
  onlineToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  onlineIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: theme.spacing.md,
  },
  onlineIconContainerOn: {
    backgroundColor: theme.colors.success + '20',
  },
  onlineIconContainerOff: {
    backgroundColor: theme.colors.surfaceAlt,
  },
  onlineToggleInfo: {
    flex: 1,
  },
  onlineToggleStatus: {
    fontSize: 17,
    fontFamily: 'Cairo_700Bold',
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'right',
  },
  onlineToggleStatusOn: {
    color: theme.colors.success,
  },
  onlineToggleStatusOff: {
    color: theme.colors.error,
  },
  onlineToggleHint: {
    fontSize: 13,
    fontFamily: 'Cairo_400Regular',
    color: theme.colors.textSecondary,
    marginTop: 4,
    textAlign: 'right',
  },
  onlineToggleButton: {
    width: 56,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceAlt,
    padding: 4,
    marginLeft: theme.spacing.md,
  },
  onlineToggleButtonOn: {
    backgroundColor: theme.colors.success,
  },
  onlineToggleButtonOff: {
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  toggleIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.white,
  },
  toggleIndicatorOn: {
    marginLeft: 24,
  },
  toggleIndicatorOff: {
    marginLeft: 0,
  },
  gpsBadge: {
    position: 'absolute',
    top: 12,
    left: 80,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.success + '15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  gpsText: { fontSize: 11, fontFamily: 'Cairo_500Medium', color: theme.colors.success },

  section: { marginTop: 0 },
  sectionHeader: { marginBottom: theme.spacing.md },
  sectionTitle: { fontSize: 17, fontFamily: 'Cairo_700Bold', fontWeight: '700', color: theme.colors.text, textAlign: 'right' },

  activeCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    borderWidth: 2,
    borderColor: theme.colors.primary + '40',
    ...theme.shadow.card,
  },
  activeTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  activeBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 },
  activeBadgeText: { fontSize: 12, fontFamily: 'Cairo_700Bold', fontWeight: '700', color: '#fff' },
  activeNumber: { fontSize: 14, fontFamily: 'Cairo_600SemiBold', fontWeight: '600', color: theme.colors.textSecondary },
  activeStoreRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  activeStore: { fontSize: 16, fontFamily: 'Cairo_600SemiBold', fontWeight: '600', color: theme.colors.text, textAlign: 'right' },
  activeFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  activeTotal: { fontSize: 20, fontFamily: 'Cairo_800ExtraBold', fontWeight: '800', color: theme.colors.primary },
  activeAction: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  activeActionText: { fontSize: 14, fontFamily: 'Cairo_600SemiBold', fontWeight: '600', color: theme.colors.primary },

  ordersList: { gap: 10 },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    ...theme.shadow.card,
  },
  orderLeft: { flex: 1, marginLeft: theme.spacing.md },
  orderStore: { fontSize: 15, fontFamily: 'Cairo_600SemiBold', fontWeight: '600', color: theme.colors.text, textAlign: 'right' },
  orderAddr: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: theme.colors.textSecondary, marginTop: 2, textAlign: 'right' },
  orderRight: { alignItems: 'flex-end' },
  orderPrice: { fontSize: 15, fontFamily: 'Cairo_700Bold', fontWeight: '700', color: theme.colors.text },
  orderBtn: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 6,
  },
  orderBtnText: { fontSize: 13, fontFamily: 'Cairo_600SemiBold', fontWeight: '600', color: '#fff' },

  seeAllBtn: { alignItems: 'center', paddingVertical: theme.spacing.md },
  seeAllText: { fontSize: 14, fontFamily: 'Cairo_600SemiBold', fontWeight: '600', color: theme.colors.primary },

  emptyCard: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    ...theme.shadow.card,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: theme.colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  emptyTitle: { fontSize: 16, fontFamily: 'Cairo_700Bold', fontWeight: '700', color: theme.colors.text },
  emptySub: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: theme.colors.textSecondary, marginTop: 4 },

  linksSection: { marginTop: theme.spacing.sm },
  linksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickLink: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    ...theme.shadow.card,
  },
  quickLinkIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: theme.colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  quickLinkText: { fontSize: 14, fontFamily: 'Cairo_600SemiBold', fontWeight: '600', color: theme.colors.text, flex: 1, textAlign: 'right' },
  quickLinkBadge: { backgroundColor: theme.colors.primary + '15', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  quickLinkBadgeText: { fontSize: 11, fontFamily: 'Cairo_600SemiBold', fontWeight: '600', color: theme.colors.primary },
});
