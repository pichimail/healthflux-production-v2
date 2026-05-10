/**
 * AdminRepository — admin-only data operations.
 * MIGRATION: Replace with supabase service-role client calls.
 * All methods here require role='admin' enforced at the API layer.
 */
import DatabaseAdapter from '../adapters/DatabaseAdapter';

const AdminRepository = {
  // Users
  async listAllUsers(limit = 200) {
    return DatabaseAdapter.list('User', '-created_date', limit);
  },

  async updateUserRole(userId, role) {
    return DatabaseAdapter.update('User', userId, { role });
  },

  // Subscriptions
  async listAllSubscriptions(limit = 200) {
    return DatabaseAdapter.list('UserSubscription', '-created_date', limit);
  },

  async createSubscription(data) {
    return DatabaseAdapter.create('UserSubscription', data);
  },

  async updateSubscription(id, data) {
    return DatabaseAdapter.update('UserSubscription', id, data);
  },

  // Credits
  async getCredits(userEmail) {
    const results = await DatabaseAdapter.filter('UserCredits', { user_email: userEmail });
    return results[0] || null;
  },

  async updateCredits(id, data) {
    return DatabaseAdapter.update('UserCredits', id, data);
  },

  async createCredits(data) {
    return DatabaseAdapter.create('UserCredits', data);
  },

  // Entitlements
  async getEntitlements(userEmail) {
    const results = await DatabaseAdapter.filter('UserEntitlement', { user_email: userEmail });
    return results[0] || null;
  },

  async upsertEntitlement(data) {
    const existing = await this.getEntitlements(data.user_email);
    if (existing) return DatabaseAdapter.update('UserEntitlement', existing.id, data);
    return DatabaseAdapter.create('UserEntitlement', data);
  },

  // Audit logs
  async createAuditLog(data) {
    return DatabaseAdapter.create('AuditLog', data);
  },

  async listAuditLogs(limit = 100) {
    return DatabaseAdapter.list('AuditLog', '-created_date', limit);
  },

  // Feature flags
  async listFeatureFlags() {
    return DatabaseAdapter.list('FeatureFlagAssignment', '-created_date', 100);
  },

  async upsertFeatureFlag(data) {
    return DatabaseAdapter.create('FeatureFlagAssignment', data);
  },

  async deleteFeatureFlag(id) {
    return DatabaseAdapter.delete('FeatureFlagAssignment', id);
  },

  // Notifications (broadcast)
  async createNotification(data) {
    return DatabaseAdapter.create('Notification', data);
  },

  async listAllProfiles(limit = 200) {
    return DatabaseAdapter.list('Profile', '-created_date', limit);
  },

  async listAllDocuments(limit = 200) {
    return DatabaseAdapter.list('MedicalDocument', '-created_date', limit);
  },
};

export default AdminRepository;