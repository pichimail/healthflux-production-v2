/**
 * VitalRepository — VitalMeasurement entity operations.
 * MIGRATION: Replace with supabase.from('vital_measurements')
 */
import DatabaseAdapter from '../adapters/DatabaseAdapter';

const VitalRepository = {
  async listForProfile(profileId, limit = 100) {
    return DatabaseAdapter.filter('VitalMeasurement', { profile_id: profileId }, '-measured_at', limit);
  },

  async listByType(profileId, vitalType, limit = 50) {
    return DatabaseAdapter.filter('VitalMeasurement', { profile_id: profileId, vital_type: vitalType }, '-measured_at', limit);
  },

  async create(data) {
    return DatabaseAdapter.create('VitalMeasurement', data);
  },

  async update(id, data) {
    return DatabaseAdapter.update('VitalMeasurement', id, data);
  },

  async delete(id) {
    return DatabaseAdapter.delete('VitalMeasurement', id);
  },

  async getLatest(profileId, vitalType) {
    const results = await this.listByType(profileId, vitalType, 1);
    return results[0] || null;
  },
};

export default VitalRepository;