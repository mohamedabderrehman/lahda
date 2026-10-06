import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { getMerchantOrders, merchantAcceptOrder, merchantRejectOrder } from '../../api/client';
import { formatPrice, theme } from '../../constants/theme';
import { IconReceiptOutline } from '../../components/Icons';
import { Card, CardSection } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { SectionHeader } from '../../components/ui/SectionHeader';
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

type OrderItem = {
  id: string;
  orderNumber: string;
  status: string;
  total: number | string;
  customer?: { fullName?: string; phone?: string };
  createdAt?: string;
};

const FILTERS = [
  { key: '', label: 'الكل' },
  { key: 'pending', label: 'قيد الانتظار' },
  { key: 'accepted_by_merchant', label: 'مقبول' },
  { key: 'preparing', label: 'قيد التحضير' },
  { key: 'ready_for_pickup', label: 'جاهز للاستلام' },
  { key: 'delivered', label: 'تم التوصيل' },
];

export default function MerchantOrdersScreen() {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('');
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await getMerchantOrders(filter || undefined);
      setOrders((res as OrderItem[]) || []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

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
      const relevantTypes = ['new_order', 'order_accepted', 'order_rejected', 'order_preparing', 'order_ready', 'driver_assigned', 'order_picked_up', 'order_on_the_way', 'order_delivered'];
      if (payload.type && relevantTypes.includes(payload.type)) {
        load(true);
      }
    });
    return () => { unsubscribe(); };
  }, [load]);

  const statusVariant = (status: string) => {
    if (status === 'pending') return 'pink';
    if (status === 'preparing') return 'warning';
    if (status === 'ready_for_pickup') return 'purple';
    if (status === 'delivered') return 'success';
    if (status === 'cancelled') return 'danger';
    return 'neutral';
  };

  const timeAgoAr = (raw?: string) => {
    if (!raw) return '—';
    const d = new Date(raw);
    const diffMs = Date.now() - d.getTime();
    const m = Math.max(0, Math.floor(diffMs / 60000));
    if (m < 1) return 'الآن';
    if (m < 60) return `منذ ${m} دقيقة`;
    const h = Math.floor(m / 60);
    if (h < 24) return `منذ ${h} ساعة`;
    const days = Math.floor(h / 24);
    return `منذ ${days} يوم`;
  };

  const accept = useCallback(async (id: string) => {
    if (actingId) return;
    setActingId(id);
    try {
      await merchantAcceptOrder(id);
      await load(true);
    } catch (e: unknown) {
      Alert.alert('خطأ', (e as Error).message || 'فشل قبول الطلب');
    } finally {
      setActingId(null);
    }
  }, [actingId, load]);

  const reject = useCallback((id: string) => {
    if (actingId) return;
    Alert.alert('رفض الطلب', 'هل تريد رفض هذا الطلب؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'رفض',
        style: 'destructive',
        onPress: async () => {
          setActingId(id);
          try {
            await merchantRejectOrder(id);
            await load(true);
          } catch (e: unknown) {
            Alert.alert('خطأ', (e as Error).message || 'فشل رفض الطلب');
          } finally {
            setActingId(null);
          }
        },
      },
    ]);
  }, [actingId, load]);

  const counts = useMemo(() => ({
    pending: orders.filter((o) => o.status === 'pending').length,
    preparing: orders.filter((o) => o.status === 'preparing').length,
    ready: orders.filter((o) => o.status === 'ready_for_pickup').length,
  }), [orders]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>الطلبات</Text>
        <Text style={styles.headerSub}>
          {counts.pending ? `${counts.pending} جديد` : '—'} · {counts.preparing ? `${counts.preparing} تحضير` : '—'} · {counts.ready ? `${counts.ready} جاهز` : '—'}
        </Text>
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={theme.colors.primary} />}
        ListHeaderComponent={
          <View style={{ gap: 12 }}>
            <Card>
              <CardSection>
                <SectionHeader title="فلترة" subtitle="اختر حالة لعرض الطلبات" />
                <View style={styles.filters}>
                  {FILTERS.map((f) => (
                    <TouchableOpacity
                      key={f.key}
                      style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
                      onPress={() => setFilter(f.key)}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.filterChipText, filter === f.key && styles.filterChipTextActive]}>{f.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </CardSection>
            </Card>
          </View>
        }
        renderItem={({ item }) => {
          const pending = item.status === 'pending';
          const acting = actingId === item.id;
          return (
            <Card style={[styles.orderCard, pending && styles.orderCardPending]}>
              <CardSection style={{ paddingBottom: 14 }}>
                <View style={styles.rowTop}>
                  <Text style={styles.orderNum}>طلب #{item.orderNumber}</Text>
                  <Badge label={STATUS_LABELS[item.status] ?? item.status} variant={statusVariant(item.status) as any} />
                </View>
                <Text style={styles.customerLine} numberOfLines={1}>
                  {item.customer?.fullName ?? '—'}{item.customer?.phone ? ` · ${item.customer.phone}` : ''} · {timeAgoAr(item.createdAt)}
                </Text>
                <View style={styles.rowBottom}>
                  <Text style={styles.total}>{formatPrice(item.total)}</Text>
                  <TouchableOpacity onPress={() => router.push(`/order/${item.id}`)} activeOpacity={0.85}>
                    <Text style={styles.detailsLink}>عرض التفاصيل ←</Text>
                  </TouchableOpacity>
                </View>

                {pending && (
                  <View style={styles.inlineActions}>
                    <Button title="قبول" onPress={() => accept(item.id)} loading={acting} variant="primary" style={{ flex: 1 }} />
                    <Button title="رفض" onPress={() => reject(item.id)} disabled={acting} variant="danger" style={{ flex: 1 }} />
                  </View>
                )}
              </CardSection>
            </Card>
          );
        }}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
          ) : (
            <Card style={{ marginTop: 16 }}>
              <EmptyState
                title="لا توجد طلبات"
                subtitle="عندما يصل طلب جديد سيظهر هنا. اسحب للأسفل للتحديث."
                action={<IconReceiptOutline size={44} color={theme.colors.textMuted} />}
              />
            </Card>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    paddingHorizontal: theme.spacing.screenPadding,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  headerTitle: { fontSize: 20, fontWeight: '900', fontFamily: 'Cairo_900Black', color: theme.colors.text, textAlign: 'right' },
  headerSub: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: theme.colors.textSecondary, textAlign: 'right', marginTop: 2 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: theme.spacing.md, justifyContent: 'flex-end' },
  filterChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surfaceAlt,
  },
  filterChipActive: { backgroundColor: theme.colors.primary },
  filterChipText: { fontSize: 13, fontWeight: '800', fontFamily: 'Cairo_800ExtraBold', color: theme.colors.textSecondary },
  filterChipTextActive: { color: theme.colors.white },
  loader: { marginTop: 30 },
  listContent: { padding: theme.spacing.screenPadding, paddingBottom: 40, gap: 12 },
  orderCard: { marginTop: 12 },
  orderCardPending: { borderColor: theme.colors.accentPink + '55' },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  orderNum: { fontSize: 16, fontWeight: '900', fontFamily: 'Cairo_900Black', color: theme.colors.text, textAlign: 'right', flex: 1 },
  customerLine: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: theme.colors.textSecondary, marginTop: 8, textAlign: 'right' },
  rowBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  total: { fontSize: 16, fontWeight: '900', fontFamily: 'Cairo_900Black', color: theme.colors.text },
  detailsLink: { fontSize: 13, fontWeight: '900', fontFamily: 'Cairo_900Black', color: theme.colors.primaryDark },
  inlineActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
});
