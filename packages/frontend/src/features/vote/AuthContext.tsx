// AuthContext.tsx
// Auth context for the /vote/* subtree. Holds the current voter's session
// token + profile, persists them in localStorage, exposes login/logout. The
// public questionnaire is unaware of this context.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { PublicUser } from '@hc/shared';

const STORAGE_KEY = 'hc:vote:auth';

interface StoredAuth {
  token: string;
  expiresAt: string;
  user: PublicUser;
}

interface AuthState {
  token: string | null;
  expiresAt: string | null;
  user: PublicUser | null;
}

interface AuthContextValue extends AuthState {
  login: (payload: StoredAuth) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const Ctx = createContext<AuthContextValue | null>(null);

const readStored = (): StoredAuth | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAuth;
    if (!parsed.token || !parsed.expiresAt || !parsed.user) return null;
    if (new Date(parsed.expiresAt).getTime() <= Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const VoteAuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AuthState>(() => {
    const stored = readStored();
    return stored
      ? { token: stored.token, expiresAt: stored.expiresAt, user: stored.user }
      : { token: null, expiresAt: null, user: null };
  });

  const login = useCallback((payload: StoredAuth) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      /* localStorage may be disabled — accept in-memory only */
    }
    setState({ token: payload.token, expiresAt: payload.expiresAt, user: payload.user });
  }, []);

  const logout = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* no-op */
    }
    setState({ token: null, expiresAt: null, user: null });
  }, []);

  // Auto-expire on TTL boundary so a stale tab does not keep stale state.
  useEffect(() => {
    if (!state.expiresAt) return;
    const ms = new Date(state.expiresAt).getTime() - Date.now();
    if (ms <= 0) {
      logout();
      return;
    }
    const timer = window.setTimeout(logout, ms);
    return () => window.clearTimeout(timer);
  }, [state.expiresAt, logout]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      login,
      logout,
      isAuthenticated: Boolean(state.token && state.user),
      isAdmin: state.user?.role === 'admin',
    }),
    [state, login, logout],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used inside <VoteAuthProvider>');
  return ctx;
};
