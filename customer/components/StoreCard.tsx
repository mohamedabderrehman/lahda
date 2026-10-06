import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { formatPrice } from '../constants/theme';
import { IconHeartOutline, IconClockOutline, IconStar } from './Icons';
import { Badge } from './Badge';
import { useTheme } from '../contexts/ThemeContext';
import { getFavoriteIds, toggleFavorite } from '../api/client';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = Math.min(SCREEN_WIDTH * 0.88, 360);

type StoreCardProps = {
  id: string;
  storeName: string;
  storeSlug: string;
  imageUrl?: string | null;
  coverUrl?: string | null;
  deliveryFee?: string | number | null;
  isOpen?: boolean;
  hasOffers?: boolean;
  ratingAvg?: number;
  ratingCount?: number;
  estimatedDeliveryMin?: number | null;
  estimatedDeliveryMax?: number | null;
  discountLabel?: string | null;
  style?: object;
};

export function StoreCard({
  id,
  storeName,
  storeSlug,
  imageUrl,
  coverUrl,
  deliveryFee,
  isOpen = true,
  hasOffers,
  ratingAvg,
  ratingCount,
  estimatedDeliveryMin,
  estimatedDeliveryMax,
  discountLabel,
  style,
}: StoreCardProps) {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const heroUrl = coverUrl || imageUrl;
  const [isFav, setIsFav] = useState(false);
  const [favLoading, setFavLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    getFavoriteIds()
      .then((rows) => {
        if (!mounted) return;
        const isFavorite = rows.some((r) => r.targetType === 'store' && r.targetId === id);
        setIsFav(isFavorite);
      })
      .catch(() => {
        // Ignore failures for guest users or network issues
      });
    return () => {
      mounted = false;
    };
  }, [id]);

  const onToggleFavorite = async (e: any) => {
    e.stopPropagation();
    if (favLoading) return;
    setFavLoading(true);
    const prev = isFav;
    setIsFav(!prev);
    try {
      const res = await toggleFavorite('store', id);
      setIsFav(!!res.favorited);
    } catch {
      setIsFav(prev);
    } finally {
      setFavLoading(false);
    }
  };
  return (
    <TouchableOpacity
      style={[styles.card, style]}
      activeOpacity={0.88}
      onPress={() => router.push(`/store/${storeSlug}`)}
    >
      <View style={styles.imageWrap}>
        {heroUrl ? (
          <Image source={{ uri: heroUrl }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.placeholderText}>{storeName.charAt(0)}</Text>
          </View>
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.32)']}
          style={styles.gradient}
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 0.5, y: 1 }}
        />
        {(estimatedDeliveryMin != null || estimatedDeliveryMax != null) && (
          <View style={styles.timeBadge}>
            <Text style={styles.timeBadgeText}>
              {estimatedDeliveryMin ?? '-'} – {estimatedDeliveryMax ?? '-'} د
            </Text>
          </View>
        )}
        <TouchableOpacity style={styles.favBtn} onPress={onToggleFavorite} activeOpacity={0.8} disabled={favLoading}>
          <IconHeartOutline size={22} color={isFav ? t.colors.discount : t.colors.textMuted} />
        </TouchableOpacity>
        {!isOpen && (
          <View style={styles.closedBadge}>
            <Text style={styles.closedText}>مغلق</Text>
          </View>
        )}
      </View>
      <View style={styles.footer}>
        {/* 1. Store name — bold, primary */}
        <Text style={styles.name} numberOfLines={1}>{storeName}</Text>
        {/* 2. Rating + time — secondary, lighter */}
        <View style={styles.footerRow1}>
          {(ratingAvg ?? 0) > 0 && (
            <View style={styles.ratingRow}>
              <IconStar size={14} color={t.colors.warning} />
              <Text style={styles.ratingText}>{Number(ratingAvg).toFixed(1)}{(ratingCount ?? 0) > 0 ? ` (${ratingCount})` : ''}</Text>
            </View>
          )}
        </View>
        {/* 3. Delivery info — secondary, lighter */}
        {deliveryFee != null && (
          <Text style={styles.delivery}>
            {deliveryFee === 0 || deliveryFee === '0' ? 'توصيل مجاني' : formatPrice(deliveryFee)}
          </Text>
        )}
        {/* 4. Discount badge */}
        {!!hasOffers && (
          <View style={styles.discountRow}>
            <Badge variant="discount">{discountLabel || 'عرض متاح'}</Badge>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const makeStyles = (t: ReturnType<typeof useTheme>) => StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    marginRight: t.spacing.lg,
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.cardRadius,
    overflow: 'hidden',
    borderWidth: 0,
    ...t.shadow.shadow2,
  },
  imageWrap: {
    width: '100%',
    height: t.image.storeCardHeight,
    position: 'relative',
    overflow: 'hidden',
    borderTopLeftRadius: t.radius.cardRadius,
    borderTopRightRadius: t.radius.cardRadius,
  },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: t.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: { ...t.typography.titleLarge, fontSize: 40, color: t.colors.textSecondary },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  favBtn: {
    position: 'absolute',
    top: t.spacing.md,
    right: t.spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    ...t.shadow.shadow1,
  },
  closedBadge: {
    position: 'absolute',
    top: t.spacing.md,
    left: t.spacing.md,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.xs,
    borderRadius: t.radius.full,
  },
  closedText: { ...t.typography.caption, fontFamily: t.fonts.bold, color: t.colors.white },
  timeBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: 50,
    minWidth: 100,
    backgroundColor: t.colors.surface,
    borderTopRightRadius: t.radius.cardRadius,
    borderBottomLeftRadius: t.radius.cardRadius,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: t.spacing.md,
    ...t.shadow.shadow1,
  },
  timeBadgeText: { ...t.typography.titleMedium, color: t.colors.text },
  footer: {
    paddingHorizontal: t.spacing.lg,
    paddingTop: t.spacing.lg,
    paddingBottom: t.spacing.lg,
  },
  name: { 
    ...t.typography.titleMedium, 
    fontFamily: t.fonts.extraBold, 
    color: t.colors.text, 
    marginBottom: t.spacing.sm,
    fontSize: 17,
  },
  footerRow1: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.md, marginBottom: t.spacing.xs },
  ratingRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: t.spacing.xs,
    backgroundColor: t.colors.backgroundSecondary,
    paddingHorizontal: t.spacing.sm,
    paddingVertical: t.spacing.xs,
    borderRadius: t.radius.full,
  },
  ratingText: { ...t.typography.caption, fontFamily: t.fonts.bold, color: t.colors.text },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.xs },
  deliveryTime: { ...t.typography.caption, fontFamily: t.fonts.medium, color: t.colors.textSecondary },
  delivery: { ...t.typography.caption, fontFamily: t.fonts.medium, color: t.colors.textMuted, marginTop: t.spacing.xs },
  discountRow: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.xs, marginTop: t.spacing.sm },
  discountText: { ...t.typography.caption, fontFamily: t.fonts.bold, color: t.colors.discount },
});

/** Full-width row for vertical store list */
export function StoreListRow({
  storeName,
  storeSlug,
  imageUrl,
  coverUrl,
  deliveryFee,
  isOpen = true,
  hasOffers,
  ratingAvg,
  estimatedDeliveryMin,
  estimatedDeliveryMax,
  discountLabel,
}: StoreCardProps) {
  const t = useTheme();
  const rowStyles = useMemo(() => makeRowStyles(t), [t]);
  const heroUrl = coverUrl || imageUrl;
  return (
    <TouchableOpacity
      style={rowStyles.card}
      activeOpacity={0.88}
      onPress={() => router.push(`/store/${storeSlug}`)}
    >
      <View style={rowStyles.imageWrap}>
        {heroUrl ? (
          <Image source={{ uri: heroUrl }} style={rowStyles.image} resizeMode="cover" />
        ) : (
          <View style={rowStyles.imagePlaceholder}>
            <Text style={rowStyles.placeholderText}>{storeName.charAt(0)}</Text>
          </View>
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.28)']}
          style={rowStyles.gradient}
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 0.5, y: 1 }}
        />
        {!isOpen && (
          <View style={rowStyles.closedBadge}>
            <Text style={rowStyles.closedText}>مغلق</Text>
          </View>
        )}
      </View>
      <View style={rowStyles.info}>
        {/* 1. Store name — bold */}
        <Text style={rowStyles.name} numberOfLines={1}>{storeName}</Text>
        {/* 2. Rating + time — lighter */}
        <View style={rowStyles.metaRow}>
          {(ratingAvg ?? 0) > 0 && (
            <View style={rowStyles.ratingRow}>
              <IconStar size={12} color={t.colors.warning} />
              <Text style={rowStyles.ratingText}>{Number(ratingAvg).toFixed(1)}</Text>
            </View>
          )}
          {(estimatedDeliveryMin != null || estimatedDeliveryMax != null) && (
            <View style={rowStyles.timeRow}>
              <IconClockOutline size={12} color={t.colors.textMuted} />
              <Text style={rowStyles.deliveryTime}>{estimatedDeliveryMin ?? '-'} – {estimatedDeliveryMax ?? '-'} د</Text>
            </View>
          )}
        </View>
        {/* 3. Delivery info + 4. Discount badge — lighter */}
        <View style={rowStyles.metaRow}>
          {deliveryFee != null && (
            <Text style={rowStyles.delivery}>
              {deliveryFee === 0 || deliveryFee === '0' ? 'توصيل مجاني' : formatPrice(deliveryFee)}
            </Text>
          )}
          {!!hasOffers && <Badge variant="discount">{discountLabel || 'عرض متاح'}</Badge>}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const makeRowStyles = (t: ReturnType<typeof useTheme>) => StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.cardRadius,
    overflow: 'hidden',
    marginBottom: t.spacing.lg,
    ...t.shadow.shadow2,
  },
  imageWrap: {
    width: t.image.storeListRowSize,
    height: t.image.storeListRowSize,
    position: 'relative',
    borderRadius: t.radius.lg,
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: t.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: { ...t.typography.titleMedium, color: t.colors.textSecondary },
  gradient: { ...StyleSheet.absoluteFillObject },
  closedBadge: {
    position: 'absolute',
    bottom: t.spacing.sm,
    left: t.spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: t.spacing.sm,
    paddingVertical: t.spacing.xs,
    borderRadius: t.radius.sm,
  },
  closedText: { ...t.typography.caption, fontFamily: t.fonts.medium, color: t.colors.white },
  info: { flex: 1, paddingHorizontal: t.spacing.lg, paddingVertical: t.spacing.md },
  name: { ...t.typography.body, fontFamily: t.fonts.bold, color: t.colors.textSecondary, marginBottom: t.spacing.sm },
  delivery: { ...t.typography.caption, color: t.colors.textSecondary },
  deliveryTime: { ...t.typography.caption, color: t.colors.textMuted },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: t.spacing.xs, gap: t.spacing.md },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.xs },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.xs },
  ratingText: { ...t.typography.caption, fontFamily: t.fonts.bold, color: t.colors.text },
});
