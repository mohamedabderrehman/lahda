import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

export function Divider() {
  const t = useTheme();
  return <View style={{ height: 1, backgroundColor: t.colors.borderLight }} />;
}
