/**
 * MedicationLogRepository — MedicationLog entity operations.
 * MIGRATION: Replace with supabase.from('medication_logs')
 *
 * Key usage: adherence calculation, 7-day window checks
 */
import DatabaseAdapter from '../adapters/DatabaseAdapter';

const MedicationLogRepository = {
  async listForProfile(profileId, limit = 100) {
    return DatabaseAdapter.filter('MedicationLog', { profile_id: profileId }, '-scheduled_time', limit);
  },

  async listForMedication(medicationId, limit = 50) {
    return DatabaseAdapter.filter('MedicationLog', { medication_id: medicationId }, '-scheduled_time', limit);
  },

  async listForProfileSince(profileId, sinceIso, limit = 200) {
    // Base44 filter doesn't support date range natively — filter client-side after fetch
    const all = await DatabaseAdapter.filter('MedicationLog', { profile_id: profileId }, '-scheduled_time', limit);
    return all.filter(l => l.scheduled_time >= sinceIso);
  },

  async create(data) {
    return DatabaseAdapter.create('MedicationLog', data);
  },

  async update(id, data) {
    return DatabaseAdapter.update('MedicationLog', id, data);
  },

  async delete(id) {
    return DatabaseAdapter.delete('MedicationLog', id);
  },

  /**
   * Calculate adherence rate for a medication over a time window.
   * @returns {{ rate: number, taken: number, total: number }}
   */
  calcAdherence(logs) {
    if (!logs.length) return { rate: 0, taken: 0, total: 0 };
    const taken = logs.filter(l => l.status === 'taken').length;
    return { rate: Math.round((taken / logs.length) * 100), taken, total: logs.length };
  },
};

export default MedicationLogRepository;