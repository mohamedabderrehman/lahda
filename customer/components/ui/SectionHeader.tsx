import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

type SectionHeaderProps = {
  title: string;
  right?: React.ReactNode;
};

export function SectionHeader({ title, right }: SectionHeaderProps) {
  const t = useTheme();
  const styles = makeStyles(t);
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {right != null ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

const makeStyles = (t: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: t.spacing.screenPadding,
      marginBottom: t.spacing.lg,
    },
    title: {
      flex: 1,
      ...t.typography.titleLarge,
      fontSize: 22,
      fontFamily: t.fonts.extraBold,
      color: t.colors.text,
    },
    right: {},
  });
