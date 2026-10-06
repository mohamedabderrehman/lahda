import { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { getCodEligibleOrders, createRemittance, getMyRemittances } from '../api/client';
import { theme } from '../constants/theme';
import { IconArrowForward } from '../components/Icons';

interface CodOrder {
  id: string;
  orderNumber: string;
  subtotal: number;
  appFee: number;
  deliveryFee: number;
  total: number;
  deliveredAt: string;
}

interface DailySummary {
  orders: CodOrder[];
  summary: {
    ordersCount: number;
    subtotalSum: number;
    appFeeSum: number;
    deliveryFeeSum: number;
    amountDueToAdmin: number;
  };
}

interface Remittance {
  id: string;
  date: string;
  status: 'draft' | 'submitted' | 'confirmed';
  ordersCount: number;
  amountDueToAdmin: number;
  submittedAt?: string;
  confirmedAt?: string;
}

function formatPrice(amount: number): string {
  return amount.toLocaleString('ar-IQ') + ' د.ع';
}

function getTodayString(): string {
  const now = new Date();
  const tzOffsetMs = now.getTimezoneOffset() * 60 * 1000;
  return new Date(now.getTime() - tzOffsetMs).toISOString().split('T')[0];
}

export default function DailyCodScreen() {
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [eligibleData, setEligibleData] = useState<DailySummary | null>(null);
  const [remittances, setRemittances] = useState<Remittance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [eligible, myRemittances] = await Promise.all([
        getCodEligibleOrders(selectedDate),
        getMyRemittances(),
      ]);
      setEligibleData(eligible);
      setRemittances(myRemittances);
    } catch (e) {
      console.error('Failed to load COD data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedDate]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleCreateRemittance = async () => {
    if (!eligibleData || eligibleData.orders.length === 0) {
      Alert.alert('لا توجد طلبات', 'لا توجد طلبات مستحقة للتسوية في هذا اليوم');
      return;
    }

    setSubmitting(true);
    try {
      await createRemittance(selectedDate);
      Alert.alert('تم', 'تم إنشاء سند التسوية بنجاح');
      load(true);
    } catch (e: unknown) {
      Alert.alert('خطأ', (e as Error).message || 'فشل إنشاء سند التسوية');
    } finally {
      setSubmitting(false);
    }
  };

  // Check if already submitted for this date
  const existingRemittance = remittances.find(r => r.date === selectedDate);
  const isSubmitted = !!existingRemittance;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <IconArrowForward size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>تسوية يومية (COD)</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={theme.colors.primary} />}
      >
        {/* Date Selector */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>اختر التاريخ</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => {
              // Simple date selection - toggle between today and yesterday
              const today = getTodayString();
              const yesterday = new Date();
              yesterday.setDate(yesterday.getDate() - 1);
              const yesterdayStr = yesterday.toISOString().split('T')[0];
              setSelectedDate(selectedDate === today ? yesterdayStr : today);
            }}
          >
            <Text style={styles.dateText}>{selectedDate === getTodayString() ? 'اليوم' : selectedDate}</Text>
          </TouchableOpacity>
        </View>

        {/* Summary Card */}
        {eligibleData && eligibleData.orders.length > 0 && (
          <View style={[styles.card, styles.highlightCard]}>
            <Text style={styles.cardTitle}>ملخص الطلبات</Text>

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>عدد الطلبات</Text>
              <Text style={styles.statValue}>{eligibleData.summary.ordersCount}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>مبلغ الطلبات (subtotal)</Text>
              <Text style={styles.statValue}>{formatPrice(eligibleData.summary.subtotalSum)}</Text>
            </View>

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>رسوم التطبيق</Text>
              <Text style={styles.statValue}>{formatPrice(eligibleData.summary.appFeeSum)}</Text>
            </View>

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>أجور التوصيل (لك)</Text>
              <Text style={[styles.statValue, styles.positive]}>{formatPrice(eligibleData.summary.deliveryFeeSum)}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.statRow}>
              <Text style={styles.statLabelBold}>المبلغ المستلم من العملاء</Text>
              <Text style={styles.statValueBold}>
                {formatPrice(eligibleData.summary.subtotalSum + eligibleData.summary.appFeeSum + eligibleData.summary.deliveryFeeSum)}
              </Text>
            </View>

            <View style={styles.statRow}>
              <Text style={[styles.statLabelBold, styles.warning]}>المبلغ الواجب تسليمه للإدارة</Text>
              <Text style={[styles.statValueBold, styles.warning]}>
                {formatPrice(eligibleData.summary.amountDueToAdmin)}
              </Text>
            </View>
          </View>
        )}

        {/* Empty State */}
        {eligibleData && eligibleData.orders.length === 0 && (
          <View style={[styles.card, styles.emptyCard]}>
            <Text style={styles.emptyText}>لا توجد طلبات مستحقة للتسوية في هذا اليوم</Text>
            <Text style={styles.emptySub}>
              يتم عرض الطلبات التي:\n• تم توصيلها بنجاح\n• الدفع عند الاستلام\n• لم يتم تسويتها بعد
            </Text>
          </View>
        )}

        {/* Action Button */}
        {eligibleData && eligibleData.orders.length > 0 && !isSubmitted && (
          <TouchableOpacity
            style={[styles.actionBtn, submitting && styles.actionBtnDisabled]}
            onPress={handleCreateRemittance}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.actionBtnText}>إنشاء سند تسوية</Text>
            )}
          </TouchableOpacity>
        )}

        {isSubmitted && existingRemittance && (
          <View style={[styles.card, styles.submittedCard]}>
            <Text style={styles.submittedTitle}>تم إنشاء السند</Text>
            <Text style={styles.submittedText}>
              تم إنشاء سند التسوية لهذا اليوم بحالة:{' '}
              {existingRemittance.status === 'submitted' ? 'في انتظار التأكيد' : 'تم التأكيد'}
            </Text>
            {existingRemittance.confirmedAt && (
              <Text style={styles.submittedSub}>
                تم التأكيد: {new Date(existingRemittance.confirmedAt).toLocaleDateString('ar-IQ')}
              </Text>
            )}
          </View>
        )}

        {/* Previous Remittances */}
        {remittances.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>سندات التسوية السابقة</Text>
            {remittances.slice(0, 5).map((remittance) => (
              <View key={remittance.id} style={styles.remittanceRow}>
                <Text style={styles.remittanceDate}>{remittance.date}</Text>
                <Text style={styles.remittanceAmount}>{formatPrice(remittance.amountDueToAdmin)}</Text>
                <View style={[
                  styles.statusBadge,
                  remittance.status === 'confirmed' ? styles.statusConfirmed : styles.statusPending
                ]}>
                  <Text style={[
                    styles.statusText,
                    remittance.status === 'confirmed' ? styles.statusTextConfirmed : styles.statusTextPending
                  ]}>
                    {remittance.status === 'confirmed' ? 'تم التأكيد' : 'قيد الانتظار'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
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
  backBtn: { padding: 4, width: 40 },
  headerTitle: { fontSize: 17, fontFamily: 'Cairo_700Bold', fontWeight: '700', color: theme.colors.text },
  scroll: { flex: 1 },
  scrollContent: { padding: theme.spacing.screenPadding, paddingBottom: theme.spacing.xxl },

  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadow.card,
  },
  highlightCard: {
    borderWidth: 2,
    borderColor: theme.colors.primary + '30',
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl,
  },
  submittedCard: {
    backgroundColor: theme.colors.success + '10',
    borderWidth: 1,
    borderColor: theme.colors.success + '30',
    alignItems: 'center',
  },

  cardTitle: { fontSize: 14, fontFamily: 'Cairo_600SemiBold', fontWeight: '600', color: theme.colors.textSecondary, marginBottom: 12 },

  dateButton: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  dateText: { fontSize: 15, fontFamily: 'Cairo_600SemiBold', fontWeight: '600', color: theme.colors.text },

  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  statLabel: { fontSize: 14, fontFamily: 'Cairo_400Regular', color: theme.colors.textSecondary },
  statLabelBold: { fontSize: 15, fontFamily: 'Cairo_700Bold', fontWeight: '700', color: theme.colors.text },
  statValue: { fontSize: 14, fontFamily: 'Cairo_600SemiBold', fontWeight: '600', color: theme.colors.text },
  statValueBold: { fontSize: 16, fontFamily: 'Cairo_800ExtraBold', fontWeight: '800', color: theme.colors.text },
  positive: { color: theme.colors.success },
  warning: { color: theme.colors.warning },

  divider: {
    height: 1,
    backgroundColor: theme.colors.borderLight,
    marginVertical: theme.spacing.sm,
  },

  emptyText: { fontSize: 16, fontFamily: 'Cairo_600SemiBold', fontWeight: '600', color: theme.colors.textSecondary, textAlign: 'center' },
  emptySub: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: theme.colors.textMuted, textAlign: 'center', marginTop: theme.spacing.sm, lineHeight: 20 },

  actionBtn: {
    height: 56,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    ...theme.shadow.card,
  },
  actionBtnDisabled: { opacity: 0.7 },
  actionBtnText: { fontSize: 17, fontFamily: 'Cairo_700Bold', fontWeight: '700', color: '#fff' },

  submittedTitle: { fontSize: 16, fontFamily: 'Cairo_700Bold', fontWeight: '700', color: theme.colors.success },
  submittedText: { fontSize: 14, fontFamily: 'Cairo_400Regular', color: theme.colors.textSecondary, textAlign: 'center', marginTop: 4 },
  submittedSub: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: theme.colors.textMuted, marginTop: 4 },

  remittanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  remittanceDate: { fontSize: 14, fontFamily: 'Cairo_400Regular', color: theme.colors.text, flex: 1 },
  remittanceAmount: { fontSize: 14, fontFamily: 'Cairo_600SemiBold', fontWeight: '600', color: theme.colors.text, marginHorizontal: theme.spacing.md },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusConfirmed: { backgroundColor: theme.colors.success + '20' },
  statusPending: { backgroundColor: theme.colors.warning + '20' },
  statusText: { fontSize: 11, fontFamily: 'Cairo_600SemiBold', fontWeight: '600' },
  statusTextConfirmed: { color: theme.colors.success },
  statusTextPending: { color: theme.colors.warning },
});
