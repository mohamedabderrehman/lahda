import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../contexts/ThemeContext';

type TabBarCustomButtonProps = {
  accessibilityState?: { selected?: boolean };
  children: React.ReactNode;
  onPress?: (e: any) => void;
};

export function TabBarCustomButton({ accessibilityState, children, onPress }: TabBarCustomButtonProps) {
  const t = useTheme();
  const isSelected = accessibilityState?.selected ?? false;
  const surface = t.colors.surface;

  if (isSelected) {
    return (
      <View style={{ flex: 1, alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', position: 'absolute', top: 0 }}>
          <View style={{ flex: 1, backgroundColor: surface }} />
          <Svg width={75} height={61} viewBox="0 0 75 61">
            <Path
              d="M75.2 0v61H0V0c4.1 0 7.4 3.1 7.9 7.1C10 21.7 22.5 33 37.7 33c15.2 0 27.7-11.3 29.7-25.9.5-4 3.9-7.1 7.9-7.1h-.1z"
              fill={surface}
            />
          </Svg>
          <View style={{ flex: 1, backgroundColor: surface }} />
        </View>
        <TouchableOpacity
          style={{
            top: -22.5,
            justifyContent: 'center',
            alignItems: 'center',
            width: 50,
            height: 50,
            borderRadius: 25,
            backgroundColor: surface,
            ...t.shadow.shadow3,
          }}
          onPress={onPress as any}
          activeOpacity={0.78}
        >
          {children}
        </TouchableOpacity>
      </View>
    );
  }
  return (
    <TouchableOpacity
      style={{
        flex: 1,
        height: 60,
        backgroundColor: surface,
        justifyContent: 'center',
        alignItems: 'center',
      }}
      activeOpacity={1}
      onPress={onPress as any}
    >
      {children}
    </TouchableOpacity>
  );
}
