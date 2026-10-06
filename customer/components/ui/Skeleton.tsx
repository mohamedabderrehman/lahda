import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

type SkeletonProps = {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: object;
};

export function Skeleton({ width = '100%', height = 20, borderRadius, style }: SkeletonProps) {
  const t = useTheme();
  const r = borderRadius ?? t.radius.sm;
  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius: r,
          backgroundColor: t.colors.backgroundSecondary,
        },
        style,
      ]}
    />
  );
}

export function HomeSkeleton() {
  const t = useTheme();
  const styles = makeStyles(t);
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Skeleton width={44} height={44} borderRadius={22} />
        <Skeleton width="70%" height={44} borderRadius={t.radius.cardRadius} />
        <Skeleton width={44} height={44} borderRadius={22} />
      </View>
      <View style={styles.searchRow}>
        <Skeleton width="100%" height={56} borderRadius={t.radius.full} />
      </View>
      <View style={styles.section}>
        <Skeleton width={120} height={24} borderRadius={t.radius.sm} />
        <View style={styles.chipRow}>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} width={72} height={72} borderRadius={t.radius.cardRadius} />
          ))}
        </View>
      </View>
      <View style={styles.section}>
        <Skeleton width={140} height={24} borderRadius={t.radius.sm} />
        <View style={styles.cardRow}>
          {[1, 2].map((i) => (
            <View key={i} style={styles.card}>
              <Skeleton width="100%" height={200} borderRadius={t.radius.cardRadius} />
              <Skeleton width={80} height={20} borderRadius={t.radius.sm} style={styles.cardTitle} />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const makeStyles = (t: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: t.spacing.screenPadding,
      paddingTop: t.spacing.lg,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: t.spacing.xl,
    },
    searchRow: {
      marginBottom: t.spacing.xl,
    },
    section: {
      marginBottom: t.spacing.xxl,
    },
    chipRow: {
      flexDirection: 'row',
      gap: t.spacing.md,
      marginTop: t.spacing.lg,
    },
    cardRow: {
      flexDirection: 'row',
      gap: t.spacing.lg,
      marginTop: t.spacing.lg,
    },
    card: {
      width: 280,
    },
    cardTitle: {
      marginTop: t.spacing.md,
    },
  });
