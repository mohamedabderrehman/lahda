import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
  Pressable,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { theme } from '../../constants/theme';
import { IconPersonOutline, IconLockOutline, IconEyeOutline, IconEyeOffOutline, IconCarOutline, IconStoreOutline } from '../../components/Icons';

const PRIVACY_POLICY_URL = 'https://lahda.netlify.app/lahda-privacy-policy.html';
const TERMS_OF_SERVICE_URL = 'https://lahda.netlify.app/lahda-terms-of-service.html';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('خطأ', 'أدخل البريد الإلكتروني وكلمة المرور');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace('/');
    } catch (e: unknown) {
      Alert.alert('خطأ في تسجيل الدخول', (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Gradient Header */}
      <LinearGradient
        colors={['#2563EB', '#1D4ED8', '#1E40AF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientHeader}
      >
        <View style={styles.headerContent}>
          <View style={styles.iconRow}>
            <View style={styles.iconCircle}>
              <IconStoreOutline size={28} color="#fff" />
            </View>
            <View style={[styles.iconCircle, styles.iconCircleOverlap]}>
              <IconCarOutline size={28} color="#fff" />
            </View>
          </View>
          <Text style={styles.title}>لوحة الشركاء</Text>
          <Text style={styles.subtitle}>تسجيل الدخول لتجار وسائقين لحظة</Text>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboard}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Form Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>تسجيل الدخول</Text>
            <Text style={styles.cardSubtitle}>أدخل بيانات حسابك المعتمدة</Text>

            {/* Email Input */}
            <View style={styles.inputWrapper}>
              <View style={styles.inputIcon}>
                <IconPersonOutline size={20} color={theme.colors.textMuted} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="البريد الإلكتروني"
                placeholderTextColor={theme.colors.textMuted}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!loading}
                textAlign="right"
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputWrapper}>
              <View style={styles.inputIcon}>
                <IconLockOutline size={20} color={theme.colors.textMuted} />
              </View>
              <TextInput
                style={styles.inputPassword}
                placeholder="كلمة المرور"
                placeholderTextColor={theme.colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!loading}
                textAlign="right"
              />
              <Pressable
                style={styles.eyeBtn}
                onPress={() => setShowPassword(!showPassword)}
                android_ripple={null}
              >
                {showPassword ? (
                  <IconEyeOffOutline size={20} color={theme.colors.textMuted} />
                ) : (
                  <IconEyeOutline size={20} color={theme.colors.textMuted} />
                )}
              </Pressable>
            </View>

            {/* Login Button - Pressable avoids opacity flash on Android */}
            <Pressable
              onPress={handleLogin}
              disabled={loading}
              style={[styles.btn, loading && styles.btnDisabled]}
              android_ripple={null}
            >
              <LinearGradient
                colors={['#2563EB', '#1D4ED8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.btnGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.btnText}>تسجيل الدخول</Text>
                )}
              </LinearGradient>
            </Pressable>

            {/* Help Text */}
            <View style={styles.helpSection}>
              <Text style={styles.helpText}>هل تواجه مشكلة في تسجيل الدخول؟</Text>
              <Text style={styles.helpSubText}>تواصل مع الإدارة للحصول على المساعدة</Text>
            </View>

            <View style={styles.legalSection}>
              <Text style={styles.legalText}>
                باستخدامك هذا التطبيق فأنت توافق على{' '}
                <Text
                  style={styles.legalLink}
                  onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
                >
                  سياسة الخصوصية
                </Text>{' '}
                و{' '}
                <Text
                  style={styles.legalLink}
                  onPress={() => Linking.openURL(TERMS_OF_SERVICE_URL)}
                >
                  شروط الخدمة
                </Text>
              </Text>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>هذا التطبيق مخصص للشركاء فقط</Text>
            <Text style={styles.footerSubText}>للعملاء، استخدم تطبيق لحظة العادي</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  gradientHeader: {
    paddingTop: 60,
    paddingBottom: 40,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    alignItems: 'center',
  },
  iconRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.md,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  iconCircleOverlap: {
    marginLeft: -12,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  title: {
    fontSize: 32,
    fontFamily: 'Cairo_800ExtraBold',
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Cairo_500Medium',
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginTop: 4,
  },

  keyboard: { flex: 1 },
  scroll: {
    flexGrow: 1,
    padding: theme.spacing.screenPadding,
    paddingTop: 0,
  },

  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    ...theme.shadow.card,
    marginTop: -20,
  },
  cardTitle: {
    fontSize: 22,
    fontFamily: 'Cairo_700Bold',
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    fontFamily: 'Cairo_400Regular',
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },

  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    height: 56,
  },
  inputIcon: {
    marginRight: theme.spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Cairo_400Regular',
    color: theme.colors.text,
    paddingVertical: theme.spacing.md,
  },
  inputPassword: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Cairo_400Regular',
    color: theme.colors.text,
    paddingVertical: theme.spacing.md,
    paddingLeft: 50,
  },
  eyeBtn: {
    padding: theme.spacing.sm,
    position: 'absolute',
    left: theme.spacing.md,
  },

  btn: {
    marginTop: theme.spacing.md,
    height: 56,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    ...theme.shadow.card,
  },
  btnGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.7 },
  btnText: {
    fontSize: 17,
    fontFamily: 'Cairo_700Bold',
    fontWeight: '700',
    color: '#fff',
  },

  helpSection: {
    marginTop: theme.spacing.lg,
    alignItems: 'center',
  },
  helpText: {
    fontSize: 13,
    fontFamily: 'Cairo_500Medium',
    color: theme.colors.textSecondary,
  },
  helpSubText: {
    fontSize: 12,
    fontFamily: 'Cairo_400Regular',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  legalSection: {
    marginTop: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  legalText: {
    fontSize: 12,
    fontFamily: 'Cairo_400Regular',
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  legalLink: {
    color: theme.colors.primary,
    fontFamily: 'Cairo_600SemiBold',
  },

  footer: {
    marginTop: theme.spacing.xl,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    fontFamily: 'Cairo_600SemiBold',
    color: theme.colors.textSecondary,
  },
  footerSubText: {
    fontSize: 12,
    fontFamily: 'Cairo_400Regular',
    color: theme.colors.textMuted,
    marginTop: 2,
  },
});
