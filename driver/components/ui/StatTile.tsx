import { Text, View, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../../constants/theme';

export function StatTile({
  label,
  value,
  tint = theme.colors.primary,
  style,
}: {
  label: string;
  value: number | string;
  tint?: string;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.tile, { borderColor: tint + '35', backgroundColor: tint + '12' }, style]}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    borderWidth: 1,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    minHeight: 86,
    justifyContent: 'center',
  },
  value: { fontSize: 22, fontWeight: '900', color: theme.colors.text, textAlign: 'right' },
  label: { fontSize: 13, fontWeight: '700', color: theme.colors.textSecondary, marginTop: 4, textAlign: 'right' },
});

