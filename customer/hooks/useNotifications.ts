import { useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { request } from '../api/client';
import { useAuth } from '../contexts/AuthContext';

const isExpoGo = Constants.appOwnership === 'expo';

// Global event emitter for notification events
type NotificationPayload = { orderId?: string; type?: string; [key: string]: unknown };
type NotificationHandler = (payload: NotificationPayload) => void;
const listeners = new Set<NotificationHandler>();

export function addNotificationListener(handler: NotificationHandler) {
  listeners.add(handler);
  return () => listeners.delete(handler);
}

export function emitNotification(payload: NotificationPayload) {
  listeners.forEach((handler) => {
    try {
      handler(payload);
    } catch (e) {
      // Silently ignore handler errors
    }
  });
}

export function useNotifications() {
  const { token } = useAuth();
  const responseListener = useRef<(() => void) | null>(null);
  const notificationListener = useRef<(() => void) | null>(null);
  const tokenRefreshListener = useRef<(() => void) | null>(null);

  const registerPushToken = useCallback(async () => {
    if (isExpoGo || !token) return;
    if (Platform.OS !== 'android') return;

    let messaging: typeof import('@react-native-firebase/messaging').default;
    try {
      messaging = require('@react-native-firebase/messaging').default;
    } catch {
      if (__DEV__) console.warn('[Lahda] Firebase Messaging not available');
      return;
    }

    try {
      // Create default channel so FCM notifications display (backend sends channelId: 'default')
      let Notifications: typeof import('expo-notifications');
      try {
        Notifications = require('expo-notifications');
        await Notifications.setNotificationChannelAsync('default', {
          name: 'الإشعارات',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF6B1A',
          sound: 'default',
        });
        // Request POST_NOTIFICATIONS at runtime (required on Android 13+)
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') {
          if (__DEV__) console.warn('[Lahda] Notification permission not granted');
          return;
        }
      } catch {}

      const authStatus = await messaging().requestPermission();
      if (authStatus !== 1 && authStatus !== 2) {
        if (__DEV__) console.warn('[Lahda] Push notifications: permission not granted');
        return;
      }

      const fcmToken = await messaging().getToken();
      if (!fcmToken?.trim()) return;

      await request('/auth/fcm-token', {
        method: 'POST',
        body: JSON.stringify({ fcmToken: fcmToken.trim() }),
      });
      if (__DEV__) console.log('[Lahda] FCM token registered with backend');
    } catch (e) {
      if (__DEV__) console.warn('[Lahda] FCM registration failed:', e);
    }
  }, [token]);

  useEffect(() => {
    if (isExpoGo || Platform.OS !== 'android') return;

    let messaging: typeof import('@react-native-firebase/messaging').default;
    try {
      messaging = require('@react-native-firebase/messaging').default;
    } catch {
      return;
    }

    // App opened from quit state by tapping notification
    messaging()
      .getInitialNotification()
      .then((remoteMessage) => {
        const data = remoteMessage?.data as NotificationPayload | undefined;
        if (data) emitNotification(data);
      })
      .catch(() => {});

    const unsubscribeForeground = messaging().onMessage(async (remoteMessage) => {
      const data = remoteMessage.data as NotificationPayload | undefined;
      if (data) emitNotification(data);
    });

    const unsubscribeNotificationOpened = messaging().onNotificationOpenedApp((remoteMessage) => {
      const data = remoteMessage.data as NotificationPayload | undefined;
      if (data) emitNotification(data);
    });

    tokenRefreshListener.current = messaging().onTokenRefresh(async (fcmToken) => {
      if (token && fcmToken?.trim()) {
        try {
          await request('/auth/fcm-token', {
            method: 'POST',
            body: JSON.stringify({ fcmToken: fcmToken.trim() }),
          });
        } catch {}
      }
    });

    responseListener.current = unsubscribeForeground;
    notificationListener.current = unsubscribeNotificationOpened;

    return () => {
      try {
        if (typeof responseListener.current === 'function') responseListener.current();
        if (typeof notificationListener.current === 'function') notificationListener.current();
        if (typeof tokenRefreshListener.current === 'function') tokenRefreshListener.current();
      } catch {}
    };
  }, [token]);

  useEffect(() => {
    if (token) registerPushToken();
  }, [token, registerPushToken]);
}
