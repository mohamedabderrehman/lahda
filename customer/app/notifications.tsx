import { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../api/client';
import { useTheme } from '../contexts/ThemeContext';
import { CustomerHeader } from '../components/customer-header';
import {
  IconBellOutline,
  IconCheckmarkOutline,
  IconRemove,
  IconBagOutline,
  IconStoreOutline,
  IconCarOutline,
  IconGiftOutline,
  IconUserOutline,
  IconReceipt,
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
  new_order: IconBellOutline,
  order_accepted: IconCheckmarkOutline,
  order_rejected: IconRemove,
  order_preparing: IconBagOutline,
  order_ready: IconGiftOutline,
  order_picked_up: IconStoreOutline,
  order_on_the_way: IconCarOutline,
  order_delivered: IconCheckmarkOutline,
  delivery_available: IconCarOutline,
  driver_assigned: IconUserOutline,
  general: IconReceipt,
};

export default function NotificationsScreen() {
  const t = useTheme();
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
      navRouter.push(`/order/${item.data.orderId}` as never);
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
      return d.toLocaleDateString('ar-DZ', { month: 'short', day: 'numeric' });
    } catch { return ''; }
  };

  const unreadCount = items.filter((n) => !n.isRead).length;
  const s = getStyles(t);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <CustomerHeader title="الإشعارات" action={unreadCount > 0 ? <TouchableOpacity onPress={handleMarkAllRead} style={s.markAllBtn}><Text style={s.markAllText}>قراءة الكل</Text></TouchableOpacity> : undefined} />

      {loading && items.length === 0 ? (
        <ActivityIndicator size="large" color={t.colors.primary} style={s.loader} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={t.colors.primary} />}
          renderItem={({ item }) => {
            const IconComponent = TYPE_ICON_COMPONENTS[item.type] ?? TYPE_ICON_COMPONENTS.general;
            return (
              <TouchableOpacity
                style={[s.card, !item.isRead && s.cardUnread]}
                onPress={() => handlePress(item)}
                activeOpacity={0.85}
              >
                <View style={s.cardIcon}>
                  <IconComponent size={20} color={t.colors.primary} />
                </View>
                <View style={s.cardContent}>
                  <Text style={s.cardTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={s.cardBody} numberOfLines={2}>{item.body}</Text>
                  <Text style={s.cardTime}>{formatDate(item.createdAt)}</Text>
                </View>
                {!item.isRead && <View style={s.unreadDot} />}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={s.empty}>
              <View style={s.emptyIconContainer}>
                <IconClockOutline size={48} color={t.colors.textMuted} />
              </View>
              <Text style={s.emptyTitle}>لا توجد إشعارات</Text>
              <Text style={s.emptySub}>ستظهر الإشعارات هنا عند وصولها</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

function getStyles(t: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: t.spacing.screenPadding,
      paddingVertical: t.spacing.lg,
      backgroundColor: t.colors.surface,
    },
    backBtn: { padding: t.spacing.md },
    backText: { ...t.typography.body, fontFamily: t.fonts.medium, color: t.colors.text },
    headerTitle: { flex: 1, ...t.typography.titleLarge, color: t.colors.text, textAlign: 'center' },
    markAllBtn: { padding: t.spacing.md },
    markAllText: { ...t.typography.caption, fontFamily: t.fonts.medium, color: t.colors.primary },
    loader: { flex: 1 },
    listContent: { padding: t.spacing.screenPadding, paddingBottom: t.spacing.xxl + t.spacing.sm },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'transparent',
      borderRadius: 0,
      paddingVertical: t.spacing.lg,
      paddingHorizontal: 0,
      marginBottom: t.spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: t.colors.borderLight,
    },
    cardUnread: { backgroundColor: t.colors.primary + '06' },
    cardIcon: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: t.colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: t.spacing.md,
    },
    iconText: { fontSize: 20 },
    cardContent: { flex: 1 },
    cardTitle: { ...t.typography.body, fontFamily: t.fonts.bold, color: t.colors.text },
    cardBody: { ...t.typography.caption, color: t.colors.textMuted, marginTop: t.spacing.xs },
    cardTime: { ...t.typography.caption, fontSize: 11, color: t.colors.textMuted, marginTop: t.spacing.xs },
    unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: t.colors.warning, marginRight: t.spacing.xs },
    empty: { paddingVertical: t.spacing.xxl * 2, alignItems: 'center' },
    emptyIconContainer: { marginBottom: t.spacing.md },
    emptyTitle: { ...t.typography.body, fontFamily: t.fonts.medium, color: t.colors.text },
    emptySub: { ...t.typography.caption, color: t.colors.textSecondary, marginTop: t.spacing.xs },
  });
}
