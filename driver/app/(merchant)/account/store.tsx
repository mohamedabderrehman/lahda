import { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { getMyStore, updateMyStore } from '../../../api/client';
import { theme } from '../../../constants/theme';
import { Card, CardSection } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { SectionHeader } from '../../../components/ui/SectionHeader';

type Store = {
  storeName?: string;
  description?: string | null;
  phone?: string | null;
  email?: string | null;
  openingTime?: string | null;
  closingTime?: string | null;
  minOrder?: number | string | null;
  deliveryFee?: number | string | null;
};

export default function MerchantStoreInfoScreen() {
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [storeName, setStoreName] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [openingTime, setOpeningTime] = useState('');
  const [closingTime, setClosingTime] = useState('');
  const [minOrder, setMinOrder] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = (await getMyStore()) as Store;
      setStore(res);
      setStoreName(res.storeName ?? '');
      setDescription(res.description ?? '');
      setPhone(res.phone ?? '');
      setEmail(res.email ?? '');
      setOpeningTime(res.openingTime ?? '');
      setClosingTime(res.closingTime ?? '');
      setMinOrder(res.minOrder != null ? String(res.minOrder) : '');
    } catch {
      setStore(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = useCallback(async () => {
    if (saving) return;
    if (!storeName.trim()) return Alert.alert('خطأ', 'أدخل اسم المتجر');

    const min = minOrder.trim() ? Number(minOrder) : undefined;
    if (minOrder.trim() && !Number.isFinite(min!)) return Alert.alert('خطأ', 'الحد الأدنى غير صحيح');

    setSaving(true);
    try {
      await updateMyStore({
        storeName: storeName.trim(),
        description: description.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        openingTime: openingTime.trim() || undefined,
        closingTime: closingTime.trim() || undefined,
        minOrder: min,
      });
      Alert.alert('تم', 'تم حفظ معلومات المتجر');
      router.back();
    } catch (e: unknown) {
      Alert.alert('خطأ', (e as Error).message || 'فشل الحفظ');
    } finally {
      setSaving(false);
    }
  }, [saving, storeName, description, phone, email, openingTime, closingTime, minOrder]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>تعديل معلومات المتجر</Text>
        <Text style={styles.back} onPress={() => router.back()}>رجوع</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card>
          <CardSection>
            <SectionHeader title="معلومات المتجر" subtitle={loading ? 'جاري التحميل...' : 'حدّث بيانات المتجر التي تظهر للعميل'} />

            <Text style={styles.label}>اسم المتجر</Text>
            <TextInput style={styles.input} value={storeName} onChangeText={setStoreName} placeholder="اسم المتجر" placeholderTextColor={theme.colors.textMuted} />

            <Text style={styles.label}>وصف</Text>
            <TextInput style={[styles.input, styles.multiline]} value={description} onChangeText={setDescription} placeholder="نبذة عن المتجر" placeholderTextColor={theme.colors.textMuted} multiline numberOfLines={3} />

            <Text style={styles.label}>هاتف المتجر</Text>
            <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="رقم التواصل" placeholderTextColor={theme.colors.textMuted} keyboardType="phone-pad" />

            <Text style={styles.label}>إيميل المتجر</Text>
            <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="store@example.com" placeholderTextColor={theme.colors.textMuted} autoCapitalize="none" />

            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>وقت الفتح</Text>
                <TextInput style={styles.input} value={openingTime} onChangeText={setOpeningTime} placeholder="مثال: 10:00" placeholderTextColor={theme.colors.textMuted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>وقت الإغلاق</Text>
                <TextInput style={styles.input} value={closingTime} onChangeText={setClosingTime} placeholder="مثال: 23:00" placeholderTextColor={theme.colors.textMuted} />
              </View>
            </View>

            <Text style={styles.label}>الحد الأدنى للطلب</Text>
            <TextInput style={styles.input} value={minOrder} onChangeText={setMinOrder} placeholder="مثال: 3000" placeholderTextColor={theme.colors.textMuted} keyboardType="numeric" />

            <View style={[styles.infoBanner, { marginTop: theme.spacing.md, backgroundColor: theme.colors.primary + '10', borderColor: theme.colors.primary + '30' }]}>
              <Text style={[styles.infoBannerText, { color: theme.colors.primary }]}>
                رسوم التوصيل تُحسب تلقائياً حسب المسافة من نظام التسعير المركزي
              </Text>
            </View>

            <View style={{ marginTop: theme.spacing.lg, gap: 10 }}>
              <Button title="حفظ" onPress={handleSave} loading={saving} disabled={loading || !store} variant="primary" />
              <Button title="إلغاء" onPress={() => router.back()} variant="secondary" />
            </View>
          </CardSection>
        </Card>
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
  headerTitle: { fontSize: 20, fontWeight: '900', color: theme.colors.text, textAlign: 'right' },
  back: { marginTop: 6, fontSize: 14, fontWeight: '800', color: theme.colors.primaryDark, textAlign: 'right' },
  content: { padding: theme.spacing.screenPadding, paddingBottom: 40 },
  label: { marginTop: 14, fontSize: 13, fontWeight: '800', color: theme.colors.textSecondary, textAlign: 'right' },
  input: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    color: theme.colors.text,
    textAlign: 'right',
    backgroundColor: theme.colors.surfaceAlt,
  },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
  row2: { flexDirection: 'row', gap: 10 },
  infoBanner: {
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
  },
  infoBannerText: {
    fontSize: 13,
    fontFamily: 'Cairo_500Medium',
    textAlign: 'right',
  },
});

