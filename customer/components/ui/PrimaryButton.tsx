import React, { useMemo } from 'react';
import { Text, StyleSheet, ActivityIndicator, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import { TactilePressable } from '../sunset';

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
};

export function PrimaryButton({ label, onPress, loading, disabled, style, labelStyle }: PrimaryButtonProps) {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  return (
    <TactilePressable
      style={[styles.button, disabled && styles.disabled, style]}
      onPress={onPress}
      disabled={disabled || loading}
      haptic="medium"
    >
      <LinearGradient
        colors={[t.colors.apricot, t.colors.primary, t.colors.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.topShine} />
        {loading ? (
          <ActivityIndicator color={t.colors.white} />
        ) : (
          <Text style={[styles.label, labelStyle]}>{label}</Text>
        )}
      </LinearGradient>
    </TactilePressable>
  );
}

const makeStyles = (t: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    button: {
      height: t.button.primaryHeight,
      borderRadius: t.radius.cardRadius,
      backgroundColor: t.colors.primary,
      overflow: 'hidden',
      ...t.shadow.shadow3,
    },
    gradient: { flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center' },
    topShine: { position: 'absolute', top: 1, left: 28, right: 28, height: 1, backgroundColor: 'rgba(255,255,255,0.72)' },
    disabled: { opacity: 0.7 },
    label: {
      ...t.typography.body,
      fontSize: 18,
      fontFamily: t.fonts.bold,
      color: t.colors.white,
      lineHeight: 28,
    },
  });
