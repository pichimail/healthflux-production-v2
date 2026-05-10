/**
 * AuthAdapter — wraps Base44 auth for portability.
 *
 * MIGRATION (Next.js + Supabase):
 *   Replace every method body with the Supabase equivalent:
 *   import { createClient } from '@supabase/supabase-js'
 *   const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
 *
 *   me()          → supabase.auth.getUser()
 *   logout()      → supabase.auth.signOut()
 *   redirectToLogin() → router.push('/login')
 *   isAuthenticated() → !!(await supabase.auth.getSession()).data.session
 *   updateMe()    → supabase.auth.updateUser({ data: {...} })
 */
import { base44 } from '@/api/base44Client';

const AuthAdapter = {
  /** Returns current user object or null */
  async me() {
    return base44.auth.me();
  },

  /** Logs out and optionally redirects */
  logout(redirectUrl) {
    return base44.auth.logout(redirectUrl);
  },

  /** Redirects to platform login page */
  redirectToLogin(nextUrl) {
    return base44.auth.redirectToLogin(nextUrl);
  },

  /** Returns true if a valid session exists */
  async isAuthenticated() {
    return base44.auth.isAuthenticated();
  },

  /** Updates current user's metadata */
  async updateMe(data) {
    return base44.auth.updateMe(data);
  },

  /** Invite a user by email with a given role */
  async inviteUser(email, role = 'user') {
    return base44.users.inviteUser(email, role);
  },
};

export default AuthAdapter;