import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

type StepperCapsuleProps = {
  value: number;
  onMinus: () => void;
  onPlus: () => void;
  minusDisabled?: boolean;
  plusDisabled?: boolean;
};

export function StepperCapsule({
  value,
  onMinus,
  onPlus,
  minusDisabled,
  plusDisabled,
}: StepperCapsuleProps) {
  const t = useTheme();
  const styles = makeStyles(t);
  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={[styles.side, styles.left]}
        onPress={onMinus}
        disabled={minusDisabled}
        activeOpacity={0.78}
      >
        <Text style={styles.sideText}>-</Text>
      </TouchableOpacity>
      <View style={styles.middle}>
        <Text style={styles.value}>{value}</Text>
      </View>
      <TouchableOpacity
        style={[styles.side, styles.right]}
        onPress={onPlus}
        disabled={plusDisabled}
        activeOpacity={0.78}
      >
        <Text style={styles.sideText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const makeStyles = (t: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: t.colors.borderLight,
      overflow: 'hidden',
      ...t.shadow.shadow1,
    },
    side: {
      width: 42,
      height: 42,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: t.colors.primarySoft,
    },
    left: {
      borderTopLeftRadius: 11,
      borderBottomLeftRadius: 11,
    },
    right: {
      borderTopRightRadius: 11,
      borderBottomRightRadius: 11,
    },
    sideText: {
      ...t.typography.body,
      fontSize: 22,
      color: t.colors.primaryDark,
    },
    middle: {
      width: 42,
      height: 42,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: t.colors.surface,
    },
    value: {
      ...t.typography.titleMedium,
      fontSize: 17,
      fontFamily: t.fonts.bold,
      color: t.colors.text,
    },
  });
