import React from 'react';
import { Text, type TextProps, type TextStyle } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

type Variant = 'display' | 'titleLarge' | 'titleMedium' | 'body' | 'bodyMedium' | 'caption' | 'captionMedium';
type Props = TextProps & { variant?: Variant; color?: string; align?: TextStyle['textAlign'] };

export function AppText({ variant = 'body', color, align = 'right', style, ...rest }: Props) {
  const t = useTheme();
  return (
    <Text
      {...rest}
      style={[
        t.typography[variant],
        { color: color ?? t.colors.text, textAlign: align, writingDirection: 'rtl' },
        style,
      ]}
    />
  );
}
