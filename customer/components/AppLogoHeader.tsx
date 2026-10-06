import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

export function AppLogoHeader() {
  const t = useTheme();
  const styles = makeStyles(t);

  return (
    <View style={styles.wrap}>
      <Image
        source={require('../assets/app-logo-transparent-background.png')}
        style={styles.img}
        resizeMode="contain"
      />
    </View>
  );
}

const makeStyles = (t: ReturnType<typeof useTheme>) => StyleSheet.create({
  wrap: {
    paddingVertical: t.spacing.lg,
    paddingHorizontal: t.spacing.screenPadding,
    alignItems: 'center',
    justifyContent: 'center',
  },
  img: { width: 190, height: 76 },
});
