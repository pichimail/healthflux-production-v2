/**
 * MedicationRepository — Medication entity operations.
 * MIGRATION: Replace with supabase.from('medications')
 */
import DatabaseAdapter from '../adapters/DatabaseAdapter';

const MedicationRepository = {
  async listForProfile(profileId, activeOnly = false) {
    const query = { profile_id: profileId };
    if (activeOnly) query.is_active = true;
    return DatabaseAdapter.filter('Medication', query, '-created_date');
  },

  async getById(id) {
    return DatabaseAdapter.get('Medication', id);
  },

  async create(data) {
    return DatabaseAdapter.create('Medication', data);
  },

  async update(id, data) {
    return DatabaseAdapter.update('Medication', id, data);
  },

  async deactivate(id) {
    return DatabaseAdapter.update('Medication', id, { is_active: false });
  },

  async delete(id) {
    return DatabaseAdapter.delete('Medication', id);
  },
};

export default MedicationRepository;