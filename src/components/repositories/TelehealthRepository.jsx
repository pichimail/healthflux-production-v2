/**
 * TelehealthRepository — wraps TelehealthAdapter for component use.
 * MIGRATION: Direct supabase queries in the adapter are sufficient;
 * this repository provides a consistent interface layer.
 */
import TelehealthAdapter from '../adapters/TelehealthAdapter';

const TelehealthRepository = {
  async listDoctors(limit = 50) {
    return TelehealthAdapter.listDoctors(limit);
  },

  async createDoctor(data) {
    return TelehealthAdapter.createDoctor(data);
  },

  async updateDoctor(id, data) {
    return TelehealthAdapter.updateDoctor(id, data);
  },

  async deleteDoctor(id) {
    return TelehealthAdapter.deleteDoctor(id);
  },

  async listAppointmentsForUser(userEmail, limit = 30) {
    return TelehealthAdapter.listAppointments(userEmail, limit);
  },

  async bookAppointment(data) {
    return TelehealthAdapter.createAppointment(data);
  },

  async cancelAppointment(id) {
    return TelehealthAdapter.cancelAppointment(id);
  },

  async completeAppointment(id, notes) {
    return TelehealthAdapter.completeAppointment(id, notes);
  },
};

export default TelehealthRepository;