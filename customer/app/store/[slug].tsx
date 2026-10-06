import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  RefreshControl,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  IconArrowForward,
  IconCartOutline,
  IconSearch,
  IconRemove,
  IconHeartOutline,
  IconShare,
} from '../../components/Icons';
import { Badge } from '../../components/Badge';
import { getStoreBySlug, getProductsByStore, getCart, updateCartItem } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { formatPrice } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { useCart } from '../../contexts/CartContext';

const LOGO_SIZE = 80;

type Product = {
  id: string;
  nameAr: string;
  nameEn?: string | null;
  description?: string | null;
  price: number;
  imageUrl?: string | null;
  isAvailable?: boolean;
  productCategoryId?: string | null;
  productCategory?: { id: string; nameAr: string; nameEn?: string | null; sortOrder?: number; isActive?: boolean } | null;
};
type CartItem = { id: string; quantity: number; product?: { id: string; nameAr: string; price: number } };

function StoreSkeleton() {
  const t = useTheme();
  const styles = useMemo(() => makeSkeletonStyles(t), [t]);
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header} />
      <View style={styles.cover} />
      <View style={styles.infoCard}>
        <View style={styles.infoBlock} />
        <View style={styles.infoBlock} />
        <View style={styles.infoBlock} />
      </View>
      <View style={styles.sectionTitle} />
      <View style={styles.productRow} />
      <View style={styles.productRow} />
      <View style={styles.productRow} />
    </SafeAreaView>
  );
}

const makeSkeletonStyles = (t: ReturnType<typeof useTheme>) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.colors.background },
  header: { height: 56, backgroundColor: t.colors.borderLight + '80', marginHorizontal: t.spacing.screenPadding, marginTop: t.spacing.sm, borderRadius: t.radius.sm },
  cover: { height: t.image.storeCoverHeight, backgroundColor: t.colors.borderLight + '80', marginTop: t.spacing.md },
  infoCard: {
    flexDirection: 'row',
    marginHorizontal: t.spacing.screenPadding,
    marginTop: -28,
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.cardRadius,
    padding: t.spacing.lg,
    gap: t.spacing.md,
  },
  infoBlock: { flex: 1, height: 44, backgroundColor: t.colors.borderLight + '80', borderRadius: t.radius.sm },
  sectionTitle: { height: 24, width: 120, backgroundColor: t.colors.borderLight + '80', borderRadius: t.radius.sm, marginHorizontal: t.spacing.screenPadding, marginTop: t.spacing.xxl, marginBottom: t.spacing.md },
  productRow: { flexDirection: 'row', height: 96, marginHorizontal: t.spacing.screenPadding, marginBottom: t.spacing.md, backgroundColor: t.colors.borderLight + '60', borderRadius: t.radius.lg },
});

export default function StoreScreen() {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { token } = useAuth();
  const { refresh: refreshCartCount } = useCart();
  const [store, setStore] = useState<Record<string, unknown> | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const scrollRef = useRef<ScrollView>(null);
  const sectionOffsets = useRef<Record<string, number>>({});

  const loadStore = async () => {
    if (!slug) return;
    try {
      const [storeRes, prodsRes] = await Promise.all([
        getStoreBySlug(slug),
        getProductsByStore(slug),
      ]);
      setStore(storeRes);
      setProducts(Array.isArray(prodsRes) ? prodsRes : []);
    } catch {
      setStore(null);
      setProducts([]);
    }
  };

  const loadCart = async () => {
    try {
      const res = await getCart();
      setCartItems((res?.items as CartItem[]) || []);
    } catch {
      setCartItems([]);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadCart();
    }, [])
  );

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    loadStore().finally(() => setLoading(false));
  }, [slug]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadStore(), loadCart()]);
    setRefreshing(false);
  };

  const productIdToCart = useMemo(() => {
    const map: Record<string, { cartItemId: string; quantity: number }> = {};
    cartItems.forEach((item) => {
      if (item.product?.id) map[item.product.id] = { cartItemId: item.id, quantity: item.quantity };
    });
    return map;
  }, [cartItems]);

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products;
    const q = productSearch.trim().toLowerCase();
    return products.filter((p) =>
      p.nameAr.toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q) ||
      (p.nameEn || '').toLowerCase().includes(q)
    );
  }, [products, productSearch]);

  const groupedSections = useMemo(() => {
    const groups = new Map<string, { title: string; sortOrder: number; products: Product[] }>();
    for (const p of filteredProducts) {
      const key = p.productCategory?.id || 'uncategorized';
      const title = p.productCategory?.nameAr || 'منتجات أخرى';
      const sortOrder = p.productCategory?.sortOrder ?? 999999;
      if (!groups.has(key)) groups.set(key, { title, sortOrder, products: [] });
      groups.get(key)?.products.push(p);
    }
    return Array.from(groups.values()).sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title, 'ar'));
  }, [filteredProducts]);

  const cartCount = useMemo(() => cartItems.reduce((s, i) => s + i.quantity, 0), [cartItems]);

  const openProductDetail = (productId: string) => {
    router.push(`/product/${productId}`);
  };

  const updateQty = async (productId: string, delta: number) => {
    const entry = productIdToCart[productId];
    if (!entry) return;
    const newQty = entry.quantity + delta;
    if (newQty < 1) return;
    setUpdatingId(productId);
    try {
      await updateCartItem(entry.cartItemId, newQty);
      await loadCart();
      refreshCartCount();
    } catch (e: unknown) {
      Alert.alert('خطأ', (e as Error).message);
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading && !store) {
    return <StoreSkeleton />;
  }

  if (!store) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <IconArrowForward size={24} color={t.colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>المتجر غير موجود</Text>
        </View>
      </SafeAreaView>
    );
  }

  const s = store as Record<string, unknown> | null;
  const storeName = ((s?.storeName as string) || (s?.storeSlug as string) || 'متجر') ?? 'متجر';
  const storeLogoUrl = s && typeof s['logoUrl'] === 'string' ? (s['logoUrl'] as string) : undefined;
  const discountLabel = (s?.discountLabel as string | undefined) ?? undefined;
  const hasOffers = (s?.hasOffers as boolean | undefined) ?? false;
  const coverUrl = s && (s['coverUrl'] != null && s['coverUrl'] !== '') ? String(s['coverUrl']) : undefined;
  const categories = groupedSections.map((sec) => ({ key: sec.title, title: sec.title }));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.colors.primary} />
        }
      >
        <View style={styles.coverWrap}>
          {coverUrl ? (
            <Image source={{ uri: coverUrl }} style={styles.cover} resizeMode="cover" />
          ) : (
            <View style={[styles.cover, styles.coverPlaceholder]} />
          )}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.28)']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0.5, y: 0.5 }}
            end={{ x: 0.5, y: 1 }}
          />
          <View style={styles.headerOverlay} pointerEvents="box-none">
            <TouchableOpacity onPress={() => router.back()} style={styles.roundBtn} activeOpacity={0.78}>
              <IconArrowForward size={22} color={t.colors.text} />
            </TouchableOpacity>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.roundBtn} onPress={() => setProductSearch('')} activeOpacity={0.78}>
                <IconSearch size={20} color={t.colors.text} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.roundBtn} onPress={() => {}} activeOpacity={0.78}>
                <IconHeartOutline size={20} color={t.colors.text} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.roundBtn} onPress={() => {}} activeOpacity={0.78}>
                <IconShare size={20} color={t.colors.text} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={[styles.storeInfoCard, storeLogoUrl ? styles.storeInfoCardWithLogo : undefined]}>
          {storeLogoUrl && (
            <View style={styles.logoWrap}>
              <Image source={{ uri: storeLogoUrl }} style={styles.logo} resizeMode="cover" />
            </View>
          )}
          <Text style={styles.storeTitle}>{storeName}</Text>
        </View>

        {(hasOffers || discountLabel) && (
          <View style={styles.offerWrap}>
            <Badge variant="discount">{discountLabel || 'عرض متاح'}</Badge>
          </View>
        )}

        {categories.length > 0 && (
          <View style={styles.categoriesWrap}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesRow}>
              {categories.map((c) => (
                <TouchableOpacity
                  key={c.key}
                  style={styles.categoryChip}
                  onPress={() => {
                    const y = sectionOffsets.current[c.key];
                    if (y != null) scrollRef.current?.scrollTo({ y: Math.max(0, y - 120), animated: true });
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.categoryChipText}>{c.title}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.productsSection}>
          <View style={styles.productsSectionHeader}>
            <Text style={styles.productsSectionTitle}>المنتجات</Text>
          </View>

          <View style={styles.searchWrap}>
            <IconSearch size={20} color={t.colors.textMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="ابحث عن منتج..."
              placeholderTextColor={t.colors.textMuted}
              value={productSearch}
              onChangeText={setProductSearch}
            />
          </View>

          {groupedSections.length === 0 ? (
            <View style={styles.emptyProducts}>
              <Text style={styles.emptyProductsText}>
                {productSearch.trim() ? 'لا توجد نتائج للبحث' : 'لا توجد منتجات'}
              </Text>
            </View>
          ) : (
            groupedSections.map((section) => (
              <View
                key={section.title}
                style={styles.groupSection}
                onLayout={(e) => {
                  sectionOffsets.current[section.title] = e.nativeEvent.layout.y;
                }}
              >
                <Text style={styles.groupTitle}>{section.title}</Text>
                {section.products.map((p) => {
                  const cartEntry = productIdToCart[p.id];
                  return (
                    <View key={p.id} style={styles.productCard}>
                      <View style={styles.productImageWrap}>
                        {p.imageUrl ? (
                          <Image source={{ uri: p.imageUrl }} style={styles.productImage} resizeMode="cover" />
                        ) : (
                          <View style={styles.productImagePlaceholder}>
                            <Text style={styles.productImagePlaceholderText}>{p.nameAr.charAt(0)}</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.productBody}>
                        <View style={styles.productTexts}>
                          <Text style={styles.productName} numberOfLines={2}>{p.nameAr}</Text>
                          {!!p.description && <Text style={styles.productDesc} numberOfLines={2}>{p.description}</Text>}
                          <Text style={styles.productPrice}>{formatPrice(p.price)}</Text>
                        </View>
                        {cartEntry ? (
                          <View style={styles.stepper}>
                            <TouchableOpacity
                              style={styles.stepperBtn}
                              onPress={() => updateQty(p.id, -1)}
                              disabled={updatingId === p.id}
                              activeOpacity={0.78}
                            >
                              <IconRemove size={18} color={t.colors.text} />
                            </TouchableOpacity>
                            <Text style={styles.stepperQty}>{cartEntry.quantity}</Text>
                            <TouchableOpacity
                              style={styles.stepperBtn}
                              onPress={() => updateQty(p.id, 1)}
                              disabled={updatingId === p.id}
                              activeOpacity={0.78}
                            >
                              <Text style={styles.stepperPlus}>+</Text>
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={[styles.addBtn, !p.isAvailable && styles.addBtnDisabled]}
                            onPress={() => p.isAvailable && openProductDetail(p.id)}
                            disabled={!p.isAvailable}
                            activeOpacity={0.75}
                          >
                            <Text style={styles.addBtnText}>+</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            ))
          )}
        </View>
        <View style={{ height: cartCount > 0 ? 80 : 0 }} />
      </ScrollView>

      {cartCount > 0 && (
        <View style={styles.stickyCartBar}>
          <TouchableOpacity style={styles.stickyCartBtn} onPress={() => router.push('/(tabs)/cart')} activeOpacity={0.78}>
            <View style={styles.stickyCartLeft}>
              <IconCartOutline size={24} color={t.colors.white} />
              <Text style={styles.stickyCartCount}>{cartCount} منتج في السلة</Text>
            </View>
            <Text style={styles.stickyCartLabel}>عرض السلة</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (t: ReturnType<typeof useTheme>) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.colors.background },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: t.spacing.xxl * 2 },
  coverWrap: {
    height: t.image.storeCoverHeight - 55,
    width: '100%',
    position: 'relative',
    backgroundColor: t.colors.borderLight,
  },
  cover: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  coverPlaceholder: { backgroundColor: t.colors.backgroundSecondary },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: t.spacing.screenPadding,
    paddingVertical: t.spacing.lg,
    justifyContent: 'space-between',
  },
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
  roundBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    ...t.shadow.shadow1,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { ...t.typography.body, color: t.colors.textSecondary },
  storeInfoCard: {
    marginHorizontal: t.spacing.screenPadding,
    marginTop: -50,
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.cardRadius,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.colors.glassBorder,
    paddingTop: t.spacing.lg,
    paddingHorizontal: t.spacing.lg,
    paddingBottom: t.spacing.lg,
    ...t.shadow.shadow2,
  },
  storeInfoCardWithLogo: {
    paddingTop: LOGO_SIZE / 2 + t.spacing.sm,
  },
  logoWrap: {
    position: 'absolute',
    top: -LOGO_SIZE / 2,
    alignSelf: 'center',
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_SIZE / 2,
    borderWidth: 4,
    borderColor: t.colors.surface,
    overflow: 'hidden',
    ...t.shadow.shadow3,
  },
  logo: { width: '100%', height: '100%' },
  storeTitle: {
    textAlign: 'center',
    ...t.typography.titleLarge,
    fontSize: 24,
    fontFamily: t.fonts.extraBold,
    color: t.colors.text,
    marginBottom: 0,
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: t.spacing.sm },
  infoRowWithLogo: { marginTop: t.spacing.sm },
  infoItem: { 
    alignItems: 'center', 
    flex: 1,
    backgroundColor: t.colors.background,
    borderRadius: t.radius.cardRadius,
    paddingVertical: t.spacing.md,
    paddingHorizontal: t.spacing.sm,
  },
  infoIcon: { marginBottom: t.spacing.xs },
  infoLabel: { ...t.typography.caption, color: t.colors.textMuted, marginBottom: t.spacing.xs },
  infoValue: { ...t.typography.body, fontFamily: t.fonts.bold, fontSize: 14, color: t.colors.text },
  infoSub: { ...t.typography.caption, fontSize: 11, color: t.colors.textMuted, marginTop: t.spacing.xs },
  offerWrap: { marginHorizontal: t.spacing.screenPadding, marginTop: t.spacing.md },
  categoriesWrap: { marginTop: t.spacing.lg },
  categoriesRow: { paddingHorizontal: t.spacing.screenPadding, gap: t.spacing.sm, paddingBottom: t.spacing.xs },
  categoryChip: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.md,
    paddingHorizontal: t.spacing.lg,
    paddingVertical: 9,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.colors.borderLight,
  },
  categoryChipText: { ...t.typography.caption, fontFamily: t.fonts.semiBold, color: t.colors.textSecondary },
  productsSection: { padding: t.spacing.screenPadding, paddingTop: t.spacing.xl },
  productsSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: t.spacing.lg },
  productsSectionTitle: { ...t.typography.titleLarge, color: t.colors.text, fontFamily: t.fonts.extraBold },
  groupSection: { marginBottom: t.spacing.xxl },
  groupTitle: {
    ...t.typography.titleMedium,
    fontSize: 18,
    fontFamily: t.fonts.extraBold,
    color: t.colors.text,
    marginBottom: t.spacing.lg,
    paddingHorizontal: t.spacing.lg,
    paddingVertical: 0,
    alignSelf: 'flex-start',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 50,
    paddingVertical: t.spacing.sm,
    paddingHorizontal: t.spacing.lg,
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.cardRadius,
    borderWidth: 1,
    borderColor: t.colors.borderLight,
    ...t.shadow.shadow1,
    marginBottom: t.spacing.lg,
  },
  searchIcon: { marginLeft: t.spacing.sm },
  searchInput: { flex: 1, ...t.typography.body, fontSize: 16, color: t.colors.text, paddingVertical: 0, textAlign: 'right' },
  emptyProducts: { 
    paddingVertical: t.spacing.xxl * 2, 
    alignItems: 'center',
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.cardRadius,
    marginVertical: t.spacing.xl,
    ...t.shadow.shadow1,
  },
  emptyProductsText: { ...t.typography.body, fontFamily: t.fonts.medium, color: t.colors.textSecondary },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.cardRadius,
    marginBottom: t.spacing.md,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.colors.glassBorder,
    ...t.shadow.shadow2,
    padding: 10,
  },
  productImageWrap: {
    width: 104,
    height: 104,
    borderRadius: t.radius.lg,
    overflow: 'hidden',
  },
  productImage: { width: '100%', height: '100%' },
  productImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: t.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productImagePlaceholderText: { ...t.typography.titleLarge, fontSize: 28, color: t.colors.textSecondary },
  productBody: { flex: 1, paddingHorizontal: t.spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  productTexts: { flex: 1, marginRight: t.spacing.sm },
  productName: { ...t.typography.titleMedium, fontFamily: t.fonts.extraBold, color: t.colors.text, fontSize: 16, lineHeight: 22 },
  productDesc: { marginTop: t.spacing.xs, ...t.typography.caption, lineHeight: 18, color: t.colors.textMuted },
  productPrice: { ...t.typography.body, fontSize: 15, fontFamily: t.fonts.bold, color: t.colors.textSecondary, marginTop: t.spacing.sm },
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: t.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...t.shadow.shadow2,
  },
  addBtnDisabled: { opacity: 0.5 },
  addBtnText: { ...t.typography.body, fontSize: 24, fontFamily: t.fonts.bold, color: t.colors.white },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.colors.backgroundSecondary,
    borderRadius: t.radius.full,
    paddingVertical: t.spacing.xs,
    paddingHorizontal: t.spacing.xs,
  },
  stepperBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  stepperQty: { ...t.typography.body, fontFamily: t.fonts.extraBold, fontSize: 15, color: t.colors.text, minWidth: 24, textAlign: 'center' },
  stepperPlus: { ...t.typography.body, fontFamily: t.fonts.bold, fontSize: 20, color: t.colors.text },
  stickyCartBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: t.spacing.screenPadding,
    paddingBottom: t.spacing.xxl,
    backgroundColor: 'transparent',
  },
  stickyCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: t.button.primaryHeight,
    backgroundColor: t.colors.primary,
    borderRadius: t.radius.full,
    paddingHorizontal: t.spacing.xl,
    ...t.shadow.shadow3,
  },
  stickyCartLeft: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
  stickyCartCount: { ...t.typography.body, fontFamily: t.fonts.bold, color: t.colors.white },
  stickyCartLabel: { ...t.typography.body, fontFamily: t.fonts.bold, color: t.colors.white },
});
