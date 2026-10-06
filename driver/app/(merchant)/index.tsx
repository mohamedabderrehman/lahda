import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { getMyStore, getMerchantOrders, updateMyStore } from '../../api/client';
import { theme, formatPrice } from '../../constants/theme';
import { MerchantDashboardStats } from '../../components/MerchantStats';
import { MerchantChart } from '../../components/MerchantChart';
import {
  IconStoreOutline,
  IconReceiptOutline,
  IconCashOutline,
  IconChartOutline,
  IconWalletOutline,
  IconPackageOutline,
  IconStarOutline,
  IconAlertOutline,
  IconArrowForward,
  IconCheckmarkOutline,
  IconTicketOutline,
} from '../../components/Icons';
import { Card, CardSection } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { addNotificationListener } from '../../hooks/useNotifications';

type Store = {
  id?: string;
  storeName?: string;
  isApproved?: boolean;
  isOpen?: boolean;
  logoUrl?: string | null;
  coverUrl?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  ratingAvg?: number;
  ratingCount?: number;
  products?: Array<{ id: string; isAvailable?: boolean }>;
};

type OrderItem = {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  createdAt?: string;
  deliveredAt?: string | null;
  customer?: { fullName?: string; phone?: string };
};

export default function MerchantHomeScreen() {
  const [store, setStore] = useState<Store | null>(null);
  const [ordersPending, setOrdersPending] = useState<OrderItem[]>([]);
  const [ordersPreparing, setOrdersPreparing] = useState<OrderItem[]>([]);
  const [ordersReady, setOrdersReady] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [storeRes, pendingRes, preparingRes, readyRes] = await Promise.all([
        getMyStore(),
        getMerchantOrders('pending'),
        getMerchantOrders('preparing'),
        getMerchantOrders('ready_for_pickup'),
      ]);
      setStore(storeRes as Store);
      setOrdersPending((pendingRes as OrderItem[]) || []);
      setOrdersPreparing((preparingRes as OrderItem[]) || []);
      setOrdersReady((readyRes as OrderItem[]) || []);
    } catch {
      setStore(null);
      setOrdersPending([]);
      setOrdersPreparing([]);
      setOrdersReady([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

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

  const products = store?.products ?? [];
  const productsTotal = products.length;
  const productsAvailable = products.filter((p) => p.isAvailable !== false).length;
  const needsLocation = !Number.isFinite(store?.latitude ?? NaN) || !Number.isFinite(store?.longitude ?? NaN);
  const needsLogo = !store?.logoUrl;
  const needsProducts = productsTotal === 0;
  const name = store?.storeName ?? 'متجري';
  const isApproved = store?.isApproved !== false;
  const isOpen = store?.isOpen !== false;
  const pendingCount = ordersPending.length;
  const totalActive = ordersPending.length + ordersPreparing.length + ordersReady.length;

  const handleToggleOpen = (value: boolean) => {
    setStore((s) => (s ? { ...s, isOpen: value } : null));
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

  if (loading && !store) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>لوحة التحكم</Text>
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
          <Text style={styles.headerName}>{name}</Text>
        </View>
        <View style={styles.headerRight}>
          {store?.ratingAvg != null && (
            <View style={styles.ratingBadge}>
              <IconStarOutline size={14} color={theme.colors.accentAmber} />
              <Text style={styles.ratingText}>{store.ratingAvg.toFixed(1)}</Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={theme.colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Approval Warning */}
        {!isApproved && (
          <View style={styles.warningCard}>
            <View style={styles.warningIcon}>
              <IconAlertOutline size={20} color={theme.colors.accentAmber} />
            </View>
            <Text style={styles.warningText}>حسابك قيد المراجعة. سيتم إعلامك عند الموافقة.</Text>
          </View>
        )}

        {/* Stats Section with Toggle */}
        <View style={styles.section}>
          <MerchantDashboardStats isOpen={isOpen} onToggleOpen={handleToggleOpen} />
        </View>

        {/* Weekly Chart */}
        <View style={styles.section}>
          <MerchantChart />
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <SectionHeader title="الإجراءات السريعة" />
          <View style={styles.quickActionsGrid}>
            <QuickActionTile
              icon={<IconReceiptOutline size={22} color={theme.colors.white} />}
              label="الطلبات"
              count={totalActive}
              color={theme.colors.primary}
              onPress={() => router.push('/(merchant)/orders')}
            />
            <QuickActionTile
              icon={<IconPackageOutline size={22} color={theme.colors.white} />}
              label="المنتجات"
              count={productsTotal}
              color={theme.colors.accentPurple}
              onPress={() => router.push('/(merchant)/products')}
            />
            <QuickActionTile
              icon={<IconWalletOutline size={22} color={theme.colors.white} />}
              label="المالية"
              color={theme.colors.success}
              onPress={() => router.push('/(merchant)/finance')}
            />
            <QuickActionTile
              icon={<IconTicketOutline size={22} color={theme.colors.white} />}
              label="أكواد الخصم"
              color={theme.colors.accentPurple}
              onPress={() => router.push('/(merchant)/account/promo-codes')}
            />
            <QuickActionTile
              icon={<IconStoreOutline size={22} color={theme.colors.white} />}
              label="الإعدادات"
              color={theme.colors.accentAmber}
              onPress={() => router.push('/(merchant)/account/store')}
            />
          </View>
        </View>

        {/* Setup Checklist */}
        {(needsLocation || needsLogo || needsProducts) && (
          <Card style={styles.checklistCard}>
            <CardSection>
              <SectionHeader
                title="إكمال إعداد المتجر"
                subtitle="أكمل هذه الخطوات لبدء استقبال الطلبات"
                right={<IconAlertOutline size={24} color={theme.colors.accentAmber} />}
              />
              <View style={styles.checklistContainer}>
                <CheckItem
                  done={!needsLogo}
                  title="إضافة شعار المتجر"
                  subtitle="يظهر الشعار للعملاء في التطبيق"
                  onPress={() => router.push('/(merchant)/account/media-location')}
                />
                <CheckItem
                  done={!needsLocation}
                  title="تحديد موقع المتجر"
                  subtitle="مطلوب لحساب رسوم التوصيل بدقة"
                  onPress={() => router.push('/(merchant)/account/media-location')}
                />
                <CheckItem
                  done={!needsProducts}
                  title="إضافة منتجاتك الأولى"
                  subtitle={needsProducts ? 'ابدأ بإضافة منتج واحد على الأقل' : `${productsTotal} منتج تم إضافته`}
                  onPress={() => router.push('/(merchant)/products')}
                />
              </View>
            </CardSection>
          </Card>
        )}

        {/* Pending Orders */}
        {pendingCount > 0 && (
          <Card style={styles.pendingCard}>
            <CardSection>
              <SectionHeader
                title={`طلبات بحاجة لإجراء (${pendingCount})`}
                subtitle="طلبات بانتظار قبولك"
                right={<Badge label="جديد" variant="pink" />}
              />
              <View style={styles.ordersList}>
                {ordersPending.slice(0, 3).map((o) => (
                  <TouchableOpacity
                    key={o.id}
                    style={styles.orderRow}
                    activeOpacity={0.9}
                    onPress={() => router.push(`/order/${o.id}`)}
                  >
                    <View style={styles.orderLeft}>
                      <Text style={styles.orderTitle}>طلب #{o.orderNumber}</Text>
                      <Text style={styles.orderSub} numberOfLines={1}>
                        {o.customer?.fullName ?? '—'} · {timeAgoAr(o.createdAt)}
                      </Text>
                    </View>
                    <View style={styles.orderRight}>
                      <Text style={styles.orderPrice}>{formatPrice(o.total)}</Text>
                      <View style={styles.orderBadge}>
                        <Text style={styles.orderBadgeText}>بانتظار القبول</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
              {pendingCount > 3 && (
                <Button
                  title={`عرض ${pendingCount - 3} طلب إضافي`}
                  onPress={() => router.push('/(merchant)/orders')}
                  variant="secondary"
                  style={{ marginTop: theme.spacing.md }}
                />
              )}
            </CardSection>
          </Card>
        )}

        {/* Empty State */}
        {pendingCount === 0 && (
          <Card style={styles.emptyStateCard}>
            <CardSection>
              <EmptyState
                title="لا توجد طلبات جديدة"
                subtitle="عندما يصل طلب جديد سيظهر هنا مع تنبيه"
                action={
                  <Button
                    title="عرض كل الطلبات"
                    onPress={() => router.push('/(merchant)/orders')}
                    variant="secondary"
                    style={{ marginTop: theme.spacing.md }}
                  />
                }
              />
            </CardSection>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function CheckItem({ done, title, subtitle, onPress }: { done: boolean; title: string; subtitle: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.checkItem, done && styles.checkItemDone]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.checkCircle, done && styles.checkCircleDone]}>
        {done && <IconCheckmarkOutline size={16} color="#fff" />}
      </View>
      <View style={styles.checkText}>
        <Text style={[styles.checkTitle, done && styles.checkTitleDone]}>{title}</Text>
        <Text style={styles.checkSubtitle}>{subtitle}</Text>
      </View>
      <IconArrowForward size={18} color={theme.colors.textMuted} style={{ transform: [{ rotate: '180deg' }] }} />
    </TouchableOpacity>
  );
}

function QuickActionTile({
  icon,
  label,
  count,
  color,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  count?: number;
  color: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.quickTile} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.quickIconWrap, { backgroundColor: color }]}>{icon}</View>
      <Text style={styles.quickLabel}>{label}</Text>
      {count !== undefined && <Text style={styles.quickCount}>{count}</Text>}
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
  content: { padding: theme.spacing.screenPadding, paddingBottom: 40 },
  section: { marginTop: 0 },

  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: '#F59E0B40',

  },
  warningIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningText: { flex: 1, fontSize: 14, fontFamily: 'Cairo_500Medium', color: '#92400e', textAlign: 'right', marginLeft: 10 },

  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickTile: {
    width: '23%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    marginBottom: 10,
    ...theme.shadow.card,
  },
  quickIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickLabel: { fontSize: 11, fontFamily: 'Cairo_500Medium', color: theme.colors.textSecondary, textAlign: 'center' },
  quickCount: { fontSize: 16, fontFamily: 'Cairo_700Bold', fontWeight: '700', color: theme.colors.primary, marginTop: 2 },

  checklistCard: { borderColor: theme.colors.accentAmber + '66' },
  checklistContainer: { marginTop: theme.spacing.md },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',

    backgroundColor: theme.colors.surfaceAlt,
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  checkItemDone: {
    opacity: 0.7,
    backgroundColor: theme.colors.background,
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: theme.colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleDone: {
    backgroundColor: theme.colors.success,
    borderColor: theme.colors.success,
  },
  checkmark: {
    fontSize: 16,
    color: theme.colors.white,
    fontWeight: '700',
  },
  checkText: { flex: 1 },
  checkTitle: { fontSize: 15, fontFamily: 'Cairo_600SemiBold', fontWeight: '600', color: theme.colors.text, textAlign: 'right' },
  checkTitleDone: { color: theme.colors.textSecondary, textDecorationLine: 'line-through' },
  checkSubtitle: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: theme.colors.textMuted, textAlign: 'right', marginTop: 2 },

  pendingCard: { borderColor: theme.colors.accentPink + '66' },
  ordersList: { marginTop: theme.spacing.md },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  orderLeft: { flex: 1, marginRight: theme.spacing.md },
  orderRight: { alignItems: 'flex-end' },
  orderTitle: { fontSize: 15, fontFamily: 'Cairo_700Bold', fontWeight: '700', color: theme.colors.text, textAlign: 'right' },
  orderSub: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: theme.colors.textSecondary, marginTop: 3, textAlign: 'right' },
  orderPrice: { fontSize: 14, fontFamily: 'Cairo_700Bold', fontWeight: '700', color: theme.colors.primary, marginBottom: 4 },
  orderBadge: {
    backgroundColor: theme.colors.accentPink + '15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  orderBadgeText: {
    fontSize: 11,
    fontFamily: 'Cairo_600SemiBold',
    fontWeight: '600',
    color: theme.colors.accentPink,
  },

  emptyStateCard: {},
});
