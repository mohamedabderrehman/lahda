import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
  deleteProduct, getMyProductCategories, getMyStore, updateProduct,
  getProductOptions, createProductOption, updateProductOption, deleteProductOption,
} from '../../../api/client';
import { theme, formatPrice } from '../../../constants/theme';
import { Card, CardSection } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { SectionHeader } from '../../../components/ui/SectionHeader';

type Product = {
  id: string;
  nameAr: string;
  price: number | string;
  description?: string | null;
  imageUrl?: string | null;
  isAvailable?: boolean;
  productCategoryId?: string | null;
};

type Store = { storeName?: string; products?: Product[] };
type ProductCategory = { id: string; nameAr: string; isActive?: boolean };
type ProductOptionItem = { id: string; name: string; priceModifier: number | string };

export default function EditProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [store, setStore] = useState<Store | null>(null);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [nameAr, setNameAr] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [productCategoryId, setProductCategoryId] = useState<string>('');
  const [isAvailable, setIsAvailable] = useState(true);

  const [options, setOptions] = useState<ProductOptionItem[]>([]);
  const [newOptName, setNewOptName] = useState('');
  const [newOptPrice, setNewOptPrice] = useState('');
  const [optSaving, setOptSaving] = useState(false);
  const [editOptId, setEditOptId] = useState<string | null>(null);
  const [editOptName, setEditOptName] = useState('');
  const [editOptPrice, setEditOptPrice] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [s, cats, opts] = await Promise.all([
        getMyStore(),
        getMyProductCategories(),
        getProductOptions(id),
      ]);
      setStore(s as Store);
      setCategories(((cats as ProductCategory[]) || []).filter((c) => c.isActive !== false));
      setOptions(opts ?? []);
    } catch {
      setStore(null);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const product = useMemo(() => {
    const list = store?.products ?? [];
    return list.find((p) => p.id === id) ?? null;
  }, [store, id]);

  useEffect(() => {
    if (!product) return;
    setNameAr(product.nameAr ?? '');
    setPrice(String(product.price ?? ''));
    setDescription(product.description ?? '');
    setImageUrl(product.imageUrl ?? '');
    setProductCategoryId(product.productCategoryId ?? '');
    setIsAvailable(product.isAvailable !== false);
  }, [product?.id]);

  const handleSave = useCallback(async () => {
    if (!id) return;
    if (!nameAr.trim()) return Alert.alert('خطأ', 'أدخل اسم المنتج');
    const n = Number(price);
    if (!Number.isFinite(n) || n <= 0) return Alert.alert('خطأ', 'أدخل سعر صحيح');

    setSaving(true);
    try {
      await updateProduct(id, {
        nameAr: nameAr.trim(),
        price: n,
        description: description.trim() || undefined,
        imageUrl: imageUrl.trim() || undefined,
        productCategoryId: productCategoryId || null,
        isAvailable,
      });
      router.replace('/(merchant)/products');
    } catch (e: unknown) {
      Alert.alert('خطأ', (e as Error).message || 'فشل حفظ التعديلات');
    } finally {
      setSaving(false);
    }
  }, [id, nameAr, price, description, imageUrl, productCategoryId, isAvailable]);

  const handleDelete = useCallback(() => {
    if (!id) return;
    Alert.alert('حذف المنتج', 'هل تريد حذف هذا المنتج نهائياً؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف',
        style: 'destructive',
        onPress: async () => {
          setSaving(true);
          try {
            await deleteProduct(id);
            router.replace('/(merchant)/products');
          } catch (e: unknown) {
            Alert.alert('خطأ', (e as Error).message || 'فشل حذف المنتج');
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  }, [id]);

  const handleAddOption = useCallback(async () => {
    if (!id || optSaving) return;
    if (!newOptName.trim()) return Alert.alert('خطأ', 'أدخل اسم الإضافة');
    const p = Number(newOptPrice) || 0;
    setOptSaving(true);
    try {
      const created = await createProductOption(id, { name: newOptName.trim(), priceModifier: p });
      setOptions((prev) => [...prev, created as ProductOptionItem]);
      setNewOptName('');
      setNewOptPrice('');
    } catch (e: unknown) {
      Alert.alert('خطأ', (e as Error).message || 'فشل إضافة الخيار');
    } finally {
      setOptSaving(false);
    }
  }, [id, optSaving, newOptName, newOptPrice]);

  const handleSaveOption = useCallback(async () => {
    if (!editOptId || optSaving) return;
    setOptSaving(true);
    try {
      const updated = await updateProductOption(editOptId, {
        name: editOptName.trim() || undefined,
        priceModifier: Number(editOptPrice) || 0,
      });
      setOptions((prev) => prev.map((o) => (o.id === editOptId ? { ...o, ...(updated as ProductOptionItem) } : o)));
      setEditOptId(null);
    } catch (e: unknown) {
      Alert.alert('خطأ', (e as Error).message || 'فشل تعديل الخيار');
    } finally {
      setOptSaving(false);
    }
  }, [editOptId, optSaving, editOptName, editOptPrice]);

  const handleDeleteOption = useCallback((optId: string) => {
    Alert.alert('حذف الإضافة', 'هل أنت متأكد؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteProductOption(optId);
            setOptions((prev) => prev.filter((o) => o.id !== optId));
          } catch (e: unknown) {
            Alert.alert('خطأ', (e as Error).message || 'فشل حذف الخيار');
          }
        },
      },
    ]);
  }, []);

  const statusBadge = <Badge label={isAvailable ? 'متاح' : 'غير متاح'} variant={isAvailable ? 'success' : 'danger'} />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>تعديل منتج</Text>
        <Text style={styles.headerSub}>{store?.storeName ?? ''}</Text>
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card>
          <CardSection>
            <SectionHeader title={product?.nameAr ?? '—'} subtitle="تعديل التفاصيل والتوفر" right={statusBadge} />

            {!product && !loading ? (
              <Text style={styles.hint}>لم يتم العثور على المنتج ضمن متجرك.</Text>
            ) : (
              <>
                <Text style={styles.label}>اسم المنتج</Text>
                <TextInput style={styles.input} value={nameAr} onChangeText={setNameAr} placeholder="اسم المنتج" placeholderTextColor={theme.colors.textMuted} />

                <Text style={styles.label}>السعر</Text>
                <TextInput style={styles.input} value={price} onChangeText={setPrice} placeholder="السعر" placeholderTextColor={theme.colors.textMuted} keyboardType="numeric" />

                <Text style={styles.label}>وصف (اختياري)</Text>
                <TextInput style={[styles.input, styles.multiline]} value={description} onChangeText={setDescription} placeholder="تفاصيل المنتج" placeholderTextColor={theme.colors.textMuted} multiline numberOfLines={3} />

                <Text style={styles.label}>رابط صورة (اختياري)</Text>
                <TextInput style={styles.input} value={imageUrl} onChangeText={setImageUrl} placeholder="https://..." placeholderTextColor={theme.colors.textMuted} autoCapitalize="none" />

                <Text style={styles.label}>التصنيف</Text>
                <View style={styles.chips}>
                  <Chip label="بدون تصنيف" active={!productCategoryId} onPress={() => setProductCategoryId('')} />
                  {categories.slice(0, 12).map((c) => (
                    <Chip key={c.id} label={c.nameAr} active={productCategoryId === c.id} onPress={() => setProductCategoryId(c.id)} />
                  ))}
                </View>

                <View style={{ marginTop: theme.spacing.lg, gap: 10 }}>
                  <Button title={isAvailable ? 'تعطيل المنتج' : 'تفعيل المنتج'} onPress={() => setIsAvailable((v) => !v)} variant={isAvailable ? 'secondary' : 'primary'} />
                  <Button title="حفظ" onPress={handleSave} loading={saving} disabled={loading || !product} variant="primary" />
                  <Button title="حذف المنتج" onPress={handleDelete} disabled={loading || !product} variant="danger" />
                  <Button title="رجوع" onPress={() => router.back()} variant="ghost" />
                </View>
              </>
            )}
          </CardSection>
        </Card>

        {product && (
          <Card>
            <CardSection>
              <SectionHeader title="الإضافات" subtitle="إضافات يمكن للعميل اختيارها مع المنتج" />

              {options.length === 0 && (
                <Text style={styles.hint}>لا توجد إضافات بعد. أضف إضافة أدناه.</Text>
              )}

              {options.map((opt) => (
                <View key={opt.id} style={styles.optRow}>
                  {editOptId === opt.id ? (
                    <View style={styles.optEditRow}>
                      <TextInput
                        style={[styles.input, { flex: 1 }]}
                        value={editOptName}
                        onChangeText={setEditOptName}
                        placeholder="الاسم"
                        placeholderTextColor={theme.colors.textMuted}
                      />
                      <TextInput
                        style={[styles.input, { width: 80 }]}
                        value={editOptPrice}
                        onChangeText={setEditOptPrice}
                        placeholder="السعر"
                        placeholderTextColor={theme.colors.textMuted}
                        keyboardType="numeric"
                      />
                      <TouchableOpacity onPress={handleSaveOption} style={styles.optActionBtn}>
                        <Text style={styles.optActionSave}>✓</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setEditOptId(null)} style={styles.optActionBtn}>
                        <Text style={styles.optActionCancel}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.optName}>{opt.name}</Text>
                        <Text style={styles.optPrice}>
                          {Number(opt.priceModifier) > 0 ? `+${formatPrice(opt.priceModifier)}` : 'مجاني'}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => {
                          setEditOptId(opt.id);
                          setEditOptName(opt.name);
                          setEditOptPrice(String(opt.priceModifier ?? 0));
                        }}
                        style={styles.optActionBtn}
                      >
                        <Text style={styles.optActionEdit}>✎</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteOption(opt.id)} style={styles.optActionBtn}>
                        <Text style={styles.optActionDelete}>✕</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              ))}

              <View style={styles.addOptRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={newOptName}
                  onChangeText={setNewOptName}
                  placeholder="اسم الإضافة"
                  placeholderTextColor={theme.colors.textMuted}
                />
                <TextInput
                  style={[styles.input, { width: 80 }]}
                  value={newOptPrice}
                  onChangeText={setNewOptPrice}
                  placeholder="السعر"
                  placeholderTextColor={theme.colors.textMuted}
                  keyboardType="numeric"
                />
              </View>
              <Button title="إضافة خيار" onPress={handleAddOption} loading={optSaving} variant="secondary" />
            </CardSection>
          </Card>
        )}
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
  hint: { fontSize: 14, color: theme.colors.textSecondary, textAlign: 'right', marginTop: 12 },
  optRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  optEditRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  optName: { fontSize: 14, fontWeight: '700', color: theme.colors.text, textAlign: 'right' },
  optPrice: { fontSize: 12, color: theme.colors.primary, textAlign: 'right', marginTop: 2 },
  optActionBtn: { padding: 8 },
  optActionSave: { fontSize: 18, color: theme.colors.success, fontWeight: '700' },
  optActionCancel: { fontSize: 16, color: theme.colors.textSecondary, fontWeight: '700' },
  optActionEdit: { fontSize: 16, color: theme.colors.primary },
  optActionDelete: { fontSize: 16, color: theme.colors.error, fontWeight: '700' },
  addOptRow: { flexDirection: 'row', gap: 8, marginTop: theme.spacing.md, marginBottom: theme.spacing.sm },
});

