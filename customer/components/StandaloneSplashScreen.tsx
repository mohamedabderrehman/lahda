import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, I18nManager } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SPLASH_CONFIG } from '../constants/splashConfig';
import { fonts } from '../constants/theme';

const { width, height } = Dimensions.get('window');
const isRTL = I18nManager.isRTL;

export type StandaloneSplashScreenRef = {
  startExit: () => void;
};

type Props = {
  onComplete: () => void;
  fontsLoaded?: boolean;
};

// Three-step soul: three dots that pulse in sequence (اطلب → نوصّل → بلحظة)
const STEP_DOT_SIZE = 10;
const STEP_GAP = 20;

export const StandaloneSplashScreen = forwardRef<StandaloneSplashScreenRef, Props>(function StandaloneSplashScreen(
  { onComplete, fontsLoaded = false },
  ref
) {
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const soulOpacity = useRef(new Animated.Value(0)).current;
  const soulScale = useRef(new Animated.Value(0.85)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(12)).current;
  const titleScale = useRef(new Animated.Value(0.96)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineTranslateY = useRef(new Animated.Value(10)).current;
  const dot1Scale = useRef(new Animated.Value(0.6)).current;
  const dot2Scale = useRef(new Animated.Value(0.6)).current;
  const dot3Scale = useRef(new Animated.Value(0.6)).current;
  const exitStarted = useRef(false);

  const runEnter = () => {
    const s = SPLASH_CONFIG.staggerMs;
    // Soul first
    Animated.parallel([
      Animated.timing(soulOpacity, {
        toValue: 1,
        duration: SPLASH_CONFIG.fadeInMs,
        useNativeDriver: true,
      }),
      Animated.spring(soulScale, {
        toValue: 1,
        tension: 48,
        friction: 9,
        useNativeDriver: true,
      }),
    ]).start(() => {
      const pulseOne = (dot: Animated.Value) =>
        Animated.sequence([
          Animated.timing(dot, {
            toValue: 1.2,
            duration: 280,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ]);
      const seq = Animated.sequence([
        pulseOne(dot1Scale),
        Animated.delay(220),
        pulseOne(dot2Scale),
        Animated.delay(220),
        pulseOne(dot3Scale),
        Animated.delay(700),
      ]);
      Animated.loop(seq).start();
    });

    // Title after stagger
    Animated.parallel([
      Animated.timing(titleOpacity, {
        toValue: 1,
        duration: SPLASH_CONFIG.fadeInMs,
        delay: s,
        useNativeDriver: true,
      }),
      Animated.timing(titleTranslateY, {
        toValue: 0,
        duration: SPLASH_CONFIG.fadeInMs,
        delay: s,
        useNativeDriver: true,
      }),
      Animated.spring(titleScale, {
        toValue: 1,
        tension: 55,
        friction: 11,
        delay: s,
        useNativeDriver: true,
      }),
    ]).start();

    // Tagline after second stagger
    Animated.parallel([
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: SPLASH_CONFIG.fadeInMs,
        delay: s * 2,
        useNativeDriver: true,
      }),
      Animated.timing(taglineTranslateY, {
        toValue: 0,
        duration: SPLASH_CONFIG.fadeInMs,
        delay: s * 2,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const runExit = () => {
    if (exitStarted.current) return;
    exitStarted.current = true;
    Animated.timing(screenOpacity, {
      toValue: 0,
      duration: SPLASH_CONFIG.fadeOutMs,
      useNativeDriver: true,
    }).start(() => {
      onComplete();
    });
  };

  useImperativeHandle(ref, () => ({
    startExit: runExit,
  }));

  useEffect(() => {
    runEnter();
  }, []);

  const titleFont = fontsLoaded ? fonts.extraBold : undefined;
  const taglineFont = fontsLoaded ? fonts.medium : undefined;

  const particlePositions = Array.from({ length: SPLASH_CONFIG.particlesCount }, (_, i) => ({
    left: (i * 37 + 11) % (width + 40) - 20,
    top: (i * 53 + 17) % (height + 50) - 25,
    size: 2 + (i % 3),
    opacity: 0.06 + (i % 5) * 0.02,
  }));

  return (
    <Animated.View style={[styles.screen, { opacity: screenOpacity }]}>
      <LinearGradient
        colors={SPLASH_CONFIG.gradientColors}
        start={SPLASH_CONFIG.gradientStart}
        end={SPLASH_CONFIG.gradientEnd}
        style={StyleSheet.absoluteFill}
      />

      {/* Concentric circles for depth */}
      {SPLASH_CONFIG.concentricCircles && (
        <View style={styles.circlesWrap} pointerEvents="none">
          {[1, 2, 3].map((i) => (
            <View
              key={i}
              style={[
                styles.concentricCircle,
                {
                  width: width * (0.5 + i * 0.35),
                  height: width * (0.5 + i * 0.35),
                  borderRadius: (width * (0.5 + i * 0.35)) / 2,
                  borderWidth: 1,
                  borderColor: `rgba(255,255,255,${0.06 - i * 0.015})`,
                },
              ]}
            />
          ))}
        </View>
      )}

      {/* Subtle particles */}
      {SPLASH_CONFIG.particlesCount > 0 && (
        <View style={styles.particlesWrap} pointerEvents="none">
          {particlePositions.map((p, i) => (
            <View
              key={i}
              style={[
                styles.particle,
                {
                  left: p.left,
                  top: p.top,
                  width: p.size,
                  height: p.size,
                  borderRadius: p.size / 2,
                  opacity: p.opacity,
                },
              ]}
            />
          ))}
        </View>
      )}

      {SPLASH_CONFIG.bloomOpacity > 0 && (
        <View
          style={[
            styles.bloom,
            {
              width: width * SPLASH_CONFIG.bloomScale,
              height: width * SPLASH_CONFIG.bloomScale,
              borderRadius: (width * SPLASH_CONFIG.bloomScale) / 2,
              opacity: SPLASH_CONFIG.bloomOpacity,
            },
          ]}
        />
      )}

      <View style={[styles.content, { top: height * SPLASH_CONFIG.contentOffsetPercent }]}>
        {/* Soul: three-step dots (اطلب → نوصّل → بلحظة) */}
        <Animated.View
          style={[
            styles.soulWrap,
            {
              opacity: soulOpacity,
              transform: [{ scale: soulScale }],
            },
          ]}
        >
          <Animated.View style={[styles.stepDot, { transform: [{ scale: dot1Scale }] }]} />
          <View style={styles.stepGap} />
          <Animated.View style={[styles.stepDot, { transform: [{ scale: dot2Scale }] }]} />
          <View style={styles.stepGap} />
          <Animated.View style={[styles.stepDot, { transform: [{ scale: dot3Scale }] }]} />
        </Animated.View>

        <Animated.View
          style={[
            styles.titleWrap,
            {
              opacity: titleOpacity,
              transform: [
                { translateY: titleTranslateY },
                { scale: titleScale },
              ],
            },
          ]}
        >
          <Text
            style={[
              styles.titleAr,
              titleFont && { fontFamily: titleFont },
            ]}
          >
            {SPLASH_CONFIG.appNameAr}
          </Text>
          {SPLASH_CONFIG.appNameEn ? (
            <Text
              style={[
                styles.titleEn,
                taglineFont && { fontFamily: taglineFont },
              ]}
            >
              {SPLASH_CONFIG.appNameEn}
            </Text>
          ) : null}
        </Animated.View>

        <View style={[styles.divider, { backgroundColor: SPLASH_CONFIG.dividerColor }]} />

        <Animated.Text
          style={[
            styles.tagline,
            { opacity: taglineOpacity, transform: [{ translateY: taglineTranslateY }] },
            taglineFont && { fontFamily: taglineFont },
          ]}
        >
          {SPLASH_CONFIG.taglineAr}
        </Animated.Text>
        {SPLASH_CONFIG.taglineEn ? (
          <Animated.Text
            style={[
              styles.taglineEn,
              { opacity: taglineOpacity },
              taglineFont && { fontFamily: taglineFont },
            ]}
          >
            {SPLASH_CONFIG.taglineEn}
          </Animated.Text>
        ) : null}
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
  },
  circlesWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  concentricCircle: {
    position: 'absolute',
  },
  particlesWrap: {
    ...StyleSheet.absoluteFillObject,
  },
  particle: {
    position: 'absolute',
    backgroundColor: '#fff',
  },
  bloom: {
    position: 'absolute',
    backgroundColor: '#fff',
    top: height / 2 - (width * SPLASH_CONFIG.bloomScale) / 2,
    left: width / 2 - (width * SPLASH_CONFIG.bloomScale) / 2,
  },
  content: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 36,
  },
  soulWrap: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  stepDot: {
    width: STEP_DOT_SIZE,
    height: STEP_DOT_SIZE,
    borderRadius: STEP_DOT_SIZE / 2,
    backgroundColor: SPLASH_CONFIG.accentColor,
  },
  stepGap: {
    width: STEP_GAP,
  },
  titleWrap: {
    alignItems: 'center',
    marginBottom: 16,
  },
  titleAr: {
    fontSize: 52,
    fontWeight: '900',
    color: SPLASH_CONFIG.titleColor,
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
    writingDirection: isRTL ? 'rtl' : 'ltr',
  },
  titleEn: {
    fontSize: 20,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.82)',
    letterSpacing: 4,
    marginTop: 6,
    writingDirection: 'ltr',
  },
  divider: {
    width: 56,
    height: 2,
    borderRadius: 1,
    marginBottom: 18,
  },
  tagline: {
    fontSize: 17,
    fontWeight: '600',
    color: SPLASH_CONFIG.taglineColor,
    textAlign: 'center',
    letterSpacing: 0.4,
    lineHeight: 26,
    writingDirection: isRTL ? 'rtl' : 'ltr',
  },
  taglineEn: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.72)',
    textAlign: 'center',
    marginTop: 8,
    letterSpacing: 0.5,
  },
});
