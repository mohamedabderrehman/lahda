import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

type LocationCapsuleProps = {
  label: string;
  onPress?: () => void;
  leftElement?: React.ReactNode;
};

export function LocationCapsule({ label, onPress, leftElement }: LocationCapsuleProps) {
  const t = useTheme();
  const styles = makeStyles(t);
  const content = (
    <View style={styles.capsule}>
      {leftElement}
      <Text style={styles.text} numberOfLines={1}>{label}</Text>
    </View>
  );
  if (onPress) {
    return (
      <TouchableOpacity style={styles.wrap} onPress={onPress} activeOpacity={0.85}>
        {content}
      </TouchableOpacity>
    );
  }
  return <View style={styles.wrap}>{content}</View>;
}

const makeStyles = (t: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    wrap: {
      width: '70%',
      height: '100%',
      maxHeight: 50,
      justifyContent: 'center',
    },
    capsule: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      minHeight: 44,
      paddingHorizontal: t.spacing.lg,
      backgroundColor: t.colors.backgroundSecondary,
      borderRadius: t.radius.cardRadius,
      ...t.shadow.shadow1,
      gap: t.spacing.xs,
    },
    text: {
      ...t.typography.titleMedium,
      color: t.colors.text,
      flex: 1,
      textAlign: 'center',
    },
  });
