/**
 * FeatureFlagAdapter — centralises feature gate checks.
 *
 * MIGRATION (Next.js + Supabase):
 *   isEnabled(flagKey, user) →
 *     Query supabase 'feature_flag_assignments' table:
 *     1. Check user-scope override  (scope_type='user', scope_id=user.email)
 *     2. Check plan-scope override  (scope_type='plan', scope_id=user.plan_key)
 *     3. Fall back to global        (scope_type='global')
 *
 *   Or use POST /api/features/gate  (migrated from functions/featureGate)
 */
import { base44 } from '@/api/base44Client';

const FeatureFlagAdapter = {
  /**
   * Check whether a feature is enabled for a user via backend gate function.
   * @param {string} featureKey
   * @param {object} user
   * @returns {Promise<boolean>}
   */
  async isEnabled(featureKey, user) {
    const res = await base44.functions.invoke('featureGate', {
      feature_key: featureKey,
      user_email: user?.email,
      user_role: user?.role,
    });
    return res?.data?.allowed ?? true;
  },

  /**
   * Get all flag assignments (admin only).
   */
  async listAll() {
    return base44.entities.FeatureFlagAssignment.list('-created_date', 100);
  },

  async create(data) {
    return base44.entities.FeatureFlagAssignment.create(data);
  },

  async update(id, data) {
    return base44.entities.FeatureFlagAssignment.update(id, data);
  },

  async delete(id) {
    return base44.entities.FeatureFlagAssignment.delete(id);
  },
};

export default FeatureFlagAdapter;