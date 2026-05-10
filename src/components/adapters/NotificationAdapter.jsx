/**
 * NotificationAdapter — wraps notification delivery.
 *
 * MIGRATION (Next.js + Supabase):
 *   sendEmail()  → POST /api/notifications/send  (Resend or SendGrid)
 *   createNotification() → supabase.from('notifications').insert(...)
 *   markRead()   → supabase.from('notifications').update({ is_read: true }).eq('id', id)
 *   list()       → supabase.from('notifications').select('*').eq('user_email', email).order('created_at', { ascending: false })
 */
import { base44 } from '@/api/base44Client';
import DatabaseAdapter from './DatabaseAdapter';

const NotificationAdapter = {
  async create(data) {
    return DatabaseAdapter.create('Notification', data);
  },

  async list(userEmail, limit = 30) {
    return DatabaseAdapter.filter('Notification', { user_email: userEmail }, '-created_date', limit);
  },

  async markRead(notificationId) {
    return DatabaseAdapter.update('Notification', notificationId, { is_read: true });
  },

  async markAllRead(userEmail) {
    const notifications = await this.list(userEmail, 100);
    const unread = notifications.filter(n => !n.is_read);
    await Promise.all(unread.map(n => this.markRead(n.id)));
  },

  async sendEmail({ to, subject, body, fromName }) {
    return base44.integrations.Core.SendEmail({ to, subject, body, from_name: fromName });
  },
};

export default NotificationAdapter;