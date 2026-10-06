import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Font from 'expo-font';
import {
  Cairo_400Regular,
  Cairo_500Medium,
  Cairo_600SemiBold,
  Cairo_700Bold,
  Cairo_800ExtraBold,
  Cairo_900Black,
} from '@expo-google-fonts/cairo';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

function RootNav() {
  const { isLoading, token } = useAuth();
  const [fontsLoaded, setFontsLoaded] = useState(false);
  useNotifications(); // must be called unconditionally (hooks rules); hook no-ops in Expo Go

  useEffect(() => {
    Font.loadAsync({
      Cairo_400Regular,
      Cairo_500Medium,
      Cairo_600SemiBold,
      Cairo_700Bold,
      Cairo_800ExtraBold,
      Cairo_900Black,
    })
      .then(() => setFontsLoaded(true))
      .catch(() => setFontsLoaded(true));
  }, []);

  useEffect(() => {
    if (!isLoading && fontsLoaded) SplashScreen.hideAsync();
  }, [isLoading, fontsLoaded]);
  if (isLoading || !fontsLoaded) return null;
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(driver)" />
        <Stack.Screen name="(merchant)" />
        <Stack.Screen name="unauthorized" />
        <Stack.Screen name="order/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="daily-cod" options={{ presentation: 'card' }} />
        <Stack.Screen name="notifications" options={{ presentation: 'card' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNav />
    </AuthProvider>
  );
}
