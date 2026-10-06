import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

type OrderSummaryBarProps = {
  itemCount: number;
  totalLabel: string;
};

export function OrderSummaryBar({ itemCount, totalLabel }: OrderSummaryBarProps) {
  const t = useTheme();
  const styles = makeStyles(t);
  return (
    <View style={styles.row}>
      <Text style={styles.count}>{itemCount} عناصر في السلة</Text>
      <Text style={styles.total}>{totalLabel}</Text>
    </View>
  );
}

const makeStyles = (t: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: t.spacing.lg,
      paddingHorizontal: t.spacing.xl,
      borderBottomWidth: 1,
      borderBottomColor: t.colors.borderLight,
    },
    count: {
      ...t.typography.titleMedium,
      color: t.colors.text,
    },
    total: {
      ...t.typography.titleMedium,
      color: t.colors.text,
    },
  });
