import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router } from 'expo-router';
import { getProduct, addToCart } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useCart } from '../../contexts/CartContext';
import { formatPrice } from '../../constants/theme';
import { IconArrowForward } from '../../components/Icons';
import { StepperCapsule, PrimaryButton } from '../../components/ui';

type ProductOption = { id: string; name: string; priceModifier: number | string };

type ProductData = {
  id: string;
  nameAr: string;
  nameEn?: string | null;
  description?: string | null;
  price: number;
  imageUrl?: string | null;
  isAvailable?: boolean;
  options?: ProductOption[];
  merchantProfile?: { storeSlug?: string };
  productCategory?: { id: string; nameAr: string } | null;
};

export default function ProductDetailScreen() {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const { refresh: refreshCartCount } = useCart();

  const [product, setProduct] = useState<ProductData | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set());
  const [note, setNote] = useState('');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getProduct(id)
      .then((data) => setProduct(data as ProductData))
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [id]);

  const options = product?.options ?? [];

  const toggleOption = useCallback((optId: string) => {
    setSelectedOptions((prev) => {
      const next = new Set(prev);
      if (next.has(optId)) next.delete(optId);
      else next.add(optId);
      return next;
    });
  }, []);

  const addonsTotal = useMemo(() => {
    let sum = 0;
    for (const opt of options) {
      if (selectedOptions.has(opt.id)) sum += Number(opt.priceModifier) || 0;
    }
    return sum;
  }, [options, selectedOptions]);

  // Ensure price is treated as a number (API may return it as string)
  const basePrice = Number(product?.price) || 0;
  const unitPrice = basePrice + addonsTotal;
  const totalPrice = unitPrice * quantity;

  const handleAddToCart = useCallback(async () => {
    if (!product) return;
    if (!token) {
      Alert.alert('تسجيل الدخول', 'يجب تسجيل الدخول لإضافة المنتجات إلى السلة', [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'تسجيل الدخول', onPress: () => router.push('/(auth)') },
      ]);
      return;
    }
    setAdding(true);
    try {
      const chosenOpts = options.filter((o) => selectedOptions.has(o.id));
      const snapshot = {
        selectedOptions: chosenOpts.map((o) => ({ id: o.id, name: o.name, priceModifier: Number(o.priceModifier) })),
        note: note.trim() || undefined,
      };
      await addToCart(product.id, quantity, snapshot);
      refreshCartCount();
      Alert.alert('تم', 'تمت الإضافة إلى السلة');
      router.back();
    } catch (e: unknown) {
      Alert.alert('خطأ', (e as Error).message || 'فشل الإضافة');
    } finally {
      setAdding(false);
    }
  }, [product, token, options, selectedOptions, note, quantity, refreshCartCount]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <IconArrowForward size={24} color={t.colors.text} />
          </TouchableOpacity>
        </View>
        <ActivityIndicator size="large" color={t.colors.primary} style={styles.loader} />
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <IconArrowForward size={24} color={t.colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.centered}>
          <Text style={styles.emptyText}>المنتج غير موجود</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.heroWrap}>
          {product.imageUrl ? (
            <Image source={{ uri: product.imageUrl }} style={styles.heroImage} resizeMode="cover" />
          ) : (
            <View style={[styles.heroImage, styles.heroPlaceholder]}>
              <Text style={styles.heroPlaceholderText}>{product.nameAr.charAt(0)}</Text>
            </View>
          )}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.28)']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0.5, y: 0.5 }}
            end={{ x: 0.5, y: 1 }}
          />
        </View>

        <View style={styles.headerOverlay}>
          <TouchableOpacity onPress={() => router.back()} style={styles.roundBtn} activeOpacity={0.78}>
            <IconArrowForward size={22} color={t.colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.body}>
          {product.productCategory && (
            <Text style={styles.categoryLabel}>{product.productCategory.nameAr}</Text>
          )}
          <Text style={styles.productName}>{product.nameAr}</Text>
          {!!product.description && (
            <Text style={styles.productDesc}>{product.description}</Text>
          )}
          <Text style={styles.basePrice}>{formatPrice(product.price)}</Text>

          {options.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>الإضافات</Text>
              {options.map((opt) => {
                const isSelected = selectedOptions.has(opt.id);
                const pm = Number(opt.priceModifier);
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.optionRow, isSelected && styles.optionRowActive]}
                    onPress={() => toggleOption(opt.id)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                      {isSelected && <Text style={styles.checkMark}>✓</Text>}
                    </View>
                    <Text style={[styles.optionName, isSelected && styles.optionNameActive]}>{opt.name}</Text>
                    <Text style={[styles.optionPrice, isSelected && styles.optionPriceActive]}>
                      {pm > 0 ? `+${formatPrice(pm)}` : 'مجاني'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ملاحظات</Text>
            <TextInput
              style={styles.noteInput}
              placeholder="مثال: بدون بصل، إضافة كاتشب..."
              placeholderTextColor={t.colors.textMuted}
              value={note}
              onChangeText={setNote}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>الكمية</Text>
            <StepperCapsule
              value={quantity}
              onMinus={() => setQuantity((q) => Math.max(1, q - 1))}
              onPlus={() => setQuantity((q) => q + 1)}
              minusDisabled={quantity <= 1}
            />
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerTotal}>
          <Text style={styles.footerTotalLabel}>الإجمالي</Text>
          <Text style={styles.footerTotalValue}>{formatPrice(totalPrice)}</Text>
        </View>
        <PrimaryButton
          label={product.isAvailable ? 'أضف للسلة' : 'غير متاح'}
          onPress={handleAddToCart}
          loading={adding}
          disabled={!product.isAvailable || adding}
          style={styles.addToCartBtn}
        />
      </View>
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
  loader: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { ...t.typography.body, color: t.colors.textSecondary },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 116 },
  heroWrap: { 
    width: '100%', 
    height: t.image.productHeroHeight - 64, 
    position: 'relative',
    borderBottomLeftRadius: t.radius.cardRadius,
    borderBottomRightRadius: t.radius.cardRadius,
    overflow: 'hidden',
  },
  heroImage: { width: '100%', height: '100%', backgroundColor: t.colors.borderLight },
  heroPlaceholder: { justifyContent: 'center', alignItems: 'center', backgroundColor: t.colors.backgroundSecondary },
  heroPlaceholderText: { ...t.typography.titleLarge, fontSize: 56, color: t.colors.textSecondary },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: t.spacing.screenPadding,
    paddingTop: t.spacing.lg,
  },
  roundBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    ...t.shadow.shadow1,
  },
  body: {
    padding: t.spacing.screenPadding,
    paddingTop: t.spacing.lg,
    marginTop: -28,
    marginHorizontal: 12,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    backgroundColor: t.colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.colors.glassBorder,
    ...t.shadow.shadow2,
  },
  categoryLabel: {
    ...t.typography.caption,
    fontFamily: t.fonts.bold,
    color: t.colors.primary,
    backgroundColor: t.colors.primary + '12',
    paddingHorizontal: t.spacing.lg,
    paddingVertical: t.spacing.xs,
    borderRadius: t.radius.full,
    alignSelf: 'flex-start',
    marginBottom: t.spacing.sm,
  },
  productName: {
    ...t.typography.titleLarge,
    fontSize: 28,
    fontFamily: t.fonts.extraBold,
    color: t.colors.text,
    marginBottom: t.spacing.md,
  },
  productDesc: {
    ...t.typography.body,
    fontSize: 15,
    color: t.colors.textSecondary,
    lineHeight: 22,
    marginBottom: t.spacing.lg,
  },
  basePrice: {
    ...t.typography.titleLarge,
    fontSize: 24,
    fontFamily: t.fonts.extraBold,
    color: t.colors.text,
    marginBottom: t.spacing.lg,
  },
  section: { marginTop: t.spacing.lg },
  sectionTitle: { ...t.typography.titleMedium, fontFamily: t.fonts.extraBold, color: t.colors.text, marginBottom: t.spacing.md },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: t.spacing.lg,
    paddingHorizontal: t.spacing.lg,
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.cardRadius,
    marginBottom: t.spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.colors.glassBorder,
    ...t.shadow.shadow1,
  },
  optionRowActive: {
    backgroundColor: t.colors.primary + '08',
    borderWidth: 1,
    borderColor: t.colors.primary + '30',
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: t.radius.full,
    borderWidth: 2,
    borderColor: t.colors.border,
    marginLeft: t.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    borderColor: t.colors.primary,
    backgroundColor: t.colors.primary,
  },
  checkMark: { ...t.typography.body, fontFamily: t.fonts.bold, color: t.colors.white, fontSize: 14 },
  optionName: { flex: 1, ...t.typography.body, fontFamily: t.fonts.medium, color: t.colors.text },
  optionNameActive: { color: t.colors.text, fontFamily: t.fonts.bold },
  optionPrice: { ...t.typography.body, fontFamily: t.fonts.bold, color: t.colors.textSecondary },
  optionPriceActive: { color: t.colors.primary },
  noteInput: {
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.borderLight,
    borderRadius: t.radius.cardRadius,
    paddingHorizontal: t.spacing.lg,
    paddingVertical: t.spacing.lg,
    ...t.typography.body,
    color: t.colors.text,
    textAlign: 'right',
    minHeight: 68,
    textAlignVertical: 'top',
    ...t.shadow.shadow1,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: t.colors.surface,
    paddingHorizontal: t.spacing.screenPadding,
    paddingTop: t.spacing.md,
    paddingBottom: t.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: t.colors.borderLight,
    ...t.shadow.shadow2,
  },
  footerTotal: { 
    flex: 1,
    paddingHorizontal: t.spacing.sm,
    paddingVertical: t.spacing.xs,
  },
  footerTotalLabel: { ...t.typography.caption, color: t.colors.textSecondary, marginBottom: t.spacing.xs },
  footerTotalValue: { ...t.typography.titleLarge, color: t.colors.text, fontFamily: t.fonts.extraBold },
  addToCartBtn: {
    flex: 1.2,
    minHeight: t.button.primaryHeight,
  },
});
