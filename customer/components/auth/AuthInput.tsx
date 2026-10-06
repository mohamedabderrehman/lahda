import React, { useMemo } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
const INPUT_ICON_SIZE = 22;

type IconComponent = React.ComponentType<{ size?: number; color?: string }>;

export function AuthInput({
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  autoCapitalize,
  keyboardType,
  autoComplete,
  icon: Icon,
}: {
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences';
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoComplete?: 'email' | 'password' | 'name' | 'tel';
  icon: IconComponent;
}) {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  return (
    <View style={styles.wrapper}>
      <View style={styles.iconWrap} pointerEvents="none">
        <Icon size={INPUT_ICON_SIZE} color={t.colors.textMuted} />
      </View>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={t.colors.textMuted}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        autoComplete={autoComplete}
        textAlign="right"
      />
    </View>
  );
}

const makeStyles = (t: ReturnType<typeof useTheme>) => StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    paddingVertical: t.spacing.sm,
    paddingHorizontal: t.spacing.lg,
    marginBottom: t.spacing.md,
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.colors.borderLight,
  },
  iconWrap: {
    marginLeft: t.spacing.md,
  },
  input: {
    flex: 1,
    ...t.typography.body,
    fontSize: 16,
    color: t.colors.text,
    paddingVertical: 0,
  },
});
