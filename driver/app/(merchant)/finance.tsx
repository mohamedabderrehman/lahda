import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { getMerchantBalance, getMerchantLedger } from '../../api/client';
import { theme, formatPrice } from '../../constants/theme';
import { IconCashOutline, IconWalletOutline, IconArrowForward } from '../../components/Icons';
import { Card, CardSection } from '../../components/ui/Card';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { Badge } from '../../components/ui/Badge';

type LedgerItem = {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  note?: string;
  createdAt: string;
  order?: { orderNumber: string };
};

export default function MerchantFinanceScreen() {
  const [balance, setBalance] = useState<{ balance: number; credits: number; debits: number; taxPercent?: number; taxAmount?: number; netAfterTax?: number } | null>(null);
  const [ledger, setLedger] = useState<LedgerItem[]>([]);
  const [ledgerTotal, setLedgerTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);

  const load = useCallback(async (isRefresh = false, pageNum = 1) => {
    if (isRefresh) setRefreshing(true);
    else if (pageNum === 1) setLoading(true);

    try {
      const [balanceRes, ledgerRes] = await Promise.all([
        getMerchantBalance(),
        getMerchantLedger(pageNum, 20),
      ]);
      setBalance(balanceRes);
      if (pageNum === 1) {
        setLedger(ledgerRes.items as LedgerItem[]);
      } else {
        setLedger((prev) => [...prev, ...(ledgerRes.items as LedgerItem[])]);
      }
      setLedgerTotal(ledgerRes.total);
    } catch {
      // silent fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const loadMore = () => {
    if (ledger.length < ledgerTotal) {
      const nextPage = page + 1;
      setPage(nextPage);
      load(false, nextPage);
    }
  };

  if (loading && !balance) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>المالية</Text>
        </View>
        <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>المالية والرصيد</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setPage(1); load(true, 1); }} tintColor={theme.colors.primary} />}
      >
        {/* Balance Card */}
        <Card style={styles.balanceCard}>
          <CardSection>
            <View style={styles.balanceHeader}>
              <View style={styles.balanceIconWrap}>
                <IconWalletOutline size={28} color="#fff" />
              </View>
              <View>
                <Text style={styles.balanceLabel}>رصيدك الحالي</Text>
                <Text style={styles.balanceValue}>{formatPrice(balance?.balance ?? 0)}</Text>
              </View>
            </View>

            <View style={styles.balanceDetails}>
              <View style={styles.balanceItem}>
                <Text style={styles.balanceItemLabel}>إجمالي المبيعات</Text>
                <Text style={[styles.balanceItemValue, { color: theme.colors.success }]}>
                  {formatPrice(balance?.credits ?? 0)}
                </Text>
              </View>
              <View style={styles.balanceDivider} />
              <View style={styles.balanceItem}>
                <Text style={styles.balanceItemLabel}>المسحوبات</Text>
                <Text style={[styles.balanceItemValue, { color: theme.colors.error }]}>
                  {formatPrice(balance?.debits ?? 0)}
                </Text>
              </View>
            </View>

            {(balance?.taxPercent != null && balance.taxPercent > 0) && (
              <View style={styles.taxBlock}>
                <Text style={styles.taxLabel}>ضريبة ({balance.taxPercent}%)</Text>
                <Text style={styles.taxValue}>{formatPrice(balance.taxAmount ?? 0)}</Text>
                <Text style={styles.netLabel}>الصافي بعد الضريبة (يصل إليك عند التسوية)</Text>
                <Text style={styles.netValue}>{formatPrice(balance.netAfterTax ?? balance.balance)}</Text>
              </View>
            )}
          </CardSection>
        </Card>

        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <IconCashOutline size={18} color={theme.colors.primary} />
          <Text style={styles.infoBannerText}>
            يتم إضافة رصيدك تلقائياً عند توصيل الطلبات. التسوية تتم عبر الإدارة.
            {balance?.taxPercent != null && balance.taxPercent > 0 && ' عند التسوية تُخصم الضريبة؛ المبلغ الذي يصل إليك = الصافي بعد الضريبة.'}
          </Text>
        </View>

        {/* Ledger */}
        <SectionHeader title="سجل الحركات المالية" subtitle="آخر العمليات على حسابك" />

        {ledger.length === 0 ? (
          <Card>
            <CardSection>
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>لا توجد حركات مالية مسجلة بعد</Text>
                <Text style={styles.emptySub}>
                  ستظهر هنا عمليات الإضافة والتسوية عندما تبدأ باستلام الطلبات
                </Text>
              </View>
            </CardSection>
          </Card>
        ) : (
          <FlatList
            data={ledger}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <View style={styles.ledgerItem}>
                <View style={styles.ledgerRow}>
                  <Badge
                    label={item.type === 'credit' ? 'إضافة' : 'تسوية'}
                    variant={item.type === 'credit' ? 'success' : 'warning'}
                  />
                  <Text style={[styles.ledgerAmount, item.type === 'credit' ? styles.credit : styles.debit]}>
                    {item.type === 'credit' ? '+' : '-'}{formatPrice(item.amount)}
                  </Text>
                </View>
                {item.order && (
                  <Text style={styles.ledgerOrder}>طلب #{item.order.orderNumber}</Text>
                )}
                <Text style={styles.ledgerNote}>{item.note || '—'}</Text>
                <Text style={styles.ledgerDate}>
                  {new Date(item.createdAt).toLocaleDateString('ar-IQ', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            )}
          />
        )}

        {ledger.length < ledgerTotal && (
          <TouchableOpacity style={styles.loadMoreBtn} onPress={loadMore}>
            <Text style={styles.loadMoreText}>تحميل المزيد</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
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
  loader: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: theme.spacing.screenPadding, paddingBottom: 40 },

  balanceCard: {
    backgroundColor: theme.colors.primary,
    borderWidth: 0,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  balanceIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceLabel: { fontSize: 14, fontWeight: '700', fontFamily: 'Cairo_700Bold', color: 'rgba(255,255,255,0.8)', textAlign: 'right' },
  balanceValue: { fontSize: 28, fontWeight: '900', fontFamily: 'Cairo_900Black', color: '#fff', marginTop: 4, textAlign: 'right' },

  balanceDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
  },
  balanceItem: { flex: 1, alignItems: 'center' },
  balanceItemLabel: { fontSize: 12, fontFamily: 'Cairo_500Medium', color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
  balanceItemValue: { fontSize: 16, fontWeight: '800', fontFamily: 'Cairo_800ExtraBold', color: '#fff' },
  balanceDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.2)' },

  taxBlock: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  taxLabel: { fontSize: 12, fontFamily: 'Cairo_500Medium', color: 'rgba(255,255,255,0.7)', textAlign: 'right', marginBottom: 2 },
  taxValue: { fontSize: 14, fontFamily: 'Cairo_700Bold', color: 'rgba(255,255,255,0.9)', textAlign: 'right' },
  netLabel: { fontSize: 12, fontFamily: 'Cairo_600SemiBold', color: 'rgba(255,255,255,0.9)', textAlign: 'right', marginTop: 8, marginBottom: 2 },
  netValue: { fontSize: 18, fontWeight: '800', fontFamily: 'Cairo_800ExtraBold', color: '#fff', textAlign: 'right' },

  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    backgroundColor: theme.colors.primary + '10',
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.primary + '30',
  },
  infoBannerText: { flex: 1, fontSize: 13, fontFamily: 'Cairo_500Medium', color: theme.colors.primary, textAlign: 'right' },

  emptyState: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { fontSize: 16, fontWeight: '700', fontFamily: 'Cairo_700Bold', color: theme.colors.text, marginBottom: 8 },
  emptySub: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: theme.colors.textSecondary, textAlign: 'center' },

  ledgerItem: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    ...theme.shadow.card,
  },
  ledgerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  ledgerAmount: { fontSize: 16, fontWeight: '900', fontFamily: 'Cairo_900Black' },
  credit: { color: theme.colors.success },
  debit: { color: theme.colors.error },
  ledgerOrder: { fontSize: 13, fontFamily: 'Cairo_600SemiBold', color: theme.colors.text, marginBottom: 4, textAlign: 'right' },
  ledgerNote: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: theme.colors.textSecondary, textAlign: 'right', marginBottom: 4 },
  ledgerDate: { fontSize: 11, fontFamily: 'Cairo_400Regular', color: theme.colors.textMuted, textAlign: 'right' },

  loadMoreBtn: {
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  loadMoreText: { fontSize: 14, fontFamily: 'Cairo_600SemiBold', color: theme.colors.primary },
});
