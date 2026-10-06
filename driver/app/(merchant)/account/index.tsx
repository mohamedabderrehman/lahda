import { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { getMyStore } from '../../../api/client';
import { useAuth } from '../../../contexts/AuthContext';
import { theme } from '../../../constants/theme';
import { IconStoreOutline } from '../../../components/Icons';
import { Badge } from '../../../components/ui/Badge';
import { Card, CardSection } from '../../../components/ui/Card';
import { SectionHeader } from '../../../components/ui/SectionHeader';
import { Button } from '../../../components/ui/Button';

type Store = {
  storeName?: string;
  isApproved?: boolean;
  isOpen?: boolean;
  storeSlug?: string;
};

export default function MerchantAccountHub() {
  const { logout } = useAuth();
  const [store, setStore] = useState<Store | null>(null);

  const handleLogout = useCallback(async () => {
    await logout();
    router.replace('/(auth)/login');
  }, [logout]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await getMyStore();
      setStore(res as Store);
    } catch {
      setStore(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !store) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>حسابي</Text>
        </View>
        <ActivityIndicator size="large" color={theme.colors.primary} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  const name = store?.storeName ?? 'متجري';
  const isOpen = store?.isOpen !== false;
  const isApproved = store?.isApproved !== false;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>حسابي</Text>
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={theme.colors.primary} />}
      >
        <View style={styles.hero}>
          <View style={styles.heroBubbleA} />
          <View style={styles.heroBubbleB} />
          <View style={styles.heroRow}>
            <View style={styles.heroIcon}>
              <IconStoreOutline size={26} color={theme.colors.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>حساب المتجر</Text>
              <Text style={styles.heroName} numberOfLines={1}>{name}</Text>
              {!!store?.storeSlug && <Text style={styles.heroSlug} numberOfLines={1}>@{store.storeSlug}</Text>}
            </View>
          </View>
          <View style={styles.heroBadges}>
            <Badge label={isOpen ? 'مفتوح' : 'مغلق'} variant={isOpen ? 'success' : 'warning'} />
            {!isApproved && <Badge label="قيد المراجعة" variant="danger" />}
          </View>
        </View>

        <Card>
          <CardSection>
            <SectionHeader title="الإعدادات" subtitle="كل شيء يخص متجرك وحسابك" />
          </CardSection>
          <View style={styles.list}>
            <SettingsRow title="تعديل معلومات المتجر" subtitle="اسم، وصف، ساعات، حد أدنى، موقع" onPress={() => router.push('/(merchant)/account/store')} />
            <SettingsRow title="أكواد الخصم" subtitle="إنشاء وإدارة أكواد الخصم الخاصة بمتجرك" onPress={() => router.push('/(merchant)/account/promo-codes')} />
            <SettingsRow title="معلومات الحساب والأمان" subtitle="الاسم/الهاتف + تغيير الإيميل وكلمة المرور" onPress={() => router.push('/(merchant)/account/security')} />
            <SettingsRow title="حالة المتجر" subtitle="فتح/غلق المتجر + تفاصيل التشغيل" onPress={() => router.push('/(merchant)/account/status')} />
            <SettingsRow title="الصور والموقع" subtitle="شعار/غلاف + تحديد الموقع على الخريطة" onPress={() => router.push('/(merchant)/account/media-location')} />
          </View>
        </Card>

        <Card>
          <CardSection>
            <SectionHeader title="الحساب" subtitle="إجراءات عامة" />
            <View style={{ marginTop: theme.spacing.md }}>
              <Button title="تسجيل الخروج" onPress={handleLogout} variant="danger" />
            </View>
          </CardSection>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingsRow({ title, subtitle, onPress }: { title: string; subtitle: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.row} activeOpacity={0.9} onPress={onPress}>
      <Text style={styles.rowArrow}>←</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSub}>{subtitle}</Text>
      </View>
    </TouchableOpacity>
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
  content: { padding: theme.spacing.screenPadding, paddingBottom: 40, gap: 12 },
  hero: {
    borderRadius: theme.radius.xl,
    backgroundColor: theme.colors.accentPurple,
    padding: theme.spacing.xl,
    overflow: 'hidden',
    marginBottom: theme.spacing.lg,
  },
  heroBubbleA: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: theme.colors.accentPink + '2A',
    top: -90,
    right: -80,
  },
  heroBubbleB: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: theme.colors.info + '22',
    bottom: -100,
    left: -90,
  },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  heroIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: { fontSize: 14, fontWeight: '800', fontFamily: 'Cairo_800ExtraBold', color: 'rgba(255,255,255,0.85)', textAlign: 'right' },
  heroName: { fontSize: 22, fontWeight: '900', fontFamily: 'Cairo_900Black', color: theme.colors.white, textAlign: 'right', marginTop: 2 },
  heroSlug: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: 'rgba(255,255,255,0.85)', textAlign: 'right', marginTop: 4 },
  heroBadges: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end', marginTop: theme.spacing.md },

  list: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.lg, gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    padding: theme.spacing.lg,
  },
  rowTitle: { fontSize: 15, fontWeight: '900', fontFamily: 'Cairo_900Black', color: theme.colors.text, textAlign: 'right' },
  rowSub: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: theme.colors.textSecondary, marginTop: 4, textAlign: 'right', lineHeight: 18 },
  rowArrow: { fontSize: 18, fontWeight: '900', fontFamily: 'Cairo_900Black', color: theme.colors.primaryDark },
});

