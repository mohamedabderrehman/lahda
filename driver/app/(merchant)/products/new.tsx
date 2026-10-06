import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { createProduct, getMyProductCategories, getMyStore } from '../../../api/client';
import { theme } from '../../../constants/theme';
import { Card, CardSection } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { SectionHeader } from '../../../components/ui/SectionHeader';

type Store = { id: string; storeName?: string };
type ProductCategory = { id: string; nameAr: string; isActive?: boolean };

export default function NewProductScreen() {
  const [store, setStore] = useState<Store | null>(null);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [nameAr, setNameAr] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [productCategoryId, setProductCategoryId] = useState<string>('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, cats] = await Promise.all([getMyStore(), getMyProductCategories()]);
      setStore(s as Store);
      setCategories(((cats as ProductCategory[]) || []).filter((c) => c.isActive !== false));
    } catch {
      setStore(null);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const primaryCat = useMemo(() => categories[0]?.id ?? '', [categories]);
  useEffect(() => {
    if (!productCategoryId && primaryCat) setProductCategoryId(primaryCat);
  }, [primaryCat, productCategoryId]);

  const handleSave = useCallback(async () => {
    if (!store?.id) return;
    if (!nameAr.trim()) return Alert.alert('خطأ', 'أدخل اسم المنتج');
    const n = Number(price);
    if (!Number.isFinite(n) || n <= 0) return Alert.alert('خطأ', 'أدخل سعر صحيح');

    setSaving(true);
    try {
      await createProduct({
        merchantProfileId: store.id,
        productCategoryId: productCategoryId || undefined,
        nameAr: nameAr.trim(),
        description: description.trim() || undefined,
        price: n,
        imageUrl: imageUrl.trim() || undefined,
      });
      router.replace('/(merchant)/products');
    } catch (e: unknown) {
      Alert.alert('خطأ', (e as Error).message || 'فشل إضافة المنتج');
    } finally {
      setSaving(false);
    }
  }, [store?.id, nameAr, price, description, imageUrl, productCategoryId]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>إضافة منتج</Text>
        <Text style={styles.headerSub}>{store?.storeName ?? ''}</Text>
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card>
          <CardSection>
            <SectionHeader title="معلومات المنتج" subtitle={loading ? 'جاري التحميل...' : 'املأ المعلومات الأساسية'} />

            <Text style={styles.label}>اسم المنتج</Text>
            <TextInput style={styles.input} value={nameAr} onChangeText={setNameAr} placeholder="مثال: برغر دبل" placeholderTextColor={theme.colors.textMuted} />

            <Text style={styles.label}>السعر</Text>
            <TextInput style={styles.input} value={price} onChangeText={setPrice} placeholder="مثال: 1200" placeholderTextColor={theme.colors.textMuted} keyboardType="numeric" />

            <Text style={styles.label}>وصف (اختياري)</Text>
            <TextInput style={[styles.input, styles.multiline]} value={description} onChangeText={setDescription} placeholder="تفاصيل المنتج" placeholderTextColor={theme.colors.textMuted} multiline numberOfLines={3} />

            <Text style={styles.label}>رابط صورة (اختياري)</Text>
            <TextInput style={styles.input} value={imageUrl} onChangeText={setImageUrl} placeholder="https://..." placeholderTextColor={theme.colors.textMuted} autoCapitalize="none" />

            <Text style={styles.label}>التصنيف</Text>
            <View style={styles.chips}>
              {categories.length === 0 ? (
                <Text style={styles.hint}>لا توجد تصنيفات. أضف تصنيف من شاشة “التصنيفات”.</Text>
              ) : (
                categories.slice(0, 12).map((c) => (
                  <Chip key={c.id} label={c.nameAr} active={productCategoryId === c.id} onPress={() => setProductCategoryId(c.id)} />
                ))
              )}
            </View>

            <View style={{ marginTop: theme.spacing.lg, gap: 10 }}>
              <Button title="حفظ" onPress={handleSave} loading={saving} disabled={loading || !store?.id} variant="primary" />
              <Button title="إلغاء" onPress={() => router.back()} variant="secondary" />
            </View>
          </CardSection>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    paddingHorizontal: theme.spacing.screenPadding,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  headerTitle: { fontSize: 20, fontWeight: '900', color: theme.colors.text, textAlign: 'right' },
  headerSub: { fontSize: 13, color: theme.colors.textSecondary, textAlign: 'right', marginTop: 2 },
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
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8, justifyContent: 'flex-end' },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: theme.radius.full, backgroundColor: theme.colors.surfaceAlt },
  chipActive: { backgroundColor: theme.colors.primary },
  chipText: { fontSize: 13, fontWeight: '800', color: theme.colors.textSecondary },
  chipTextActive: { color: theme.colors.white },
  hint: { fontSize: 13, color: theme.colors.textSecondary, textAlign: 'right' },
});

