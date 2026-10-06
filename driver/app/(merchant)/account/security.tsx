import { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { changeEmail, changePassword, updateAuthProfile } from '../../../api/client';
import { useAuth } from '../../../contexts/AuthContext';
import { theme } from '../../../constants/theme';
import { Card, CardSection } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { SectionHeader } from '../../../components/ui/SectionHeader';

export default function MerchantSecurityScreen() {
  const { user, refreshProfile } = useAuth();
  const [saving, setSaving] = useState(false);

  // Profile
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  // Email change
  const [newEmail, setNewEmail] = useState('');
  const [currentPasswordForEmail, setCurrentPasswordForEmail] = useState('');

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    const u = user as { fullName?: string; phone?: string; email?: string } | null;
    if (!u) return;
    if (!fullName && u.fullName) setFullName(u.fullName);
    if (!phone && u.phone) setPhone(u.phone);
  }, [user]);

  const saveProfile = useCallback(async () => {
    setSaving(true);
    try {
      await updateAuthProfile({ fullName: fullName.trim() || undefined, phone: phone.trim() || null });
      await refreshProfile();
      Alert.alert('تم', 'تم تحديث معلومات الحساب');
    } catch (e: unknown) {
      Alert.alert('خطأ', (e as Error).message || 'فشل التحديث');
    } finally {
      setSaving(false);
    }
  }, [fullName, phone, refreshProfile]);

  const doChangeEmail = useCallback(async () => {
    if (!newEmail.trim()) return Alert.alert('خطأ', 'أدخل الإيميل الجديد');
    if (!currentPasswordForEmail) return Alert.alert('خطأ', 'أدخل كلمة المرور الحالية');
    setSaving(true);
    try {
      await changeEmail(newEmail.trim(), currentPasswordForEmail);
      await refreshProfile();
      Alert.alert('تم', 'تم تغيير الإيميل');
      setNewEmail('');
      setCurrentPasswordForEmail('');
    } catch (e: unknown) {
      Alert.alert('خطأ', (e as Error).message || 'فشل تغيير الإيميل');
    } finally {
      setSaving(false);
    }
  }, [newEmail, currentPasswordForEmail]);

  const doChangePassword = useCallback(async () => {
    if (!currentPassword) return Alert.alert('خطأ', 'أدخل كلمة المرور الحالية');
    if (!newPassword || newPassword.length < 6) return Alert.alert('خطأ', 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل');
    if (newPassword !== confirmPassword) return Alert.alert('خطأ', 'كلمة المرور غير متطابقة');
    setSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      Alert.alert('تم', 'تم تغيير كلمة المرور');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e: unknown) {
      Alert.alert('خطأ', (e as Error).message || 'فشل تغيير كلمة المرور');
    } finally {
      setSaving(false);
    }
  }, [currentPassword, newPassword, confirmPassword]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>الحساب والأمان</Text>
        <Text style={styles.back} onPress={() => router.back()}>رجوع</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card>
          <CardSection>
            <SectionHeader title="معلومات الحساب" subtitle="الاسم ورقم الهاتف" />
            <Text style={styles.label}>الاسم</Text>
            <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder="اسمك" placeholderTextColor={theme.colors.textMuted} />
            <Text style={styles.label}>رقم الهاتف</Text>
            <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="اختياري" placeholderTextColor={theme.colors.textMuted} keyboardType="phone-pad" />
            <View style={{ marginTop: theme.spacing.lg }}>
              <Button title="حفظ معلومات الحساب" onPress={saveProfile} loading={saving} variant="primary" />
            </View>
          </CardSection>
        </Card>

        <Card style={{ marginTop: theme.spacing.lg }}>
          <CardSection>
            <SectionHeader title="تغيير الإيميل" subtitle="يتطلب كلمة المرور الحالية" />
            <Text style={styles.label}>الإيميل الجديد</Text>
            <TextInput style={styles.input} value={newEmail} onChangeText={setNewEmail} placeholder="new@example.com" placeholderTextColor={theme.colors.textMuted} autoCapitalize="none" keyboardType="email-address" />
            <Text style={styles.label}>كلمة المرور الحالية</Text>
            <TextInput style={styles.input} value={currentPasswordForEmail} onChangeText={setCurrentPasswordForEmail} placeholder="••••••••" placeholderTextColor={theme.colors.textMuted} secureTextEntry />
            <View style={{ marginTop: theme.spacing.lg }}>
              <Button title="تغيير الإيميل" onPress={doChangeEmail} loading={saving} variant="secondary" />
            </View>
          </CardSection>
        </Card>

        <Card style={{ marginTop: theme.spacing.lg }}>
          <CardSection>
            <SectionHeader title="تغيير كلمة المرور" subtitle="حافظ على أمان حسابك" />
            <Text style={styles.label}>كلمة المرور الحالية</Text>
            <TextInput style={styles.input} value={currentPassword} onChangeText={setCurrentPassword} placeholder="••••••••" placeholderTextColor={theme.colors.textMuted} secureTextEntry />
            <Text style={styles.label}>كلمة المرور الجديدة</Text>
            <TextInput style={styles.input} value={newPassword} onChangeText={setNewPassword} placeholder="6 أحرف على الأقل" placeholderTextColor={theme.colors.textMuted} secureTextEntry />
            <Text style={styles.label}>تأكيد كلمة المرور</Text>
            <TextInput style={styles.input} value={confirmPassword} onChangeText={setConfirmPassword} placeholder="إعادة كتابة" placeholderTextColor={theme.colors.textMuted} secureTextEntry />
            <View style={{ marginTop: theme.spacing.lg }}>
              <Button title="تغيير كلمة المرور" onPress={doChangePassword} loading={saving} variant="primary" />
            </View>
          </CardSection>
        </Card>
      </ScrollView>
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
});

