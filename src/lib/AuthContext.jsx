/**
 * AuthContext — Production (Supabase Auth: Google + Phone OTP + Email + ABHA)
 *
 * Three sign-in methods exposed to UI:
 *   1. continueWithGoogle()    → Supabase OAuth
 *   2. requestPhoneOtp()/verifyPhoneOtp() → Supabase phone (SMS)
 *   3. continueWithABHA()      → /api/abha (Surepass)
 *
 * NO Base44 SDK. NO localStorage hacks.
 */
import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import db from './db';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [authError, setAuthError] = useState(null);
  const initDone = useRef(false);

  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;
    checkAuth();

    let unsubscribe = null;
    (async () => {
      try {
        const result = await db.auth.onAuthStateChange((event, session) => {
          if (event === 'SIGNED_IN' && session?.user) {
            setUser(formatUser(session.user));
            setIsAuthenticated(true);
            setAuthError(null);
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

  useEffect(() => {
    const timer = setTimeout(() => setIsLoadingAuth(false), 10000);
    return () => clearTimeout(timer);
  }, []);

  function formatUser(u) {
    if (!u) return null;
    return {
      id: u.id,
      email: u.email || u.user_metadata?.email,
      full_name: u.user_metadata?.full_name || u.user_metadata?.name || '',
      avatar_url: u.user_metadata?.avatar_url || u.user_metadata?.picture,
      phone: u.phone,
      provider: u.app_metadata?.provider,
      raw: u,
    };
  }

  async function checkAuth() {
    try {
      const { data, error } = await db.auth.getUser();
      if (error || !data?.user) {
        setUser(null);
        setIsAuthenticated(false);
      } else {
        setUser(formatUser(data.user));
        setIsAuthenticated(true);
      }
    } catch (e) {
      setUser(null);
      setIsAuthenticated(false);
      setAuthError({ type: 'unknown', message: e.message });
    } finally {
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  }

  // ─── Sign-in methods ──────────────────────────────────
  async function continueWithGoogle(returnTo) {
    const { error } = await db.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: returnTo || `${window.location.origin}/onboarding`,
        scopes: 'email profile',
      },
    });
    if (error) throw error;
  }

  async function requestPhoneOtp(phone) {
    const { error } = await db.auth.signInWithOtp({
      phone,
      options: { channel: 'sms' },
    });
    if (error) throw error;
    return true;
  }

  async function verifyPhoneOtp(phone, otp) {
    const { data, error } = await db.auth.verifyOtp({
      phone, token: otp, type: 'sms',
    });
    if (error) throw error;
    if (data?.user) {
      setUser(formatUser(data.user));
      setIsAuthenticated(true);
    }
    return data;
  }

  async function continueWithEmail(email) {
    const { error } = await db.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/onboarding` },
    });
    if (error) throw error;
    return true;
  }

  async function continueWithABHA() {
    // Redirect to ABHA flow page (handled by /pages/ABHAConnect.jsx)
    window.location.href = '/abha-connect';
  }

  async function signOut() {
    await db.auth.signOut();
    setUser(null);
    setIsAuthenticated(false);
    localStorage.clear();
    window.location.href = '/';
  }

  const value = {
    user, isAuthenticated, isLoadingAuth, authChecked, authError,
    checkAuth, checkUserAuth: checkAuth, // alias
    continueWithGoogle,
    requestPhoneOtp, verifyPhoneOtp,
    continueWithEmail, continueWithABHA,
    signOut, logout: signOut, // alias
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
