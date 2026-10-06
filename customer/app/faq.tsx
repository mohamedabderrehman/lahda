import { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconArrowForward } from '../components/Icons';
import { TouchableOpacity } from 'react-native';
import { getFaq } from '../api/client';
import { useTheme } from '../contexts/ThemeContext';
import { CustomerHeader } from '../components/customer-header';

type FaqItem = { id: string; questionAr: string; answerAr: string };

export default function FaqScreen() {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [list, setList] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await getFaq();
        setList(Array.isArray(res) ? (res as unknown as FaqItem[]) : []);
      } catch {
        setList([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <CustomerHeader title="الأسئلة الشائعة" />
      {loading ? (
        <ActivityIndicator size="large" color={t.colors.primary} style={styles.loader} />
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.intro}>إجابات مختصرة لأكثر الأسئلة شيوعاً</Text>
          {list.map((item) => <FaqRow key={item.id} item={item} styles={styles} />)}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (t: ReturnType<typeof useTheme>) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: t.spacing.screenPadding, paddingVertical: t.spacing.lg, backgroundColor: t.colors.surface, borderBottomWidth: 1, borderBottomColor: t.colors.borderLight },
  backBtn: { padding: t.spacing.md },
  headerTitle: { flex: 1, ...t.typography.titleLarge, color: t.colors.text, textAlign: 'center' },
  loader: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: t.spacing.screenPadding },
  intro: { ...t.typography.caption, color: t.colors.textSecondary, marginBottom: t.spacing.md },
  card: { paddingVertical: t.spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: t.colors.borderLight },
  questionRow: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.md },
  question: { ...t.typography.titleMedium, fontFamily: t.fonts.extraBold, color: t.colors.text },
  answer: { ...t.typography.body, color: t.colors.textMuted, marginTop: t.spacing.sm, lineHeight: 22 },
  chevron: { marginLeft: 'auto', fontSize: 22, color: t.colors.primary },
});

function FaqRow({ item, styles }: { item: FaqItem; styles: ReturnType<typeof makeStyles> }) {
  const [open, setOpen] = useState(false);
  return <TouchableOpacity style={styles.card} onPress={() => setOpen((value) => !value)} activeOpacity={0.8}>
    <View style={styles.questionRow}><Text style={styles.question}>{item.questionAr}</Text><Text style={styles.chevron}>{open ? '−' : '+'}</Text></View>
    {open ? <Text style={styles.answer}>{item.answerAr}</Text> : null}
  </TouchableOpacity>;
}
