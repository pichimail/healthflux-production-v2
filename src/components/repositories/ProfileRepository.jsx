/**
 * ProfileRepository — all Profile entity operations.
 * MIGRATION: Replace with supabase.from('profiles')
 */
import DatabaseAdapter from '../adapters/DatabaseAdapter';

const ProfileRepository = {
  async listForUser(userEmail) {
    return DatabaseAdapter.filter('Profile', { created_by: userEmail }, '-created_date');
  },

  async getById(id) {
    return DatabaseAdapter.get('Profile', id);
  },

  async create(data) {
    return DatabaseAdapter.create('Profile', data);
  },

  async update(id, data) {
    return DatabaseAdapter.update('Profile', id, data);
  },

  async delete(id) {
    return DatabaseAdapter.delete('Profile', id);
  },

  async getSelf(userEmail) {
    const profiles = await DatabaseAdapter.filter('Profile', {
      created_by: userEmail,
      relationship: 'self',
    });
    return profiles[0] || null;
  },
};

export default ProfileRepository;