/**
 * HealthFlux Auth Service — Production (Supabase Auth)
 * Replaces Base44 auth entirely
 */
import { base44 } from '@/api/base44Client'; // Uses dbClient shim → Supabase Auth

export async function getCurrentUser() {
  try {
    return await base44.auth.me();
  } catch {
    return null;
  }
}

export async function isAuthenticated() {
  return base44.auth.isAuthenticated();
}

export function redirectToLogin(returnUrl) {
  base44.auth.redirectToLogin(returnUrl || window.location.href);
}

export async function logout(redirectUrl) {
  return base44.auth.logout(redirectUrl);
}

export async function signInWithGoogle() {
  return base44.auth.redirectToLogin(window.location.href);
}

export async function updateProfile(updates) {
  // Update the profiles table
  const user = await getCurrentUser();
  if (!user) throw new Error('Not authenticated');
  // Update via entities proxy
  const existing = await base44.entities.Profile.filter({ created_by: user.email });
  if (existing?.[0]) {
    return base44.entities.Profile.update(existing[0].id, updates);
  }
  return base44.entities.Profile.create({ ...updates, created_by: user.email });
}
