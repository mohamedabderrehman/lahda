import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';
import { IconTruckOutline } from '../../components/Icons';

const t = theme;

export default function DeliveryTab() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <IconTruckOutline size={48} color={t.colors.textMuted} />
        </View>
        <Text style={styles.title}>المندوب</Text>
        <Text style={styles.sub}>قريباً</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.colors.background },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: t.spacing.xxl },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: t.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: t.spacing.xl,
  },
  title: { ...t.typography.titleLarge, fontSize: 22, color: t.colors.text, marginBottom: t.spacing.sm },
  sub: { ...t.typography.body, color: t.colors.textSecondary },
});
