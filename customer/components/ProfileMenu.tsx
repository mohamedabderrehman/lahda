import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable, Alert } from 'react-native';
import { router } from 'expo-router';
import { IconPerson, IconLocationOutline, IconHelpCircleOutline, IconLogOutOutline, IconChevronBack } from './Icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

type ProfileMenuProps = {
  visible: boolean;
  onClose: () => void;
};

export function ProfileMenu({ visible, onClose }: ProfileMenuProps) {
  const t = useTheme();
  const styles = makeStyles(t);
  const { user, logout } = useAuth();
  const fullName = (user?.fullName as string) || (user?.email as string) || 'حسابي';
  const email = (user?.email as string) || '';

  const handleLogout = () => {
    Alert.alert('تسجيل الخروج', 'هل تريد تسجيل الخروج؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'خروج',
        style: 'destructive',
        onPress: async () => {
          onClose();
          await logout();
          router.replace('/(auth)');
        },
      },
    ]);
  };

  const goTo = (path: string) => {
    onClose();
    router.push(path as any);
  };

  function Row({ icon: Icon, label, onPress }: { icon: React.ComponentType<{ size?: number; color?: string }>; label: string; onPress: () => void }) {
    return (
      <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
        <Icon size={22} color={t.colors.textSecondary} />
        <Text style={styles.rowLabel}>{label}</Text>
        <IconChevronBack size={20} color={t.colors.textMuted} style={{ transform: [{ scaleX: -1 }] }} />
      </TouchableOpacity>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.menu} onPress={(e) => e.stopPropagation()}>
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              <IconPerson size={32} color={t.colors.textSecondary} />
            </View>
            <Text style={styles.name}>{fullName}</Text>
            {email ? <Text style={styles.email}>{email}</Text> : null}
          </View>

          <View style={styles.divider} />

          <Row icon={IconLocationOutline} label="عناويني" onPress={() => goTo('/addresses')} />
          <Row icon={IconHelpCircleOutline} label="الأسئلة الشائعة" onPress={() => goTo('/faq')} />

          <View style={styles.divider} />

          <TouchableOpacity style={styles.logoutRow} onPress={handleLogout} activeOpacity={0.7}>
            <IconLogOutOutline size={22} color={t.colors.error} />
            <Text style={styles.logoutText}>تسجيل الخروج</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const makeStyles = (t: ReturnType<typeof useTheme>) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: t.spacing.xxl * 2 + t.spacing.lg,
    paddingHorizontal: t.spacing.screenPadding,
  },
  menu: {
    width: 280,
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.xl,
    padding: t.spacing.xl,
    borderWidth: 0,
    ...t.shadow.shadow2,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: t.spacing.lg,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: t.colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: t.spacing.sm,
  },
  name: {
    ...t.typography.titleMedium,
    color: t.colors.text,
    textAlign: 'center',
  },
  email: {
    ...t.typography.caption,
    color: t.colors.textSecondary,
    marginTop: t.spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: t.colors.border,
    marginVertical: t.spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: t.spacing.md,
  },
  rowLabel: {
    flex: 1,
    ...t.typography.body,
    color: t.colors.text,
    marginLeft: t.spacing.md,
    textAlign: 'right',
  },
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: t.spacing.md,
    gap: t.spacing.sm,
  },
  logoutText: {
    ...t.typography.body,
    fontFamily: t.fonts.medium,
    color: t.colors.error,
  },
});
