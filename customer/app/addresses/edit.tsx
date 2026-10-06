import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import * as Location from 'expo-location';
import { IconArrowForward } from '../../components/Icons';
import { AddressMap, AddressMapRef } from '../../components/AddressMap';
import { getAddress, updateAddress } from '../../api/client';
import { useTheme } from '../../contexts/ThemeContext';
import { isInsideDeliveryZone, DELIVERY_ZONE_MESSAGE } from '../../utils/deliveryZone';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAP_HEIGHT = 220;

export default function EditAddressScreen() {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const mapRef = useRef<AddressMapRef>(null);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState('');
  const [addressText, setAddressText] = useState('');
  const [extraNotes, setExtraNotes] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [latitude, setLatitude] = useState(33.3152);
  const [longitude, setLongitude] = useState(44.3661);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const addr = await getAddress(id);
        const a = addr as Record<string, unknown>;
        setLabel((a.label as string) || '');
        setAddressText((a.addressText as string) || '');
        setExtraNotes((a.extraNotes as string) || '');
        setIsDefault(!!a.isDefault);
        const lat = a.latitude as number | undefined;
        const lng = a.longitude as number | undefined;
        if (lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)) {
          setLatitude(lat);
          setLongitude(lng);
        }
      } catch {
        Alert.alert('خطأ', 'تعذر تحميل العنوان');
        router.back();
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleSave = async () => {
    if (!id) return;
    const trimmed = addressText.trim();
    if (!trimmed) {
      Alert.alert('تنبيه', 'أدخل وصف العنوان');
      return;
    }
    if (!isInsideDeliveryZone(latitude, longitude)) {
      Alert.alert('عذراً', DELIVERY_ZONE_MESSAGE);
      return;
    }
    setSaving(true);
    try {
      await updateAddress(id, {
        label: label.trim() || undefined,
        addressText: trimmed,
        latitude,
        longitude,
        extraNotes: extraNotes.trim() || undefined,
        isDefault,
      });
      Alert.alert('تم', 'تم تحديث العنوان', [{ text: 'حسناً', onPress: () => router.back() }]);
    } catch (e: unknown) {
      Alert.alert('خطأ', (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const requestLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const lat = loc.coords.latitude;
      const lng = loc.coords.longitude;
      setLatitude(lat);
      setLongitude(lng);
      mapRef.current?.goToLocation(lat, lng);
    } catch {
      Alert.alert('خطأ', 'تعذر الحصول على الموقع');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <IconArrowForward size={24} color={t.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>تعديل العنوان</Text>
        </View>
        <ActivityIndicator size="large" color={t.colors.primary} style={styles.loader} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <IconArrowForward size={24} color={t.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>تعديل العنوان</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.mapWrap}>
          <AddressMap
            ref={mapRef}
            latitude={latitude}
            longitude={longitude}
            style={{ width: SCREEN_WIDTH - t.spacing.screenPadding * 2, height: MAP_HEIGHT }}
            interactive
            onLocationSelect={(lat, lng) => { setLatitude(lat); setLongitude(lng); }}
          />
          <TouchableOpacity style={styles.myLocationBtn} onPress={requestLocation} activeOpacity={0.8}>
            <Text style={styles.myLocationText}>موقعي الحالي</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>تسمية (اختياري)</Text>
          <TextInput
            style={styles.input}
            value={label}
            onChangeText={setLabel}
            placeholder="مثل: المنزل، العمل"
            placeholderTextColor={t.colors.textMuted}
            editable={!saving}
          />
          <Text style={[styles.label, { marginTop: t.spacing.lg }]}>الشارع *</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={addressText}
            onChangeText={setAddressText}
            placeholder="اسم الشارع أو العنوان"
            placeholderTextColor={t.colors.textMuted}
            multiline
            numberOfLines={2}
            editable={!saving}
          />
          <Text style={[styles.label, { marginTop: t.spacing.lg }]}>ملاحظات (اختياري)</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={extraNotes}
            onChangeText={setExtraNotes}
            placeholder="تعليمات للتوصيل"
            placeholderTextColor={t.colors.textMuted}
            multiline
            editable={!saving}
          />
          <TouchableOpacity
            style={styles.defaultRow}
            onPress={() => setIsDefault(!isDefault)}
            activeOpacity={0.7}
            disabled={saving}
          >
            <View style={[styles.checkbox, isDefault && styles.checkboxChecked]} />
            <Text style={styles.defaultLabel}>استخدامه كعنوان افتراضي</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color={t.colors.white} size="small" />
          ) : (
            <Text style={styles.saveBtnText}>حفظ التغييرات</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (t: ReturnType<typeof useTheme>) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.colors.background },
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
  loader: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: t.spacing.screenPadding, paddingBottom: t.spacing.xxl + t.spacing.sm },
  mapWrap: { position: 'relative', height: MAP_HEIGHT, borderRadius: t.radius.lg, overflow: 'hidden', marginBottom: t.spacing.xl },
  map: { width: '100%', height: '100%' },
  myLocationBtn: {
    position: 'absolute',
    bottom: t.spacing.md,
    alignSelf: 'center',
    backgroundColor: t.colors.surface,
    paddingVertical: t.spacing.sm,
    paddingHorizontal: t.spacing.lg,
    borderRadius: t.radius.full,
    ...t.shadow.shadow2,
  },
  myLocationText: { ...t.typography.body, fontFamily: t.fonts.medium, color: t.colors.text },
  card: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.lg,
    padding: t.spacing.xl,
    marginBottom: t.spacing.xl,
    borderWidth: 0,
    ...t.shadow.shadow2,
  },
  label: { ...t.typography.body, fontFamily: t.fonts.medium, color: t.colors.textSecondary, marginBottom: t.spacing.sm },
  input: {
    backgroundColor: t.colors.background,
    borderRadius: t.radius.lg,
    paddingHorizontal: t.spacing.lg,
    paddingVertical: t.spacing.md,
    ...t.typography.body,
    fontSize: 16,
    color: t.colors.text,
    borderWidth: 1,
    borderColor: t.colors.borderLight,
    minHeight: 52,
  },
  inputMultiline: { minHeight: 80 },
  defaultRow: { flexDirection: 'row', alignItems: 'center', marginTop: t.spacing.xl },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: t.colors.border,
    marginLeft: t.spacing.sm,
  },
  checkboxChecked: { backgroundColor: t.colors.primary, borderColor: t.colors.primary },
  defaultLabel: { ...t.typography.body, color: t.colors.text },
  saveBtn: {
    height: t.button.primaryHeight,
    backgroundColor: t.colors.primary,
    borderRadius: t.radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { ...t.typography.body, fontFamily: t.fonts.bold, color: t.colors.white },
});
