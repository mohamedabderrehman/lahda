import { useEffect, useMemo, useState } from 'react';
import { FlatList, Image, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { MapPin, ShoppingBag } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAddresses, getAuthToken, getHome, getMerchants, getPromoBanners, type HomeCategory, type HomeSection } from '../../api/client';
import { useCart } from '../../contexts/CartContext';
import { useTheme } from '../../contexts/ThemeContext';
import { FoodSearchField, IconControl, RestaurantCard, SectionHeading, EmptyMoment } from '../../components/food-ui';
import { TactilePressable } from '../../components/sunset';
import { useVisualFixtures, visualHome } from '../../lib/visual-fixtures';

type Address = { label?: string | null; addressText?: string | null; latitude?: number | null; longitude?: number | null; isDefault?: boolean };

export default function HomeScreen() {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const { count } = useCart();
  const [sections, setSections] = useState<HomeSection[]>([]);
  const [categories, setCategories] = useState<HomeCategory[]>([]);
  const [banners, setBanners] = useState<Array<{ id: string; titleAr: string; imageUrl?: string | null; linkUrl?: string | null }>>([]);
  const [location, setLocation] = useState('اختر عنوان التوصيل');
  const [search, setSearch] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [categoryMerchants, setCategoryMerchants] = useState<HomeSection['merchants']>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [coordinates, setCoordinates] = useState<{ lat?: number; lng?: number }>({});

  const load = async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    try {
      let lat: number | undefined; let lng: number | undefined;
      if (getAuthToken()) {
        const rows = await getAddresses().catch(() => []);
        const addresses = Array.isArray(rows) ? rows as Address[] : [];
        const address = addresses.find((item) => item.isDefault) ?? addresses[0];
        if (address) { setLocation(address.label || address.addressText || 'عنوان التوصيل'); lat = address.latitude ?? undefined; lng = address.longitude ?? undefined; }
      }
      setCoordinates({ lat, lng });
      const [home, promo] = await Promise.all([getHome(lat, lng), getPromoBanners().catch(() => [])]);
      const nextSections = home.sections ?? [];
      setSections(useVisualFixtures && nextSections.length === 0 ? visualHome.sections : nextSections);
      setCategories(useVisualFixtures && (home.categories ?? []).length === 0 ? visualHome.categories : home.categories ?? []);
      setBanners(promo ?? []);
    } catch {
      setSections(useVisualFixtures ? visualHome.sections : []);
      setCategories(useVisualFixtures ? visualHome.categories : []);
      setBanners([]);
    } finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { void load(); }, []);
  useEffect(() => {
    if (!selectedCategoryId) { setCategoryMerchants([]); return; }
    let live = true;
    void getMerchants(selectedCategoryId, coordinates.lat, coordinates.lng).then((items) => {
      if (live) setCategoryMerchants((Array.isArray(items) ? items : []).map((item) => ({ ...item, deliveryFee: item.deliveryFee == null ? null : Number(item.deliveryFee) })));
    }).catch(() => { if (live) setCategoryMerchants([]); });
    return () => { live = false; };
  }, [selectedCategoryId, coordinates.lat, coordinates.lng]);

  const activeSections = sections.map((section) => ({ ...section, merchants: section.merchants.filter((merchant) => merchant.isOpen !== false) })).filter((section) => section.merchants.length);
  const activeCategory = categories.find((category) => category.id === selectedCategoryId);
  const visibleSections = selectedCategoryId && activeCategory ? [{ id: `category-${activeCategory.id}`, titleAr: activeCategory.nameAr, merchants: categoryMerchants } as HomeSection] : activeSections;
  return <SafeAreaView style={styles.safe} edges={['top']}>
    <FlatList data={visibleSections} keyExtractor={(section) => section.id} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={t.colors.primary} />} contentContainerStyle={styles.content}
      ListHeaderComponent={<>
        <View style={styles.topbar}><IconControl icon={ShoppingBag} label="السلة" badge={count} onPress={() => router.push('/(tabs)/cart')} /><TactilePressable style={styles.location} onPress={() => router.push('/addresses')}><MapPin size={18} color={t.colors.primaryDark} /><View style={styles.locationText}><Text style={styles.locationHint}>التوصيل إلى</Text><Text style={styles.locationValue} numberOfLines={1}>{location}</Text></View></TactilePressable></View>
        <View style={styles.intro}><Text style={styles.greeting}>ماذا تشتهي اليوم؟</Text><Text style={styles.supporting}>اكتشف مطاعم قريبة واطلب بسرعة.</Text></View>
        <FoodSearchField value={search} onChangeText={setSearch} onSubmit={() => router.push({ pathname: '/(tabs)/search', params: { q: search } })} />
        {banners.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.promoList} style={styles.promoScroll}>{banners.map((banner) => <TactilePressable key={banner.id} style={styles.promo} onPress={() => banner.linkUrl && router.push(banner.linkUrl as any)}>{banner.imageUrl ? <Image source={{ uri: banner.imageUrl }} style={styles.promoImage} /> : <View style={styles.promoFallback}><Text style={styles.promoText}>{banner.titleAr}</Text></View>}</TactilePressable>)}</ScrollView> : null}
        {categories.length ? <><SectionHeading title="اختر ما تحبه" /><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryList}>{categories.map((category) => <TactilePressable key={category.id} style={[styles.category, selectedCategoryId === category.id && styles.categorySelected]} onPress={() => setSelectedCategoryId((value) => value === category.id ? null : category.id)}><Text style={[styles.categoryText, selectedCategoryId === category.id && styles.categoryTextSelected]}>{category.nameAr}</Text></TactilePressable>)}</ScrollView></> : null}
        {loading ? <View style={styles.loadingSpace}><Text style={styles.loadingText}>نحمّل المطاعم القريبة…</Text></View> : null}
      </>}
      renderItem={({ item: section }) => <View style={styles.section}><SectionHeading title={section.titleAr} actionLabel="عرض الكل" onAction={() => router.push({ pathname: '/(tabs)/search', params: { sectionId: section.id, categoryId: selectedCategoryId || undefined } })} />{section.merchants.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.restaurantList}>{section.merchants.map((restaurant) => <RestaurantCard key={restaurant.id} restaurant={restaurant} compact />)}</ScrollView> : <EmptyMoment kind="stores" title="لا توجد نتائج في هذا التصنيف" message="جرّب تصنيفاً آخر أو عد لاحقاً." />}</View>}
      ListEmptyComponent={!loading ? <EmptyMoment kind="stores" title="لا توجد مطاعم قريبة الآن" message="أضف عنوان توصيل أو حاول مرة أخرى بعد قليل." actionLabel="إدارة العناوين" onAction={() => router.push('/addresses')} /> : null}
    />
  </SafeAreaView>;
}

const makeStyles = (t: ReturnType<typeof useTheme>) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.colors.background }, content: { padding: 20, paddingBottom: 96, gap: 0 }, topbar: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }, location: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, maxWidth: '78%' }, locationText: { alignItems: 'flex-end', flexShrink: 1 }, locationHint: { color: t.colors.textMuted, fontSize: 11, fontFamily: t.fonts.regular }, locationValue: { color: t.colors.text, fontSize: 14, fontFamily: t.fonts.semiBold }, intro: { alignItems: 'flex-end', marginBottom: 14 }, greeting: { color: t.colors.text, fontSize: 27, lineHeight: 36, fontFamily: t.fonts.bold }, supporting: { color: t.colors.textSecondary, fontSize: 14, lineHeight: 22, fontFamily: t.fonts.regular, marginTop: 1 }, promoScroll: { marginTop: 16, marginHorizontal: -20 }, promoList: { paddingHorizontal: 20, gap: 12 }, promo: { width: 300, height: 108, borderRadius: 14, overflow: 'hidden', backgroundColor: t.colors.primarySoft }, promoImage: { width: '100%', height: '100%' }, promoFallback: { flex: 1, justifyContent: 'center', padding: 18, backgroundColor: t.colors.primary }, promoText: { color: '#fff', fontFamily: t.fonts.bold, fontSize: 18, textAlign: 'right' }, section: { marginTop: 21 }, categoryList: { gap: 8, paddingBottom: 2 }, category: { minHeight: 36, paddingHorizontal: 14, justifyContent: 'center', borderRadius: 10, backgroundColor: t.colors.surfaceElevated, borderWidth: 1, borderColor: t.colors.borderLight }, categorySelected: { backgroundColor: t.colors.text, borderColor: t.colors.text }, categoryText: { color: t.colors.textSecondary, fontFamily: t.fonts.medium, fontSize: 13 }, categoryTextSelected: { color: '#fff', fontFamily: t.fonts.bold }, restaurantList: { gap: 0, paddingBottom: 2 }, loadingSpace: { paddingVertical: 32, alignItems: 'center' }, loadingText: { color: t.colors.textSecondary, fontFamily: t.fonts.regular, fontSize: 14 },
});
