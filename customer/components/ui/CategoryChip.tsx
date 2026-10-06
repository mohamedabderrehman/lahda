import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

type CategoryChipProps = {
  label: string;
  selected?: boolean;
  onPress: () => void;
  icon?: React.ReactNode;
};

export function CategoryChip({ label, selected, onPress, icon }: CategoryChipProps) {
  const t = useTheme();
  const styles = makeStyles(t);
  return (
    <TouchableOpacity
      style={[
        styles.chip,
        selected ? styles.chipSelected : styles.chipDefault,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconCircle, selected ? styles.iconCircleSelected : styles.iconCircleDefault]}>
        {icon}
      </View>
      <Text style={[styles.text, selected && styles.textSelected]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const makeStyles = (t: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    chip: {
      padding: t.spacing.sm,
      paddingBottom: t.spacing.lg,
      borderRadius: t.radius.cardRadius,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: t.spacing.sm,
      minWidth: 72,
    },
    chipSelected: {
      backgroundColor: t.colors.primary,
    },
    chipDefault: {
      backgroundColor: t.colors.surface,
      ...t.shadow.shadow1,
    },
    iconCircle: {
      width: 50,
      height: 50,
      borderRadius: 25,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconCircleSelected: {
      backgroundColor: t.colors.white,
    },
    iconCircleDefault: {
      backgroundColor: t.colors.backgroundSecondary,
    },
    text: {
      marginTop: t.spacing.sm,
      ...t.typography.caption,
      fontFamily: t.fonts.medium,
      color: t.colors.text,
    },
    textSelected: {
      color: t.colors.white,
    },
  });
