import React, { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  haptic?: 'light' | 'medium' | 'none';
};

export function TactilePressable({ style, scaleTo = 0.975, haptic = 'light', onPressIn, disabled, children, ...rest }: Props) {
  const scale = useSharedValue(1);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const handlePressIn = useCallback<NonNullable<PressableProps['onPressIn']>>((event) => {
    if (!reduceMotion) scale.value = withSpring(scaleTo, { damping: 18, stiffness: 240, mass: 0.65 });
    if (haptic !== 'none') {
      void Haptics.impactAsync(haptic === 'medium' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onPressIn?.(event);
  }, [haptic, onPressIn, reduceMotion, scale, scaleTo]);

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={() => { scale.value = withSpring(1, { damping: 18, stiffness: 240, mass: 0.65 }); }}
      style={[style, animatedStyle, disabled && { opacity: 0.5 }]}
    >
      {children}
    </AnimatedPressable>
  );
}
