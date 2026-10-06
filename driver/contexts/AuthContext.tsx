import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as api from '../api/client';

const TOKEN_KEY = 'lahda_partners_token';
const USER_KEY = 'lahda_partners_user';

type User = Record<string, unknown> | null;

type AuthContextType = {
  user: User;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const persist = useCallback(async (t: string | null, u: User) => {
    api.setAuthToken(t);
    setToken(t);
    setUser(u);
    if (t && u) {
      await AsyncStorage.setItem(TOKEN_KEY, t);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(u));
    } else {
      await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
    }
  }, []);

  const logout = useCallback(async () => {
    await persist(null, null);
  }, [persist]);

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await api.login(email, password);
      const u = data.user as Record<string, unknown>;
      const role = u?.role as string;
      if (role !== 'driver' && role !== 'merchant') {
        if (role === 'customer') throw new Error('هذا حساب عميل. استخدم تطبيق العملاء.');
        if (role === 'admin') throw new Error('هذا حساب إداري. استخدم لوحة الإدارة.');
        throw new Error('نوع الحساب غير مدعوم في هذا التطبيق.');
      }
      await persist(data.access_token, u);
    },
    [persist]
  );

  const refreshProfile = useCallback(async () => {
    if (!token) return;
    const profile = await api.getProfile();
    setUser(profile);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(profile));
  }, [token]);

  useEffect(() => {
    (async () => {
      try {
        const [t, u] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(USER_KEY),
        ]);
        if (t && u) {
          const parsed = JSON.parse(u);
          if (parsed?.role !== 'driver' && parsed?.role !== 'merchant') {
            await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
            api.setAuthToken(null);
          } else {
            api.setAuthToken(t);
            setToken(t);
            setUser(parsed);
          }
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
