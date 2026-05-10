/**
 * InsightRepository — HealthInsight entity operations.
 * MIGRATION: Replace with supabase.from('health_insights')
 */
import DatabaseAdapter from '../adapters/DatabaseAdapter';

const InsightRepository = {
  async listForProfile(profileId, limit = 20) {
    return DatabaseAdapter.filter('HealthInsight', { profile_id: profileId }, '-created_date', limit);
  },

  async getUnread(profileId) {
    const all = await this.listForProfile(profileId, 50);
    return all.filter(i => !i.is_read);
  },

  async create(data) {
    return DatabaseAdapter.create('HealthInsight', data);
  },

  async markRead(id) {
    return DatabaseAdapter.update('HealthInsight', id, { is_read: true });
  },

  async delete(id) {
    return DatabaseAdapter.delete('HealthInsight', id);
  },
};

export default InsightRepository;