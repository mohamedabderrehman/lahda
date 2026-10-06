import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { getMyStore, updateMyStore } from '../../../api/client';
import { theme } from '../../../constants/theme';
import { Card, CardSection } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { SectionHeader } from '../../../components/ui/SectionHeader';

type Store = { isApproved?: boolean; isOpen?: boolean; openingTime?: string | null; closingTime?: string | null };

export default function MerchantStatusScreen() {
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isOpen, setIsOpen] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = (await getMyStore()) as Store;
      setStore(res);
      setIsOpen(res.isOpen !== false);
    } catch {
      setStore(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const approved = store?.isApproved !== false;
  const badge = <Badge label={isOpen ? 'مفتوح' : 'مغلق'} variant={isOpen ? 'success' : 'warning'} />;

  const handleSave = useCallback(async () => {
    if (!approved) {
      Alert.alert('تنبيه', 'لا يمكنك فتح المتجر قبل الموافقة من الإدارة.');
      return;
    }
    setSaving(true);
    try {
      await updateMyStore({ isOpen });
      Alert.alert('تم', 'تم تحديث حالة المتجر');
      router.back();
    } catch (e: unknown) {
      Alert.alert('خطأ', (e as Error).message || 'فشل الحفظ');
    } finally {
      setSaving(false);
    }
  }, [approved, isOpen]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>حالة المتجر</Text>
        <Text style={styles.back} onPress={() => router.back()}>رجوع</Text>
      </View>
      <View style={styles.content}>
        <Card>
          <CardSection>
            <SectionHeader title="فتح/غلق المتجر" subtitle="تحكم سريع بتوفر المتجر للطلبات" right={badge} />

            {!approved && (
              <Text style={styles.warn}>ملاحظة: المتجر قيد المراجعة، لا يمكن فتحه قبل الموافقة.</Text>
            )}

            <View style={styles.toggleWrap}>
              <Button
                title="مفتوح"
                onPress={() => setIsOpen(true)}
                variant={isOpen ? 'primary' : 'secondary'}
                disabled={!approved || loading}
                style={{ flex: 1 }}
              />
              <Button
                title="مغلق"
                onPress={() => setIsOpen(false)}
                variant={!isOpen ? 'primary' : 'secondary'}
                disabled={loading}
                style={{ flex: 1 }}
              />
            </View>

            <Text style={styles.hint}>
              عندما يكون المتجر <Text style={{ fontWeight: '900' }}>{isOpen ? 'مفتوح' : 'مغلق'}</Text>:\n
              {isOpen ? 'سيظهر للعميل ويمكن استقبال الطلبات.' : 'لن يظهر للعميل ولن تستقبل طلبات جديدة.'}
            </Text>

            <View style={{ marginTop: theme.spacing.lg, gap: 10 }}>
              <Button title="حفظ" onPress={handleSave} loading={saving} disabled={loading || !store} variant="primary" />
              <Button title="إلغاء" onPress={() => router.back()} variant="secondary" />
            </View>
          </CardSection>
        </Card>
      </View>
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
  headerTitle: { fontSize: 20, fontWeight: '900', color: theme.colors.text, textAlign: 'right' },
  back: { marginTop: 6, fontSize: 14, fontWeight: '800', color: theme.colors.primaryDark, textAlign: 'right' },
  content: { padding: theme.spacing.screenPadding },
  toggleWrap: { flexDirection: 'row', gap: 10, marginTop: theme.spacing.md },
  hint: { marginTop: theme.spacing.md, fontSize: 13, color: theme.colors.textSecondary, textAlign: 'right', lineHeight: 18 },
  warn: { marginTop: theme.spacing.md, fontSize: 13, color: theme.colors.error, textAlign: 'right' },
});

