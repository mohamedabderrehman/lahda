import { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useRouter } from 'expo-router';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../api/client';
import { theme } from '../constants/theme';
import {
  IconAlertOutline,
  IconCheckmarkOutline,
  IconBoxOutline,
  IconStoreOutline,
  IconCarOutline,
  IconPackageOutline,
  IconPersonOutline,
  IconReceiptOutline,
  IconClockOutline,
} from '../components/Icons';

type NotifItem = {
  id: string;
  title: string;
  body: string;
  type: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
};

const TYPE_ICON_COMPONENTS: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  new_order: IconAlertOutline,
  order_accepted: IconCheckmarkOutline,
  order_rejected: IconAlertOutline,
  order_preparing: IconBoxOutline,
  order_ready: IconPackageOutline,
  order_picked_up: IconStoreOutline,
  order_on_the_way: IconCarOutline,
  order_delivered: IconCheckmarkOutline,
  delivery_available: IconCarOutline,
  delivery_offer: IconCarOutline,
  driver_assigned: IconPersonOutline,
  general: IconReceiptOutline,
};

export default function NotificationsScreen() {
  const navRouter = useRouter();
  const [items, setItems] = useState<NotifItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await getNotifications();
      setItems(Array.isArray(res) ? res : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handlePress = useCallback(async (item: NotifItem) => {
    if (!item.isRead) {
      markNotificationRead(item.id).catch(() => {});
      setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)));
    }
    if (item.data?.orderId) {
      navRouter.push(`/order/${item.data.orderId}`);
    }
  }, [navRouter]);

  const handleMarkAllRead = useCallback(async () => {
    markAllNotificationsRead().catch(() => {});
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }, []);

  const formatDate = (raw: string) => {
    try {
      const d = new Date(raw);
      const now = new Date();
      const diff = now.getTime() - d.getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return 'الآن';
      if (mins < 60) return `منذ ${mins} دقيقة`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `منذ ${hours} ساعة`;
      const days = Math.floor(hours / 24);
      if (days < 7) return `منذ ${days} يوم`;
      return d.toLocaleDateString('ar-IQ', { month: 'short', day: 'numeric' });
    } catch { return ''; }
  };

  const unreadCount = items.filter((n) => !n.isRead).length;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navRouter.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← رجوع</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>الإشعارات</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAllRead} style={styles.markAllBtn}>
            <Text style={styles.markAllText}>قراءة الكل</Text>
          </TouchableOpacity>
        )}
        {unreadCount === 0 && <View style={{ width: 70 }} />}
      </View>

      {loading && items.length === 0 ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={theme.colors.primary} />}
          renderItem={({ item }) => {
            const IconComponent = TYPE_ICON_COMPONENTS[item.type] ?? TYPE_ICON_COMPONENTS.general;
            return (
              <TouchableOpacity
                style={[styles.card, !item.isRead && styles.cardUnread]}
                onPress={() => handlePress(item)}
                activeOpacity={0.85}
              >
                <View style={styles.cardIcon}>
                  <IconComponent size={20} color={theme.colors.primary} />
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.cardBody} numberOfLines={2}>{item.body}</Text>
                  <Text style={styles.cardTime}>{formatDate(item.createdAt)}</Text>
                </View>
                {!item.isRead && <View style={styles.unreadDot} />}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIconContainer}>
                <IconClockOutline size={48} color={theme.colors.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>لا توجد إشعارات</Text>
              <Text style={styles.emptySub}>ستظهر الإشعارات هنا عند وصولها</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.screenPadding,
    paddingVertical: 12,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  backBtn: { padding: 4 },
  backText: { fontSize: 15, fontFamily: 'Cairo_600SemiBold', fontWeight: '600', color: theme.colors.primary },
  headerTitle: { fontSize: 18, fontFamily: 'Cairo_700Bold', fontWeight: '700', color: theme.colors.text },
  markAllBtn: { padding: 4 },
  markAllText: { fontSize: 13, fontFamily: 'Cairo_600SemiBold', fontWeight: '600', color: theme.colors.primary },
  loader: { flex: 1 },
  listContent: { padding: theme.spacing.screenPadding, paddingBottom: 32 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    ...theme.shadow.card,
  },
  cardUnread: { backgroundColor: theme.colors.primary + '08', borderWidth: 1, borderColor: theme.colors.primary + '20' },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: theme.spacing.md,
  },
  iconText: { fontSize: 20 },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 14, fontFamily: 'Cairo_600SemiBold', fontWeight: '600', color: theme.colors.text },
  cardBody: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: theme.colors.textSecondary, marginTop: 2 },
  cardTime: { fontSize: 11, fontFamily: 'Cairo_400Regular', color: theme.colors.textMuted, marginTop: 4 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.primary, marginRight: 4 },
  empty: { paddingVertical: 48, alignItems: 'center' },
  emptyIconContainer: { marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontFamily: 'Cairo_600SemiBold', fontWeight: '600', color: theme.colors.text },
  emptySub: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: theme.colors.textSecondary, marginTop: 4 },
});
