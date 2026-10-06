import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Image, Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconArrowForward } from '../components/Icons';
import { EmptyState } from '../components/ui';
import { useTheme } from '../contexts/ThemeContext';
import { getFavorites, toggleFavorite } from '../api/client';
import { formatPrice } from '../constants/theme';
import { CustomerHeader } from '../components/customer-header';

type FavStore = { id: string; storeName: string; storeSlug: string; logoUrl?: string | null; ratingAvg?: number; ratingCount?: number };
type FavProduct = { id: string; nameAr: string; price: number; imageUrl?: string | null; merchantProfile?: { storeName: string; storeSlug: string } };
type Tab = 'stores' | 'products';

export default function FavoritesScreen() {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [tab, setTab] = useState<Tab>('stores');
  const [stores, setStores] = useState<FavStore[]>([]);
  const [products, setProducts] = useState<FavProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getFavorites();
      setStores((res.stores || []) as FavStore[]);
      setProducts((res.products || []) as FavProduct[]);
    } catch {
      setStores([]);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleUnfav = useCallback(async (type: 'store' | 'product', id: string) => {
    try {
      await toggleFavorite(type, id);
      load();
    } catch (e: unknown) {
      Alert.alert('Error', (e as Error).message);
    }
  }, [load]);

  const renderStore = useCallback(({ item }: { item: FavStore }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => router.push(`/store/${item.storeSlug}`)}
    >
      {item.logoUrl ? (
        <Image source={{ uri: item.logoUrl }} style={styles.cardImg} />
      ) : (
        <View style={[styles.cardImg, styles.cardImgPlaceholder]}>
          <Text style={{ fontSize: 20, color: t.colors.textMuted }}>{'\uD83C\uDFEA'}</Text>
        </View>
      )}
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.storeName}</Text>
        {(item.ratingCount ?? 0) > 0 && (
          <Text style={styles.cardSub}>{'\u2B50'} {(item.ratingAvg ?? 0).toFixed(1)} ({item.ratingCount})</Text>
        )}
      </View>
      <TouchableOpacity onPress={() => handleUnfav('store', item.id)} style={styles.heartBtn}>
        <Text style={{ fontSize: 18, color: t.colors.discount }}>{'\u2764\uFE0F'}</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  ), [styles, t, handleUnfav]);

  const renderProduct = useCallback(({ item }: { item: FavProduct }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => router.push(`/product/${item.id}`)}
    >
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.cardImg} />
      ) : (
        <View style={[styles.cardImg, styles.cardImgPlaceholder]}>
          <Text style={{ fontSize: 20, color: t.colors.textMuted }}>{'\uD83D\uDED2'}</Text>
        </View>
      )}
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.nameAr}</Text>
        <Text style={styles.cardSub}>{formatPrice(item.price)}</Text>
        {item.merchantProfile && <Text style={styles.cardMeta} numberOfLines={1}>{item.merchantProfile.storeName}</Text>}
      </View>
      <TouchableOpacity onPress={() => handleUnfav('product', item.id)} style={styles.heartBtn}>
        <Text style={{ fontSize: 18, color: t.colors.discount }}>{'\u2764\uFE0F'}</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  ), [styles, t, handleUnfav]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <CustomerHeader title="المفضلة" />

      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tabBtn, tab === 'stores' && styles.tabBtnActive]} onPress={() => setTab('stores')} activeOpacity={0.85}>
          <Text style={[styles.tabText, tab === 'stores' && styles.tabTextActive]}>متاجر</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, tab === 'products' && styles.tabBtnActive]} onPress={() => setTab('products')} activeOpacity={0.85}>
          <Text style={[styles.tabText, tab === 'products' && styles.tabTextActive]}>منتجات</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={t.colors.primary} style={styles.loader} />
      ) : tab === 'stores' ? (
        stores.length === 0 ? (
          <EmptyState kind="favorites" title="لا متاجر مفضلة" message="المتاجر التي تحفظها ستظهر هنا" />
        ) : (
          <FlatList data={stores} keyExtractor={(i) => i.id} contentContainerStyle={styles.list} renderItem={renderStore} />
        )
      ) : (
        products.length === 0 ? (
          <EmptyState kind="favorites" title="لا منتجات مفضلة" message="المنتجات التي تحفظها ستظهر هنا" />
        ) : (
          <FlatList data={products} keyExtractor={(i) => i.id} contentContainerStyle={styles.list} renderItem={renderProduct} />
        )
      )}
    </SafeAreaView>
  );
}

const makeStyles = (t: ReturnType<typeof useTheme>) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: t.spacing.screenPadding,
    paddingVertical: t.spacing.lg,
    backgroundColor: t.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.borderLight,
  },
  backBtn: { padding: t.spacing.md },
  headerTitle: { flex: 1, ...t.typography.titleLarge, color: t.colors.text, textAlign: 'center' },
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: t.spacing.screenPadding,
    marginTop: t.spacing.md,
    marginBottom: t.spacing.md,
    backgroundColor: 'transparent',
    borderRadius: 0,
    padding: t.spacing.xs,
  },
  tabBtn: { flex: 1, paddingVertical: t.spacing.sm, alignItems: 'center', borderRadius: t.radius.sm, borderBottomWidth: 2, borderColor: 'transparent' },
  tabBtnActive: { borderColor: t.colors.primary },
  tabText: { ...t.typography.body, fontFamily: t.fonts.medium, color: t.colors.textSecondary },
  tabTextActive: { color: t.colors.primary, fontFamily: t.fonts.bold },
  loader: { flex: 1 },
  list: { paddingHorizontal: t.spacing.screenPadding, paddingBottom: t.spacing.xxl },
  card: {
    flexDirection: 'row',
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.md,
    marginBottom: t.spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.colors.borderLight,
    overflow: 'hidden',
    alignItems: 'center',
  },
  cardImg: { width: 96, height: 96 },
  cardImgPlaceholder: { backgroundColor: t.colors.backgroundSecondary, alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1, padding: t.spacing.lg },
  cardTitle: { ...t.typography.titleMedium, fontFamily: t.fonts.extraBold, color: t.colors.text, textAlign: 'right' },
  cardSub: { ...t.typography.body, fontFamily: t.fonts.medium, color: t.colors.textSecondary, marginTop: t.spacing.xs, textAlign: 'right' },
  cardMeta: { ...t.typography.caption, color: t.colors.textMuted, marginTop: t.spacing.xs, textAlign: 'right' },
  heartBtn: { padding: t.spacing.md },
});
