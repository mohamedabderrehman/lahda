import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Alert, TouchableOpacity, Dimensions, Modal, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { getMyStore, updateMyStore } from '../../../api/client';
import { theme } from '../../../constants/theme';
import { Card, CardSection } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { SectionHeader } from '../../../components/ui/SectionHeader';
import { StoreLocationMap, StoreLocationMapRef } from '../../../components/StoreLocationMap';
import { IconLocationOutline, IconCheckmarkOutline, IconCloseOutline, IconMapOutline } from '../../../components/Icons';

type Store = {
  logoUrl?: string | null;
  coverUrl?: string | null;
  addressText?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

const SCREEN_W = Dimensions.get('window').width;
const SCREEN_H = Dimensions.get('window').height;

export default function MerchantMediaLocationScreen() {
  const colorScheme = useColorScheme();
  const modalMapRef = useRef<StoreLocationMapRef>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [logoUrl, setLogoUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [addressText, setAddressText] = useState('');
  const [lat, setLat] = useState<number>(32.4833);
  const [lng, setLng] = useState<number>(44.4211);
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [modalTempLat, setModalTempLat] = useState<number>(32.4833);
  const [modalTempLng, setModalTempLng] = useState<number>(44.4211);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = (await getMyStore()) as Store;
      setStore(res);
      setLogoUrl(res.logoUrl ?? '');
      setCoverUrl(res.coverUrl ?? '');
      setAddressText(res.addressText ?? '');
      if (Number.isFinite(res.latitude ?? NaN) && Number.isFinite(res.longitude ?? NaN)) {
        setLat(res.latitude as number);
        setLng(res.longitude as number);
      }
    } catch {
      setStore(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openMapModal = useCallback(() => {
    setModalTempLat(lat);
    setModalTempLng(lng);
    setMapModalVisible(true);
    setTimeout(() => {
      modalMapRef.current?.goToLocation(lat, lng);
    }, 300);
  }, [lat, lng]);

  const closeMapModal = useCallback(() => {
    setMapModalVisible(false);
  }, []);

  const handleModalMapMove = useCallback((newLat: number, newLng: number) => {
    setModalTempLat(newLat);
    setModalTempLng(newLng);
  }, []);

  const confirmLocationFromModal = useCallback(() => {
    setLat(modalTempLat);
    setLng(modalTempLng);
    setMapModalVisible(false);
    Alert.alert('تم', 'تم تحديد الموقع الجديد. لا تنسَ حفظ التغييرات.');
  }, [modalTempLat, modalTempLng]);

  const handleMyLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('تنبيه', 'يجب منح الإذن للوصول إلى موقعك');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const newLat = loc.coords.latitude;
      const newLng = loc.coords.longitude;
      modalMapRef.current?.goToLocation(newLat, newLng);
      setModalTempLat(newLat);
      setModalTempLng(newLng);
    } catch {
      Alert.alert('خطأ', 'تعذّر الحصول على الموقع');
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      await updateMyStore({
        logoUrl: logoUrl.trim() || undefined,
        coverUrl: coverUrl.trim() || undefined,
        addressText: addressText.trim() || undefined,
        latitude: lat,
        longitude: lng,
      });
      Alert.alert('تم', 'تم تحديث الصور والموقع');
      router.back();
    } catch (e: unknown) {
      Alert.alert('خطأ', (e as Error).message || 'فشل الحفظ');
    } finally {
      setSaving(false);
    }
  }, [saving, logoUrl, coverUrl, addressText, lat, lng]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>الصور والموقع</Text>
        <Text style={styles.back} onPress={() => router.back()}>رجوع</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card>
          <CardSection>
            <SectionHeader title="صور المتجر" subtitle="روابط للّوجو والغلاف (اختياري)" />
            <Text style={styles.label}>رابط الشعار (logoUrl)</Text>
            <TextInput style={styles.input} value={logoUrl} onChangeText={setLogoUrl} placeholder="https://..." placeholderTextColor={theme.colors.textMuted} autoCapitalize="none" />
            <Text style={styles.label}>رابط الغلاف (coverUrl)</Text>
            <TextInput style={styles.input} value={coverUrl} onChangeText={setCoverUrl} placeholder="https://..." placeholderTextColor={theme.colors.textMuted} autoCapitalize="none" />
          </CardSection>
        </Card>

        <Card style={{ marginTop: theme.spacing.lg }}>
          <CardSection>
            <SectionHeader title="عنوان المتجر" subtitle="سيظهر للعميل والسائق" />
            <TextInput style={[styles.input, styles.multiline]} value={addressText} onChangeText={setAddressText} placeholder="عنوان المتجر" placeholderTextColor={theme.colors.textMuted} multiline numberOfLines={2} />
          </CardSection>
        </Card>

        <Card style={{ marginTop: theme.spacing.lg }}>
          <CardSection>
            <SectionHeader title="موقع المتجر" subtitle="اختر موقع المتجر على الخريطة" />
          </CardSection>

          <TouchableOpacity style={styles.locationCard} onPress={openMapModal}>
            <View style={styles.locationIconContainer}>
              <IconMapOutline size={32} color={theme.colors.primary} />
            </View>
            <View style={styles.locationInfo}>
              <Text style={styles.locationTitle}>تحديد الموقع على الخريطة</Text>
              <Text style={styles.locationCoords}>
                {lat.toFixed(6)}, {lng.toFixed(6)}
              </Text>
            </View>
            <View style={styles.locationArrow}>
              <Text style={{ color: theme.colors.primary, fontSize: 18 }}>‹</Text>
            </View>
          </TouchableOpacity>
        </Card>

        <View style={{ marginTop: theme.spacing.lg, gap: 10 }}>
          <Button title="حفظ" onPress={handleSave} loading={saving} disabled={loading || !store} variant="primary" />
          <Button title="إلغاء" onPress={() => router.back()} variant="secondary" />
        </View>
      </ScrollView>

      {/* Full Screen Map Modal */}
      <Modal
        visible={mapModalVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={closeMapModal}
      >
        <SafeAreaView style={styles.modalSafe} edges={['top']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={closeMapModal}>
              <IconCloseOutline size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>تحديد موقع المتجر</Text>
            <TouchableOpacity style={styles.modalConfirmBtn} onPress={confirmLocationFromModal}>
              <IconCheckmarkOutline size={24} color={theme.colors.success} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalMapContainer}>
            <StoreLocationMap
              ref={modalMapRef}
              latitude={modalTempLat}
              longitude={modalTempLng}
              interactive
              onLocationSelect={handleModalMapMove}
              style={{ width: SCREEN_W, height: SCREEN_H - 140 }}
              darkMode={colorScheme === 'dark'}
            />

            <View style={styles.mapCenterMarker} pointerEvents="none">
              <IconLocationOutline size={48} color={theme.colors.primary} />
            </View>

            <View style={styles.mapHintOverlay}>
              <Text style={styles.mapHintText}>حرّك الخريطة لوضع العلامة على موقع المتجر</Text>
            </View>
          </View>

          <View style={styles.modalFooter}>
            <View style={styles.coordRow}>
              <Text style={styles.coord}>{modalTempLat.toFixed(6)}</Text>
              <Text style={styles.coordSep}>·</Text>
              <Text style={styles.coord}>{modalTempLng.toFixed(6)}</Text>
            </View>
            <TouchableOpacity style={styles.myLocationBtn} onPress={handleMyLocation}>
              <Text style={styles.myLocationText}>الذهاب لموقعي الحالي</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    paddingHorizontal: theme.spacing.screenPadding,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  headerTitle: { fontSize: 20, fontWeight: '900', color: theme.colors.text, textAlign: 'right' },
  back: { marginTop: 6, fontSize: 14, fontWeight: '800', color: theme.colors.primaryDark, textAlign: 'right' },
  content: { padding: theme.spacing.screenPadding, paddingBottom: 40 },
  label: { marginTop: 14, fontSize: 13, fontWeight: '800', color: theme.colors.textSecondary, textAlign: 'right' },
  input: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    color: theme.colors.text,
    textAlign: 'right',
    backgroundColor: theme.colors.surfaceAlt,
  },
  multiline: { minHeight: 72, textAlignVertical: 'top' },

  // Location Card Styles
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.lg,
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  locationIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primaryLight + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: theme.spacing.md,
  },
  locationInfo: {
    flex: 1,
  },
  locationTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'right',
  },
  locationCoords: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  locationArrow: {
    marginRight: 4,
  },

  // Modal Styles
  modalSafe: { flex: 1, backgroundColor: theme.colors.background },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.screenPadding,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  modalCloseBtn: {
    padding: 8,
    borderRadius: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text,
  },
  modalConfirmBtn: {
    padding: 8,
    borderRadius: 20,
  },
  modalMapContainer: {
    position: 'relative',
    flex: 1,
  },
  mapCenterMarker: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -24,
    marginTop: -48,
    zIndex: 10,
  },
  mapHintOverlay: {
    position: 'absolute',
    top: 20,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 5,
  },
  mapHintText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  modalFooter: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.screenPadding,
    paddingVertical: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    gap: 12,
  },
  coordRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  coord: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
  },
  coordSep: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  myLocationBtn: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    borderRadius: theme.radius.md,
    alignItems: 'center',
  },
  myLocationText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
