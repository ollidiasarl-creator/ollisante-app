import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ApiError, setSessionExpiredHandler } from '../api/client';
import { getMe, logoutRequest } from '../api/endpoints';
import type { AuthResponse, UserResponse } from '../api/types';
import { tokenStore } from './storage';

type Status = 'loading' | 'signedOut' | 'signedIn' | 'unreachable';

interface AuthContextValue {
  status: Status;
  user: UserResponse | null;
  signIn: (response: AuthResponse) => Promise<void>;
  signOut: () => Promise<void>;
  retry: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUser] = useState<UserResponse | null>(null);

  const bootstrap = useCallback(async () => {
    setStatus('loading');
    const tokens = await tokenStore.load();
    if (!tokens) {
      setStatus('signedOut');
      return;
    }
    try {
      const me = await getMe();
      setUser(me);
      setStatus('signedIn');
    } catch (e) {
      if (e instanceof ApiError && e.status === 0) {
        // Pas de réseau : on garde la session et on propose de réessayer.
        setStatus('unreachable');
      } else {
        await tokenStore.clear();
        setUser(null);
        setStatus('signedOut');
      }
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    setSessionExpiredHandler(() => {
      setUser(null);
      setStatus('signedOut');
    });
    return () => setSessionExpiredHandler(null);
  }, []);

  const signIn = useCallback(async (response: AuthResponse) => {
    await tokenStore.save({ accessToken: response.accessToken, refreshToken: response.refreshToken });
    setUser(response.user);
    setStatus('signedIn');
  }, []);

  const signOut = useCallback(async () => {
    const tokens = await tokenStore.load();
    if (tokens) {
      try {
        await logoutRequest(tokens.refreshToken);
      } catch {
        // la déconnexion locale suffit si le serveur est injoignable
      }
    }
    await tokenStore.clear();
    setUser(null);
    setStatus('signedOut');
  }, []);

  const value = useMemo(
    () => ({ status, user, signIn, signOut, retry: () => void bootstrap() }),
    [status, user, signIn, signOut, bootstrap],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider');
  return ctx;
}
