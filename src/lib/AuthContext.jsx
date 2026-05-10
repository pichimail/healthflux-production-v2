/**
 * AuthContext — Google OAuth via Supabase Auth (or custom JWT for Neon)
 * Replaces Base44 auth completely
 * 
 * ENV:
 *   VITE_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
 *   VITE_DB_PROVIDER=supabase|neon
 *   
 * For Supabase: Configure Google OAuth in Supabase Dashboard → Auth → Providers
 * For Neon: Uses /api/auth/* endpoints (implement with NextAuth or custom)
 */
import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import db from './db';

const AuthContext = createContext(null);
const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAIL || import.meta.env.ADMIN_EMAIL || '')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const initDone = useRef(false);

  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;
    checkAuth();

    // Listen for auth state changes (Supabase realtime)
    let unsubscribe = null;
    (async () => {
      try {
        const result = await db.auth.onAuthStateChange((event, session) => {
          if (event === 'SIGNED_IN' && session?.user) {
            setUser(formatUser(session.user));
            setIsAuthenticated(true);
          } else if (event === 'SIGNED_OUT') {
            setUser(null);
            setIsAuthenticated(false);
          }
        });
        unsubscribe = result?.data?.subscription?.unsubscribe;
      } catch {}
    })();

    return () => unsubscribe?.();
  }, []);

  // Safety timer — never stay loading forever
  useEffect(() => {
    const timer = setTimeout(() => setIsLoadingAuth(false), 10000);
    return () => clearTimeout(timer);
  }, []);

  function formatUser(u) {
    if (!u) return null;
    const email = u.email || u.user_metadata?.email || '';
    const isEnvAdmin = ADMIN_EMAILS.includes(String(email).toLowerCase());
    return {
      id: u.id,
      email,
      full_name: u.user_metadata?.full_name || u.user_metadata?.name || '',
      avatar_url: u.user_metadata?.avatar_url || u.user_metadata?.picture || '',
      role: isEnvAdmin ? 'admin' : (u.user_metadata?.role || 'user'),
    };
  }

  async function checkAuth() {
    try {
      setIsLoadingAuth(true);
      setAuthError(null);

      const { data } = await db.auth.getSession();
      const session = data?.session;

      if (session?.user) {
        setUser(formatUser(session.user));
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    } catch (err) {
      console.error('Auth check failed:', err);
      setAuthError({ type: 'unknown', message: err.message });
    } finally {
      setIsLoadingAuth(false);
    }
  }

  async function signInWithGoogle() {
    try {
      await db.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/dashboard',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
    } catch (err) {
      setAuthError({ type: 'auth_failed', message: err.message });
    }
  }

  async function logout(shouldRedirect = true) {
    try {
      await db.auth.signOut();
    } catch {}
    setUser(null);
    setIsAuthenticated(false);
    if (shouldRedirect) {
      window.location.href = '/';
    }
  }

  function navigateToLogin() {
    signInWithGoogle();
  }

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings: null,
      logout,
      navigateToLogin,
      signInWithGoogle,
      checkAppState: checkAuth,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
