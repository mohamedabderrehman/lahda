import React, { useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Animated, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MASCOT_SIZE = 36;
const PADDING = 24;

export function FloatingMascot() {
  const posX = useRef(new Animated.Value(SCREEN_WIDTH * 0.3)).current;
  const posY = useRef(new Animated.Value(SCREEN_HEIGHT * 0.2)).current;
  const opacity = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    const moveToRandom = () => {
      const maxX = SCREEN_WIDTH - MASCOT_SIZE - PADDING * 2;
      const maxY = SCREEN_HEIGHT - MASCOT_SIZE - PADDING * 2;
      const nextX = PADDING + Math.random() * Math.max(0, maxX);
      const nextY = PADDING + Math.random() * Math.max(0, maxY);

      Animated.parallel([
        Animated.timing(posX, {
          toValue: nextX,
          duration: 2000 + Math.random() * 1500,
          useNativeDriver: true,
        }),
        Animated.timing(posY, {
          toValue: nextY,
          duration: 2000 + Math.random() * 1500,
          useNativeDriver: true,
        }),
      ]).start();
    };

    const interval = setInterval(moveToRandom, 4000 + Math.random() * 3000);
    const t = setTimeout(moveToRandom, 1500);

    return () => {
      clearInterval(interval);
      clearTimeout(t);
    };
  }, [posX, posY]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.wrap,
        {
          opacity,
          transform: [
            { translateX: posX },
            { translateY: posY },
          ],
        },
      ]}
    >
      <Image
        source={require('../assets/app-symbol.png')}
        style={styles.img}
        resizeMode="contain"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: MASCOT_SIZE,
    height: MASCOT_SIZE,
    zIndex: 10,
  },
  img: {
    width: MASCOT_SIZE,
    height: MASCOT_SIZE,
  },
});
