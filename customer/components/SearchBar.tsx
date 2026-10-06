import { View, TextInput, StyleSheet } from 'react-native';
import { IconSearch, IconOptionsOutline } from '../components/Icons';
import { useTheme } from '../contexts/ThemeContext';
import { TactilePressable } from './sunset';

type SearchBarProps = {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  onFilterPress?: () => void;
  onSubmitEditing?: () => void;
};

export function SearchBar({ value, onChangeText, placeholder = 'ابحث عن متجر أو منتج', onFilterPress, onSubmitEditing }: SearchBarProps) {
  const t = useTheme();
  const styles = makeStyles(t);
  return (
    <View style={styles.wrap}>
      <IconSearch size={20} color={t.colors.textMuted} style={styles.icon} />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={t.colors.textMuted}
        value={value}
        onChangeText={onChangeText}
        returnKeyType="search"
        onSubmitEditing={onSubmitEditing}
      />
      {onFilterPress && (
        <TactilePressable onPress={onFilterPress} style={styles.filterBtn}>
          <View style={styles.filterCircle}>
            <IconOptionsOutline size={18} color={t.colors.textSecondary} />
          </View>
        </TactilePressable>
      )}
    </View>
  );
}

const makeStyles = (t: ReturnType<typeof useTheme>) => StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingVertical: t.spacing.sm,
    paddingHorizontal: t.spacing.lg,
    backgroundColor: t.colors.glass,
    borderRadius: t.radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.colors.glassBorder,
    ...t.shadow.shadow2,
  },
  icon: { marginRight: t.spacing.sm },
  input: { 
    flex: 1, 
    ...t.typography.body, 
    color: t.colors.text, 
    paddingVertical: 0,
    textAlign: 'right',
  },
  filterBtn: { padding: t.spacing.xs },
  filterCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: t.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
