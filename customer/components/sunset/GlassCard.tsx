import React from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';

type Props = ViewProps & {
  blur?: boolean;
  elevated?: boolean;
  radius?: number;
  children?: React.ReactNode;
};

export function GlassCard({ blur = false, elevated = false, radius, style, children, ...rest }: Props) {
  const t = useTheme();
  const r = radius ?? t.radius.xl;
  return (
    <View
      {...rest}
      style={[
        styles.frame,
        {
          borderRadius: r,
          borderColor: t.colors.glassBorder,
          backgroundColor: blur ? t.colors.glass : t.colors.surface,
        },
        elevated ? t.shadow.shadow2 : t.shadow.shadow1,
        style,
      ]}
    >
      {blur && (
        <BlurView
          intensity={32}
          tint="light"
          experimentalBlurMethod="dimezisBlurView"
          style={[StyleSheet.absoluteFill, { borderRadius: r }]}
        />
      )}
      <LinearGradient
        pointerEvents="none"
        colors={[t.colors.highlight, 'rgba(255,255,255,0)']}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.82, y: 0.55 }}
        style={[styles.highlight, { borderRadius: r }]}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  highlight: { ...StyleSheet.absoluteFillObject, opacity: 0.34 },
});
