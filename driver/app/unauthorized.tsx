import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Stack, router } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { theme } from '../constants/theme';

export default function Unauthorized() {
  const { logout } = useAuth();
  const handleBack = async () => {
    await logout();
    router.replace('/(auth)/login');
  };
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.centered}>
        <Text style={styles.title}>غير مصرح</Text>
        <Text style={styles.subtitle}>هذا التطبيق مخصّص للسائقين فقط. استخدم حساب سائق مسجّل.</Text>
        <TouchableOpacity onPress={handleBack} style={styles.btn}>
          <Text style={styles.linkText}>تسجيل الخروج والعودة</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.screenPadding,
    backgroundColor: theme.colors.background,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  btn: { paddingVertical: theme.spacing.md, paddingHorizontal: theme.spacing.xl },
  linkText: { fontSize: 16, fontWeight: '600', color: theme.colors.primary },
});
