import React, { useMemo, useState } from 'react';
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
import {
  IconArrowForward,
  IconHome,
  IconBriefcaseOutline,
  IconHeartOutline,
  IconTagOutline,
} from '../../components/Icons';
import { AddressMap } from '../../components/AddressMap';
import { addAddress } from '../../api/client';
import { useTheme } from '../../contexts/ThemeContext';
import { isInsideDeliveryZoneEnhanced, DELIVERY_ZONE_MESSAGE } from '../../utils/deliveryZone';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAP_PREVIEW_HEIGHT = 180;
const ADDRESS_LABELS = [
  { key: 'المنزل', value: 'home', icon: IconHome },
  { key: 'عمل', value: 'work', icon: IconBriefcaseOutline },
  { key: 'أمي', value: 'mom', icon: IconHeartOutline },
  { key: 'غير', value: 'other', icon: IconTagOutline },
] as const;

export default function AddDetailsScreen() {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const { lat, lng } = useLocalSearchParams<{ lat: string; lng: string }>();
  const latitude = lat ? parseFloat(lat) : 33.3152;
  const longitude = lng ? parseFloat(lng) : 44.3661;

  const [labelKey, setLabelKey] = useState<string>('المنزل');
  const [street, setStreet] = useState('');
  const [extraNotes, setExtraNotes] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);

  const addressText = street.trim() || `الموقع: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

  const handleConfirm = async () => {
    if (!street.trim()) {
      Alert.alert('تنبيه', 'أدخل اسم الشارع أو العنوان');
      return;
    }
    setSaving(true);
    try {
      const ok = await isInsideDeliveryZoneEnhanced(latitude, longitude);
      if (!ok) {
        Alert.alert('عذراً', DELIVERY_ZONE_MESSAGE);
        return;
      }
      await addAddress({
        label: labelKey,
        addressText: addressText.trim(),
        latitude,
        longitude,
        extraNotes: extraNotes.trim() || undefined,
        isDefault,
      });
      Alert.alert('تم', 'تمت إضافة العنوان', [{ text: 'حسناً', onPress: () => router.replace('/addresses') }]);
    } catch (e: unknown) {
      Alert.alert('خطأ', (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const canConfirm = street.trim().length > 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <IconArrowForward size={24} color={t.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>العناوين</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Map preview + change location */}
        <View style={styles.mapCard}>
          <View style={styles.mapWrap}>
            <AddressMap
              latitude={latitude}
              longitude={longitude}
              style={{ width: SCREEN_WIDTH - CARD_PADDING * 2 - 20, height: MAP_PREVIEW_HEIGHT }}
              interactive={false}
            />
          </View>
          <View style={styles.mapFooter}>
            <Text style={styles.mapHint}>الموقع المحدد</Text>
            <TouchableOpacity
              onPress={() =>
                router.replace({
                  pathname: '/addresses/pick-location',
                  params: { lat: String(latitude), lng: String(longitude) },
                })
              }
              style={styles.mapChangeBtn}
              activeOpacity={0.8}
            >
              <Text style={styles.mapChangeBtnText}>تغيير الموقع</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Address type – horizontal pills */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>حدد اسم العنوان</Text>
          <Text style={styles.sectionSubtitle}>اختر نوع العنوان</Text>
          <View style={styles.pillRow}>
            {ADDRESS_LABELS.map(({ key, value, icon: Icon }) => {
              const selected = labelKey === key;
              return (
                <TouchableOpacity
                  key={value}
                  style={[styles.pill, selected && styles.pillSelected]}
                  onPress={() => setLabelKey(key)}
                  activeOpacity={0.8}
                >
                  <Icon
                    size={20}
                    color={selected ? t.colors.text : t.colors.textMuted}
                  />
                  <Text style={[styles.pillText, selected && styles.pillTextSelected]}>{key}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Details card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>اعطينا التفاصيل</Text>

          <Text style={styles.label}>الشارع</Text>
          <TextInput
            style={styles.input}
            value={street}
            onChangeText={setStreet}
            placeholder="اسم الشارع أو العنوان"
            placeholderTextColor={t.colors.textMuted}
            editable={!saving}
          />

          <Text style={styles.label}>ملاحظات (اختياري)</Text>
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
          style={[styles.confirmBtn, (!canConfirm || saving) && styles.confirmBtnDisabled]}
          onPress={handleConfirm}
          disabled={!canConfirm || saving}
          activeOpacity={0.9}
        >
          {saving ? (
            <ActivityIndicator color={t.colors.white} size="small" />
          ) : (
            <Text style={styles.confirmBtnText}>التأكيد</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const CARD_PADDING = 20;
const PILL_GAP = 8;

const makeStyles = (t: ReturnType<typeof useTheme>) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: t.spacing.sm,
    paddingVertical: t.spacing.lg,
    backgroundColor: t.colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: t.colors.borderLight,
  },
  backBtn: { padding: t.spacing.md },
  headerTitle: { flex: 1, ...t.typography.titleLarge, color: t.colors.text, textAlign: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: CARD_PADDING, paddingBottom: t.spacing.xxl * 2 },
  mapCard: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.lg,
    padding: t.spacing.lg,
    marginBottom: t.spacing.lg,
    overflow: 'hidden',
    borderWidth: 0,
    ...t.shadow.shadow2,
  },
  mapWrap: {
    width: SCREEN_WIDTH - CARD_PADDING * 2 - 20,
    height: MAP_PREVIEW_HEIGHT,
    borderRadius: 12,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  mapFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: t.spacing.sm,
    paddingHorizontal: t.spacing.xs,
  },
  mapHint: {
    ...t.typography.caption,
    color: t.colors.textMuted,
  },
  mapChangeBtn: { paddingVertical: t.spacing.xs, paddingHorizontal: t.spacing.sm },
  mapChangeBtnText: {
    ...t.typography.body,
    fontFamily: t.fonts.medium,
    color: t.colors.text,
  },
  section: {
    marginBottom: t.spacing.xl,
  },
  sectionTitle: {
    ...t.typography.body,
    fontFamily: t.fonts.medium,
    color: t.colors.textSecondary,
    marginBottom: t.spacing.xs,
  },
  sectionSubtitle: {
    ...t.typography.caption,
    color: t.colors.textMuted,
    marginBottom: t.spacing.md,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: PILL_GAP,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: t.spacing.md,
    paddingHorizontal: t.spacing.lg,
    borderRadius: 9999,
    backgroundColor: t.colors.surface,
    gap: t.spacing.sm,
    borderWidth: 1,
    borderColor: t.colors.borderLight,
  },
  pillSelected: {
    backgroundColor: t.colors.backgroundSecondary,
    borderColor: t.colors.border,
  },
  pillText: {
    ...t.typography.body,
    fontFamily: t.fonts.medium,
    color: t.colors.textSecondary,
  },
  pillTextSelected: {
    color: t.colors.text,
  },
  card: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.lg,
    padding: t.spacing.xl,
    marginBottom: t.spacing.xl,
    borderWidth: 0,
    ...t.shadow.shadow2,
  },
  cardTitle: {
    ...t.typography.body,
    fontFamily: t.fonts.medium,
    color: t.colors.textSecondary,
    marginBottom: t.spacing.lg,
  },
  label: {
    ...t.typography.body,
    fontFamily: t.fonts.medium,
    color: t.colors.textSecondary,
    marginBottom: t.spacing.sm,
    marginTop: t.spacing.md,
  },
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
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: t.colors.border,
    marginLeft: t.spacing.sm,
  },
  checkboxChecked: { backgroundColor: t.colors.primary, borderColor: t.colors.primary },
  defaultLabel: { ...t.typography.body, color: t.colors.text },
  confirmBtn: {
    height: t.button.primaryHeight,
    backgroundColor: t.colors.primary,
    borderRadius: t.radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmBtnDisabled: { opacity: 0.5 },
  confirmBtnText: { ...t.typography.body, fontFamily: t.fonts.bold, color: t.colors.white },
});
