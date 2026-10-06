import { Text, View, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../../constants/theme';

export function EmptyState({
  title,
  subtitle,
  action,
  style,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.wrap, style]}>
      <Text style={styles.title}>{title}</Text>
      {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: 24,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
    gap: 10,
  },
  title: { fontSize: 16, fontWeight: '900', color: theme.colors.text, textAlign: 'center' },
  subtitle: { fontSize: 13, color: theme.colors.textSecondary, textAlign: 'center', lineHeight: 18 },
});

