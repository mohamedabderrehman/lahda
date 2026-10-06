import { useMemo, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Eye, EyeOff } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { FormField, PrimaryAction } from '../../components/food-ui';

const MIN_PASSWORD_LEN = 5;
const PRIVACY_POLICY_URL = 'https://lahda.netlify.app/lahda-privacy-policy.html';
const TERMS_OF_SERVICE_URL = 'https://lahda.netlify.app/lahda-terms-of-service.html';

function normalizePhone(value: string) {
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('213')) digits = digits.slice(3);
  if (digits.startsWith('0')) digits = digits.slice(1);
  return digits.slice(0, 10);
}

export default function AuthScreen() {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password) return Alert.alert('تحقّق من البيانات', 'أدخل بريدك الإلكتروني وكلمة المرور.');
    if (mode === 'signup') {
      if (!fullName.trim() || !confirmPassword) return Alert.alert('تحقّق من البيانات', 'أكمل الحقول المطلوبة.');
      if (password.length < MIN_PASSWORD_LEN) return Alert.alert('كلمة مرور قصيرة', `استخدم ${MIN_PASSWORD_LEN} أحرف على الأقل.`);
      if (password !== confirmPassword) return Alert.alert('كلمتا المرور غير متطابقتين', 'أعد كتابة كلمة المرور نفسها.');
    }
    setLoading(true);
    try {
      if (mode === 'login') await login(email.trim(), password);
      else await register({ fullName: fullName.trim(), email: email.trim(), password, phone: phone ? `+213${normalizePhone(phone)}` : undefined });
      router.replace('/(tabs)');
    } catch (error) {
      Alert.alert(mode === 'login' ? 'تعذّر تسجيل الدخول' : 'تعذّر إنشاء الحساب', (error as Error).message);
    } finally { setLoading(false); }
  };

  const passwordTrailing = <Pressable onPress={() => setShowPassword((current) => !current)} hitSlop={8}><>{showPassword ? <EyeOff size={20} color={t.colors.textMuted} /> : <Eye size={20} color={t.colors.textMuted} />}</></Pressable>;
  return <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={styles.brandBlock}>
        <View style={styles.mark}><Image source={require('../../assets/app-logo-transparent-background.png')} resizeMode="contain" style={styles.logo} /></View>
        <Text style={styles.kicker}>طعامك المفضل، أقرب إليك</Text>
        <Text style={styles.headline}>{mode === 'login' ? 'أهلاً بعودتك' : 'ابدأ طلبك الأول'}</Text>
        <Text style={styles.subhead}>{mode === 'login' ? 'سجّل دخولك لتكمل من حيث توقفت.' : 'اكتشف المطاعم المحلية واطلب بكل سهولة.'}</Text>
      </View>
      <View style={styles.formArea}>
        <View style={styles.switcher}>
          <Pressable onPress={() => setMode('signup')} style={[styles.switchOption, mode === 'signup' && styles.switchSelected]}><Text style={[styles.switchText, mode === 'signup' && styles.switchTextSelected]}>حساب جديد</Text></Pressable>
          <Pressable onPress={() => setMode('login')} style={[styles.switchOption, mode === 'login' && styles.switchSelected]}><Text style={[styles.switchText, mode === 'login' && styles.switchTextSelected]}>تسجيل الدخول</Text></Pressable>
        </View>
        <View style={styles.fields}>
          {mode === 'signup' ? <FormField label="الاسم الكامل" value={fullName} onChangeText={setFullName} placeholder="كيف نُناديك؟" autoComplete="name" /> : null}
          <FormField label="البريد الإلكتروني" value={email} onChangeText={setEmail} placeholder="name@example.com" keyboardType="email-address" autoComplete="email" />
          {mode === 'signup' ? <FormField label="رقم الهاتف (اختياري)" value={phone} onChangeText={setPhone} placeholder="05 xx xx xx xx" keyboardType="phone-pad" autoComplete="tel" /> : null}
          <FormField label="كلمة المرور" value={password} onChangeText={setPassword} placeholder="أدخل كلمة المرور" secureTextEntry={!showPassword} autoComplete="password" trailing={passwordTrailing} />
          {mode === 'signup' ? <FormField label="تأكيد كلمة المرور" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="أعد كتابة كلمة المرور" secureTextEntry={!showPassword} autoComplete="password" /> : null}
        </View>
        {mode === 'login' ? <Pressable onPress={() => Alert.alert('نسيت كلمة المرور', 'تواصل مع الدعم لاستعادة حسابك.')} style={styles.forgot}><Text style={styles.forgotText}>نسيت كلمة المرور؟</Text></Pressable> : null}
        <PrimaryAction label={mode === 'login' ? 'دخول' : 'إنشاء الحساب'} onPress={submit} loading={loading} />
        <Text style={styles.terms}>بالمتابعة، أنت توافق على <Text style={styles.termsLink} onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}>سياسة الخصوصية</Text> و<Text style={styles.termsLink} onPress={() => Linking.openURL(TERMS_OF_SERVICE_URL)}>شروط الخدمة</Text>.</Text>
      </View>
    </ScrollView>
  </KeyboardAvoidingView>;
}

const makeStyles = (t: ReturnType<typeof useTheme>) => StyleSheet.create({
  page: { flex: 1, backgroundColor: t.colors.background }, content: { flexGrow: 1, paddingHorizontal: 22, paddingTop: 34, paddingBottom: 32 },
  brandBlock: { paddingTop: 22, paddingBottom: 30, alignItems: 'flex-end' }, mark: { alignSelf: 'flex-end', width: 42, height: 42, borderRadius: 12, backgroundColor: t.colors.surfaceElevated, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: t.colors.borderLight }, logo: { width: 27, height: 27, tintColor: t.colors.primaryDark }, kicker: { marginTop: 30, color: t.colors.primaryDark, fontFamily: t.fonts.semiBold, fontSize: 14 }, headline: { marginTop: 7, color: t.colors.text, fontFamily: t.fonts.bold, fontSize: 30, lineHeight: 40, textAlign: 'right' }, subhead: { marginTop: 7, color: t.colors.textSecondary, fontFamily: t.fonts.regular, fontSize: 15, lineHeight: 25, textAlign: 'right', maxWidth: 290 },
  formArea: { gap: 18 }, switcher: { flexDirection: 'row-reverse', padding: 4, borderRadius: 14, backgroundColor: t.colors.backgroundSecondary }, switchOption: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 10 }, switchSelected: { backgroundColor: t.colors.surfaceElevated, boxShadow: '0 1px 4px rgba(23,21,19,0.07)' }, switchText: { color: t.colors.textSecondary, fontFamily: t.fonts.medium, fontSize: 14 }, switchTextSelected: { color: t.colors.text, fontFamily: t.fonts.bold },
  fields: { gap: 14 }, forgot: { alignSelf: 'flex-end', marginTop: -5 }, forgotText: { color: t.colors.primaryDark, fontFamily: t.fonts.medium, fontSize: 14 }, terms: { color: t.colors.textMuted, fontFamily: t.fonts.regular, fontSize: 12, lineHeight: 20, textAlign: 'center', paddingHorizontal: 18 }, termsLink: { color: t.colors.primaryDark, fontFamily: t.fonts.medium },
});
