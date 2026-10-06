import { type ComponentType, type ReactNode, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, View, type KeyboardTypeOptions, type StyleProp, type ViewStyle } from 'react-native';
import { Heart, MapPin, PackageOpen, Search, ShoppingBag, Star, Store, type LucideProps } from 'lucide-react-native';
import { router } from 'expo-router';
import { useTheme } from '../contexts/ThemeContext';
import { TactilePressable } from './sunset';

type Icon = ComponentType<LucideProps>;

export function IconControl({ icon: Icon, label, onPress, badge }: { icon: Icon; label: string; onPress: () => void; badge?: number }) {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  return <TactilePressable accessibilityLabel={label} onPress={onPress} style={styles.iconControl} haptic="light">
    <Icon size={21} color={t.colors.text} strokeWidth={2} />
    {!!badge && <View style={styles.countBadge}><Text style={styles.countBadgeText}>{badge > 99 ? '99+' : badge}</Text></View>}
  </TactilePressable>;
}

export function FoodSearchField({ value, onChangeText, onSubmit, placeholder = 'ابحث عن مطعم أو طبق' }: { value: string; onChangeText: (value: string) => void; onSubmit?: () => void; placeholder?: string }) {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  return <View style={styles.searchField}>
    <Search size={21} color={t.colors.textMuted} strokeWidth={2} />
    <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={t.colors.textMuted} style={styles.searchInput} textAlign="right" returnKeyType="search" onSubmitEditing={onSubmit} />
  </View>;
}

export function SectionHeading({ title, actionLabel, onAction }: { title: string; actionLabel?: string; onAction?: () => void }) {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  return <View style={styles.sectionHeading}>
    {actionLabel && onAction ? <Pressable onPress={onAction} hitSlop={8}><Text style={styles.sectionAction}>{actionLabel}</Text></Pressable> : <View />}
    <Text style={styles.sectionTitle}>{title}</Text>
  </View>;
}

export type RestaurantInfo = {
  id?: string;
  storeName: string;
  storeSlug: string;
  coverUrl?: string | null;
  logoUrl?: string | null;
  isOpen?: boolean;
  hasOffers?: boolean;
  ratingAvg?: number;
  discountLabel?: string | null;
};

export function RestaurantCard({ restaurant, compact = false }: { restaurant: RestaurantInfo; compact?: boolean }) {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const image = restaurant.coverUrl || restaurant.logoUrl;
  const hasRating = Number(restaurant.ratingAvg) > 0;
  return <TactilePressable onPress={() => router.push(`/store/${restaurant.storeSlug}`)} style={[styles.restaurantCard, compact && styles.restaurantCompact]}>
    <View style={styles.restaurantImageWrap}>
      {image ? <Image source={{ uri: image }} style={styles.restaurantImage} resizeMode="cover" /> : <View style={styles.restaurantPlaceholder}><Store size={30} color={t.colors.textMuted} /></View>}
      {!restaurant.isOpen && <View style={styles.closedPill}><Text style={styles.closedPillText}>مغلق</Text></View>}
      {restaurant.hasOffers && <View style={styles.offerPill}><Text style={styles.offerPillText}>{restaurant.discountLabel || 'عرض اليوم'}</Text></View>}
    </View>
    <View style={styles.restaurantDetails}>
      <Text style={styles.restaurantName} numberOfLines={1}>{restaurant.storeName}</Text>
      <View style={styles.restaurantMeta}>
        {hasRating ? <View style={styles.metaItem}><Star size={13} color="#E3A21A" fill="#E3A21A" /><Text style={styles.metaText}>{Number(restaurant.ratingAvg).toFixed(1)}</Text></View> : <Text style={styles.newLabel}>جديد</Text>}
        {restaurant.hasOffers ? <View style={styles.metaDot} /> : null}
        {restaurant.hasOffers ? <Text style={styles.metaText}>{restaurant.discountLabel || 'عرض متاح'}</Text> : null}
      </View>
    </View>
  </TactilePressable>;
}

export function PrimaryAction({ label, onPress, loading, disabled, style }: { label: string; onPress: () => void; loading?: boolean; disabled?: boolean; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  return <TactilePressable style={[styles.primaryAction, style]} onPress={onPress} disabled={disabled || loading} haptic="medium"><>{loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryActionText}>{label}</Text>}</></TactilePressable>;
}

export function FormField({ label, value, onChangeText, placeholder, secureTextEntry, keyboardType = 'default', autoComplete, trailing }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; secureTextEntry?: boolean; keyboardType?: KeyboardTypeOptions; autoComplete?: 'email' | 'password' | 'name' | 'tel'; trailing?: ReactNode }) {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  return <View style={styles.formBlock}><Text style={styles.formLabel}>{label}</Text><View style={styles.formInputWrap}><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={t.colors.textMuted} secureTextEntry={secureTextEntry} keyboardType={keyboardType} autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'} autoComplete={autoComplete} style={styles.formInput} textAlign="right" />{trailing}</View></View>;
}

const emptyIcons: Record<string, Icon> = { cart: ShoppingBag, orders: PackageOpen, search: Search, favorites: Heart, stores: MapPin };
export function EmptyMoment({ kind = 'search', title, message, actionLabel, onAction }: { kind?: 'cart' | 'orders' | 'search' | 'favorites' | 'stores'; title: string; message?: string; actionLabel?: string; onAction?: () => void }) {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const Icon = emptyIcons[kind];
  return <View style={styles.emptyMoment}><View style={styles.emptyIcon}><Icon size={34} color={kind === 'favorites' ? t.colors.error : t.colors.primary} strokeWidth={1.6} /></View><Text style={styles.emptyTitle}>{title}</Text>{message ? <Text style={styles.emptyMessage}>{message}</Text> : null}{actionLabel && onAction ? <Pressable onPress={onAction} style={styles.emptyAction}><Text style={styles.emptyActionText}>{actionLabel}</Text></Pressable> : null}</View>;
}

const makeStyles = (t: ReturnType<typeof useTheme>) => StyleSheet.create({
  iconControl: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 21, borderWidth: StyleSheet.hairlineWidth, borderColor: t.colors.borderLight, backgroundColor: t.colors.surfaceElevated },
  countBadge: { position: 'absolute', top: -3, right: -2, minWidth: 17, height: 17, paddingHorizontal: 3, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: t.colors.primary }, countBadgeText: { color: '#fff', fontSize: 9, fontFamily: t.fonts.bold },
  searchField: { minHeight: 52, flexDirection: 'row-reverse', gap: 10, alignItems: 'center', paddingHorizontal: 16, borderRadius: 14, backgroundColor: t.colors.surfaceElevated, borderWidth: 1, borderColor: t.colors.border }, searchInput: { flex: 1, fontFamily: t.fonts.medium, fontSize: 15, color: t.colors.text, paddingVertical: 12 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }, sectionTitle: { color: t.colors.text, fontFamily: t.fonts.bold, fontSize: 19, lineHeight: 27 }, sectionAction: { color: t.colors.primaryDark, fontFamily: t.fonts.medium, fontSize: 13 },
  restaurantCard: { backgroundColor: t.colors.surfaceElevated, borderRadius: 16, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: t.colors.borderLight, marginBottom: 14 }, restaurantCompact: { width: 222, marginLeft: 12, marginBottom: 0 }, restaurantImageWrap: { height: 126, backgroundColor: t.colors.backgroundSecondary, position: 'relative' }, restaurantImage: { width: '100%', height: '100%' }, restaurantPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' }, closedPill: { position: 'absolute', top: 9, right: 9, paddingHorizontal: 7, paddingVertical: 3, backgroundColor: 'rgba(23,21,19,0.78)', borderRadius: 7 }, closedPillText: { color: '#fff', fontFamily: t.fonts.medium, fontSize: 10 }, offerPill: { position: 'absolute', left: 9, top: 9, paddingHorizontal: 7, paddingVertical: 3, backgroundColor: '#E95454', borderRadius: 7 }, offerPillText: { color: '#fff', fontFamily: t.fonts.medium, fontSize: 10 },
  restaurantDetails: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 11 }, restaurantName: { color: t.colors.text, fontFamily: t.fonts.bold, fontSize: 15, textAlign: 'right' }, restaurantMeta: { flexDirection: 'row-reverse', alignItems: 'center', gap: 7, marginTop: 5 }, metaItem: { flexDirection: 'row-reverse', gap: 4, alignItems: 'center' }, metaText: { color: t.colors.textSecondary, fontFamily: t.fonts.regular, fontSize: 11 }, newLabel: { color: t.colors.success, fontFamily: t.fonts.bold, fontSize: 11 }, metaDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: t.colors.textMuted },
  primaryAction: { minHeight: 52, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, borderRadius: 14, backgroundColor: t.colors.primary, boxShadow: '0 8px 18px rgba(255,107,26,0.20)' }, primaryActionText: { color: '#fff', fontFamily: t.fonts.bold, fontSize: 16 },
  formBlock: { gap: 7 }, formLabel: { fontFamily: t.fonts.semiBold, fontSize: 14, color: t.colors.text }, formInputWrap: { minHeight: 52, flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: 14, backgroundColor: t.colors.surfaceElevated, borderWidth: 1, borderColor: t.colors.border, borderRadius: 12 }, formInput: { flex: 1, color: t.colors.text, fontFamily: t.fonts.regular, fontSize: 16, paddingVertical: 12 },
  emptyMoment: { flex: 1, minHeight: 270, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 34, paddingBottom: 50 }, emptyIcon: { width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: t.colors.primarySoft, marginBottom: 18 }, emptyTitle: { color: t.colors.text, fontFamily: t.fonts.bold, fontSize: 19 }, emptyMessage: { color: t.colors.textSecondary, fontFamily: t.fonts.regular, fontSize: 14, textAlign: 'center', lineHeight: 23, marginTop: 7 }, emptyAction: { marginTop: 22, paddingVertical: 10 }, emptyActionText: { color: t.colors.primaryDark, fontFamily: t.fonts.bold, fontSize: 15 },
});
