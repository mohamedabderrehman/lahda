import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import { IconArrowForward, IconTarget } from '../../components/Icons';
import { AddressMap, AddressMapRef } from '../../components/AddressMap';
import { useTheme } from '../../contexts/ThemeContext';
import { FeedbackBanner } from '../../components/feedback-banner';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAP_HEIGHT = Math.round(SCREEN_HEIGHT * 0.7);
const DEFAULT_LAT = 33.3152;
const DEFAULT_LNG = 44.3661;

export default function PickLocationScreen() {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const { lat: paramLat, lng: paramLng } = useLocalSearchParams<{ lat?: string; lng?: string }>();
  const initialLat = paramLat != null ? parseFloat(paramLat) : DEFAULT_LAT;
  const initialLng = paramLng != null ? parseFloat(paramLng) : DEFAULT_LNG;

  const mapRef = useRef<AddressMapRef>(null);
  const [latitude, setLatitude] = useState(initialLat);
  const [longitude, setLongitude] = useState(initialLng);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);

  const goToCurrentLocation = async () => {
    setLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationMessage('نحتاج موقعك لتحديد عنوان التوصيل بدقة. يمكنك تحريك الخريطة يدوياً أيضاً.');
        setLoadingLocation(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude: lat, longitude: lng } = loc.coords;
      setLatitude(lat);
      setLongitude(lng);
      mapRef.current?.goToLocation(lat, lng);
    } catch {
      setLocationMessage('تعذر الحصول على موقعك حالياً. حاول مرة أخرى أو حدّد الموقع يدوياً.');
    } finally {
      setLoadingLocation(false);
    }
  };

  // No auto "my location" — pin starts at default or passed params; user moves map or taps FAB to go to current location

  const handleLocationSelect = (lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
  };

  const handleConfirm = () => {
    router.replace({
      pathname: '/addresses/add-details',
      params: { lat: String(latitude), lng: String(longitude) },
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <IconArrowForward size={24} color={t.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>إختر الموقع</Text>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.mapContainer}>
        <AddressMap
          ref={mapRef}
          latitude={latitude}
          longitude={longitude}
          style={{ width: SCREEN_WIDTH, height: MAP_HEIGHT }}
          interactive
          onLocationSelect={handleLocationSelect}
        />
        <TouchableOpacity
          style={styles.fab}
          onPress={goToCurrentLocation}
          disabled={loadingLocation}
          activeOpacity={0.9}
        >
          {loadingLocation ? (
            <ActivityIndicator size="small" color={t.colors.white} />
          ) : (
            <IconTarget size={24} color={t.colors.white} />
          )}
        </TouchableOpacity>
      </View>

      {locationMessage ? <View style={styles.feedback}><FeedbackBanner tone="warning">{locationMessage}</FeedbackBanner></View> : null}

      <View style={styles.footer}>
        <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} activeOpacity={0.9}>
          <Text style={styles.confirmBtnText}>التأكيد</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const makeStyles = (t: ReturnType<typeof useTheme>) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.colors.surface },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: t.spacing.sm,
    paddingVertical: t.spacing.lg,
    backgroundColor: t.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.borderLight,
  },
  backBtn: { padding: t.spacing.md },
  headerTitle: { flex: 1, ...t.typography.titleLarge, color: t.colors.text, textAlign: 'center' },
  headerRight: { width: 40 },
  mapContainer: {
    width: SCREEN_WIDTH,
    height: MAP_HEIGHT,
    position: 'relative',
  },
  fab: {
    position: 'absolute',
    bottom: t.spacing.xl,
    left: t.spacing.lg,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: t.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...t.shadow.shadow3,
  },
  footer: {
    padding: t.spacing.screenPadding,
    paddingTop: t.spacing.lg,
    backgroundColor: t.colors.surface,
  },
  feedback: { paddingHorizontal: t.spacing.screenPadding, paddingTop: t.spacing.sm, backgroundColor: t.colors.surface },
  confirmBtn: {
    height: t.button.primaryHeight,
    backgroundColor: t.colors.primary,
    borderRadius: t.radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmBtnText: { ...t.typography.body, fontFamily: t.fonts.bold, color: t.colors.white },
});
