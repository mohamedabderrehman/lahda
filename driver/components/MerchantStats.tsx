import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Switch } from 'react-native';
import { getMerchantStats, getMerchantBalance, updateMyStore } from '../api/client';
import { theme, formatPrice } from '../constants/theme';
import {
  IconPackageOutline,
  IconCashOutline,
  IconChartOutline,
  IconStoreOutline,
  IconStarOutline,
} from './Icons';

type StatsData = {
  todayOrders: number;
  todayRevenue: number;
  weekOrders: number;
  weekRevenue: number;
  totalOrders: number;
  totalRevenue: number;
  rating: number | null;
  balance: number;
};

export function MerchantDashboardStats({
  isOpen,
  onToggleOpen,
}: {
  isOpen: boolean;
  onToggleOpen: (value: boolean) => void;
}) {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      const [statsRes, balanceRes] = await Promise.all([
        getMerchantStats(),
        getMerchantBalance(),
      ]);

      const summary = (statsRes as { summary?: {
        todayOrders?: number;
        totalRevenue?: number;
        weekOrders?: number;
        totalOrders?: number;
      } })?.summary || {};

      // Estimate today's and week's revenue based on order counts
      const avgOrderValue = summary.totalRevenue && summary.totalOrders
        ? summary.totalRevenue / summary.totalOrders
        : 0;

      const todayRevenue = (summary.todayOrders || 0) * avgOrderValue;
      const weekRevenue = (summary.weekOrders || 0) * avgOrderValue;

      setStats({
        todayOrders: summary.todayOrders || 0,
        todayRevenue,
        weekOrders: summary.weekOrders || 0,
        weekRevenue,
        totalOrders: summary.totalOrders || 0,
        totalRevenue: summary.totalRevenue || 0,
        rating: (statsRes as { summary?: { ratingAvg?: number } })?.summary?.ratingAvg ?? null,
        balance: (balanceRes as { balance?: number })?.balance || 0,
      });
    } catch {
      setStats({
        todayOrders: 0,
        todayRevenue: 0,
        weekOrders: 0,
        weekRevenue: 0,
        totalOrders: 0,
        totalRevenue: 0,
        rating: null,
        balance: 0,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleToggle = async (value: boolean) => {
    if (toggling) return;
    setToggling(true);
    try {
      await updateMyStore({ isOpen: value });
      onToggleOpen(value);
    } catch {
      // Revert on error
    } finally {
      setToggling(false);
    }
  };

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
      {/* Store Status Toggle */}
      <View style={[styles.toggleCard, isOpen ? styles.toggleCardOpen : styles.toggleCardClosed]}>
        <View style={styles.toggleContent}>
          <View style={[styles.toggleIconContainer, isOpen ? styles.toggleIconOpen : styles.toggleIconClosed]}>
            <IconStoreOutline size={28} color={isOpen ? theme.colors.success : theme.colors.textMuted} />
          </View>
          <View style={styles.toggleTextContainer}>
            <Text style={[styles.toggleTitle, isOpen ? styles.toggleTitleOpen : styles.toggleTitleClosed]}>
              {isOpen ? 'المتجر مفتوح' : 'المتجر مغلق'}
            </Text>
            <Text style={styles.toggleSubtitle}>
              {isOpen ? 'تستقبل الطلبات الآن' : 'لا تستقبل طلبات جديدة'}
            </Text>
          </View>
        </View>
        <Switch
          value={isOpen}
          onValueChange={handleToggle}
          disabled={toggling}
          trackColor={{ false: theme.colors.borderLight, true: theme.colors.success + '50' }}
          thumbColor={isOpen ? theme.colors.success : theme.colors.white}
          ios_backgroundColor={theme.colors.borderLight}
        />
      </View>

      {/* Stats Grid */}
      <View style={styles.grid}>
        <StatCard
          icon={<IconPackageOutline size={22} color={theme.colors.primary} />}
          value={String(stats.todayOrders)}
          label="طلبات اليوم"
          color={theme.colors.primary}
          backgroundColor={theme.colors.primarySoft}
        />
        <StatCard
          icon={<IconCashOutline size={22} color={theme.colors.success} />}
          value={formatPrice(stats.todayRevenue)}
          label="مبيعات اليوم"
          color={theme.colors.success}
          backgroundColor="#DCFCE7"
        />
        <StatCard
          icon={<IconChartOutline size={22} color={theme.colors.accentPurple} />}
          value={String(stats.weekOrders)}
          label="طلبات الأسبوع"
          color={theme.colors.accentPurple}
          backgroundColor="#F3E8FF"
        />
      </View>

      {/* Balance Card */}
      <View style={styles.balanceCard}>
        <View style={styles.balanceContent}>
          <View style={styles.balanceIconContainer}>
            <IconCashOutline size={24} color={theme.colors.success} />
          </View>
          <View style={styles.balanceTextContainer}>
            <Text style={styles.balanceLabel}>الرصيد المتاح</Text>
            <Text style={styles.balanceValue}>{formatPrice(stats.balance)}</Text>
          </View>
        </View>
        <View style={styles.balanceDivider} />
        <View style={styles.balanceRow}>
          <View style={styles.balanceItem}>
            <Text style={styles.balanceItemValue}>{formatPrice(stats.totalRevenue)}</Text>
            <Text style={styles.balanceItemLabel}>إجمالي المبيعات</Text>
          </View>
          <View style={styles.balanceItemDivider} />
          <View style={styles.balanceItem}>
            <Text style={styles.balanceItemValue}>{stats.rating ? stats.rating.toFixed(1) : '-'}</Text>
            <Text style={styles.balanceItemLabel}>التقييم</Text>
          </View>
        </View>
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

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    borderWidth: 2,
    borderColor: theme.colors.borderLight,
    ...theme.shadow.card,
  },
  toggleCardOpen: {
    borderColor: theme.colors.success + '50',
    backgroundColor: '#F0FDF4',
  },
  toggleCardClosed: {
    borderColor: theme.colors.error + '30',
  },
  toggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  toggleIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: theme.spacing.md,
  },
  toggleIconOpen: {
    backgroundColor: theme.colors.success + '20',
  },
  toggleIconClosed: {
    backgroundColor: theme.colors.surfaceAlt,
  },
  toggleTextContainer: {
    flex: 1,
  },
  toggleTitle: {
    fontSize: 17,
    fontFamily: 'Cairo_700Bold',
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'right',
  },
  toggleTitleOpen: {
    color: theme.colors.success,
  },
  toggleTitleClosed: {
    color: theme.colors.error,
  },
  toggleSubtitle: {
    fontSize: 13,
    fontFamily: 'Cairo_400Regular',
    color: theme.colors.textSecondary,
    marginTop: 2,
    textAlign: 'right',
  },

  grid: {
    flexDirection: 'row',
    gap: 10,
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
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 16,
    fontFamily: theme.fonts.extraBold,
    fontWeight: '800',
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 10,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },

  balanceCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.success + '40',
    ...theme.shadow.card,
  },
  balanceContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: theme.colors.success + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: theme.spacing.md,
  },
  balanceTextContainer: {
    flex: 1,
  },
  balanceLabel: {
    fontSize: 14,
    fontFamily: theme.fonts.medium,
    color: theme.colors.textSecondary,
    textAlign: 'right',
  },
  balanceValue: {
    fontSize: 24,
    fontFamily: theme.fonts.extraBold,
    fontWeight: '800',
    color: theme.colors.success,
    textAlign: 'right',
    marginTop: 2,
  },
  balanceDivider: {
    height: 1,
    backgroundColor: theme.colors.borderLight,
    marginVertical: theme.spacing.md,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceItem: {
    flex: 1,
    alignItems: 'center',
  },
  balanceItemDivider: {
    width: 1,
    height: 30,
    backgroundColor: theme.colors.borderLight,
  },
  balanceItemValue: {
    fontSize: 15,
    fontFamily: theme.fonts.bold,
    fontWeight: '700',
    color: theme.colors.text,
  },
  balanceItemLabel: {
    fontSize: 11,
    fontFamily: theme.fonts.regular,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
});
