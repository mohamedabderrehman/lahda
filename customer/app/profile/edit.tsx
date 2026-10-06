import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { IconArrowForward, IconPencilOutline, IconCameraOutline, IconTrashOutline } from '../../components/Icons';
import { useAuth } from '../../contexts/AuthContext';
import { updateProfile, changeEmail, changePassword, updateAvatar, uploadAvatarImage } from '../../api/client';
import { useTheme } from '../../contexts/ThemeContext';
import { CustomerHeader } from '../../components/customer-header';

export default function ProfileEditScreen() {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const { user, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarUrl = (user?.avatarUrl as string) || null;

  useEffect(() => {
    setFullName((user?.fullName as string) || '');
    setPhone((user?.phone as string) || '');
    setNewEmail((user?.email as string) || '');
  }, [user]);

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('التصريح مطلوب', 'يجب السماح بالوصول إلى مكتبة الصور');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      setUploadingAvatar(true);
      try {
        const uploadedUrl = await uploadAvatarImage(result.assets[0].uri);
        await updateAvatar(uploadedUrl);
        await refreshProfile();
        Alert.alert('تم', 'تم تحديث الصورة الشخصية بنجاح');
      } catch (e: unknown) {
        Alert.alert('خطأ', (e as Error).message || 'فشل رفع الصورة');
      } finally {
        setUploadingAvatar(false);
      }
    }
  };

  const handleRemoveAvatar = async () => {
    Alert.alert('حذف الصورة', 'هل تريد حذف الصورة الشخصية؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف',
        style: 'destructive',
        onPress: async () => {
          setUploadingAvatar(true);
          try {
            await updateAvatar(null);
            await refreshProfile();
            Alert.alert('تم', 'تم حذف الصورة الشخصية');
          } catch (e: unknown) {
            Alert.alert('خطأ', (e as Error).message);
          } finally {
            setUploadingAvatar(false);
          }
        },
      },
    ]);
  };

  const handleSaveProfile = async () => {
    const trimmedName = fullName.trim();
    if (!trimmedName) {
      Alert.alert('تنبيه', 'الاسم مطلوب');
      return;
    }
    setSaving(true);
    try {
      await updateProfile({ fullName: trimmedName, phone: phone.trim() || null });
      await refreshProfile();
      Alert.alert('تم', 'تم تحديث بياناتك بنجاح');
    } catch (e: unknown) {
      Alert.alert('خطأ', (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleChangeEmail = async () => {
    const trimmedEmail = newEmail.trim();
    if (!trimmedEmail) { Alert.alert('تنبيه', 'البريد مطلوب'); return; }
    if (!emailPassword) { Alert.alert('تنبيه', 'أدخل كلمة المرور للتأكيد'); return; }
    setSavingEmail(true);
    try {
      await changeEmail(trimmedEmail, emailPassword);
      await refreshProfile();
      setEmailPassword('');
      Alert.alert('تم', 'تم تغيير البريد الإلكتروني');
    } catch (e: unknown) {
      Alert.alert('خطأ', (e as Error).message);
    } finally {
      setSavingEmail(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword) { Alert.alert('تنبيه', 'أدخل كلمة المرور الحالية'); return; }
    if (newPassword.length < 6) { Alert.alert('تنبيه', 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل'); return; }
    if (newPassword !== confirmPassword) { Alert.alert('تنبيه', 'كلمة المرور غير متطابقة'); return; }
    setSavingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('تم', 'تم تغيير كلمة المرور بنجاح');
    } catch (e: unknown) {
      Alert.alert('خطأ', (e as Error).message);
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <CustomerHeader title="تعديل الحساب" />

      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.iconWrap}>
            <IconPencilOutline size={40} color={t.colors.textSecondary} />
          </View>
          <Text style={styles.subtitle}>عدّل معلوماتك الشخصية</Text>

          {/* Profile Picture Section */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarContainer}>
              {uploadingAvatar ? (
                <View style={styles.avatarWrap}>
                  <ActivityIndicator color={t.colors.primary} size="large" />
                </View>
              ) : avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarWrap}>
                  <Text style={styles.avatarText}>{(fullName || '؟').charAt(0)}</Text>
                </View>
              )}
            </View>

            <View style={styles.avatarActions}>
              <TouchableOpacity style={styles.avatarBtn} onPress={handlePickImage} disabled={uploadingAvatar}>
                <IconCameraOutline size={20} color={t.colors.white} />
                <Text style={styles.avatarBtnText}>تغيير الصورة</Text>
              </TouchableOpacity>

              {avatarUrl && (
                <TouchableOpacity
                  style={[styles.avatarBtn, styles.avatarBtnDanger]}
                  onPress={handleRemoveAvatar}
                  disabled={uploadingAvatar}
                >
                  <IconTrashOutline size={20} color={t.colors.white} />
                  <Text style={styles.avatarBtnText}>حذف</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Name & Phone */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>المعلومات الأساسية</Text>
            <Text style={styles.label}>الاسم الكامل</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="أدخل اسمك"
              placeholderTextColor={t.colors.textMuted}
              autoCapitalize="words"
              editable={!saving}
            />
            <Text style={[styles.label, { marginTop: t.spacing.lg }]}>رقم الهاتف</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="مثال: 07XX XXX XXXX"
              placeholderTextColor={t.colors.textMuted}
              keyboardType="phone-pad"
              editable={!saving}
            />
            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSaveProfile}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving ? <ActivityIndicator color={t.colors.white} size="small" /> : <Text style={styles.saveBtnText}>حفظ</Text>}
            </TouchableOpacity>
          </View>

          {/* Change Email */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>تغيير البريد الإلكتروني</Text>
            <Text style={styles.label}>البريد الجديد</Text>
            <TextInput
              style={styles.input}
              value={newEmail}
              onChangeText={setNewEmail}
              placeholder="example@mail.com"
              placeholderTextColor={t.colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!savingEmail}
            />
            <Text style={[styles.label, { marginTop: t.spacing.lg }]}>كلمة المرور (للتأكيد)</Text>
            <TextInput
              style={styles.input}
              value={emailPassword}
              onChangeText={setEmailPassword}
              placeholder="أدخل كلمة المرور"
              placeholderTextColor={t.colors.textMuted}
              secureTextEntry={!showPasswords}
              editable={!savingEmail}
            />
            <TouchableOpacity
              style={[styles.saveBtn, savingEmail && styles.saveBtnDisabled]}
              onPress={handleChangeEmail}
              disabled={savingEmail}
              activeOpacity={0.8}
            >
              {savingEmail ? <ActivityIndicator color={t.colors.white} size="small" /> : <Text style={styles.saveBtnText}>تغيير البريد</Text>}
            </TouchableOpacity>
          </View>

          {/* Change Password */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>تغيير كلمة المرور</Text>
            <Text style={styles.label}>كلمة المرور الحالية</Text>
            <TextInput
              style={styles.input}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="كلمة المرور الحالية"
              placeholderTextColor={t.colors.textMuted}
              secureTextEntry={!showPasswords}
              editable={!savingPassword}
            />
            <Text style={[styles.label, { marginTop: t.spacing.lg }]}>كلمة المرور الجديدة</Text>
            <TextInput
              style={styles.input}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="6 أحرف على الأقل"
              placeholderTextColor={t.colors.textMuted}
              secureTextEntry={!showPasswords}
              editable={!savingPassword}
            />
            <Text style={[styles.label, { marginTop: t.spacing.lg }]}>تأكيد كلمة المرور</Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="أعد كتابة كلمة المرور"
              placeholderTextColor={t.colors.textMuted}
              secureTextEntry={!showPasswords}
              editable={!savingPassword}
            />
            <TouchableOpacity onPress={() => setShowPasswords((value) => !value)} style={styles.passwordToggle}><Text style={styles.passwordToggleText}>{showPasswords ? 'إخفاء كلمات المرور' : 'إظهار كلمات المرور'}</Text></TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, savingPassword && styles.saveBtnDisabled]}
              onPress={handleChangePassword}
              disabled={savingPassword}
              activeOpacity={0.8}
            >
              {savingPassword ? <ActivityIndicator color={t.colors.white} size="small" /> : <Text style={styles.saveBtnText}>تغيير كلمة المرور</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  keyboard: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: t.spacing.screenPadding, paddingTop: t.spacing.xl, paddingBottom: t.spacing.xxl + t.spacing.lg },
  iconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: t.colors.backgroundSecondary,
    justifyContent: 'center', alignItems: 'center',
    alignSelf: 'center', marginBottom: t.spacing.md,
  },
  subtitle: {
    ...t.typography.body,
    color: t.colors.textSecondary,
    textAlign: 'center',
    marginBottom: t.spacing.xl,
  },
  card: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.lg,
    padding: t.spacing.xl,
    marginBottom: t.spacing.lg,
    borderWidth: 0,
    ...t.shadow.shadow2,
  },
  cardTitle: {
    ...t.typography.titleMedium,
    fontFamily: t.fonts.extraBold,
    color: t.colors.text,
    marginBottom: t.spacing.lg,
  },
  label: {
    ...t.typography.caption,
    fontFamily: t.fonts.medium,
    color: t.colors.textMuted,
    marginBottom: t.spacing.sm,
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
    textAlign: 'right',
    minHeight: 52,
  },
  saveBtn: {
    height: t.button.primaryHeight,
    backgroundColor: t.colors.primary,
    borderRadius: t.radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: t.spacing.lg,
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { ...t.typography.body, fontFamily: t.fonts.bold, color: t.colors.white },
  passwordToggle: { alignSelf: 'flex-end', paddingVertical: t.spacing.sm },
  passwordToggleText: { ...t.typography.caption, fontFamily: t.fonts.medium, color: t.colors.primaryDark },

  // Avatar section
  avatarSection: {
    alignItems: 'center',
    marginBottom: t.spacing.xl,
  },
  avatarContainer: {
    marginBottom: t.spacing.md,
  },
  avatarWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: t.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: t.colors.surface,
    ...t.shadow.shadow2,
  },
  avatarImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: t.colors.surface,
    ...t.shadow.shadow2,
  },
  avatarText: {
    ...t.typography.titleLarge,
    fontSize: 48,
    fontFamily: t.fonts.extraBold,
    color: '#fff',
  },
  avatarActions: {
    flexDirection: 'row',
    gap: t.spacing.md,
  },
  avatarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.sm,
    backgroundColor: t.colors.primary,
    paddingHorizontal: t.spacing.lg,
    paddingVertical: t.spacing.md,
    borderRadius: t.radius.lg,
    ...t.shadow.shadow1,
  },
  avatarBtnDanger: {
    backgroundColor: t.colors.error,
  },
  avatarBtnText: {
    ...t.typography.body,
    fontFamily: t.fonts.bold,
    color: t.colors.white,
    fontSize: 14,
  },
});
