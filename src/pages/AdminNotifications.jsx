// @ts-nocheck
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '../components/admin/AdminLayout.jsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { AdaptiveOverlay } from '@/components/ui/adaptive-overlay';
import { Bell, Plus, Trash2, Loader2, Send } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function AdminNotifications() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    type: 'system', title: '', message: '', priority: 'medium',
    recipient_group: 'all', recipient_email: '', send_email: false
  });
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['admin-notifs'],
    queryFn: () => base44.entities.Notification.list('-created_date', 50),
  });

  const createMutation = useMutation({
    mutationFn: (d) => base44.entities.Notification.create(d),
    onSuccess: async (notif) => {
      if (form.send_email && form.recipient_email) {
        await base44.integrations.Core.SendEmail({
          to: form.recipient_email,
          subject: form.title,
          body: form.message,
        });
      }
      toast.success('Notification sent');
      setDialogOpen(false);
      queryClient.invalidateQueries(['admin-notifs']);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.delete(id),
    onSuccess: () => { toast.success('Deleted'); queryClient.invalidateQueries(['admin-notifs']); },
  });

  const priorityColors = {
    low: { bg: 'rgba(168,230,207,0.15)', color: 'var(--hf-mint-strong)' },
    medium: { bg: 'rgba(155,180,255,0.15)', color: 'var(--hf-sky-strong)' },
    high: { bg: 'rgba(247,201,163,0.15)', color: 'var(--hf-peach-strong)' },
    urgent: { bg: 'rgba(242,140,140,0.15)', color: 'var(--hf-coral-strong)' },
  };

  return (
    <AdminLayout currentPageName="AdminNotifications">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black" style={{ color: 'var(--hf-text)' }}>Notifications</h1>
            <p className="text-sm" style={{ color: 'var(--hf-text-muted)' }}>Send & manage notifications</p>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="rounded-2xl font-bold" style={{ background: '#d7f576', color: '#0a1200' }}>
            <Plus size={16} className="mr-2" /> New
          </Button>
        </div>

        <div className="rounded-[22px] overflow-hidden" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--hf-lemon-strong)' }} /></div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--hf-text-muted)' }} />
              <p style={{ color: 'var(--hf-text-muted)' }}>No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--hf-border)' }}>
              {notifications.map(n => {
                const pc = priorityColors[n.priority] || priorityColors.medium;
                return (
                  <div key={n.id} className="p-4 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: pc.bg }}>
                        <Bell size={14} style={{ color: pc.color }} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold" style={{ color: 'var(--hf-text)' }}>{n.title}</p>
                        <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--hf-text-muted)' }}>{n.message}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: pc.bg, color: pc.color }}>{n.priority}</span>
                          <span className="text-[10px]" style={{ color: 'var(--hf-text-muted)' }}>{n.type}</span>
                          <span className="text-[10px]" style={{ color: 'var(--hf-text-muted)' }}>{format(new Date(n.created_date), 'MMM d, HH:mm')}</span>
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(n.id)} className="rounded-xl h-8 w-8 text-red-400 hover:bg-red-500/10 flex-shrink-0">
                      <Trash2 size={14} />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <AdaptiveOverlay open={dialogOpen} onOpenChange={setDialogOpen} title="Send Notification" size="md" showClose>
          <form onSubmit={e => { e.preventDefault(); createMutation.mutate(form); }} className="space-y-3">
            <div><Label style={{ color: 'var(--hf-text)' }}>Title *</Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required className="rounded-xl"
                style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }} /></div>
            <div><Label style={{ color: 'var(--hf-text)' }}>Message *</Label>
              <Textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} required className="rounded-xl min-h-[80px]"
                style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label style={{ color: 'var(--hf-text)' }}>Type</Label>
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                  <SelectTrigger className="rounded-xl" style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['system', 'subscription', 'feature', 'health', 'admin'].map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                  </SelectContent>
                </Select></div>
              <div><Label style={{ color: 'var(--hf-text)' }}>Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
                  <SelectTrigger className="rounded-xl" style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['low', 'medium', 'high', 'urgent'].map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                  </SelectContent>
                </Select></div>
            </div>
            <div><Label style={{ color: 'var(--hf-text)' }}>Recipient Email (optional)</Label>
              <Input value={form.recipient_email} onChange={e => setForm({ ...form, recipient_email: e.target.value })} type="email" className="rounded-xl"
                style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }} /></div>
            <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)' }}>
              <span className="text-sm" style={{ color: 'var(--hf-text)' }}>Also send email</span>
              <Switch checked={form.send_email} onCheckedChange={v => setForm({ ...form, send_email: v })} />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1 rounded-xl">Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending} className="flex-1 rounded-xl font-bold" style={{ background: '#d7f576', color: '#0a1200' }}>
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send size={14} className="mr-1.5" /> Send</>}
              </Button>
            </div>
          </form>
      </AdaptiveOverlay>
    </AdminLayout>
  );
}
