import { useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Animated, Dimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

interface AnimatedSplashScreenProps {
  onReady?: () => void;
  minimumDisplayTime?: number;
}

export function AnimatedSplashScreen({
  onReady,
  minimumDisplayTime = 2200,
}: AnimatedSplashScreenProps) {
  const logoScale = useRef(new Animated.Value(0.4)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const glowScale = useRef(new Animated.Value(0.85)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.9)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(24)).current;
  const shard1 = useRef(new Animated.Value(0)).current;
  const shard2 = useRef(new Animated.Value(0)).current;
  const shard3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const startTime = Date.now();
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let breatheAnim: Animated.CompositeAnimation | null = null;

    Animated.stagger(80, [
      Animated.timing(shard1, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(shard2, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(shard3, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();

    Animated.parallel([
      Animated.sequence([
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(cardScale, {
          toValue: 1,
          friction: 7,
          tension: 70,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(logoScale, {
          toValue: 1.08,
          duration: 550,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 5,
          tension: 90,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(glowOpacity, {
          toValue: 0.5,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(glowScale, {
          toValue: 1.5,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      breatheAnim = Animated.loop(
        Animated.sequence([
          Animated.timing(logoScale, {
            toValue: 1.025,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(logoScale, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      );
      breatheAnim.start();

      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(textTranslateY, {
          toValue: 0,
          friction: 9,
          tension: 50,
          useNativeDriver: true,
        }),
      ]).start();

      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minimumDisplayTime - elapsed);
      timeoutId = setTimeout(() => {
        breatheAnim?.stop();
        Animated.parallel([
          Animated.timing(logoOpacity, { toValue: 0, duration: 280, useNativeDriver: true }),
          Animated.timing(textOpacity, { toValue: 0, duration: 280, useNativeDriver: true }),
          Animated.timing(glowOpacity, { toValue: 0, duration: 280, useNativeDriver: true }),
          Animated.timing(cardOpacity, { toValue: 0, duration: 280, useNativeDriver: true }),
        ]).start(() => onReady?.());
      }, remaining);
    });

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      breatheAnim?.stop();
    };
  }, [logoScale, logoOpacity, glowOpacity, glowScale, cardOpacity, cardScale, textOpacity, textTranslateY, shard1, shard2, shard3, minimumDisplayTime, onReady]);

  const shardAnim = (val: Animated.Value) => ({
    opacity: val,
    transform: [{ scale: val }],
  });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={['#FFF8F1', '#FFE2C7', '#FFB36B', '#FF6B1A', '#D94A00']}
        locations={[0, 0.25, 0.5, 0.75, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Decorative floating shapes */}
      <Animated.View style={[styles.shard, styles.shard1, shardAnim(shard1)]} />
      <Animated.View style={[styles.shard, styles.shard2, shardAnim(shard2)]} />
      <Animated.View style={[styles.shard, styles.shard3, shardAnim(shard3)]} />
      {/* Radial glow */}
      <Animated.View
        style={[
          styles.glow,
          { opacity: glowOpacity, transform: [{ scale: glowScale }] },
        ]}
      />
      <View style={styles.content}>
        <Animated.View
          style={[
            styles.logoCard,
            {
              opacity: cardOpacity,
              transform: [{ scale: cardScale }],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.logoContainer,
              {
                opacity: logoOpacity,
                transform: [{ scale: logoScale }],
              },
            ]}
          >
            <Image
              source={require('../assets/app-logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </Animated.View>
        </Animated.View>
        <Animated.Text
          style={[
            styles.arabicText,
            {
              opacity: textOpacity,
              transform: [{ translateY: textTranslateY }],
            },
          ]}
        >
          لحظة
        </Animated.Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shard: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  shard1: {
    width: 140,
    height: 140,
    top: height * 0.12,
    right: -40,
  },
  shard2: {
    width: 80,
    height: 80,
    bottom: height * 0.25,
    left: -20,
  },
  shard3: {
    width: 100,
    height: 100,
    bottom: height * 0.15,
    right: width * 0.1,
  },
  glow: {
    position: 'absolute',
    width: width * 0.9,
    height: width * 0.9,
    borderRadius: width * 0.45,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    top: height / 2 - width * 0.45,
    left: width / 2 - width * 0.45,
  },
  logoCard: {
    width: width * 0.72,
    paddingVertical: 36,
    paddingHorizontal: 32,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    ...Platform.select({
      android: { elevation: 24 },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.25,
        shadowRadius: 24,
      },
    }),
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    width: width * 0.5,
    height: width * 0.28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  arabicText: {
    fontSize: 30,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.98)',
    marginTop: 20,
    letterSpacing: 3,
  },
});
