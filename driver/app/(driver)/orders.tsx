import { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { getMyOrders, getPendingDeliveries } from '../../api/client';
import { formatPrice } from '../../constants/theme';
import { theme } from '../../constants/theme';
import { IconReceiptOutline, IconArrowForward } from '../../components/Icons';
import { addNotificationListener } from '../../hooks/useNotifications';

const STATUS_LABELS: Record<string, string> = {
  pending: 'قيد الانتظار',
  accepted_by_merchant: 'مقبول',
  preparing: 'قيد التحضير',
  ready_for_pickup: 'جاهز للاستلام',
  picked_up: 'تم الاستلام',
  on_the_way: 'في الطريق',
  delivered: 'تم التوصيل',
  cancelled: 'ملغي',
};

const STATUS_DOT_COLOR: Record<string, string> = {
  ready_for_pickup: '#f59e0b',
  picked_up: '#3b82f6',
  on_the_way: '#8b5cf6',
  delivered: '#22c55e',
  cancelled: '#ef4444',
};

type Tab = 'available' | 'active' | 'history';

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

export default function DriverOrdersScreen() {
  const [tab, setTab] = useState<Tab>('active');
  const [myOrders, setMyOrders] = useState<OrderItem[]>([]);
  const [pending, setPending] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [myRes, pendingRes] = await Promise.all([getMyOrders(), getPendingDeliveries()]);
      setMyOrders(Array.isArray(myRes) ? (myRes as OrderItem[]) : []);
      setPending(Array.isArray(pendingRes) ? (pendingRes as OrderItem[]) : []);
    } catch {
      setMyOrders([]);
      setPending([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useFocusEffect(
    useCallback(() => {
      load(true);
    }, [load]),
  );

  useEffect(() => {
    const intervalId = setInterval(() => {
      load(true);
    }, 10000);
    return () => clearInterval(intervalId);
  }, [load]);

  // Reload on relevant notifications
  useEffect(() => {
    const unsubscribe = addNotificationListener((payload) => {
      const relevantTypes = ['delivery_offer', 'delivery_available', 'driver_assigned', 'order_accepted', 'order_picked_up', 'order_on_the_way', 'order_delivered'];
      if (payload.type && relevantTypes.includes(payload.type)) {
        load(true);
      }
    });
    return () => { unsubscribe(); };
  }, [load]);

  const activeOrders = myOrders.filter((o) => !['delivered', 'cancelled'].includes(o.status));
  const historyOrders = myOrders.filter((o) => ['delivered', 'cancelled'].includes(o.status));

  const dataMap: Record<Tab, OrderItem[]> = {
    available: pending,
    active: activeOrders,
    history: historyOrders,
  };

  const list = dataMap[tab];

  const formatDate = (raw?: string) => {
    if (!raw) return '';
    try {
      const d = new Date(raw);
      return d.toLocaleDateString('ar-IQ', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
  };

  const renderItem = ({ item }: { item: OrderItem }) => {
    const dotColor = STATUS_DOT_COLOR[item.status] ?? theme.colors.textMuted;
    const isAvailable = tab === 'available';
    return (
      <TouchableOpacity
        style={[styles.card, isAvailable && styles.cardAvailable]}
        onPress={() => router.push(`/order/${item.id}`)}
        activeOpacity={0.85}
      >
        <View style={styles.cardTop}>
          <View style={styles.cardTopLeft}>
            <Text style={styles.orderNum}>#{item.orderNumber}</Text>
            {item.createdAt ? <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text> : null}
          </View>
          <View style={[styles.statusChip, { backgroundColor: dotColor + '18' }]}>
            <View style={[styles.statusDot, { backgroundColor: dotColor }]} />
            <Text style={[styles.statusText, { color: dotColor }]}>{STATUS_LABELS[item.status] ?? item.status}</Text>
          </View>
        </View>
        <Text style={styles.storeName}>{item.merchantProfile?.storeName ?? '—'}</Text>
        {(item.deliveryAddressText || item.address?.addressText) && (
          <Text style={styles.addrText} numberOfLines={1}>
            {item.deliveryAddressText || item.address?.addressText}
          </Text>
        )}
        <View style={styles.cardBottom}>
          <Text style={styles.totalText}>{formatPrice(item.total)}</Text>
          <View style={styles.cardAction}>
            <Text style={styles.actionText}>{isAvailable ? 'استلام' : 'التفاصيل'}</Text>
            <IconArrowForward size={14} color={theme.colors.primary} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'active', label: 'نشطة', count: activeOrders.length },
    { key: 'available', label: 'متاحة', count: pending.length },
    { key: 'history', label: 'السجل', count: historyOrders.length },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>الطلبات</Text>
      </View>

      <View style={styles.tabBar}>
        {tabs.map((t) => {
          const active = tab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              style={[styles.tabItem, active && styles.tabItemActive]}
              onPress={() => setTab(t.key)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
              {t.count > 0 && (
                <View style={[styles.tabBadge, active && styles.tabBadgeActive]}>
                  <Text style={[styles.tabBadgeText, active && styles.tabBadgeTextActive]}>{t.count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {loading && list.length === 0 ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={list}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={theme.colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <IconReceiptOutline size={48} color={theme.colors.textMuted} />
              <Text style={styles.emptyTitle}>
                {tab === 'available' ? 'لا توجد طلبات متاحة' : tab === 'active' ? 'لا توجد طلبات نشطة' : 'لا يوجد سجل بعد'}
              </Text>
              <Text style={styles.emptySub}>
                {tab === 'available' ? 'ستظهر الطلبات الجديدة هنا' : tab === 'active' ? 'ستظهر الطلبات الحالية هنا عند استلامها' : 'سيظهر سجل التوصيلات المكتملة هنا'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    paddingHorizontal: theme.spacing.screenPadding,
    paddingVertical: 14,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  headerTitle: { fontSize: 20, fontFamily: 'Cairo_700Bold', fontWeight: '700', color: theme.colors.text },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.screenPadding,
    paddingVertical: 10,
    backgroundColor: theme.colors.surface,
    gap: 8,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surfaceAlt,
  },
  tabItemActive: { backgroundColor: theme.colors.primary },
  tabText: { fontSize: 14, fontFamily: 'Cairo_600SemiBold', fontWeight: '600', color: theme.colors.textSecondary },
  tabTextActive: { color: '#fff' },
  tabBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.textMuted + '30',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  tabBadgeActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  tabBadgeText: { fontSize: 11, fontFamily: 'Cairo_700Bold', fontWeight: '700', color: theme.colors.textSecondary },
  tabBadgeTextActive: { color: '#fff' },
  loader: { flex: 1 },
  listContent: { padding: theme.spacing.screenPadding, paddingBottom: 32 },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadow.card,
  },
  cardAvailable: { borderWidth: 2, borderColor: theme.colors.primary + '40' },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  cardTopLeft: {},
  orderNum: { fontSize: 16, fontFamily: 'Cairo_700Bold', fontWeight: '700', color: theme.colors.text },
  cardDate: { fontSize: 11, fontFamily: 'Cairo_400Regular', color: theme.colors.textMuted, marginTop: 1 },
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, fontFamily: 'Cairo_600SemiBold', fontWeight: '600' },
  storeName: { fontSize: 15, fontFamily: 'Cairo_600SemiBold', fontWeight: '600', color: theme.colors.text, marginBottom: 2 },
  addrText: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: theme.colors.textSecondary, marginBottom: 8 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  totalText: { fontSize: 16, fontFamily: 'Cairo_800ExtraBold', fontWeight: '800', color: theme.colors.text },
  cardAction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { fontSize: 13, fontFamily: 'Cairo_600SemiBold', fontWeight: '600', color: theme.colors.primary },
  empty: { paddingVertical: 48, alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontFamily: 'Cairo_600SemiBold', fontWeight: '600', color: theme.colors.text, marginTop: theme.spacing.md },
  emptySub: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: theme.colors.textSecondary, marginTop: 4, textAlign: 'center', paddingHorizontal: 32 },
});
