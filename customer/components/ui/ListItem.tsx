import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

type ListItemProps = {
  left?: React.ReactNode;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
};

export function ListItem({ left, title, subtitle, right, onPress }: ListItemProps) {
  const t = useTheme();
  const styles = makeStyles(t);
  const content = (
    <>
      {left != null && <View style={styles.left}>{left}</View>}
      <View style={styles.textWrap}>
        <Text style={styles.title}>{title}</Text>
        {subtitle != null && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {right != null && <View style={styles.right}>{right}</View>}
    </>
  );
  if (onPress) {
    return (
      <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.78}>
        {content}
      </TouchableOpacity>
    );
  }
  return <View style={styles.row}>{content}</View>;
}

const makeStyles = (t: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: t.spacing.screenPadding,
      paddingVertical: t.spacing.lg,
      minHeight: 56,
    },
    left: { marginLeft: t.spacing.md },
    textWrap: { flex: 1, marginHorizontal: t.spacing.md },
    title: { ...t.typography.body, fontFamily: t.fonts.medium, color: t.colors.text },
    subtitle: { ...t.typography.caption, color: t.colors.textSecondary, marginTop: t.spacing.xs },
    right: {},
  });
