import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { IconArrowForward } from './Icons';
import { useTheme } from '../contexts/ThemeContext';

export function CustomerHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  const t = useTheme();
  const router = useRouter();
  return (
    <View style={[styles.row, { borderBottomColor: t.colors.borderLight }]}> 
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="رجوع" onPress={() => router.back()} style={[styles.back, { backgroundColor: t.colors.surfaceElevated }]}>
        <IconArrowForward size={20} color={t.colors.text} />
      </TouchableOpacity>
      <Text style={[styles.title, { color: t.colors.text, fontFamily: t.fonts.bold }]}>{title}</Text>
      <View style={styles.action}>{action}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 64, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth },
  back: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center', fontSize: 18, lineHeight: 26 },
  action: { minWidth: 38, alignItems: 'flex-end' },
});
