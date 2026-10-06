import { Text, View, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../../constants/theme';

export function SectionHeader({
  title,
  subtitle,
  right,
  style,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.row, style]}>
      <View style={styles.textWrap}>
        <Text style={styles.title}>{title}</Text>
        {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  textWrap: { flex: 1 },
  title: { fontSize: 16, fontWeight: '900', color: theme.colors.text, textAlign: 'right' },
  subtitle: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2, textAlign: 'right' },
});

