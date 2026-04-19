// src/store/AuthContext.jsx
import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { syncManager } from '../sync/syncManager';
import {
  saveTokens,
  clearAuth,
  getAccessToken,
  DEMO_ACCESS_TOKEN,
  saveDemoSession,
  getDemoUser,
} from '../sync/offlineStore';
import { findDemoCredential, buildDemoSessionUser } from '../constants/demoUsers';

const AuthCtx = createContext(null);

function allowDemoLoginFallback() {
  return import.meta.env.VITE_DEMO_LOGIN === 'true';
}

export function AuthProvider({ children }) {
  const [user, setUser]         = useState(null);
  const [loading, setLoading]   = useState(true);

  const isDemoSession = useMemo(
    () => !!user?.id && String(user.id).startsWith('demo-'),
    [user],
  );

  // Restore session on mount (JWT, demo session, or anonymous user when API has auth disabled)
  useEffect(() => {
    (async () => {
      const token = await getAccessToken();
      if (token) {
        if (token === DEMO_ACCESS_TOKEN) {
          const demo = await getDemoUser();
          if (demo) setUser(demo);
          else await clearAuth();
        } else {
          try {
            const { data } = await syncManager.api.get('/users/me');
            setUser(data);
          } catch {
            await clearAuth();
          }
        }
      } else {
        try {
          const { data } = await syncManager.api.get('/users/me');
          if (data?.id) setUser(data);
        } catch {
          /* no token and server requires login — stay logged out */
        }
      }
      setLoading(false);
    })();
  }, []);

  const login = useCallback(async (email, password, deviceId) => {
    try {
      const { data } = await syncManager.api.post('/auth/login', { email, password, device_id: deviceId });
      await saveTokens(data.access_token, data.refresh_token);
      setUser(data.user);
      syncManager.startAutoSync();
      return { ...data, demo: false };
    } catch (err) {
      const demoRow = findDemoCredential(email, password);
      if (allowDemoLoginFallback() && demoRow) {
        const sessionUser = buildDemoSessionUser(demoRow);
        await saveDemoSession(sessionUser);
        setUser(sessionUser);
        return { user: sessionUser, access_token: DEMO_ACCESS_TOKEN, demo: true };
      }
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await syncManager.api.post('/auth/logout');
    } catch { /* best effort */ }
    await clearAuth();
    syncManager.stopAutoSync();
    setUser(null);
  }, []);

  // Listen for forced logout (token refresh failed)
  useEffect(() => {
    const h = () => logout();
    window.addEventListener('vahd:logout', h);
    return () => window.removeEventListener('vahd:logout', h);
  }, [logout]);

  return (
    <AuthCtx.Provider value={{ user, loading, login, logout, isAuthenticated: !!user, isDemoSession }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};