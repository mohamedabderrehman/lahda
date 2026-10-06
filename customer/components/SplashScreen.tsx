import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export function AnimatedSplashScreen() {
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleY = useRef(new Animated.Value(30)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineY = useRef(new Animated.Value(20)).current;
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const barProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 60,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(titleOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(titleY, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(taglineOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(taglineY, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }),
      ]),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(ring1, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(ring1, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    ).start();

    setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(ring2, { toValue: 1, duration: 2000, useNativeDriver: true }),
          Animated.timing(ring2, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      ).start();
    }, 800);

    Animated.timing(barProgress, {
      toValue: 1,
      duration: 2200,
      delay: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  const ring1Scale = ring1.interpolate({ inputRange: [0, 1], outputRange: [1, 2.5] });
  const ring1Opacity = ring1.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0.35, 0.1, 0] });
  const ring2Scale = ring2.interpolate({ inputRange: [0, 1], outputRange: [1, 2.8] });
  const ring2Opacity = ring2.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0.25, 0.08, 0] });

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FFF8F1', '#FFB36B', '#FF6B1A']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.bgDots}>
          {Array.from({ length: 30 }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  top: Math.random() * height,
                  left: Math.random() * width,
                  width: 2 + Math.random() * 4,
                  height: 2 + Math.random() * 4,
                  opacity: 0.06 + Math.random() * 0.08,
                },
              ]}
            />
          ))}
        </View>

        <View style={styles.center}>
          <Animated.View
            style={[styles.ringPulse, { transform: [{ scale: ring1Scale }], opacity: ring1Opacity }]}
          />
          <Animated.View
            style={[styles.ringPulse, { transform: [{ scale: ring2Scale }], opacity: ring2Opacity }]}
          />

          <Animated.View
            style={[
              styles.logoWrap,
              { transform: [{ scale: logoScale }], opacity: logoOpacity },
            ]}
          >
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>لحظة</Text>
            </View>
          </Animated.View>

          <Animated.View style={{ opacity: titleOpacity, transform: [{ translateY: titleY }] }}>
            <Text style={styles.title}>لحظة</Text>
          </Animated.View>

          <Animated.View style={{ opacity: taglineOpacity, transform: [{ translateY: taglineY }] }}>
            <Text style={styles.tagline}>اطلب .. نوصّل .. بلحظة</Text>
          </Animated.View>
        </View>

        <View style={styles.bottom}>
          <View style={styles.barTrack}>
            <Animated.View
              style={[
                styles.barFill,
                { transform: [{ scaleX: barProgress }] },
              ]}
            />
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const LOGO_SIZE = 110;

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  bgDots: { ...StyleSheet.absoluteFillObject },
  dot: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 99,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringPulse: {
    position: 'absolute',
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_SIZE / 2,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  logoWrap: {
    marginBottom: 20,
  },
  logoCircle: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_SIZE / 2,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#D94A00',
    marginTop: 4,
  },
  title: {
    fontSize: 44,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 12,
    marginTop: 4,
  },
  tagline: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.85)',
    marginTop: 8,
    letterSpacing: 0.5,
  },
  bottom: {
    position: 'absolute',
    bottom: 70,
    left: width * 0.2,
    right: width * 0.2,
  },
  barTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 2,
    transformOrigin: 'left',
  },
});
