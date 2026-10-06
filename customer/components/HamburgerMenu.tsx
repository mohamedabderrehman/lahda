import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable } from 'react-native';
import { router } from 'expo-router';
import { IconHome, IconSearch, IconReceipt, IconPerson, IconChevronBack } from './Icons';
import { theme } from '../constants/theme';

const t = theme;

type HamburgerMenuProps = {
  visible: boolean;
  onClose: () => void;
};

function NavRow({
  icon: Icon,
  label,
  onPress,
}: {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <Icon size={24} color={t.colors.text} />
      <Text style={styles.rowLabel}>{label}</Text>
      <IconChevronBack size={20} color={t.colors.textMuted} style={{ transform: [{ scaleX: -1 }] }} />
    </TouchableOpacity>
  );
}

export function HamburgerMenu({ visible, onClose }: HamburgerMenuProps) {
  const goTo = (path: string) => {
    onClose();
    router.push(path as any);
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.menu} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>القائمة</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: t.spacing.md, bottom: t.spacing.md, left: t.spacing.md, right: t.spacing.md }}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <NavRow icon={IconHome} label="الرئيسية" onPress={() => goTo('/(tabs)')} />
          <NavRow icon={IconSearch} label="بحث" onPress={() => goTo('/(tabs)/search')} />
          <NavRow icon={IconReceipt} label="طلباتي" onPress={() => goTo('/(tabs)/orders')} />
          <NavRow icon={IconPerson} label="حسابي" onPress={() => goTo('/(tabs)/account')} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    paddingTop: t.spacing.xxl * 2 + t.spacing.lg,
    paddingLeft: t.spacing.screenPadding,
  },
  menu: {
    width: 280,
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.xl,
    padding: t.spacing.xl,
    borderWidth: 0,
    ...t.shadow.shadow2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: t.spacing.lg,
  },
  title: {
    ...t.typography.titleLarge,
    color: t.colors.text,
  },
  closeBtn: {
    padding: t.spacing.md,
  },
  closeText: {
    fontSize: 20,
    color: t.colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: t.colors.border,
    marginVertical: t.spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: t.spacing.lg,
  },
  rowLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: t.colors.text,
    marginLeft: t.spacing.md,
    textAlign: 'right',
  },
});
