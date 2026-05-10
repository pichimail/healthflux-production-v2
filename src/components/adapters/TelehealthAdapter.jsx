/**
 * TelehealthAdapter — abstracts telehealth doctor/appointment access
 * and video call link generation.
 *
 * MIGRATION (Next.js + Supabase):
 *   All entity calls → supabase.from('telehealth_doctors') / supabase.from('telehealth_appointments')
 *
 *   generateMeetingUrl():
 *     Option A (Daily.co):  POST https://api.daily.co/v1/rooms  → returns room URL
 *     Option B (Whereby):   POST https://api.whereby.dev/v1/meetings
 *     Option C (Jitsi):     Return `https://meet.jit.si/${roomId}` (no API key needed for basic)
 *
 *   IMPORTANT: Remove the Math.random() meeting URL hack from Telehealth.jsx
 *   and route all meeting URL generation through this adapter.
 *
 * Current telehealth vendor: NONE (demo only — Math.random() URL)
 * Required env vars after migration: DAILY_API_KEY or WHEREBY_API_KEY
 */
import DatabaseAdapter from './DatabaseAdapter';

const TelehealthAdapter = {
  // ── Doctors ──────────────────────────────────────────────
  async listDoctors(limit = 50) {
    return DatabaseAdapter.list('TelehealthDoctor', '-created_date', limit);
  },

  async createDoctor(data) {
    return DatabaseAdapter.create('TelehealthDoctor', data);
  },

  async updateDoctor(id, data) {
    return DatabaseAdapter.update('TelehealthDoctor', id, data);
  },

  async deleteDoctor(id) {
    return DatabaseAdapter.delete('TelehealthDoctor', id);
  },

  // ── Appointments ─────────────────────────────────────────
  async listAppointments(userEmail, limit = 30) {
    return DatabaseAdapter.filter(
      'TelehealthAppointment',
      { user_email: userEmail },
      '-scheduled_at',
      limit
    );
  },

  async createAppointment(data) {
    // MIGRATION: replace meeting_url generation here
    const meetingUrl = await this.generateMeetingUrl();
    return DatabaseAdapter.create('TelehealthAppointment', {
      ...data,
      meeting_url: meetingUrl,
    });
  },

  async updateAppointment(id, data) {
    return DatabaseAdapter.update('TelehealthAppointment', id, data);
  },

  async cancelAppointment(id) {
    return DatabaseAdapter.update('TelehealthAppointment', id, { status: 'cancelled' });
  },

  async completeAppointment(id, notes) {
    return DatabaseAdapter.update('TelehealthAppointment', id, {
      status: 'completed',
      notes,
    });
  },

  // ── Video call URL generation ─────────────────────────────
  /**
   * MIGRATION: Replace this with a real provider API call.
   * e.g. Daily.co: POST https://api.daily.co/v1/rooms
   * Returns a meeting URL string.
   */
  async generateMeetingUrl() {
    // TODO POST-EXPORT: replace with Daily.co / Whereby / Jitsi API
    const roomId = Math.random().toString(36).slice(2, 10);
    return `https://meet.healthflux.app/${roomId}`;
  },
};

export default TelehealthAdapter;