import { ActivityIndicator, StyleProp, StyleSheet, Text, TextStyle, TouchableOpacity, ViewStyle } from 'react-native';
import { theme } from '../../constants/theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  title,
  onPress,
  loading,
  disabled,
  variant = 'primary',
  style,
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: Variant;
  style?: StyleProp<ViewStyle>;
}) {
  const isDisabled = !!disabled || !!loading;
  const stylesByVariant = VARIANT[variant];
  const textColor = variant === 'secondary' || variant === 'ghost' ? theme.colors.text : theme.colors.white;
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      disabled={isDisabled}
      style={[base.btn, stylesByVariant.btn, isDisabled && base.btnDisabled, style]}
    >
      {loading ? <ActivityIndicator size="small" color={textColor} /> : <Text style={[base.text, stylesByVariant.text]}>{title}</Text>}
    </TouchableOpacity>
  );
}

const VARIANT: Record<Variant, { btn: ViewStyle; text: TextStyle }> = {
  primary: { btn: { backgroundColor: theme.colors.primary }, text: { color: theme.colors.white } },
  secondary: { btn: { backgroundColor: theme.colors.surfaceAlt, borderWidth: 1, borderColor: theme.colors.border }, text: { color: theme.colors.text } },
  ghost: { btn: { backgroundColor: 'transparent' }, text: { color: theme.colors.primaryDark } },
  danger: { btn: { backgroundColor: theme.colors.error }, text: { color: theme.colors.white } },
};

const base = StyleSheet.create({
  btn: {
    minHeight: 48,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { fontSize: 16, fontWeight: '800' },
  btnDisabled: { opacity: 0.6 },
});

