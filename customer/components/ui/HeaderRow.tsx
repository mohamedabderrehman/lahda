import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

type HeaderRowProps = {
  left?: React.ReactNode;
  center: React.ReactNode;
  right?: React.ReactNode;
};

export function HeaderRow({ left, center, right }: HeaderRowProps) {
  const t = useTheme();
  const styles = makeStyles(t);
  return (
    <View style={styles.row}>
      <View style={styles.side}>{left}</View>
      <View style={styles.center}>{center}</View>
      <View style={styles.side}>{right}</View>
    </View>
  );
}

const makeStyles = (t: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 50,
      paddingHorizontal: t.spacing.screenPadding,
    },
    side: {
      width: 50,
      justifyContent: 'center',
      alignItems: 'center',
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
