import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { IconBellOutline, IconLocationOutline, IconPerson } from './Icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAppSettings } from '../contexts/AppSettingsContext';

type HomeHeaderProps = {
  locationLabel?: string | null;
  onLocationPress?: () => void;
  onNotificationPress?: () => void;
  onProfilePress: () => void;
};

export function HomeHeader({
  locationLabel,
  onLocationPress,
  onNotificationPress,
  onProfilePress,
}: HomeHeaderProps) {
  const t = useTheme();
  const styles = makeStyles(t);
  const { appNameAr } = useAppSettings();
  const locationText = locationLabel && locationLabel.trim() ? locationLabel.trim() : 'اختر موقع التوصيل';

  return (
    <View style={styles.header}>
      {/* Left: Notification with soft circular bg */}
      <TouchableOpacity onPress={onNotificationPress} style={styles.iconBtn} activeOpacity={0.78}>
        <View style={styles.iconCircle}>
          <IconBellOutline size={22} color={t.colors.text} />
        </View>
      </TouchableOpacity>

      {/* Center: Location capsule (pill style like reference) */}
      <TouchableOpacity style={styles.center} onPress={onLocationPress} activeOpacity={0.85}>
        <View style={styles.locationCapsule}>
          <Image
            source={require('../assets/app-logo-transparent-background.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <IconLocationOutline size={16} color={t.colors.primary} style={styles.locationIcon} />
          <Text style={styles.locationText} numberOfLines={1}>{locationText}</Text>
        </View>
      </TouchableOpacity>

      {/* Right: Profile with soft circular bg */}
      <TouchableOpacity onPress={onProfilePress} style={styles.iconBtn} activeOpacity={0.78}>
        <View style={styles.iconCircle}>
          <IconPerson size={22} color={t.colors.text} />
        </View>
      </TouchableOpacity>
    </View>
  );
}

const makeStyles = (t: ReturnType<typeof useTheme>) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: t.spacing.screenPadding,
    paddingVertical: t.spacing.lg,
  },
  iconBtn: {
    padding: t.spacing.xs,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: t.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    ...t.shadow.shadow1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: t.spacing.sm,
  },
  locationCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: t.spacing.lg,
    paddingVertical: t.spacing.sm,
    backgroundColor: t.colors.backgroundSecondary,
    borderRadius: t.radius.cardRadius,
    gap: t.spacing.xs,
    ...t.shadow.shadow1,
  },
  logo: { width: 34, height: 34, borderRadius: 17 },
  logoFallback: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: t.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: { ...t.typography.caption, fontFamily: t.fonts.extraBold, color: t.colors.text, fontSize: 14 },
  locationIcon: { marginHorizontal: t.spacing.xs },
  locationText: {
    ...t.typography.body,
    fontSize: 14,
    fontFamily: t.fonts.medium,
    color: t.colors.text,
    maxWidth: 140,
  },
});
