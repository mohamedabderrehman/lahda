import { useCallback, useEffect, useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { getDriverEarnings } from '../../api/client';
import { formatPrice } from '../../constants/theme';
import { theme } from '../../constants/theme';
import { IconCashOutline, IconTimeOutline } from '../../components/Icons';

type EarningItem = {
  id: string;
  amount: number;
  orderId?: string;
  order?: { orderNumber?: string };
  createdAt?: string;
  status?: string;
};

type EarningsData = {
  total: number;
  pending: number;
  earnings: EarningItem[];
};

type Period = 'all' | 'today' | 'week';

export default function DriverEarningsScreen() {
  const [data, setData] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<Period>('all');

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await getDriverEarnings();
      setData(res as EarningsData);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const formatDate = (raw?: string) => {
    if (!raw) return '—';
    try {
      const d = new Date(raw);
      return d.toLocaleDateString('ar-IQ', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return raw; }
  };

  const filteredList = useMemo(() => {
    const list = data?.earnings ?? [];
    if (period === 'all') return list;
    const now = new Date();
    const start = new Date(now);
    if (period === 'today') {
      start.setHours(0, 0, 0, 0);
    } else {
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
    }
    return list.filter((e) => {
      if (!e.createdAt) return false;
      return new Date(e.createdAt) >= start;
    });
  }, [data?.earnings, period]);

  const filteredTotal = useMemo(() => filteredList.reduce((s, e) => s + Number(e.amount ?? 0), 0), [filteredList]);

  const total = data?.total ?? 0;
  const pending = data?.pending ?? 0;
  const paid = total - pending;

  if (loading && !data) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>الأرباح</Text>
        </View>
        <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
      </SafeAreaView>
    );
  }

  const periods: { key: Period; label: string }[] = [
    { key: 'today', label: 'اليوم' },
    { key: 'week', label: 'الأسبوع' },
    { key: 'all', label: 'الكل' },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>الأرباح</Text>
      </View>

      <FlatList
        data={filteredList}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={theme.colors.primary} />}
        ListHeaderComponent={
          <>
            {/* Main stat */}
            <View style={styles.mainStat}>
              <View style={styles.mainIconWrap}>
                <IconCashOutline size={32} color="#fff" />
              </View>
              <Text style={styles.mainLabel}>إجمالي الأرباح</Text>
              <Text style={styles.mainValue}>{formatPrice(total)}</Text>
              <View style={styles.statRow}>
                <View style={styles.statItem}>
                  <View style={[styles.statDot, { backgroundColor: theme.colors.success }]} />
                  <Text style={styles.statSmLabel}>مُحصّل</Text>
                  <Text style={styles.statSmValue}>{formatPrice(paid)}</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <View style={[styles.statDot, { backgroundColor: theme.colors.warning }]} />
                  <Text style={styles.statSmLabel}>قيد التحصيل</Text>
                  <Text style={styles.statSmValue}>{formatPrice(pending)}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.codBtn} onPress={() => router.push('/daily-cod')} activeOpacity={0.85}>
                <Text style={styles.codBtnText}>التسوية اليومية (COD)</Text>
              </TouchableOpacity>
            </View>

            {/* Period filter */}
            <View style={styles.periodRow}>
              {periods.map((p) => {
                const active = period === p.key;
                return (
                  <TouchableOpacity
                    key={p.key}
                    style={[styles.periodBtn, active && styles.periodBtnActive]}
                    onPress={() => setPeriod(p.key)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.periodText, active && styles.periodTextActive]}>{p.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {period !== 'all' && (
              <View style={styles.filteredStat}>
                <Text style={styles.filteredLabel}>{period === 'today' ? 'أرباح اليوم' : 'أرباح الأسبوع'}</Text>
                <Text style={styles.filteredValue}>{formatPrice(filteredTotal)}</Text>
              </View>
            )}

            <Text style={styles.sectionTitle}>سجل التوصيلات</Text>
          </>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.rowIconWrap}>
              <IconTimeOutline size={18} color={theme.colors.primary} />
            </View>
            <View style={styles.rowInfo}>
              <Text style={styles.rowOrder}>طلب #{item.order?.orderNumber ?? item.orderId ?? '—'}</Text>
              <Text style={styles.rowDate}>{formatDate(item.createdAt)}</Text>
            </View>
            <Text style={styles.rowAmount}>+{formatPrice(item.amount)}</Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>لا توجد أرباح {period === 'today' ? 'اليوم' : period === 'week' ? 'هذا الأسبوع' : 'مسجلة بعد'}</Text>
          </View>
        }
      />
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
  loader: { flex: 1 },
  listContent: { padding: theme.spacing.screenPadding, paddingBottom: 32 },
  mainStat: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.xl,
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  mainIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  mainLabel: { fontSize: 14, fontFamily: 'Cairo_500Medium', color: 'rgba(255,255,255,0.8)', marginBottom: 2 },
  mainValue: { fontSize: 32, fontFamily: 'Cairo_800ExtraBold', fontWeight: '800', color: '#fff', marginBottom: 12 },
  statRow: { flexDirection: 'row', alignItems: 'center', width: '100%' },
  statItem: { flex: 1, alignItems: 'center' },
  statDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 4 },
  statSmLabel: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: 'rgba(255,255,255,0.7)' },
  statSmValue: { fontSize: 16, fontFamily: 'Cairo_700Bold', fontWeight: '700', color: '#fff', marginTop: 2 },
  statDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.2)' },
  codBtn: {
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: theme.radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  codBtnText: { fontSize: 13, fontFamily: 'Cairo_700Bold', fontWeight: '700', color: '#fff' },
  periodRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: theme.spacing.lg,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    ...theme.shadow.card,
  },
  periodBtnActive: { backgroundColor: theme.colors.text },
  periodText: { fontSize: 14, fontFamily: 'Cairo_600SemiBold', fontWeight: '600', color: theme.colors.textSecondary },
  periodTextActive: { color: '#fff' },
  filteredStat: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.success + '12',
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.success + '30',
  },
  filteredLabel: { fontSize: 14, fontFamily: 'Cairo_600SemiBold', fontWeight: '600', color: theme.colors.text },
  filteredValue: { fontSize: 20, fontFamily: 'Cairo_800ExtraBold', fontWeight: '800', color: theme.colors.success },
  sectionTitle: { fontSize: 16, fontFamily: 'Cairo_700Bold', fontWeight: '700', color: theme.colors.text, marginBottom: theme.spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    ...theme.shadow.card,
  },
  rowIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: theme.colors.primary + '12',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: theme.spacing.md,
  },
  rowInfo: { flex: 1 },
  rowOrder: { fontSize: 14, fontFamily: 'Cairo_600SemiBold', fontWeight: '600', color: theme.colors.text },
  rowDate: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: theme.colors.textSecondary, marginTop: 1 },
  rowAmount: { fontSize: 16, fontFamily: 'Cairo_700Bold', fontWeight: '700', color: theme.colors.success },
  empty: { paddingVertical: 32, alignItems: 'center' },
  emptyText: { fontSize: 15, fontFamily: 'Cairo_400Regular', color: theme.colors.textSecondary },
});
