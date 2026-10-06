import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  getRewardChallengeStatus,
  startRewardChallenge,
  claimRewardChallenge,
  type RewardChallengeStatus,
  type RewardChallengeTier,
} from '../../api/client';
import { formatPrice } from '../../constants/theme';
import { theme } from '../../constants/theme';
import { IconTrophyOutline, IconCheckmarkOutline } from '../../components/Icons';

const PROGRESS_BAR_HEIGHT = 8;

const HERO_GRADIENT_DARK = ['#0f172a', '#1e3a5f', '#1e40af'] as const;
const HERO_GRADIENT_SUCCESS = [theme.colors.success, '#15803d', '#166534'] as const;
const TIER_ACCENT_COLORS = [theme.colors.primary, theme.colors.primaryDark, theme.colors.accentAmber];

function formatCountdown(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

export default function RewardsScreen() {
  const [data, setData] = useState<RewardChallengeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionPending, setActionPending] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await getRewardChallengeStatus();
      setData(res);
      if (res.challenge?.timeRemainingSeconds != null && res.challenge.timeRemainingSeconds > 0) {
        setCountdown(res.challenge.timeRemainingSeconds);
      } else {
        setCountdown(null);
      }
    } catch {
      setData(null);
      setCountdown(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Update countdown every second when challenge is active
  useEffect(() => {
    if (countdown == null || countdown <= 0) return;
    const t = setInterval(() => {
      setCountdown((s) => (s != null && s > 0 ? s - 1 : null));
    }, 1000);
    return () => clearInterval(t);
  }, [countdown]);

  const handleStart = async () => {
    if (actionPending || !data) return;
    setActionPending(true);
    try {
      await startRewardChallenge();
      await load();
    } catch (e: unknown) {
      Alert.alert('خطأ', (e as Error).message);
    } finally {
      setActionPending(false);
    }
  };

  const handleClaim = async () => {
    if (actionPending || !data?.challenge?.canClaim) return;
    setActionPending(true);
    try {
      await claimRewardChallenge();
      await load();
    } catch (e: unknown) {
      Alert.alert('خطأ', (e as Error).message);
    } finally {
      setActionPending(false);
    }
  };

  if (loading && !data) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <LinearGradient
          colors={[theme.colors.primary + '12', theme.colors.surface]}
          style={styles.header}
        >
          <View style={styles.headerRow}>
            <View style={styles.headerIconWrap}>
              <IconTrophyOutline size={22} color={theme.colors.primary} />
            </View>
            <Text style={styles.headerTitle}>المكافآت</Text>
          </View>
        </LinearGradient>
        <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
      </SafeAreaView>
    );
  }

  const config = data?.config ?? { timeWindowMinutes: 300, tiers: [] };
  const tiers = config.tiers.length > 0 ? config.tiers : [
    { trips: 5, amount: 500 },
    { trips: 7, amount: 800 },
    { trips: 15, amount: 1500 },
  ];
  const challenge = data?.challenge ?? null;
  const usedToday = data?.usedToday ?? false;
  const deliveriesCount = challenge?.deliveriesCount ?? 0;
  const canStart = !usedToday;
  const canClaim = challenge?.canClaim ?? false;
  const timerActive = (countdown ?? challenge?.timeRemainingSeconds ?? 0) > 0;

  const TierCard = ({ tier, index }: { tier: RewardChallengeTier; index: number }) => {
    const reached = deliveriesCount >= tier.trips;
    const progress = Math.min(deliveriesCount, tier.trips);
    const progressPercent = tier.trips > 0 ? (progress / tier.trips) * 100 : 0;
    const accentColor = TIER_ACCENT_COLORS[Math.min(index, TIER_ACCENT_COLORS.length - 1)];
    return (
      <View style={[styles.tierCard, reached && styles.tierCardReached]}>
        <View style={[styles.tierAccentBar, { backgroundColor: accentColor }]} />
        <View style={styles.tierHeader}>
          <Text style={styles.tierLabel}>المستوى {index + 1}</Text>
          {reached && (
            <View style={styles.tierBadge}>
              <IconCheckmarkOutline size={14} color="#fff" />
            </View>
          )}
        </View>
        <View style={styles.tierBody}>
          <Text style={styles.tierTrips}>
            {progress}/{tier.trips} توصيلة
          </Text>
          <Text style={[styles.tierAmount, styles.tabularNums]}>{formatPrice(tier.amount)}</Text>
        </View>
        <View style={styles.progressTrack}>
          {reached ? (
            <View
              style={[
                styles.progressFill,
                { width: '100%', backgroundColor: theme.colors.success },
              ]}
            />
          ) : (
            <LinearGradient
              colors={[theme.colors.primary, theme.colors.primarySoft || theme.colors.primary + '99']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressFill, { width: `${Math.min(100, progressPercent)}%` }]}
            />
          )}
        </View>
        <Text style={styles.tierHint}>أكمل {tier.trips} توصيلات خلال الوقت لتفوز بـ {formatPrice(tier.amount)}</Text>
      </View>
    );
  };

  const HowItWorksCard = () => (
    <View style={styles.howItWorksCard}>
      <Text style={styles.howItWorksTitle}>كيف يعمل التحدي</Text>
      <Text style={styles.howItWorksItem}>تحدي واحد يومياً. اضغط بدء التحدي لتفعيل العدّ.</Text>
      <Text style={styles.howItWorksItem}>لديك {config.timeWindowMinutes / 60} ساعة. لا يمكن إيقاف العدّ بعد البدء.</Text>
      <Text style={styles.howItWorksItem}>كلما زادت توصيلاتك في المدة، زادت المكافأة حسب المستوى.</Text>
      <Text style={styles.howItWorksItem}>بعد انتهاء الوقت اضغط تحصيل المكافأة لتحويلها لحسابك.</Text>
    </View>
  );

  const SummaryCard = ({ label, value }: { label: string; value: string }) => (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, styles.tabularNums]}>{value}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <LinearGradient
        colors={[theme.colors.primary + '12', theme.colors.surface]}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerIconWrap}>
            <IconTrophyOutline size={22} color={theme.colors.primary} />
          </View>
          <Text style={styles.headerTitle}>المكافآت</Text>
        </View>
      </LinearGradient>

      <LinearGradient
        colors={['#f1f5f9', '#f8fafc', '#ffffff']}
        style={styles.screenGradient}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={theme.colors.primary} />
          }
        >
          {/* State 1: No challenge today + can start */}
          {canStart && (
            <>
              <LinearGradient
                colors={HERO_GRADIENT_DARK}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.hero}
              >
                <View style={styles.heroIconRing}>
                  <View style={styles.heroIconWrap}>
                    <IconTrophyOutline size={42} color="#fff" />
                  </View>
                </View>
                <Text style={styles.heroTitle}>تحدي المكافآت اليومي</Text>
                <Text style={styles.heroDesc}>
                  ابدأ تحدي {config.timeWindowMinutes / 60} ساعة، أكمل توصيلات واكسب مكافآت نقدية
                </Text>
                <Text style={styles.heroMotivation}>كلما زادت توصيلاتك في الوقت، زادت مكافأتك</Text>
              </LinearGradient>

              <HowItWorksCard />

              <View style={styles.summaryRow}>
                <SummaryCard label="تحدي اليوم" value="لم يبدأ بعد" />
              </View>

              <Text style={styles.sectionLabel}>المستويات</Text>
              {tiers.map((t, i) => (
                <TierCard key={i} tier={t} index={i} />
              ))}

              <TouchableOpacity
                style={[styles.primaryBtn, actionPending && styles.primaryBtnDisabled]}
                onPress={handleStart}
                disabled={actionPending}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={HERO_GRADIENT_DARK}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.primaryBtnGradient}
                >
                  <Text style={styles.primaryBtnText}>
                    {actionPending ? 'جاري البدء...' : 'بدء التحدي'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}

          {/* State 2: Challenge active - countdown */}
          {usedToday && timerActive && challenge && (
            <>
              <LinearGradient
                colors={HERO_GRADIENT_DARK}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.hero}
              >
                <View style={styles.heroIconRing}>
                  <View style={styles.heroIconWrap}>
                    <IconTrophyOutline size={42} color="#fff" />
                  </View>
                </View>
                <Text style={styles.countdownLabel}>الوقت المتبقي</Text>
                <View style={styles.countdownBox}>
                  <Text style={styles.countdown} selectable={false}>
                    {formatCountdown(countdown ?? 0)}
                  </Text>
                </View>
                <Text style={styles.deliveriesCount}>{deliveriesCount} توصيلة مكتملة</Text>
                <Text style={styles.heroMotivation}>استمر، الوقت لم ينتهِ بعد</Text>
              </LinearGradient>

              <View style={styles.summaryRow}>
                <SummaryCard label="التوصيلات خلال التحدي" value={String(deliveriesCount)} />
                <SummaryCard label="الوقت المتبقي" value={formatCountdown(countdown ?? 0)} />
              </View>

              <Text style={styles.sectionLabel}>المستويات</Text>
              {tiers.map((t, i) => (
                <TierCard key={i} tier={t} index={i} />
              ))}
            </>
          )}

          {/* State 3: Timer ended + eligible - claim */}
          {usedToday && !timerActive && canClaim && challenge && (
            <>
              <LinearGradient
                colors={HERO_GRADIENT_SUCCESS}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.hero}
              >
                <View style={styles.heroIconRing}>
                  <View style={styles.heroIconWrap}>
                    <IconTrophyOutline size={42} color="#fff" />
                  </View>
                </View>
                <Text style={styles.heroTitle}>أنهيت التحدي</Text>
                <Text style={styles.deliveriesCount}>{deliveriesCount} توصيلة</Text>
                <Text style={styles.heroDesc}>يمكنك تحصيل مكافأتك الآن</Text>
              </LinearGradient>

              <View style={styles.summaryRow}>
                <SummaryCard label="التوصيلات المكتملة" value={String(deliveriesCount)} />
              </View>

              <Text style={styles.sectionLabel}>المستويات</Text>
              {tiers.map((t, i) => (
                <TierCard key={i} tier={t} index={i} />
              ))}

              <TouchableOpacity
                style={[styles.primaryBtn, styles.primaryBtnSuccess, actionPending && styles.primaryBtnDisabled]}
                onPress={handleClaim}
                disabled={actionPending}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={HERO_GRADIENT_SUCCESS}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.primaryBtnGradient}
                >
                  <Text style={styles.primaryBtnText}>
                    {actionPending ? 'جاري التحصيل...' : 'تحصيل المكافأة'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}

          {/* State 4: Used today / already claimed */}
          {usedToday && !timerActive && !canClaim && (
            <>
              <View style={styles.usedCard}>
                <View style={styles.usedIconWrap}>
                  <IconTrophyOutline size={48} color={theme.colors.textMuted} />
                </View>
                <Text style={styles.usedTitle}>استخدمت التحدي اليوم</Text>
                <Text style={styles.usedDesc}>تحدي واحد لكل يوم تقويمي</Text>
                <Text style={styles.usedTomorrow}>عد غداً لتحدٍ جديد ومكافأة جديدة</Text>
                <View style={styles.statsRow}>
                  <Text style={styles.statsLabel}>التوصيلات المكتملة اليوم</Text>
                  <Text style={[styles.statsValue, styles.tabularNums]}>{deliveriesCount}</Text>
                </View>
              </View>
              <HowItWorksCard />
            </>
          )}
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f1f5f9' },
  screenGradient: { flex: 1 },
  header: {
    paddingHorizontal: theme.spacing.screenPadding,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: theme.colors.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Cairo_700Bold',
    fontWeight: '700',
    color: theme.colors.text,
  },
  loader: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: theme.spacing.screenPadding, paddingBottom: 32 },
  hero: {
    borderRadius: 28,
    paddingVertical: 28,
    paddingHorizontal: theme.spacing.xl + 8,
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  heroIconRing: {
    width: 88,
    height: 88,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroIconWrap: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 26,
    fontFamily: 'Cairo_800ExtraBold',
    fontWeight: '800',
    color: '#fff',
    marginBottom: 6,
  },
  heroDesc: {
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  heroMotivation: {
    fontSize: 13,
    fontFamily: 'Cairo_500Medium',
    color: 'rgba(255,255,255,0.8)',
    marginTop: 10,
    textAlign: 'center',
  },
  countdownLabel: {
    fontSize: 14,
    fontFamily: 'Cairo_500Medium',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 10,
  },
  countdownBox: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 16,
    marginBottom: 10,
  },
  countdown: {
    fontSize: 48,
    fontFamily: 'Cairo_800ExtraBold',
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 8,
  },
  deliveriesCount: {
    fontSize: 16,
    fontFamily: 'Cairo_600SemiBold',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.95)',
    marginTop: 4,
  },
  howItWorksCard: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 12,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  howItWorksTitle: {
    fontSize: 15,
    fontFamily: 'Cairo_700Bold',
    fontWeight: '700',
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
    letterSpacing: 0.3,
  },
  howItWorksItem: {
    fontSize: 13,
    fontFamily: 'Cairo_400Regular',
    color: theme.colors.textSecondary,
    marginBottom: 6,
    lineHeight: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    borderTopWidth: 3,
    borderTopColor: theme.colors.primary,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: 'Cairo_500Medium',
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontFamily: 'Cairo_800ExtraBold',
    fontWeight: '800',
    color: theme.colors.primary,
  },
  tabularNums: {
    fontVariant: ['tabular-nums'],
  },
  sectionLabel: {
    fontSize: 16,
    fontFamily: 'Cairo_700Bold',
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    letterSpacing: 0.5,
  },
  tierCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    paddingRight: theme.spacing.lg + 6,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  tierAccentBar: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 2,
    borderBottomLeftRadius: 2,
  },
  tierCardReached: {
    borderColor: theme.colors.success,
    backgroundColor: theme.colors.success + '0C',
    shadowColor: theme.colors.success,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  tierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  tierLabel: {
    fontSize: 14,
    fontFamily: 'Cairo_600SemiBold',
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  tierBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  tierTrips: {
    fontSize: 18,
    fontFamily: 'Cairo_700Bold',
    fontWeight: '700',
    color: theme.colors.text,
  },
  tierAmount: {
    fontSize: 20,
    fontFamily: 'Cairo_800ExtraBold',
    fontWeight: '800',
    color: theme.colors.primary,
  },
  progressTrack: {
    height: PROGRESS_BAR_HEIGHT,
    borderRadius: PROGRESS_BAR_HEIGHT / 2,
    backgroundColor: theme.colors.borderLight,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: PROGRESS_BAR_HEIGHT / 2,
  },
  tierHint: {
    fontSize: 12,
    fontFamily: 'Cairo_400Regular',
    color: theme.colors.textMuted,
    lineHeight: 18,
  },
  primaryBtn: {
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    marginTop: theme.spacing.xl,
    minHeight: 56,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryBtnGradient: {
    flexDirection: 'row',
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
  },
  primaryBtnSuccess: {},
  primaryBtnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    fontSize: 18,
    fontFamily: 'Cairo_700Bold',
    fontWeight: '700',
    color: '#fff',
  },
  usedCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.xxl,
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    ...theme.shadow.card,
  },
  usedIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  usedTitle: {
    fontSize: 20,
    fontFamily: 'Cairo_700Bold',
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  usedDesc: {
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    color: theme.colors.textSecondary,
    marginBottom: 6,
    textAlign: 'center',
  },
  usedTomorrow: {
    fontSize: 14,
    fontFamily: 'Cairo_600SemiBold',
    color: theme.colors.primary,
    marginBottom: 16,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  statsLabel: {
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    color: theme.colors.textSecondary,
  },
  statsValue: {
    fontSize: 18,
    fontFamily: 'Cairo_700Bold',
    fontWeight: '700',
    color: theme.colors.text,
  },
});
