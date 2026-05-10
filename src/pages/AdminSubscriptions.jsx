// @ts-nocheck
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '../components/admin/AdminLayout.jsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Plus, Edit, Loader2, CreditCard, X } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const PLAN_META = {
  free:       { color: 'var(--hf-mint-strong)', tc: '#003d20', label: 'Free' },
  pro:        { color: 'var(--hf-lemon-strong)', tc: '#0a1200', label: 'Pro' },
  enterprise: { color: 'var(--hf-lavender-strong)', tc: '#1a0a40', label: 'Enterprise' },
};
const STATUS_META = {
  active:    { color: 'var(--hf-lemon-strong)', tc: '#0a1200' },
  trialing:  { color: 'var(--hf-sky-strong)', tc: '#0a1240' },
  cancelled: { color: 'var(--hf-coral-strong)', tc: '#3d0000' },
  expired:   { color: 'var(--hf-border)', tc: 'var(--hf-text-muted)' },
  past_due:  { color: 'var(--hf-peach-strong)', tc: '#3d1a00' },
};

const EMPTY_FORM = {
  user_email: '', plan_key: 'free', status: 'active',
  start_at: new Date().toISOString().split('T')[0],
  end_at: '', renew_at: ''
};

export default function AdminSubscriptions() {
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSub, setEditingSub] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const qc = useQueryClient();

  const { data: subs = [], isLoading } = useQuery({
    queryKey: ['admin-subs-page'],
    queryFn: () => base44.entities.UserSubscription.list('-created_date', 500),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.UserSubscription.create(data),
    onSuccess: () => { qc.invalidateQueries(['admin-subs-page']); setDialogOpen(false); toast.success('Subscription created'); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.UserSubscription.update(id, data),
    onSuccess: () => { qc.invalidateQueries(['admin-subs-page']); setDialogOpen(false); toast.success('Subscription updated'); },
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => base44.entities.UserSubscription.update(id, { status: 'cancelled' }),
    onSuccess: () => { qc.invalidateQueries(['admin-subs-page']); toast.success('Subscription cancelled'); },
  });

  const filtered = subs.filter(s => {
    const matchSearch = !search || s.user_email?.toLowerCase().includes(search.toLowerCase());
    const matchPlan = planFilter === 'all' || s.plan_key === planFilter;
    const matchStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchSearch && matchPlan && matchStatus;
  });

  const openCreate = () => {
    setEditingSub(null);
    setFormData(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (sub) => {
    setEditingSub(sub);
    setFormData({
      user_email: sub.user_email,
      plan_key: sub.plan_key,
      status: sub.status,
      start_at: sub.start_at?.split('T')[0] || '',
      end_at: sub.end_at?.split('T')[0] || '',
      renew_at: sub.renew_at?.split('T')[0] || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      start_at: formData.start_at ? new Date(formData.start_at).toISOString() : undefined,
      end_at: formData.end_at ? new Date(formData.end_at).toISOString() : undefined,
      renew_at: formData.renew_at ? new Date(formData.renew_at).toISOString() : undefined,
    };
    if (editingSub) {
      updateMutation.mutate({ id: editingSub.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const counts = {
    total: subs.length,
    active: subs.filter(s => s.status === 'active').length,
    pro: subs.filter(s => s.plan_key === 'pro' && s.status === 'active').length,
    enterprise: subs.filter(s => s.plan_key === 'enterprise' && s.status === 'active').length,
  };

  return (
    <AdminLayout currentPageName="AdminSubscriptions">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between gap-3 items-start sm:items-center">
          <div>
            <h1 className="text-2xl font-black" style={{ color: 'var(--hf-text)' }}>Subscriptions</h1>
            <p className="text-sm" style={{ color: 'var(--hf-text-muted)' }}>{counts.total} total · {counts.active} active</p>
          </div>
          <Button onClick={openCreate} className="rounded-2xl font-bold h-9 px-4 text-sm"
            style={{ background: '#d7f576', color: '#0a1200', border: 'none' }}>
            <Plus size={15} className="mr-1" /> New Subscription
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total', value: counts.total, bg: '#d7f576', color: '#0a1200' },
            { label: 'Active', value: counts.active, bg: '#a8e6cf', color: '#003d20' },
            { label: 'Pro Plans', value: counts.pro, bg: '#f7c9a3', color: '#3d1a00' },
            { label: 'Enterprise', value: counts.enterprise, bg: '#c9bbff', color: '#1a0a40' },
          ].map(s => (
            <div key={s.label} className="rounded-[20px] p-4" style={{ background: s.bg }}>
              <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs font-bold mt-0.5" style={{ color: s.color, opacity: 0.7 }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-44">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--hf-text-muted)' }} />
            <Input placeholder="Search by email…" value={search} onChange={e => setSearch(e.target.value)}
              className="pl-8 rounded-2xl text-sm h-9"
              style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }} />
          </div>
          <Select value={planFilter} onValueChange={setPlanFilter}>
            <SelectTrigger className="rounded-2xl h-9 w-32 text-sm"
              style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }}>
              <SelectValue placeholder="Plan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Plans</SelectItem>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
              <SelectItem value="enterprise">Enterprise</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="rounded-2xl h-9 w-32 text-sm"
              style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }}>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="trialing">Trialing</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="past_due">Past Due</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-[22px] overflow-hidden" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
          <div className="grid grid-cols-12 gap-2 px-4 py-3 border-b text-[10px] font-black uppercase tracking-wider"
            style={{ borderColor: 'var(--hf-border)', color: 'var(--hf-text-muted)' }}>
            <div className="col-span-4">User Email</div>
            <div className="col-span-2">Plan</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2 hidden md:block">Started</div>
            <div className="col-span-2 hidden md:block">Actions</div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--hf-lemon-strong)' }} /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--hf-text-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--hf-text-muted)' }}>No subscriptions found</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--hf-border)' }}>
              {filtered.map(sub => {
                const pm = PLAN_META[sub.plan_key] || PLAN_META.free;
                const sm = STATUS_META[sub.status] || STATUS_META.expired;
                return (
                  <div key={sub.id} className="grid grid-cols-12 gap-2 items-center px-4 py-3 hover:bg-white/2 transition-colors">
                    <div className="col-span-4 min-w-0">
                      <p className="text-sm font-bold truncate" style={{ color: 'var(--hf-text)' }}>{sub.user_email}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: pm.color + '33', color: pm.color }}>{pm.label}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
                        style={{ background: sm.color + '33', color: sm.color }}>{sub.status}</span>
                    </div>
                    <div className="col-span-2 hidden md:block">
                      <span className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>
                        {sub.start_at ? format(new Date(sub.start_at), 'MMM d, yyyy') : '—'}
                      </span>
                    </div>
                    <div className="col-span-2 hidden md:flex items-center gap-1">
                      <button onClick={() => openEdit(sub)}
                        className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" style={{ color: 'var(--hf-text-muted)' }}>
                        <Edit size={13} />
                      </button>
                      {sub.status !== 'cancelled' && (
                        <button onClick={() => { if (confirm('Cancel this subscription?')) cancelMutation.mutate(sub.id); }}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors text-red-400">
                          <X size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-[28px] max-w-md p-6" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }}>
          <DialogHeader>
            <DialogTitle style={{ color: 'var(--hf-text)' }}>{editingSub ? 'Edit Subscription' : 'New Subscription'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1">
              <Label className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>User Email *</Label>
              <Input value={formData.user_email} onChange={e => setFormData(p => ({ ...p, user_email: e.target.value }))}
                placeholder="user@example.com" required disabled={!!editingSub} className="h-10 rounded-xl"
                style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>Plan</Label>
                <Select value={formData.plan_key} onValueChange={v => setFormData(p => ({ ...p, plan_key: v }))}>
                  <SelectTrigger className="h-10 rounded-xl" style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>Status</Label>
                <Select value={formData.status} onValueChange={v => setFormData(p => ({ ...p, status: v }))}>
                  <SelectTrigger className="h-10 rounded-xl" style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="trialing">Trialing</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="past_due">Past Due</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>Start Date</Label>
                <Input type="date" value={formData.start_at} onChange={e => setFormData(p => ({ ...p, start_at: e.target.value }))}
                  className="h-10 rounded-xl" style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>End Date</Label>
                <Input type="date" value={formData.end_at} onChange={e => setFormData(p => ({ ...p, end_at: e.target.value }))}
                  className="h-10 rounded-xl" style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>Renew Date</Label>
              <Input type="date" value={formData.renew_at} onChange={e => setFormData(p => ({ ...p, renew_at: e.target.value }))}
                className="h-10 rounded-xl" style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }} />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1 rounded-xl h-10">Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}
                className="flex-1 rounded-xl h-10 font-bold" style={{ background: '#d7f576', color: '#0a1200', border: 'none' }}>
                {(createMutation.isPending || updateMutation.isPending) ? <Loader2 size={15} className="animate-spin" /> : editingSub ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
