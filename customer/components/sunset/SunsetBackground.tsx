import React from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';

type Props = ViewProps & { subtle?: boolean; children?: React.ReactNode };

export function SunsetBackground({ subtle = false, style, children, ...rest }: Props) {
  const t = useTheme();
  return (
    <View {...rest} style={[styles.root, { backgroundColor: t.colors.background }, style]}>
      <LinearGradient
        pointerEvents="none"
        colors={subtle ? ['#FFF8F1', '#FFFDF9'] : ['#FFF8F1', '#FFF1E6', '#FFFDF9']}
        locations={[0, subtle ? 1 : 0.52, 1] as any}
        start={{ x: 0.12, y: 0 }}
        end={{ x: 0.92, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {!subtle && (
        <>
          <View pointerEvents="none" style={[styles.blob, styles.blobTop, { backgroundColor: t.colors.peach + '92' }]} />
          <View pointerEvents="none" style={[styles.blob, styles.blobSide, { backgroundColor: t.colors.apricot + '38' }]} />
        </>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  blob: { position: 'absolute', borderRadius: 999 },
  blobTop: { width: 260, height: 260, top: -125, right: -86, opacity: 0.66 },
  blobSide: { width: 220, height: 220, top: 320, left: -160, opacity: 0.5 },
});
