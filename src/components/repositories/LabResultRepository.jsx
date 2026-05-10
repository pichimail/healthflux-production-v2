/**
 * LabResultRepository — LabResult entity operations.
 * MIGRATION: Replace with supabase.from('lab_results')
 */
import DatabaseAdapter from '../adapters/DatabaseAdapter';

const LabResultRepository = {
  async listForProfile(profileId, limit = 100) {
    return DatabaseAdapter.filter('LabResult', { profile_id: profileId }, '-test_date', limit);
  },

  async listByCategory(profileId, category, limit = 50) {
    return DatabaseAdapter.filter('LabResult', { profile_id: profileId, test_category: category }, '-test_date', limit);
  },

  async getAbnormal(profileId) {
    const all = await this.listForProfile(profileId, 200);
    return all.filter(l => l.flag && l.flag !== 'normal');
  },

  async create(data) {
    return DatabaseAdapter.create('LabResult', data);
  },

  async update(id, data) {
    return DatabaseAdapter.update('LabResult', id, data);
  },

  async delete(id) {
    return DatabaseAdapter.delete('LabResult', id);
  },
};

export default LabResultRepository;