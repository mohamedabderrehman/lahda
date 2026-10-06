import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { getDriverEarnings, getMyRemittances } from '../api/client';
import { theme, formatPrice } from '../constants/theme';
import { IconBoxOutline, IconCashOutline, IconStarFilled, IconWalletOutline } from './Icons';

type StatsData = {
  todayOrders: number;
  todayEarnings: number;
  pendingCod: number;
  rating: number | null;
  totalDeliveries: number;
  weeklyEarnings: number;
};

export function DriverDashboardStats() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      const [earningsRes, remittancesRes] = await Promise.all([
        getDriverEarnings(),
        getMyRemittances(),
      ]);

      // Calculate today's earnings from earnings data
      const today = new Date().toISOString().split('T')[0];
      const todayRemittances = Array.isArray(remittancesRes)
        ? remittancesRes.filter((r) => r.date === today && r.status === 'confirmed')
        : [];

      const todayEarnings = todayRemittances.reduce((sum, r) => sum + (r.deliveryFeeSum || 0), 0);
      const todayOrders = todayRemittances.reduce((sum, r) => sum + (r.ordersCount || 0), 0);

      // Calculate pending COD from non-confirmed remittances
      const pendingRemittances = Array.isArray(remittancesRes)
        ? remittancesRes.filter((r) => r.status !== 'confirmed')
        : [];
      const pendingCod = pendingRemittances.reduce((sum, r) => sum + (r.amountDueToAdmin || 0), 0);

      // Calculate weekly earnings (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const weeklyEarnings = Array.isArray(remittancesRes)
        ? remittancesRes
            .filter((r) => new Date(r.date) >= sevenDaysAgo && r.status === 'confirmed')
            .reduce((sum, r) => sum + (r.deliveryFeeSum || 0), 0)
        : 0;

      // Total deliveries
      const totalDeliveries = Array.isArray(remittancesRes)
        ? remittancesRes
            .filter((r) => r.status === 'confirmed')
            .reduce((sum, r) => sum + (r.ordersCount || 0), 0)
        : 0;

      setStats({
        todayOrders,
        todayEarnings,
        pendingCod,
        rating: (earningsRes as { ratingAvg?: number })?.ratingAvg ?? null,
        totalDeliveries,
        weeklyEarnings,
      });
    } catch {
      setStats({
        todayOrders: 0,
        todayEarnings: 0,
        pendingCod: 0,
        rating: null,
        totalDeliveries: 0,
        weeklyEarnings: 0,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  }

  if (!stats) return null;

  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        <StatCard
          icon={<IconBoxOutline size={24} color={theme.colors.primary} />}
          value={String(stats.todayOrders)}
          label="طلبات اليوم"
          color={theme.colors.primary}
          backgroundColor={theme.colors.primarySoft}
        />
        <StatCard
          icon={<IconCashOutline size={24} color={theme.colors.success} />}
          value={formatPrice(stats.todayEarnings)}
          label="أرباح اليوم"
          color={theme.colors.success}
          backgroundColor="#DCFCE7"
        />
        <StatCard
          icon={<IconStarFilled size={24} color={theme.colors.accentAmber} />}
          value={stats.rating ? stats.rating.toFixed(1) : '-'}
          label="التقييم"
          color={theme.colors.accentAmber}
          backgroundColor="#FEF3C7"
        />
      </View>

      {/* Additional Stats Row */}
      <View style={styles.rowGrid}>
        <SmallStatCard
          icon={<IconWalletOutline size={18} color={theme.colors.accentPurple} />}
          value={formatPrice(stats.pendingCod)}
          label="مبالغ مستحقة"
          color={theme.colors.accentPurple}
        />
        <SmallStatCard
          icon={<IconBoxOutline size={18} color={theme.colors.info} />}
          value={String(stats.totalDeliveries)}
          label="إجمالي التوصيل"
          color={theme.colors.info}
        />
      </View>
    </View>
  );
}

function StatCard({
  icon,
  value,
  label,
  color,
  backgroundColor,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  color: string;
  backgroundColor: string;
}) {
  return (
    <View style={[styles.statCard, { borderColor: color + '30' }]}>
      <View style={[styles.iconContainer, { backgroundColor }]}>
        {icon}
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SmallStatCard({
  icon,
  value,
  label,
  color,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  color: string;
}) {
  return (
    <View style={[styles.smallCard, { borderColor: color + '30' }]}>
      <View style={styles.smallCardContent}>
        <View style={[styles.smallIconContainer, { backgroundColor: color + '15' }]}>
          {icon}
        </View>
        <View style={styles.smallTextContainer}>
          <Text style={[styles.smallValue, { color }]}>{value}</Text>
          <Text style={styles.smallLabel}>{label}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  rowGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    ...theme.shadow.card,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontFamily: theme.fonts.extraBold,
    fontWeight: '800',
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 11,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  smallCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    ...theme.shadow.card,
  },
  smallCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  smallIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallTextContainer: {
    flex: 1,
    marginLeft: 10,
  },
  smallValue: {
    fontSize: 14,
    fontFamily: theme.fonts.bold,
    fontWeight: '700',
  },
  smallLabel: {
    fontSize: 11,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
});
