import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';

type CategoryChipProps = {
  label: string;
  selected?: boolean;
  onPress: () => void;
};

export function CategoryChip({ label, selected, onPress }: CategoryChipProps) {
  const t = useTheme();
  const styles = makeStyles(t);
  const content = (
    <Text style={[styles.text, selected && styles.textSelected]} numberOfLines={1}>
      {label}
    </Text>
  );

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.wrapper, !selected && styles.wrapperDefault]}
    >
      {selected ? (
        <LinearGradient
          colors={[t.colors.primary, t.colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.chip}
        >
          {content}
        </LinearGradient>
      ) : (
        <View style={[styles.chip, styles.chipDefault]}>{content}</View>
      )}
    </TouchableOpacity>
  );
}

const makeStyles = (t: ReturnType<typeof useTheme>) => StyleSheet.create({
  wrapper: { marginLeft: t.spacing.sm },
  wrapperDefault: {},
  chip: {
    paddingHorizontal: t.spacing.lg,
    paddingVertical: t.spacing.md,
    borderRadius: t.radius.cardRadius,
  },
  chipDefault: {
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  text: { ...t.typography.body, fontFamily: t.fonts.medium, color: t.colors.textSecondary },
  textSelected: { color: t.colors.white },
});
