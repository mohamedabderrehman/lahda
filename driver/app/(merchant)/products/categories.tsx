import { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList, Alert, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { createMyProductCategory, deleteMyProductCategory, getMyProductCategories, updateMyProductCategory } from '../../../api/client';
import { theme } from '../../../constants/theme';
import { Card, CardSection } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { SectionHeader } from '../../../components/ui/SectionHeader';
import { EmptyState } from '../../../components/ui/EmptyState';

type ProductCategory = { id: string; nameAr: string; nameEn?: string | null; sortOrder?: number; isActive?: boolean };

export default function ProductCategoriesScreen() {
  const [items, setItems] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [newName, setNewName] = useState('');
  const [edit, setEdit] = useState<{ id: string; name: string } | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await getMyProductCategories();
      setItems((res as ProductCategory[]) || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addCategory = useCallback(async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      await createMyProductCategory({ nameAr: newName.trim(), sortOrder: 0, isActive: true });
      setNewName('');
      await load(true);
    } catch (e: unknown) {
      Alert.alert('خطأ', (e as Error).message || 'فشل إضافة التصنيف');
    } finally {
      setSaving(false);
    }
  }, [newName, load]);

  const toggleActive = useCallback(async (c: ProductCategory) => {
    if (saving) return;
    setSaving(true);
    try {
      await updateMyProductCategory(c.id, { isActive: !(c.isActive !== false) });
      await load(true);
    } catch (e: unknown) {
      Alert.alert('خطأ', (e as Error).message || 'فشل التحديث');
    } finally {
      setSaving(false);
    }
  }, [saving, load]);

  const rename = useCallback((c: ProductCategory) => {
    setEdit({ id: c.id, name: c.nameAr });
  }, []);

  const saveRename = useCallback(async () => {
    if (!edit) return;
    const next = edit.name.trim();
    if (!next) return;
    setSaving(true);
    try {
      await updateMyProductCategory(edit.id, { nameAr: next });
      setEdit(null);
      await load(true);
    } catch (e: unknown) {
      Alert.alert('خطأ', (e as Error).message || 'فشل التحديث');
    } finally {
      setSaving(false);
    }
  }, [edit, load]);

  const remove = useCallback((c: ProductCategory) => {
    Alert.alert('حذف التصنيف', 'هل تريد حذف هذا التصنيف؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف',
        style: 'destructive',
        onPress: async () => {
          setSaving(true);
          try {
            await deleteMyProductCategory(c.id);
            await load(true);
          } catch (e: unknown) {
            Alert.alert('خطأ', (e as Error).message || 'فشل الحذف');
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  }, [load]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>التصنيفات</Text>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.back}>رجوع</Text></TouchableOpacity>
      </View>

      {edit && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>تعديل اسم التصنيف</Text>
            <TextInput
              value={edit.name}
              onChangeText={(t) => setEdit({ ...edit, name: t })}
              placeholder="اسم التصنيف"
              placeholderTextColor={theme.colors.textMuted}
              style={styles.input}
            />
            <View style={styles.modalActions}>
              <Button title="حفظ" onPress={saveRename} loading={saving} variant="primary" style={{ flex: 1 }} />
              <Button title="إلغاء" onPress={() => setEdit(null)} variant="secondary" style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      )}

      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={theme.colors.primary} />}
        ListHeaderComponent={
          <Card>
            <CardSection>
              <SectionHeader title="إضافة تصنيف" subtitle="قسّم منتجاتك لسهولة الإدارة" />
              <TextInput
                value={newName}
                onChangeText={setNewName}
                placeholder="اسم التصنيف (مثال: برغر)"
                placeholderTextColor={theme.colors.textMuted}
                style={styles.input}
              />
              <View style={{ marginTop: 10 }}>
                <Button title="إضافة" onPress={addCategory} loading={saving} disabled={!newName.trim() || loading} variant="primary" />
              </View>
            </CardSection>
          </Card>
        }
        renderItem={({ item }) => {
          const active = item.isActive !== false;
          return (
            <Card style={styles.rowCard}>
              <CardSection style={{ paddingVertical: 14 }}>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{item.nameAr}</Text>
                    <Text style={styles.rowSub}>ترتيب: {item.sortOrder ?? 0}</Text>
                  </View>
                  <Badge label={active ? 'مفعل' : 'غير مفعل'} variant={active ? 'success' : 'danger'} />
                </View>
                <View style={styles.rowActions}>
                  <Button title={active ? 'إيقاف' : 'تفعيل'} onPress={() => toggleActive(item)} variant="secondary" style={{ flex: 1 }} />
                  <Button title="تعديل" onPress={() => rename(item)} variant="secondary" style={{ flex: 1 }} />
                  <Button title="حذف" onPress={() => remove(item)} variant="danger" style={{ flex: 1 }} />
                </View>
              </CardSection>
            </Card>
          );
        }}
        ListEmptyComponent={
          !loading ? (
            <Card style={{ marginTop: 16 }}>
              <EmptyState title="لا توجد تصنيفات" subtitle="أضف تصنيفًا واحدًا على الأقل لتنظيم المنتجات." />
            </Card>
          ) : null
        }
      />
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '900', color: theme.colors.text },
  back: { fontSize: 14, fontWeight: '800', color: theme.colors.primaryDark },
  content: { padding: theme.spacing.screenPadding, paddingBottom: 40, gap: 12 },
  input: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    color: theme.colors.text,
    textAlign: 'right',
    backgroundColor: theme.colors.surfaceAlt,
  },
  rowCard: { marginTop: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowTitle: { fontSize: 16, fontWeight: '900', color: theme.colors.text, textAlign: 'right' },
  rowSub: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2, textAlign: 'right' },
  rowActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  modalOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: theme.colors.overlay,
    zIndex: 50,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.screenPadding,
  },
  modalCard: {
    width: '100%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    ...theme.shadow.card,
  },
  modalTitle: { fontSize: 16, fontWeight: '900', color: theme.colors.text, textAlign: 'right' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
});

