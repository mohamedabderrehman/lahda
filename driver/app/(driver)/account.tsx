import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { getDriverProfile, changeEmail, changePassword } from '../../api/client';
import { theme } from '../../constants/theme';
import { IconPersonOutline, IconCarOutline, IconShieldOutline, IconLocationOutline, IconLogoutOutline } from '../../components/Icons';
import * as Location from 'expo-location';

type DriverProfile = {
  id: string;
  nationalId?: string | null;
  vehicleInfo?: string | null;
  isApproved?: boolean;
  ratingAvg?: number;
  ratingCount?: number;
  user?: { fullName?: string; email?: string; phone?: string };
};

type SecurityField = 'email' | 'password' | null;

export default function DriverAccountScreen() {
  const { user: authUser, logout } = useAuth();
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [locationPerm, setLocationPerm] = useState<string>('unknown');

  const [secField, setSecField] = useState<SecurityField>(null);
  const [secCurrent, setSecCurrent] = useState('');
  const [secNew, setSecNew] = useState('');
  const [secSaving, setSecSaving] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await getDriverProfile();
      const p = res as DriverProfile;
      setProfile(p);
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    (async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      setLocationPerm(status);
    })();
  }, []);

  const handleSecuritySave = useCallback(async () => {
    if (secSaving || !secField) return;
    if (!secCurrent.trim()) { Alert.alert('خطأ', 'أدخل كلمة المرور الحالية'); return; }
    if (!secNew.trim()) { Alert.alert('خطأ', secField === 'email' ? 'أدخل البريد الجديد' : 'أدخل كلمة المرور الجديدة'); return; }
    setSecSaving(true);
    try {
      if (secField === 'email') {
        await changeEmail(secNew.trim(), secCurrent.trim());
      } else {
        await changePassword(secCurrent.trim(), secNew.trim());
      }
      Alert.alert('تم', secField === 'email' ? 'تم تغيير البريد الإلكتروني' : 'تم تغيير كلمة المرور');
      setSecField(null);
      setSecCurrent('');
      setSecNew('');
      load(true);
    } catch (e: unknown) {
      Alert.alert('خطأ', (e as Error).message || 'فشلت العملية');
    } finally {
      setSecSaving(false);
    }
  }, [secField, secCurrent, secNew, secSaving, load]);

  const handleLogout = useCallback(() => {
    Alert.alert('تسجيل الخروج', 'هل تريد تسجيل الخروج؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'خروج',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  }, [logout]);

  const requestLocationPermission = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    setLocationPerm(status);
    if (status === 'granted') {
      Alert.alert('تم', 'تم منح إذن الموقع');
    } else {
      Alert.alert('تنبيه', 'لم يتم منح إذن الموقع. يمكنك تفعيله من إعدادات الجهاز.');
    }
  }, []);

  if (loading && !profile) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}><Text style={styles.headerTitle}>حسابي</Text></View>
        <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
      </SafeAreaView>
    );
  }

  const displayName = profile?.user?.fullName ?? (authUser as { fullName?: string })?.fullName ?? '—';
  const email = profile?.user?.email ?? (authUser as { email?: string })?.email ?? '—';
  const phone = profile?.user?.phone ?? '—';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}><Text style={styles.headerTitle}>حسابي</Text></View>

      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={theme.colors.primary} />}
          keyboardShouldPersistTaps="handled"
        >
          {/* Profile header */}
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <IconPersonOutline size={36} color="#fff" />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{displayName}</Text>
              <Text style={styles.profileEmail}>{email}</Text>
              {profile && !profile.isApproved && (
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingText}>قيد المراجعة</Text>
                </View>
              )}
              {profile?.isApproved && (
                <View style={styles.approvedBadge}>
                  <Text style={styles.approvedText}>مفعّل</Text>
                </View>
              )}
            </View>
          </View>

          {/* Rating */}
          {(profile?.ratingCount ?? 0) > 0 && (
            <View style={styles.ratingCard}>
              <Text style={styles.ratingStars}>{'\u2B50'} {(profile?.ratingAvg ?? 0).toFixed(1)}</Text>
              <Text style={styles.ratingCount}>{profile?.ratingCount} تقييم</Text>
            </View>
          )}

          {/* Quick info */}
          <View style={styles.infoRow}>
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>الهاتف</Text>
              <Text style={styles.infoValue}>{phone || '—'}</Text>
            </View>
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>الموقع</Text>
              <Text style={[styles.infoValue, { color: locationPerm === 'granted' ? theme.colors.success : theme.colors.error }]}>
                {locationPerm === 'granted' ? 'مفعّل' : 'معطّل'}
              </Text>
            </View>
          </View>

          {/* Location permission */}
          {locationPerm !== 'granted' && (
            <TouchableOpacity style={styles.locationBanner} onPress={requestLocationPermission} activeOpacity={0.85}>
              <IconLocationOutline size={22} color={theme.colors.warning} />
              <View style={styles.locationBannerInfo}>
                <Text style={styles.locationBannerTitle}>إذن الموقع مطلوب</Text>
                <Text style={styles.locationBannerSub}>اضغط لتفعيل الموقع واستقبال الطلبات</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Vehicle & ID - Read Only (Managed by Admin) */}
          <Text style={styles.sectionTitle}>بيانات المركبة والهوية</Text>
          <View style={[styles.formCard, { backgroundColor: theme.colors.surfaceAlt + '80' }]}>
            <View style={[styles.infoBanner, { marginBottom: theme.spacing.md }]}>
              <IconShieldOutline size={16} color={theme.colors.textMuted} />
              <Text style={styles.infoBannerText}>يتم إدارة هذه البيانات من قبل الإدارة فقط</Text>
            </View>
            <View style={styles.formRow}>
              <IconCarOutline size={20} color={theme.colors.textMuted} />
              <View style={styles.formField}>
                <Text style={styles.formLabel}>معلومات المركبة</Text>
                <Text style={[styles.readOnlyValue, { color: profile?.vehicleInfo ? theme.colors.text : theme.colors.textMuted }]}>
                  {profile?.vehicleInfo || 'غير مسجل'}
                </Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.formRow}>
              <IconShieldOutline size={20} color={theme.colors.textMuted} />
              <View style={styles.formField}>
                <Text style={styles.formLabel}>الرقم الوطني</Text>
                <Text style={[styles.readOnlyValue, { color: profile?.nationalId ? theme.colors.text : theme.colors.textMuted }]}>
                  {profile?.nationalId || 'غير مسجل'}
                </Text>
              </View>
            </View>
          </View>

          {/* Security */}
          <Text style={styles.sectionTitle}>الأمان</Text>
          <View style={styles.formCard}>
            <TouchableOpacity style={styles.secRow} onPress={() => { setSecField('email'); setSecCurrent(''); setSecNew(''); }} activeOpacity={0.85}>
              <Text style={styles.secLabel}>تغيير البريد الإلكتروني</Text>
              <Text style={styles.secArrow}>←</Text>
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.secRow} onPress={() => { setSecField('password'); setSecCurrent(''); setSecNew(''); }} activeOpacity={0.85}>
              <Text style={styles.secLabel}>تغيير كلمة المرور</Text>
              <Text style={styles.secArrow}>←</Text>
            </TouchableOpacity>
          </View>

          {/* Logout */}
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
            <IconLogoutOutline size={20} color={theme.colors.error} />
            <Text style={styles.logoutText}>تسجيل الخروج</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Security modal */}
      <Modal visible={secField !== null} transparent animationType="slide" onRequestClose={() => setSecField(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {secField === 'email' ? 'تغيير البريد الإلكتروني' : 'تغيير كلمة المرور'}
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="كلمة المرور الحالية"
              placeholderTextColor={theme.colors.textMuted}
              secureTextEntry
              value={secCurrent}
              onChangeText={setSecCurrent}
              autoCapitalize="none"
            />
            <TextInput
              style={styles.modalInput}
              placeholder={secField === 'email' ? 'البريد الإلكتروني الجديد' : 'كلمة المرور الجديدة'}
              placeholderTextColor={theme.colors.textMuted}
              secureTextEntry={secField === 'password'}
              keyboardType={secField === 'email' ? 'email-address' : 'default'}
              value={secNew}
              onChangeText={setSecNew}
              autoCapitalize="none"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setSecField(null)} activeOpacity={0.85}>
                <Text style={styles.modalCancelText}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={handleSecuritySave} disabled={secSaving} activeOpacity={0.85}>
                {secSaving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.modalSaveText}>حفظ</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  keyboard: { flex: 1 },
  header: {
    paddingHorizontal: theme.spacing.screenPadding,
    paddingVertical: 14,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
  },
  headerTitle: { fontSize: 20, fontFamily: 'Cairo_700Bold', fontWeight: '700', color: theme.colors.text },
  loader: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: theme.spacing.screenPadding, paddingBottom: 40 },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: theme.spacing.lg,
  },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 20, fontFamily: 'Cairo_700Bold', fontWeight: '700', color: '#fff' },
  profileEmail: { fontSize: 13, fontFamily: 'Cairo_400Regular', color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  pendingBadge: { marginTop: 6, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, alignSelf: 'flex-start' },
  pendingText: { fontSize: 12, fontFamily: 'Cairo_600SemiBold', fontWeight: '600', color: '#fef3c7' },
  approvedBadge: { marginTop: 6, backgroundColor: 'rgba(34,197,94,0.3)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, alignSelf: 'flex-start' },
  approvedText: { fontSize: 12, fontFamily: 'Cairo_600SemiBold', fontWeight: '600', color: '#dcfce7' },
  ratingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    borderRadius: theme.radius.lg,
    paddingVertical: 12,
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: '#F59E0B40',
  },
  ratingStars: { fontSize: 20, fontFamily: 'Cairo_700Bold', fontWeight: '700', color: '#92400e' },
  ratingCount: { fontSize: 14, fontFamily: 'Cairo_500Medium', color: '#92400e' },
  infoRow: { flexDirection: 'row', gap: theme.spacing.md, marginBottom: theme.spacing.lg },
  infoCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    ...theme.shadow.card,
  },
  infoLabel: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: theme.colors.textSecondary, marginBottom: 4 },
  infoValue: { fontSize: 15, fontFamily: 'Cairo_600SemiBold', fontWeight: '600', color: theme.colors.text },
  locationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: '#F59E0B40',
    gap: theme.spacing.md,
  },
  locationBannerInfo: { flex: 1 },
  locationBannerTitle: { fontSize: 14, fontFamily: 'Cairo_600SemiBold', fontWeight: '600', color: '#92400e' },
  locationBannerSub: { fontSize: 12, fontFamily: 'Cairo_400Regular', color: '#92400e', marginTop: 2 },
  sectionTitle: { fontSize: 16, fontFamily: 'Cairo_700Bold', fontWeight: '700', color: theme.colors.text, marginBottom: theme.spacing.md },
  formCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    ...theme.shadow.card,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  infoBannerText: { fontSize: 13, fontFamily: 'Cairo_500Medium', color: theme.colors.textMuted, flex: 1 },
  formRow: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.md, paddingVertical: 6 },
  formField: { flex: 1 },
  formLabel: { fontSize: 12, fontFamily: 'Cairo_500Medium', color: theme.colors.textSecondary, marginBottom: 4 },
  readOnlyValue: {
    fontSize: 15,
    fontFamily: 'Cairo_600SemiBold',
    fontWeight: '600',
    paddingVertical: 8,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    textAlign: 'right',
  },
  divider: { height: 1, backgroundColor: theme.colors.borderLight, marginVertical: 10 },
  secRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  secLabel: { fontSize: 15, fontFamily: 'Cairo_500Medium', color: theme.colors.text },
  secArrow: { fontSize: 16, color: theme.colors.textMuted },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.error + '10',
    borderRadius: theme.radius.lg,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: theme.colors.error + '30',
  },
  logoutText: { fontSize: 16, fontFamily: 'Cairo_600SemiBold', fontWeight: '600', color: theme.colors.error },
  modalOverlay: { flex: 1, backgroundColor: theme.colors.overlay, justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: theme.spacing.xl,
    paddingBottom: 40,
  },
  modalTitle: { fontSize: 18, fontFamily: 'Cairo_700Bold', fontWeight: '700', color: theme.colors.text, textAlign: 'center', marginBottom: theme.spacing.lg },
  modalInput: {
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: 'Cairo_400Regular',
    color: theme.colors.text,
    textAlign: 'right',
    backgroundColor: theme.colors.surfaceAlt,
    marginBottom: theme.spacing.md,
  },
  modalActions: { flexDirection: 'row', gap: theme.spacing.md, marginTop: theme.spacing.sm },
  modalCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center',
  },
  modalCancelText: { fontSize: 15, fontFamily: 'Cairo_600SemiBold', fontWeight: '600', color: theme.colors.textSecondary },
  modalSave: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
  },
  modalSaveText: { fontSize: 15, fontFamily: 'Cairo_700Bold', fontWeight: '700', color: '#fff' },
});
