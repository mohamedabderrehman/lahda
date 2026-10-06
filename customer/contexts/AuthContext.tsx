import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as api from '../api/client';

const TOKEN_KEY = 'lahda_customer_token';
const USER_KEY = 'lahda_customer_user';

type User = Record<string, unknown> | null;

type AuthContextType = {
  user: User;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; fullName: string; phone?: string }) => Promise<void>;
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
      await persist(data.access_token, data.user as Record<string, unknown>);
    },
    [persist]
  );

  const register = useCallback(
    async (data: { email: string; password: string; fullName: string; phone?: string }) => {
      const res = await api.register(data);
      await persist(res.access_token, res.user as Record<string, unknown>);
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
    let cancelled = false;
    const AUTH_LOAD_TIMEOUT_MS = 4000;

    const timeoutId = setTimeout(() => {
      if (!cancelled) setIsLoading(false);
    }, AUTH_LOAD_TIMEOUT_MS);

    (async () => {
      try {
        const [storedToken, storedUser] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(USER_KEY),
        ]);
        if (!cancelled && storedToken && storedUser) {
          api.setAuthToken(storedToken);
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch {
        // ignore; will show login
      } finally {
        if (!cancelled) {
          clearTimeout(timeoutId);
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
