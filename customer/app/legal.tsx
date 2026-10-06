import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconArrowForward } from '../components/Icons';
import { useTheme } from '../contexts/ThemeContext';
import { CustomerHeader } from '../components/customer-header';

export default function LegalScreen() {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <CustomerHeader title="الشروط والخصوصية" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>معلومات قانونية</Text>
        <Text style={styles.body}>
          يمكنك الاطلاع على شروط الاستخدام وسياسة الخصوصية من خلال التطبيق أو الموقع. للاستفسارات القانونية يرجى التواصل معنا.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (t: ReturnType<typeof useTheme>) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: t.spacing.screenPadding,
    paddingVertical: t.spacing.lg,
    backgroundColor: t.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.borderLight,
  },
  backBtn: { padding: t.spacing.md },
  headerTitle: { flex: 1, ...t.typography.titleLarge, color: t.colors.text, textAlign: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: t.spacing.screenPadding, paddingBottom: t.spacing.xxl + t.spacing.sm },
  sectionTitle: { ...t.typography.body, fontFamily: t.fonts.bold, color: t.colors.text, marginBottom: t.spacing.md },
  body: { ...t.typography.body, color: t.colors.textSecondary, lineHeight: 24 },
});
