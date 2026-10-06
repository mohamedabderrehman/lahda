import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { TactilePressable } from '../sunset';

const SIZE = 50;

type IconButtonProps = {
  children: React.ReactNode;
  onPress: () => void;
  size?: number;
  style?: object;
};

export function IconButton({ children, onPress, size = SIZE, style }: IconButtonProps) {
  const t = useTheme();
  const styles = makeStyles(t, size);
  return (
    <TactilePressable style={[styles.button, style]} onPress={onPress}>
      <View style={styles.inner}>{children}</View>
    </TactilePressable>
  );
}

const makeStyles = (t: ReturnType<typeof useTheme>, size: number) =>
  StyleSheet.create({
    button: {
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: t.colors.glass,
      justifyContent: 'center',
      alignItems: 'center',
      ...t.shadow.shadow1,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.colors.glassBorder,
    },
    inner: {
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
