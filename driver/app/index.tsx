import { Redirect } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

export default function Index() {
  const { token, user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!token) return <Redirect href="/(auth)/login" />;
  const role = (user as { role?: string })?.role;
  if (role === 'driver') return <Redirect href="/(driver)" />;
  if (role === 'merchant') return <Redirect href="/(merchant)" />;
  return <Redirect href="/unauthorized" />;
}
