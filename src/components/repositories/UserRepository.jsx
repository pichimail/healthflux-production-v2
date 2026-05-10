/**
 * UserRepository — all user entity operations.
 * MIGRATION: Replace DatabaseAdapter calls with supabase.from('users')
 */
import DatabaseAdapter from '../adapters/DatabaseAdapter';
import AuthAdapter from '../adapters/AuthAdapter';

const UserRepository = {
  async getCurrentUser() {
    return AuthAdapter.me();
  },

  async updateCurrentUser(data) {
    return AuthAdapter.updateMe(data);
  },

  async listAll(limit = 100) {
    return DatabaseAdapter.list('User', '-created_date', limit);
  },

  async getByEmail(email) {
    const results = await DatabaseAdapter.filter('User', { email });
    return results[0] || null;
  },

  async updateRole(userId, role) {
    return DatabaseAdapter.update('User', userId, { role });
  },

  async inviteUser(email, role = 'user') {
    return AuthAdapter.inviteUser(email, role);
  },
};

export default UserRepository;