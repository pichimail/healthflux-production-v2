/**
 * NotificationRepository — Notification entity operations.
 * MIGRATION: Replace with supabase.from('notifications')
 * Realtime: supabase.channel('notifications').on('postgres_changes', ...).subscribe()
 */
import DatabaseAdapter from '../adapters/DatabaseAdapter';

const NotificationRepository = {
  async listForUser(userEmail, limit = 30) {
    return DatabaseAdapter.filter('Notification', { user_email: userEmail }, '-created_date', limit);
  },

  async getUnread(userEmail) {
    const all = await this.listForUser(userEmail, 50);
    return all.filter(n => !n.is_read);
  },

  async create(data) {
    return DatabaseAdapter.create('Notification', data);
  },

  async markRead(id) {
    return DatabaseAdapter.update('Notification', id, { is_read: true });
  },

  async delete(id) {
    return DatabaseAdapter.delete('Notification', id);
  },

  subscribe(userEmail, callback) {
    return DatabaseAdapter.subscribe('Notification', callback);
  },
};

export default NotificationRepository;