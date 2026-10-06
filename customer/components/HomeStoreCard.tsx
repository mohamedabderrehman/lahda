import React, { useMemo } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Star, Store } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { TactilePressable } from './sunset';

type Props = {
  storeName: string;
  storeSlug: string;
  imageUrl?: string | null;
  coverUrl?: string | null;
  ratingAvg?: number;
  ratingCount?: number;
};

export function HomeStoreCard({ storeName, storeSlug, imageUrl, coverUrl, ratingAvg, ratingCount }: Props) {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const heroUrl = coverUrl || imageUrl;
  const hasRating = ratingAvg != null && Number(ratingAvg) > 0;

  return (
    <TactilePressable style={styles.card} onPress={() => router.push(`/store/${storeSlug}`)}>
      <View style={styles.imageWrap}>
        {heroUrl ? (
          <Image source={{ uri: heroUrl }} style={styles.image} resizeMode="cover" />
        ) : (
          <LinearGradient colors={[t.colors.peach, t.colors.primarySoft]} style={styles.placeholder}>
            <Store size={40} color={t.colors.primary} strokeWidth={1.8} />
          </LinearGradient>
        )}
        <LinearGradient
          colors={['rgba(33,26,23,0)', 'rgba(33,26,23,0.72)']}
          start={{ x: 0.5, y: 0.28 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.overlay}
        />
        <View style={styles.ratingPill}>
          <Star size={13} color={t.colors.warning} fill={t.colors.warning} />
          <Text style={styles.ratingText}>
            {hasRating ? Number(ratingAvg).toFixed(1) : 'جديد'}
          </Text>
        </View>
        <View style={styles.nameWrap}>
          <Text style={styles.name} numberOfLines={2}>{storeName}</Text>
          {(ratingCount ?? 0) > 0 && <Text style={styles.count}>{ratingCount} تقييم</Text>}
        </View>
      </View>
      <View style={styles.footer}>
        <View style={styles.dot} />
        <Text style={styles.footerText}>جاهز لطلبك</Text>
        <View style={styles.ctaBubble}><Text style={styles.cta}>استكشف</Text></View>
      </View>
    </TactilePressable>
  );
}

const makeStyles = (t: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    card: {
      width: 236,
      height: 288,
      marginRight: 16,
      backgroundColor: t.colors.surface,
      borderRadius: 30,
      overflow: 'hidden',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.colors.glassBorder,
      ...t.shadow.shadow2,
    },
    imageWrap: { height: 228, backgroundColor: t.colors.backgroundSecondary, overflow: 'hidden' },
    image: { width: '100%', height: '100%' },
    placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    overlay: { ...StyleSheet.absoluteFillObject },
    ratingPill: {
      position: 'absolute', top: 14, left: 14, flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: 'rgba(255,253,249,0.92)', paddingHorizontal: 10, height: 30, borderRadius: 15,
      borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.92)',
    },
    ratingText: { fontSize: 12, lineHeight: 18, fontFamily: t.fonts.bold, color: t.colors.text },
    nameWrap: { position: 'absolute', left: 16, right: 16, bottom: 16, alignItems: 'flex-end' },
    name: { fontSize: 20, lineHeight: 29, fontFamily: t.fonts.bold, color: t.colors.white, textAlign: 'right' },
    count: { fontSize: 11, lineHeight: 18, fontFamily: t.fonts.regular, color: '#FFE9D7', marginTop: 1 },
    footer: { flex: 1, minHeight: 60, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center' },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: t.colors.success, marginRight: 7 },
    footerText: { flex: 1, fontSize: 12, lineHeight: 20, fontFamily: t.fonts.medium, color: t.colors.textSecondary },
    ctaBubble: { backgroundColor: t.colors.primarySoft, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 },
    cta: { fontSize: 11, lineHeight: 17, fontFamily: t.fonts.bold, color: t.colors.primaryDark },
  });
