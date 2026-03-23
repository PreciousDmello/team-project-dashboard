import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api, { setAccessToken, getAccessToken } from '../api/client';
import { AuthUser } from '../types';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount: try to restore session via refresh token cookie
  useEffect(() => {
    const restore = async () => {
      try {
        const res = await api.post('/auth/refresh');
        setAccessToken(res.data.data.accessToken);
        setUser(res.data.data.user);
      } catch {
        // No valid session
      } finally {
        setLoading(false);
      }
    };
    restore();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    setAccessToken(res.data.data.accessToken);
    setUser(res.data.data.user);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {}
    setAccessToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
