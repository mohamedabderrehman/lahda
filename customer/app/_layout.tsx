import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  useFonts,
  IBMPlexSansArabic_400Regular,
  IBMPlexSansArabic_500Medium,
  IBMPlexSansArabic_600SemiBold,
  IBMPlexSansArabic_700Bold,
} from '@expo-google-fonts/ibm-plex-sans-arabic';
import { AuthProvider } from '../contexts/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import { AppSettingsProvider } from '../contexts/AppSettingsContext';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import { CartProvider } from '../contexts/CartContext';
import { AnimatedSplashScreen } from '../components/AnimatedSplashScreen';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

const FONT_LOAD_TIMEOUT_MS = 2000;

function RootLayoutNav() {
  const t = useTheme();
  useNotifications();
  const [splashDone, setSplashDone] = useState(false);
  const [proceedAfterTimeout, setProceedAfterTimeout] = useState(false);

  const [fontsLoaded, fontError] = useFonts({
    IBMPlexSansArabic_400Regular,
    IBMPlexSansArabic_500Medium,
    IBMPlexSansArabic_600SemiBold,
    IBMPlexSansArabic_700Bold,
  });

  // Proceed when fonts loaded, font error, or timeout (avoids blank screen if expo-font hangs in release)
  const appReady = fontsLoaded || fontError != null || proceedAfterTimeout;

  useEffect(() => {
    if (appReady) SplashScreen.hideAsync();
  }, [appReady]);

  useEffect(() => {
    const t = setTimeout(() => setProceedAfterTimeout(true), FONT_LOAD_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, []);

  if (!appReady) return null;

  return (
    <>
      <StatusBar style={!splashDone ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          animationDuration: 280,
          gestureEnabled: true,
          contentStyle: { backgroundColor: t.colors.background },
        }}
      >
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="store/[slug]" options={{ presentation: 'card' }} />
        <Stack.Screen name="checkout" options={{ presentation: 'card' }} />
        <Stack.Screen name="addresses" />
        <Stack.Screen name="faq" />
        <Stack.Screen name="support" />
        <Stack.Screen name="favorites" />
        <Stack.Screen name="legal" />
        <Stack.Screen name="profile/edit" />
        <Stack.Screen name="order/[id]" />
        <Stack.Screen name="thank-you" options={{ gestureEnabled: false }} />
        <Stack.Screen name="product/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="notifications" options={{ presentation: 'card' }} />
      </Stack>
      {!splashDone && (
        <AnimatedSplashScreen onReady={() => setSplashDone(true)} />
      )}
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AuthProvider>
          <CartProvider>
            <AppSettingsProvider>
              <RootLayoutNav />
            </AppSettingsProvider>
          </CartProvider>
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
