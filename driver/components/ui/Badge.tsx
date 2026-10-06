import { Text, View, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { theme } from '../../constants/theme';

type Variant = 'primary' | 'success' | 'warning' | 'danger' | 'neutral' | 'purple' | 'pink';

const VARIANT: Record<Variant, { bg: string; fg: string }> = {
  primary: { bg: theme.colors.primarySoft, fg: theme.colors.primaryDark },
  success: { bg: theme.colors.success + '1F', fg: theme.colors.success },
  warning: { bg: theme.colors.warning + '1F', fg: theme.colors.warning },
  danger: { bg: theme.colors.error + '1F', fg: theme.colors.error },
  neutral: { bg: theme.colors.surfaceAlt, fg: theme.colors.textSecondary },
  purple: { bg: theme.colors.accentPurple + '1F', fg: theme.colors.accentPurple },
  pink: { bg: theme.colors.accentPink + '1F', fg: theme.colors.accentPink },
};

export function Badge({
  label,
  variant = 'neutral',
  style,
  textStyle,
}: {
  label: string;
  variant?: Variant;
  style?: ViewStyle;
  textStyle?: TextStyle;
}) {
  const v = VARIANT[variant];
  return (
    <View style={[styles.badge, { backgroundColor: v.bg }, style]}>
      <Text style={[styles.text, { color: v.fg }, textStyle]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: theme.radius.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
  },
});

