import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { getMerchantOrders } from '../api/client';
import { theme, formatPrice } from '../constants/theme';
import { IconChartOutline } from './Icons';

const screenWidth = Dimensions.get('window').width;

export function MerchantChart() {
  const [chartData, setChartData] = useState<{ labels: string[]; data: number[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalWeek, setTotalWeek] = useState(0);
  const [dateRangeText, setDateRangeText] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const orders = await getMerchantOrders('delivered');

      // Get last 7 days
      const days: { label: string; revenue: number }[] = [];
      const today = new Date();

      // Build date range text
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 6);
      const endDateStr = today.toLocaleDateString('ar-IQ', { day: 'numeric', month: 'short' });
      const startDateStr = startDate.toLocaleDateString('ar-IQ', { day: 'numeric', month: 'short' });
      setDateRangeText(`${startDateStr} - ${endDateStr}`);

      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        // Use day number instead of Arabic name to avoid RTL/rendering issues
        const dayNumber = date.getDate();

        // Find orders for this day
        const dayOrders = Array.isArray(orders)
          ? orders.filter((o: { deliveredAt?: string; createdAt?: string; total?: number | string }) => {
              const orderDate = o.deliveredAt || o.createdAt;
              if (!orderDate) return false;
              return orderDate.startsWith(dateStr);
            })
          : [];

        const revenue = dayOrders.reduce((sum: number, o: { total?: number | string }) => {
          const total = typeof o.total === 'string' ? parseFloat(o.total) : Number(o.total) || 0;
          return sum + total;
        }, 0);

        days.push({
          label: String(dayNumber),
          revenue,
        });
      }

      const labels = days.map((d) => d.label);
      const data = days.map((d) => d.revenue);
      const total = data.reduce((sum, val) => sum + val, 0);

      setChartData({ labels, data });
      setTotalWeek(total);
    } catch {
      setChartData({ labels: [], data: [] });
      setTotalWeek(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <IconChartOutline size={20} color={theme.colors.primary} />
          <Text style={styles.title}>مبيعات آخر 7 أيام</Text>
        </View>
        <ActivityIndicator size="small" color={theme.colors.primary} style={styles.loader} />
      </View>
    );
  }

  if (!chartData || chartData.data.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <IconChartOutline size={20} color={theme.colors.primary} />
          <Text style={styles.title}>مبيعات آخر 7 أيام</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>لا توجد بيانات كافية</Text>
        </View>
      </View>
    );
  }

  const hasData = chartData.data.some((val) => val > 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <IconChartOutline size={20} color={theme.colors.primary} />
          <View>
            <Text style={styles.title}>مبيعات آخر 7 أيام</Text>
            <Text style={styles.dateRange}>{dateRangeText}</Text>
          </View>
        </View>
        <Text style={styles.total}>{formatPrice(totalWeek)}</Text>
      </View>

      {hasData ? (
        <LineChart
          data={{
            labels: chartData.labels,
            datasets: [
              {
                data: chartData.data,
                color: () => theme.colors.success,
                strokeWidth: 3,
              },
            ],
          }}
          width={screenWidth - 64}
          height={180}
          chartConfig={{
            backgroundColor: theme.colors.surface,
            backgroundGradientFrom: theme.colors.surface,
            backgroundGradientTo: theme.colors.surface,
            decimalPlaces: 0,
            color: () => theme.colors.success,
            labelColor: () => theme.colors.textSecondary,
            style: {
              borderRadius: theme.radius.lg,
            },
            propsForDots: {
              r: '4',
              strokeWidth: '2',
              stroke: theme.colors.success,
              fill: theme.colors.surface,
            },
            propsForBackgroundLines: {
              stroke: theme.colors.borderLight,
              strokeDasharray: '',
            },
            formatYLabel: (value) => {
              const num = Number(value);
              if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
              return String(num);
            },
          }}
          bezier
          style={styles.chart}
          withVerticalLines={false}
          withHorizontalLines={true}
          withDots={true}
          withShadow={false}
          fromZero
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>ابدأ باستقبال الطلبات لترى مبيعاتك</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    ...theme.shadow.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontFamily: theme.fonts.bold,
    fontWeight: '700',
    color: theme.colors.text,
  },
  dateRange: {
    fontSize: 11,
    fontFamily: theme.fonts.medium,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  total: {
    fontSize: 14,
    fontFamily: theme.fonts.bold,
    fontWeight: '700',
    color: theme.colors.success,
  },
  chart: {
    marginVertical: 4,
    borderRadius: theme.radius.lg,
  },
  loader: {
    paddingVertical: 40,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontFamily: theme.fonts.medium,
    color: theme.colors.textSecondary,
  },
});
