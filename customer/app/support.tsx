import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Linking, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { IconArrowForward, IconChatBubbleOutline, IconMailOutline, IconCallOutline } from '../components/Icons';
import { useTheme } from '../contexts/ThemeContext';
import { getSupportChannels } from '../api/client';
import { CustomerHeader } from '../components/customer-header';

type SupportChannel = { id: string; type: string; label: string; value: string; iconName: string | null };

function getIconForType(type: string) {
  switch (type) {
    case 'email': return IconMailOutline;
    case 'phone': return IconCallOutline;
    case 'whatsapp': return IconChatBubbleOutline;
    case 'telegram': return IconChatBubbleOutline;
    default: return IconChatBubbleOutline;
  }
}

function getLinkForChannel(type: string, value: string) {
  switch (type) {
    case 'email': return `mailto:${value}`;
    case 'phone': return `tel:${value}`;
    case 'whatsapp': return Platform.OS === 'ios' ? `whatsapp://send?phone=${value}` : `whatsapp://send?phone=${value}`;
    case 'telegram': return `https://t.me/${value.replace('@', '')}`;
    case 'instagram': return `https://instagram.com/${value.replace('@', '')}`;
    case 'facebook': return value.startsWith('http') ? value : `https://facebook.com/${value}`;
    default: return value.startsWith('http') ? value : `https://${value}`;
  }
}

export default function SupportScreen() {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [channels, setChannels] = useState<SupportChannel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await getSupportChannels();
        setChannels(Array.isArray(res) ? res : []);
      } catch {
        setChannels([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const openChannel = (ch: SupportChannel) => {
    const url = getLinkForChannel(ch.type, ch.value);
    Linking.openURL(url).catch(() => {});
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <CustomerHeader title="الدعم" />
      {loading ? (
        <ActivityIndicator size="large" color={t.colors.primary} style={{ flex: 1 }} />
      ) : channels.length === 0 ? (
        <View style={styles.emptyWrap}>
          <IconChatBubbleOutline size={48} color={t.colors.textMuted} />
          <Text style={styles.emptyText}>لا توجد طرق تواصل حالياً</Text>
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.intro}>اختر طريقة التواصل المناسبة لك</Text>
          {channels.map((ch) => {
            const Icon = getIconForType(ch.type);
            return (
              <TouchableOpacity key={ch.id} style={styles.contactCard} onPress={() => openChannel(ch)} activeOpacity={0.7}>
                <View style={styles.contactIconWrap}>
                  <Icon size={28} color={t.colors.textSecondary} />
                </View>
                <View style={styles.contactText}>
                  <Text style={styles.contactTitle}>{ch.label}</Text>
                  <Text style={styles.contactSubtitle}>{ch.value}</Text>
                </View>
                <IconArrowForward size={20} color={t.colors.textMuted} />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
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
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: t.spacing.md },
  emptyText: { ...t.typography.body, color: t.colors.textSecondary },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 0,
    paddingVertical: t.spacing.lg,
    paddingHorizontal: 0,
    marginBottom: t.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: t.colors.borderLight,
  },
  contactIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: t.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: t.spacing.md,
  },
  contactText: { flex: 1 },
  contactTitle: { ...t.typography.titleMedium, fontFamily: t.fonts.extraBold, color: t.colors.text },
  contactSubtitle: { ...t.typography.caption, color: t.colors.textMuted, marginTop: t.spacing.xs },
  intro: { ...t.typography.body, color: t.colors.textSecondary, marginBottom: t.spacing.md },
});
