'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { authApi } from '@/lib/api-client';
import type { AuthUser } from '@/lib/types';

const REFRESH_KEY = 'mlg.refreshToken';

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  initializing: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Mantém o access token apenas em memória (state). O refresh token fica no
 * localStorage para permitir reidratar a sessão ao recarregar a página.
 */
export function AuthProvider({ children }: { readonly children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);

  const applyTokens = useCallback((refreshToken: string, access: string) => {
    setAccessToken(access);
    window.localStorage.setItem(REFRESH_KEY, refreshToken);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await authApi.login(email, password);
      setUser(result.user);
      applyTokens(result.tokens.refreshToken, result.tokens.accessToken);
    },
    [applyTokens],
  );

  const register = useCallback(
    async (email: string, password: string) => {
      const result = await authApi.register(email, password);
      setUser(result.user);
      applyTokens(result.tokens.refreshToken, result.tokens.accessToken);
    },
    [applyTokens],
  );

  const logout = useCallback(async () => {
    const refreshToken = window.localStorage.getItem(REFRESH_KEY);
    if (refreshToken) {
      await authApi.logout(refreshToken).catch(() => undefined);
    }
    window.localStorage.removeItem(REFRESH_KEY);
    setAccessToken(null);
    setUser(null);
  }, []);

  // Reidrata a sessão a partir do refresh token ao montar.
  useEffect(() => {
    const stored = window.localStorage.getItem(REFRESH_KEY);
    if (!stored) {
      setInitializing(false);
      return;
    }
    authApi
      .refresh(stored)
      .then((tokens) => {
        applyTokens(tokens.refreshToken, tokens.accessToken);
        // Descobre o usuário a partir do /auth/me implicitamente não é
        // necessário aqui; o email não é crítico para a UI principal.
        setUser((prev) => prev ?? { id: 'me', email: '' });
      })
      .catch(() => {
        window.localStorage.removeItem(REFRESH_KEY);
      })
      .finally(() => setInitializing(false));
  }, [applyTokens]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, accessToken, initializing, login, register, logout }),
    [user, accessToken, initializing, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider.');
  }
  return ctx;
}
