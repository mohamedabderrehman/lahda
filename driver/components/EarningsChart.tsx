import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { getMyRemittances } from '../api/client';
import { theme, formatPrice } from '../constants/theme';
import { IconChartOutline } from './Icons';

const screenWidth = Dimensions.get('window').width;

export function EarningsChart() {
  const [chartData, setChartData] = useState<{ labels: string[]; data: number[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalWeek, setTotalWeek] = useState(0);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const remittances = await getMyRemittances();

      // Get last 7 days
      const days: { label: string; earnings: number }[] = [];
      const today = new Date();

      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const dayName = date.toLocaleDateString('ar-IQ', { weekday: 'short' });

        const dayRemittances = Array.isArray(remittances)
          ? remittances.filter((r) => r.date === dateStr && r.status === 'confirmed')
          : [];

        const earnings = dayRemittances.reduce((sum, r) => sum + (r.deliveryFeeSum || 0), 0);

        days.push({
          label: dayName,
          earnings,
        });
      }

      const labels = days.map((d) => d.label);
      const data = days.map((d) => d.earnings);
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
          <Text style={styles.title}>أرباح آخر 7 أيام</Text>
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
          <Text style={styles.title}>أرباح آخر 7 أيام</Text>
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
          <Text style={styles.title}>أرباح آخر 7 أيام</Text>
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
                color: () => theme.colors.primary,
                strokeWidth: 3,
              },
            ],
          }}
          width={screenWidth - 64}
          height={160}
          chartConfig={{
            backgroundColor: theme.colors.surface,
            backgroundGradientFrom: theme.colors.surface,
            backgroundGradientTo: theme.colors.surface,
            decimalPlaces: 0,
            color: () => theme.colors.primary,
            labelColor: () => theme.colors.textSecondary,
            style: {
              borderRadius: theme.radius.lg,
            },
            propsForDots: {
              r: '4',
              strokeWidth: '2',
              stroke: theme.colors.primary,
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
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>ابدأ العمل لترى إحصائيات أرباحك</Text>
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
