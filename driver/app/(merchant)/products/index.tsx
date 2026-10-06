import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { getMyStore, getMyProductCategories, updateProduct } from '../../../api/client';
import { formatPrice, theme } from '../../../constants/theme';
import { Card, CardSection } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { SectionHeader } from '../../../components/ui/SectionHeader';
import { EmptyState } from '../../../components/ui/EmptyState';
import { addNotificationListener } from '../../../hooks/useNotifications';

type Product = {
  id: string;
  nameAr: string;
  price: number | string;
  imageUrl?: string | null;
  isAvailable?: boolean;
  sortOrder?: number;
  productCategoryId?: string | null;
};

type Store = {
  id: string;
  storeName?: string;
  products?: Product[];
};

type ProductCategory = { id: string; nameAr: string; isActive?: boolean; sortOrder?: number };

export default function MerchantProductsScreen() {
  const [store, setStore] = useState<Store | null>(null);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [s, cats] = await Promise.all([getMyStore(), getMyProductCategories()]);
      setStore(s as Store);
      setCategories((cats as ProductCategory[]) || []);
    } catch {
      setStore(null);
      setCategories([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load(true);
    }, [load]),
  );

  useEffect(() => {
    const intervalId = setInterval(() => {
      load(true);
    }, 10000);
    return () => clearInterval(intervalId);
  }, [load]);

  // Reload on new orders (products may change status)
  useEffect(() => {
    const unsubscribe = addNotificationListener((payload) => {
      if (payload.type === 'new_order') {
        load(true);
      }
    });
    return () => { unsubscribe(); };
  }, [load]);

  const catNameById = useMemo(() => {
    const m = new Map<string, string>();
    categories.forEach((c) => m.set(c.id, c.nameAr));
    return m;
  }, [categories]);

  const products = store?.products ?? [];
  const filtered = useMemo(() => {
    const q = search.trim();
    return products.filter((p) => {
      const okCat = categoryId ? p.productCategoryId === categoryId : true;
      const okSearch = q ? (p.nameAr || '').includes(q) : true;
      return okCat && okSearch;
    });
  }, [products, search, categoryId]);

  const toggleAvailability = useCallback(async (p: Product) => {
    if (togglingId) return;
    setTogglingId(p.id);
    try {
      await updateProduct(p.id, { isAvailable: !(p.isAvailable !== false) });
      await load(true);
    } finally {
      setTogglingId(null);
    }
  }, [togglingId, load]);

  const Header = (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>المنتجات</Text>
      <Text style={styles.headerSub}>{store?.storeName ?? ''}</Text>
    </View>
  );

  if (loading && !store) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        {Header}
        <ActivityIndicator size="large" color={theme.colors.primary} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {Header}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={theme.colors.primary} />}
        ListHeaderComponent={
          <View style={{ gap: 12 }}>
            <Card>
              <CardSection>
                <SectionHeader title="إدارة المنتجات" subtitle="إضافة/تعديل/تفعيل أو تعطيل المنتجات" />
                <View style={styles.actionsRow}>
                  <Button title="إضافة منتج" onPress={() => router.push('/(merchant)/products/new')} variant="primary" style={{ flex: 1 }} />
                  <Button title="التصنيفات" onPress={() => router.push('/(merchant)/products/categories')} variant="secondary" style={{ flex: 1 }} />
                </View>
              </CardSection>
            </Card>

            <Card>
              <CardSection>
                <Text style={styles.label}>بحث</Text>
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="ابحث باسم المنتج"
                  placeholderTextColor={theme.colors.textMuted}
                  style={styles.input}
                />
                <Text style={[styles.label, { marginTop: 12 }]}>فلترة حسب التصنيف</Text>
                <View style={styles.chips}>
                  <Chip label="الكل" active={!categoryId} onPress={() => setCategoryId('')} />
                  {categories
                    .filter((c) => c.isActive !== false)
                    .slice(0, 10)
                    .map((c) => (
                      <Chip key={c.id} label={c.nameAr} active={categoryId === c.id} onPress={() => setCategoryId(c.id)} />
                    ))}
                </View>
              </CardSection>
            </Card>
          </View>
        }
        renderItem={({ item }) => {
          const available = item.isAvailable !== false;
          const catLabel = item.productCategoryId ? catNameById.get(item.productCategoryId) : undefined;
          return (
            <TouchableOpacity activeOpacity={0.9} onPress={() => router.push(`/(merchant)/products/${item.id}`)} style={styles.productCard}>
              <View style={{ flex: 1 }}>
                <View style={styles.productTopRow}>
                  <Text style={styles.productName} numberOfLines={1}>{item.nameAr}</Text>
                  <Badge label={available ? 'متاح' : 'غير متاح'} variant={available ? 'success' : 'danger'} />
                </View>
                <Text style={styles.productMeta}>
                  {formatPrice(item.price)}{catLabel ? ` · ${catLabel}` : ''}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => toggleAvailability(item)}
                disabled={togglingId === item.id}
                style={[styles.toggleBtn, available ? styles.toggleBtnOff : styles.toggleBtnOn]}
              >
                <Text style={[styles.toggleBtnText, available ? styles.toggleBtnTextOff : styles.toggleBtnTextOn]}>
                  {togglingId === item.id ? '...' : available ? 'تعطيل' : 'تفعيل'}
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <Card style={{ marginTop: 16 }}>
            <EmptyState
              title="لا توجد منتجات"
              subtitle="أضف أول منتج ليظهر في تطبيق العملاء."
              action={<Button title="إضافة منتج الآن" onPress={() => router.push('/(merchant)/products/new')} variant="primary" style={{ marginTop: 6 }} />}
            />
          </Card>
        }
      />
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
  headerTitle: { fontSize: 20, fontWeight: '900', fontFamily: 'Cairo_900Black', color: theme.colors.text, textAlign: 'right' },
  headerSub: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: theme.colors.textSecondary, textAlign: 'right', marginTop: 2 },
  content: { padding: theme.spacing.screenPadding, paddingBottom: 40, gap: 12 },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: theme.spacing.md },
  label: { fontSize: 13, fontWeight: '800', fontFamily: 'Cairo_800ExtraBold', color: theme.colors.textSecondary, textAlign: 'right' },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    color: theme.colors.text,
    textAlign: 'right',
    marginTop: 6,
    backgroundColor: theme.colors.surfaceAlt,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8, justifyContent: 'flex-end' },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: theme.radius.full, backgroundColor: theme.colors.surfaceAlt },
  chipActive: { backgroundColor: theme.colors.primary },
  chipText: { fontSize: 13, fontWeight: '800', fontFamily: 'Cairo_800ExtraBold', color: theme.colors.textSecondary },
  chipTextActive: { color: theme.colors.white },
  productCard: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    padding: theme.spacing.lg,
    ...theme.shadow.card,
  },
  productTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  productName: { fontSize: 16, fontWeight: '900', fontFamily: 'Cairo_900Black', color: theme.colors.text, textAlign: 'right', flex: 1 },
  productMeta: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: theme.colors.textSecondary, marginTop: 6, textAlign: 'right' },
  toggleBtn: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: theme.radius.lg, borderWidth: 1 },
  toggleBtnOn: { backgroundColor: theme.colors.success + '1A', borderColor: theme.colors.success + '55' },
  toggleBtnOff: { backgroundColor: theme.colors.error + '12', borderColor: theme.colors.error + '44' },
  toggleBtnText: { fontSize: 13, fontWeight: '900', fontFamily: 'Cairo_900Black' },
  toggleBtnTextOn: { color: theme.colors.success },
  toggleBtnTextOff: { color: theme.colors.error },
});

