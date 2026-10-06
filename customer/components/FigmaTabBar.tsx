import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { usePathname, router } from 'expo-router';
import { Clock3, House, Search, ShoppingBag, UserRound } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCart } from '../contexts/CartContext';
import { useTheme } from '../contexts/ThemeContext';
import { TactilePressable } from './sunset';

const tabs = [
  { route: '/(tabs)', label: 'الرئيسية', Icon: House },
  { route: '/(tabs)/search', label: 'استكشف', Icon: Search },
  { route: '/(tabs)/cart', label: 'السلة', Icon: ShoppingBag },
  { route: '/(tabs)/orders', label: 'طلباتي', Icon: Clock3 },
  { route: '/(tabs)/account', label: 'حسابي', Icon: UserRound },
] as const;

export function FigmaTabBar() {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { count } = useCart();
  const active = (route: string) => route === '/(tabs)' ? pathname === '/' || pathname === '/(tabs)' || pathname === '/(tabs)/index' : pathname === route;
  return <View style={[styles.shell, { bottom: Math.max(insets.bottom, 10) }]}>
    <View style={styles.bar}>{tabs.map(({ route, label, Icon }) => {
      const selected = active(route);
      return <TactilePressable key={route} style={styles.tab} onPress={() => router.replace(route as any)} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected }} haptic="light">
        <View style={styles.iconWrap}><Icon size={20} strokeWidth={selected ? 2.5 : 1.9} color={selected ? t.colors.primary : t.colors.textSecondary} />{route.includes('cart') && count > 0 ? <View style={styles.badge}><Text style={styles.badgeText}>{count > 9 ? '9+' : count}</Text></View> : null}</View>
        <Text style={[styles.label, selected && styles.labelActive]}>{label}</Text>
      </TactilePressable>;
    })}</View>
  </View>;
}

const makeStyles = (t: ReturnType<typeof useTheme>) => StyleSheet.create({
  shell: { position: 'absolute', left: 12, right: 12, height: 54, backgroundColor: 'rgba(255,255,255,0.96)', borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: t.colors.border, boxShadow: '0 8px 24px rgba(23,21,19,0.10)', overflow: 'hidden' },
  bar: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 4 },
  tab: { minWidth: 54, flex: 1, height: '100%', alignItems: 'center', justifyContent: 'center', gap: 2 },
  iconWrap: { position: 'relative', height: 23, justifyContent: 'center' },
  label: { color: t.colors.textSecondary, fontFamily: t.fonts.medium, fontSize: 10, lineHeight: 14 }, labelActive: { color: t.colors.primaryDark, fontFamily: t.fonts.bold },
  badge: { position: 'absolute', top: -7, right: -11, minWidth: 15, height: 15, borderRadius: 8, backgroundColor: t.colors.primary, borderWidth: 1.5, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' }, badgeText: { color: '#fff', fontFamily: t.fonts.bold, fontSize: 8 },
});
