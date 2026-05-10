/**
 * SubscriptionRepository — UserSubscription, UserCredits, UserEntitlement operations.
 * MIGRATION: Replace with supabase.from('user_subscriptions') etc.
 * Stripe webhooks → /api/webhooks/stripe (Next.js route)
 */
import DatabaseAdapter from '../adapters/DatabaseAdapter';

const SubscriptionRepository = {
  async getForUser(userEmail) {
    const results = await DatabaseAdapter.filter('UserSubscription', { user_email: userEmail }, '-created_date', 1);
    return results[0] || null;
  },

  async create(data) {
    return DatabaseAdapter.create('UserSubscription', data);
  },

  async update(id, data) {
    return DatabaseAdapter.update('UserSubscription', id, data);
  },

  async getCredits(userEmail) {
    const results = await DatabaseAdapter.filter('UserCredits', { user_email: userEmail }, '-created_date', 1);
    return results[0] || null;
  },

  async getEntitlements(userEmail) {
    const results = await DatabaseAdapter.filter('UserEntitlement', { user_email: userEmail }, '-created_date', 1);
    return results[0] || null;
  },

  async listPackages() {
    return DatabaseAdapter.list('SubscriptionPackage', '-created_date', 20);
  },
};

export default SubscriptionRepository;