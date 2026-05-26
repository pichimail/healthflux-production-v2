// @ts-nocheck
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '../components/admin/AdminLayout.jsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { AdaptiveOverlay } from '@/components/ui/adaptive-overlay';
import { Shield, Plus, Edit, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const PERMISSION_LIST = [
  { key: 'view_own_data', label: 'View Own Data' },
  { key: 'view_all_data', label: 'View All Data' },
  { key: 'manage_users', label: 'Manage Users' },
  { key: 'manage_subscriptions', label: 'Manage Subscriptions' },
  { key: 'send_notifications', label: 'Send Notifications' },
  { key: 'manage_packages', label: 'Manage Packages' },
  { key: 'view_analytics', label: 'View Analytics' },
  { key: 'manage_roles', label: 'Manage Roles' },
  { key: 'access_ai_insights', label: 'AI Insights' },
  { key: 'access_predictive_analytics', label: 'Predictive Analytics' },
  { key: 'emergency_sharing', label: 'Emergency Sharing' },
];

export default function AdminRoles() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', permissions: {}, is_system_role: false });
  const queryClient = useQueryClient();

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: () => base44.entities.Role.list('name'),
  });

  const createMutation = useMutation({
    mutationFn: (d) => base44.entities.Role.create(d),
    onSuccess: () => { toast.success('Role created'); close(); queryClient.invalidateQueries(['admin-roles']); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, d }) => base44.entities.Role.update(id, d),
    onSuccess: () => { toast.success('Role updated'); close(); queryClient.invalidateQueries(['admin-roles']); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Role.delete(id),
    onSuccess: () => { toast.success('Role deleted'); queryClient.invalidateQueries(['admin-roles']); },
  });

  const close = () => { setDialogOpen(false); setEditing(null); };

  const openDialog = (role = null) => {
    if (role) {
      setEditing(role);
      setForm({ name: role.name, description: role.description || '', permissions: role.permissions || {}, is_system_role: role.is_system_role || false });
    } else {
      setEditing(null);
      setForm({ name: '', description: '', permissions: {}, is_system_role: false });
    }
    setDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editing) updateMutation.mutate({ id: editing.id, d: form });
    else createMutation.mutate(form);
  };

  const togglePerm = (key) => {
    setForm({ ...form, permissions: { ...form.permissions, [key]: !form.permissions[key] } });
  };

  const enabledCount = (perms) => Object.values(perms || {}).filter(Boolean).length;

  return (
    <AdminLayout currentPageName="AdminRoles">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black" style={{ color: 'var(--hf-text)' }}>Roles</h1>
            <p className="text-sm" style={{ color: 'var(--hf-text-muted)' }}>Manage permissions & access</p>
          </div>
          <Button onClick={() => openDialog()} className="rounded-2xl font-bold" style={{ background: '#d7f576', color: '#0a1200' }}>
            <Plus size={16} className="mr-2" /> New Role
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--hf-lemon-strong)' }} /></div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roles.map(role => (
              <div key={role.id} className="rounded-[22px] p-5" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: role.is_system_role ? '#d7f576' : '#c9bbff' }}>
                      <Shield size={18} style={{ color: role.is_system_role ? '#0a1200' : '#1a0a40' }} />
                    </div>
                    <div>
                      <p className="font-bold text-sm" style={{ color: 'var(--hf-text)' }}>{role.name}</p>
                      {role.is_system_role && <span className="text-[10px] font-bold" style={{ color: 'var(--hf-lemon-strong)' }}>System</span>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openDialog(role)} className="rounded-xl h-8 w-8">
                      <Edit size={14} style={{ color: 'var(--hf-text-muted)' }} />
                    </Button>
                    {!role.is_system_role && (
                      <Button variant="ghost" size="icon" onClick={() => { if (confirm('Delete?')) deleteMutation.mutate(role.id); }}
                        className="rounded-xl h-8 w-8 text-red-400 hover:bg-red-500/10">
                        <Trash2 size={14} />
                      </Button>
                    )}
                  </div>
                </div>
                {role.description && <p className="text-xs mb-3" style={{ color: 'var(--hf-text-muted)' }}>{role.description}</p>}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: 'rgba(215,245,118,0.15)', color: 'var(--hf-lemon-strong)' }}>
                    {enabledCount(role.permissions)} permissions
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AdaptiveOverlay open={dialogOpen} onOpenChange={close} title={editing ? 'Edit Role' : 'Create Role'} size="md" showClose>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label style={{ color: 'var(--hf-text)' }}>Name *</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required className="rounded-xl"
                style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }} />
            </div>
            <div>
              <Label style={{ color: 'var(--hf-text)' }}>Description</Label>
              <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="rounded-xl"
                style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }} />
            </div>
            <div>
              <Label className="mb-3 block" style={{ color: 'var(--hf-text)' }}>Permissions</Label>
              <div className="space-y-2">
                {PERMISSION_LIST.map(p => (
                  <div key={p.key} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)' }}>
                    <span className="text-sm" style={{ color: 'var(--hf-text)' }}>{p.label}</span>
                    <Switch checked={!!form.permissions[p.key]} onCheckedChange={() => togglePerm(p.key)} />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={close} className="flex-1 rounded-xl">Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="flex-1 rounded-xl font-bold" style={{ background: '#d7f576', color: '#0a1200' }}>
                {(createMutation.isPending || updateMutation.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : editing ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
      </AdaptiveOverlay>
    </AdminLayout>
  );
}
