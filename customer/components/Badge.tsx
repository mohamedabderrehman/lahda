import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

export type BadgeVariant = 'discount' | 'success' | 'error' | 'neutral';

type BadgeProps = {
  children: React.ReactNode;
  variant?: BadgeVariant;
  style?: ViewStyle;
  textStyle?: TextStyle;
};

/**
 * Badge: rounded, light background, bold text.
 * Use for discounts and statuses.
 */
export function Badge({ children, variant = 'neutral', style, textStyle }: BadgeProps) {
  const t = useTheme();
  const styles = StyleSheet.create({
    wrap: {
      alignSelf: 'flex-start',
      borderRadius: t.radius.full,
      paddingHorizontal: t.spacing.md,
      paddingVertical: t.spacing.xs,
      backgroundColor:
        variant === 'discount'
          ? t.colors.discount + '22'
          : variant === 'success'
            ? t.colors.success + '22'
            : variant === 'error'
              ? t.colors.error + '22'
              : t.colors.backgroundSecondary,
    },
    text: {
      ...t.typography.caption,
      fontFamily: t.fonts.bold,
      color:
        variant === 'discount'
          ? t.colors.discount
          : variant === 'success'
            ? t.colors.success
            : variant === 'error'
              ? t.colors.error
              : t.colors.text,
    },
  });
  return (
    <View style={[styles.wrap, style]}>
      <Text style={[styles.text, textStyle]}>{children}</Text>
    </View>
  );
}
