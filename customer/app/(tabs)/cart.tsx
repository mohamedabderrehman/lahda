import { useMemo, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Dimensions,
  I18nManager,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { EmptyState } from '../../components/ui';
import { getCart, updateCartItem, removeCartItem } from '../../api/client';
import { useTheme } from '../../contexts/ThemeContext';
import { useCart } from '../../contexts/CartContext';
import { formatPrice } from '../../constants/theme';

const CHEVRON_LEFT_URI = 'https://www.figma.com/api/mcp/asset/e69a4659-f060-4ddc-ba15-9bf6cd45b9c8';
const SWIPE_ICON_URI = 'https://www.figma.com/api/mcp/asset/7916c0c6-986d-4e56-b774-eb8026068e3d';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const H_PADDING = 24;
const CARD_MAX_WIDTH = 400;
const CARD_HEIGHT = 96;
const IMAGE_SIZE = 68;
const TAB_BAR_HEIGHT = 60;
const QTY_BTN_SIZE = 32;
const QTY_STEPPER_GAP = 4;
const SWIPE_ACTION_WIDTH = 64;
const CARD_GAP = 12;
const CARD_PADDING = 12;

type OptionSnapshot = {
  selectedOptions?: Array<{ name: string; priceModifier: number | string }>;
  note?: string;
};
type CartItem = {
  id: string;
  quantity: number;
  optionsSnapshot?: OptionSnapshot | null;
  product?: { id: string; nameAr: string; price: number; imageUrl?: string | null };
};

export default function CartTabScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(t, insets), [t, insets]);
  const { refresh: refreshCartCount } = useCart();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const swipeableRefs = useRef<Map<string, Swipeable | null>>(new Map());

  const load = async () => {
    setLoading(true);
    try {
      const res = await getCart();
      setItems((res?.items as CartItem[]) || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const updateQty = async (id: string, quantity: number) => {
    if (quantity < 1) return;
    setUpdating(id);
    try {
      await updateCartItem(id, quantity);
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, quantity } : i)));
      refreshCartCount();
    } finally {
      setUpdating(null);
    }
  };

  const remove = async (id: string) => {
    swipeableRefs.current.get(id)?.close();
    setUpdating(id);
    try {
      await removeCartItem(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      refreshCartCount();
    } finally {
      setUpdating(null);
    }
  };

  const itemUnitPrice = (item: CartItem) => {
    const base = Number(item.product?.price) || 0;
    const addons = (item.optionsSnapshot?.selectedOptions ?? []).reduce(
      (s, o) => s + (Number(o.priceModifier) || 0), 0,
    );
    return base + addons;
  };

  const total = items.reduce((sum, i) => sum + (i.quantity * itemUnitPrice(i)), 0);

  const renderRightActions = (item: CartItem) => (
    <TouchableOpacity
      style={styles.swipeAction}
      onPress={() => remove(item.id)}
      disabled={updating === item.id}
      activeOpacity={1}
    >
      <View style={styles.redCircle}>
        <Text style={styles.closeIconText}>×</Text>
      </View>
    </TouchableOpacity>
  );

  const renderLeftActions = (item: CartItem) => (
    <TouchableOpacity
      style={styles.swipeAction}
      onPress={() => remove(item.id)}
      disabled={updating === item.id}
      activeOpacity={1}
    >
      <View style={styles.redCircle}>
        <Text style={styles.closeIconText}>×</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={[styles.header, styles.headerRtl]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Image source={{ uri: CHEVRON_LEFT_URI }} style={styles.chevronImg} resizeMode="contain" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>السلة</Text>
          <View style={styles.headerSpacer} />
        </View>
        <ActivityIndicator size="large" color={t.colors.primary} style={styles.loader} />
      </SafeAreaView>
    );
  }

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={[styles.header, styles.headerRtl]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Image source={{ uri: CHEVRON_LEFT_URI }} style={styles.chevronImg} resizeMode="contain" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>السلة</Text>
          <View style={styles.headerSpacer} />
        </View>
        <EmptyState
          kind="cart"
          title="السلة فارغة"
          message="أضف منتجات من المتاجر لتظهر هنا"
          actionLabel="تصفح المتاجر"
          onAction={() => router.push('/(tabs)/search')}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={[styles.header, styles.headerRtl]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Image source={{ uri: CHEVRON_LEFT_URI }} style={styles.chevronImg} resizeMode="contain" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>السلة</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={[styles.hintRow, styles.rowRtl]}>
        <Image source={{ uri: SWIPE_ICON_URI }} style={styles.swipeIcon} resizeMode="contain" />
        <Text style={styles.hintText}>اسحب العنصر لحذفه</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {items.map((item) => {
          const uPrice = itemUnitPrice(item);
          const imageUrl = item.product?.imageUrl;
          return (
            <View key={item.id} style={styles.swipeRow}>
              <Swipeable
                ref={(ref) => { swipeableRefs.current.set(item.id, ref); }}
                renderRightActions={I18nManager.isRTL ? undefined : () => renderRightActions(item)}
                renderLeftActions={I18nManager.isRTL ? () => renderLeftActions(item) : undefined}
                friction={2}
                rightThreshold={30}
                leftThreshold={30}
              >
                <View style={[styles.card, styles.cardRtl]}>
                <View style={styles.cardImageWrap}>
                  {imageUrl ? (
                    <Image source={{ uri: imageUrl }} style={styles.cardImage} resizeMode="cover" />
                  ) : (
                    <View style={styles.cardImagePlaceholder}>
                      <Text style={styles.cardImagePlaceholderText}>{item.product?.nameAr?.charAt(0) || '?'}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.cardName} numberOfLines={2}>{item.product?.nameAr || 'منتج'}</Text>
                  {(item.optionsSnapshot?.selectedOptions?.length || item.optionsSnapshot?.note) ? <Text style={styles.cardOptions} numberOfLines={1}>{item.optionsSnapshot?.selectedOptions?.map((option) => option.name).join(' · ') || item.optionsSnapshot?.note}</Text> : null}
                  <Text style={styles.cardPrice}>{formatPrice(uPrice)}</Text>
                </View>
                <View style={[styles.qtyStepper, styles.rowRtl]}>
                  <TouchableOpacity
                    style={[styles.qtyBtn, item.quantity <= 1 && styles.qtyBtnDisabled]}
                    onPress={() => updateQty(item.id, item.quantity - 1)}
                    disabled={updating === item.id || item.quantity <= 1}
                    activeOpacity={0.7}
                  >
                    <View style={styles.qtyMinusIcon} />
                  </TouchableOpacity>
                  <Text style={styles.qtyValue} numberOfLines={1}>{item.quantity}</Text>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => updateQty(item.id, item.quantity + 1)}
                    disabled={updating === item.id}
                    activeOpacity={0.7}
                  >
                    <View style={styles.qtyPlusIcon}>
                      <View style={styles.qtyPlusH} />
                      <View style={styles.qtyPlusV} />
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
              </Swipeable>
            </View>
          );
        })}
      </ScrollView>

      <View style={[styles.footer, styles.footerRtl]}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>المجموع</Text>
          <Text style={styles.totalValue}>{formatPrice(total)}</Text>
        </View>
        <TouchableOpacity
          style={styles.completeBtn}
          onPress={() => router.push('/checkout')}
          activeOpacity={0.88}
        >
          <Text style={styles.completeBtnText}>إتمام الطلب</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (t: ReturnType<typeof useTheme>, insets: { bottom: number }) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: H_PADDING,
      paddingTop: 12,
      paddingBottom: 16,
      minHeight: 56,
      backgroundColor: t.colors.background,
    },
    headerRtl: { direction: 'rtl' },
    backBtn: {
      width: 44,
      height: 44,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1,
    },
    headerSpacer: { width: 44, height: 44 },
    chevronImg: { width: 24, height: 24 },
    headerTitle: {
      position: 'absolute',
      left: 0,
      right: 0,
      fontSize: 20,
      fontFamily: t.fonts.semiBold,
      color: t.colors.text,
      textAlign: 'center',
      lineHeight: 26,
      pointerEvents: 'none',
    },
    loader: { flex: 1 },
    hintRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: H_PADDING,
      marginBottom: 10,
      gap: 10,
    },
    rowRtl: { direction: 'rtl' },
    swipeIcon: { width: 22, height: 22 },
    hintText: {
      fontSize: 12,
      fontFamily: t.fonts.regular,
      color: t.colors.textSecondary,
      lineHeight: 18,
    },
    scroll: { flex: 1 },
    scrollContent: {
      paddingHorizontal: H_PADDING,
      paddingBottom: 32,
      gap: CARD_GAP,
    },
    swipeRow: {
      width: '100%',
      maxWidth: CARD_MAX_WIDTH,
      alignSelf: 'center',
    },
    swipeAction: {
      width: SWIPE_ACTION_WIDTH,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 10,
    },
    redCircle: {
      width: 48,
      height: 48,
      borderRadius: 16,
      backgroundColor: t.colors.error,
      justifyContent: 'center',
      alignItems: 'center',
    },
    closeIconText: {
      fontSize: 28,
      fontFamily: t.fonts.regular,
      color: t.colors.white,
      lineHeight: 30,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '100%',
      height: CARD_HEIGHT,
      backgroundColor: t.colors.surface,
      borderRadius: 24,
      paddingHorizontal: CARD_PADDING,
      ...t.shadow.shadow2,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.colors.glassBorder,
    },
    cardRtl: { direction: 'rtl' },
    cardImageWrap: {
      width: IMAGE_SIZE,
      height: IMAGE_SIZE,
      borderRadius: 14,
      overflow: 'hidden',
      backgroundColor: t.colors.backgroundSecondary,
    },
    cardImage: { width: '100%', height: '100%' },
    cardImagePlaceholder: {
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: t.colors.backgroundSecondary,
    },
    cardImagePlaceholderText: {
      fontSize: 24,
      fontFamily: t.fonts.bold,
      color: t.colors.primary,
    },
    cardContent: {
      flex: 1,
      minWidth: 0,
      marginHorizontal: 10,
      justifyContent: 'center',
    },
    cardName: {
      fontSize: 15,
      fontFamily: t.fonts.semiBold,
      color: t.colors.text,
      lineHeight: 22,
      marginBottom: 2,
    },
    cardPrice: {
      fontSize: 14,
      fontFamily: t.fonts.semiBold,
      color: t.colors.text,
      lineHeight: 20,
    },
    cardOptions: { fontSize: 11, lineHeight: 16, fontFamily: t.fonts.regular, color: t.colors.textMuted, marginBottom: 2 },
    qtyStepper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: QTY_STEPPER_GAP,
      flexShrink: 0,
    },
    qtyBtn: {
      width: QTY_BTN_SIZE,
      height: QTY_BTN_SIZE,
      borderRadius: QTY_BTN_SIZE / 2,
      backgroundColor: t.colors.primarySoft,
      borderWidth: 1,
      borderColor: t.colors.primary + '55',
      justifyContent: 'center',
      alignItems: 'center',
    },
    qtyBtnDisabled: {
      opacity: 0.4,
      borderColor: t.colors.border,
    },
    qtyMinusIcon: {
      width: 10,
      height: 2,
      backgroundColor: t.colors.primary,
      borderRadius: 1,
    },
    qtyPlusIcon: {
      width: 14,
      height: 14,
      justifyContent: 'center',
      alignItems: 'center',
    },
    qtyPlusH: {
      position: 'absolute',
      width: 10,
      height: 2,
      backgroundColor: t.colors.primary,
      borderRadius: 1,
    },
    qtyPlusV: {
      position: 'absolute',
      width: 2,
      height: 10,
      backgroundColor: t.colors.primary,
      borderRadius: 1,
    },
    qtyValue: {
      fontSize: 15,
      fontFamily: t.fonts.semiBold,
      color: t.colors.text,
      minWidth: 20,
      textAlign: 'center',
    },
    footer: {
      backgroundColor: t.colors.surface,
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      paddingTop: 16,
      paddingBottom: 16 + TAB_BAR_HEIGHT + insets.bottom,
      paddingHorizontal: H_PADDING,
      ...t.shadow.shadow3,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderColor: t.colors.glassBorder,
    },
    footerRtl: { direction: 'rtl' },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    totalLabel: {
      fontSize: 16,
      fontFamily: t.fonts.regular,
      color: t.colors.text,
      lineHeight: 22,
    },
    totalValue: {
      fontSize: 18,
      fontFamily: t.fonts.bold,
      color: t.colors.primary,
      lineHeight: 24,
    },
    completeBtn: {
      height: 52,
      backgroundColor: t.colors.primary,
      borderRadius: 15,
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
      maxWidth: CARD_MAX_WIDTH,
      alignSelf: 'center',
    },
    completeBtnText: {
      fontSize: 17,
      fontFamily: t.fonts.semiBold,
      color: t.colors.white,
      textAlign: 'center',
      lineHeight: 22,
    },
  });
