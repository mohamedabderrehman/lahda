import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search } from 'lucide-react-native';
import { getMerchants, searchProducts } from '../../api/client';
import { useTheme } from '../../contexts/ThemeContext';
import { FoodSearchField, RestaurantCard, EmptyMoment } from '../../components/food-ui';
import { formatPrice } from '../../constants/theme';
import { TactilePressable } from '../../components/sunset';

type Merchant = { id: string; storeName: string; storeSlug: string; logoUrl?: string | null; coverUrl?: string | null; deliveryFee?: string | number | null; isOpen?: boolean; hasOffers?: boolean; ratingAvg?: number; estimatedDeliveryMin?: number | null; estimatedDeliveryMax?: number | null; discountLabel?: string | null };
type Product = { id: string; nameAr: string; price: number; imageUrl?: string | null; merchantProfile?: { storeName: string; storeSlug: string } };

export default function SearchScreen() {
  const t = useTheme(); const styles = useMemo(() => makeStyles(t), [t]);
  const params = useLocalSearchParams<{ q?: string; categoryId?: string }>();
  const [query, setQuery] = useState(params.q || ''); const [type, setType] = useState<'stores' | 'products'>('stores');
  const [stores, setStores] = useState<Merchant[]>([]); const [products, setProducts] = useState<Product[]>([]); const [loading, setLoading] = useState(true);
  useEffect(() => { setQuery(params.q || ''); }, [params.q]);
  const load = useCallback(async () => { setLoading(true); try {
    if (type === 'stores') { const list = await getMerchants(typeof params.categoryId === 'string' ? params.categoryId : undefined); const filter = query.trim().toLocaleLowerCase('ar'); setStores((Array.isArray(list) ? list : []).filter((item) => !filter || item.storeName.toLocaleLowerCase('ar').includes(filter))); }
    else { const response = query.trim() ? await searchProducts(query.trim()) : { items: [] }; setProducts(response.items ?? []); }
  } catch { setStores([]); setProducts([]); } finally { setLoading(false); } }, [params.categoryId, query, type]);
  useEffect(() => { void load(); }, [load]);
  const data: Array<Merchant | Product> = type === 'stores' ? stores : products;
  return <SafeAreaView style={styles.safe} edges={['top']}><FlatList data={data} key={type} keyExtractor={(item) => item.id} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}
    ListHeaderComponent={<><View style={styles.header}><Text style={styles.title}>استكشف</Text><Text style={styles.subtitle}>ابحث عن مطعم أو طبق تحبه</Text></View><FoodSearchField value={query} onChangeText={setQuery} onSubmit={() => void load()} /><View style={styles.switcher}><Pressable style={[styles.switch, type === 'products' && styles.switchActive]} onPress={() => setType('products')}><Text style={[styles.switchText, type === 'products' && styles.switchTextActive]}>أطباق</Text></Pressable><Pressable style={[styles.switch, type === 'stores' && styles.switchActive]} onPress={() => setType('stores')}><Text style={[styles.switchText, type === 'stores' && styles.switchTextActive]}>مطاعم</Text></Pressable></View>{loading ? <ActivityIndicator color={t.colors.primary} style={styles.loader} /> : null}</>}
    renderItem={({ item }) => type === 'stores' ? <RestaurantCard restaurant={item as Merchant} /> : <ProductRow product={item as unknown as Product} />}
    ListEmptyComponent={!loading ? <EmptyMoment kind="search" title={query.trim() ? 'لم نجد نتائج مطابقة' : type === 'products' ? 'ابحث عن طبق' : 'ابدأ الاستكشاف'} message={query.trim() ? 'جرّب اسماً آخر أو تصفح المطاعم.' : type === 'products' ? 'اكتب اسم طبق أو مكوّن للبحث.' : 'اكتب اسم مطعم أو تصنيف لتحصل على نتائج.'} /> : null}
  /></SafeAreaView>;
  function ProductRow({ product }: { product: Product }) { return <TactilePressable style={styles.product} onPress={() => router.push(`/product/${product.id}`)}><View style={styles.productInfo}><Text style={styles.productName} numberOfLines={2}>{product.nameAr}</Text>{product.merchantProfile ? <Text style={styles.productStore} numberOfLines={1}>{product.merchantProfile.storeName}</Text> : null}<Text style={styles.productPrice}>{formatPrice(product.price)}</Text></View>{product.imageUrl ? <Image source={{ uri: product.imageUrl }} style={styles.productImage} /> : <View style={styles.productPlaceholder}><Search size={22} color={t.colors.textMuted} /></View>}</TactilePressable>; }
}

const makeStyles = (t: ReturnType<typeof useTheme>) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.colors.background }, content: { padding: 20, paddingBottom: 104 }, header: { alignItems: 'flex-end', marginBottom: 18 }, title: { color: t.colors.text, fontFamily: t.fonts.bold, fontSize: 27, lineHeight: 36 }, subtitle: { color: t.colors.textSecondary, fontFamily: t.fonts.regular, fontSize: 14, marginTop: 2 }, switcher: { flexDirection: 'row-reverse', marginTop: 16, marginBottom: 20, borderBottomWidth: 1, borderColor: t.colors.borderLight }, switch: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2, borderColor: 'transparent' }, switchActive: { borderColor: t.colors.primary }, switchText: { color: t.colors.textSecondary, fontFamily: t.fonts.medium, fontSize: 14 }, switchTextActive: { color: t.colors.text, fontFamily: t.fonts.bold }, loader: { marginVertical: 34 }, product: { minHeight: 104, padding: 10, flexDirection: 'row-reverse', gap: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: t.colors.borderLight }, productImage: { width: 84, height: 84, borderRadius: 12 }, productPlaceholder: { width: 84, height: 84, borderRadius: 12, backgroundColor: t.colors.backgroundSecondary, justifyContent: 'center', alignItems: 'center' }, productInfo: { flex: 1, alignItems: 'flex-end', justifyContent: 'center' }, productName: { color: t.colors.text, fontFamily: t.fonts.semiBold, fontSize: 16, lineHeight: 23, textAlign: 'right' }, productStore: { color: t.colors.textMuted, fontFamily: t.fonts.regular, fontSize: 12, marginTop: 4 }, productPrice: { color: t.colors.primaryDark, fontFamily: t.fonts.bold, fontSize: 14, marginTop: 5 },
});
