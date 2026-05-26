// @ts-nocheck
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '../components/admin/AdminLayout.jsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { AdaptiveOverlay } from '@/components/ui/adaptive-overlay';
import { Package, Plus, Edit, Trash2, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';

const BLANK = {
  name: '', description: '', price: 0, duration_months: 1,
  max_profiles: 1, max_documents: 10,
  ai_insights_enabled: false, predictive_analytics_enabled: false,
  emergency_sharing_enabled: false, is_active: true, display_order: 0,
  features: [],
};

const PASTEL = ['#d7f576', '#c9bbff', '#f7c9a3', '#9bb4ff', '#a8e6cf', '#f28c8c'];
const TEXT   = ['#0a1200', '#1a0a40', '#3d1a00', '#0a1240', '#003d20', '#3d0000'];

export default function AdminPackages() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [featInput, setFeatInput] = useState('');
  const queryClient = useQueryClient();

  const { data: packages = [], isLoading } = useQuery({
    queryKey: ['admin-packages'],
    queryFn: () => base44.entities.SubscriptionPackage.list('display_order'),
  });

  const createMutation = useMutation({
    mutationFn: (d) => base44.entities.SubscriptionPackage.create(d),
    onSuccess: () => { toast.success('Package created'); close_(); queryClient.invalidateQueries(['admin-packages']); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, d }) => base44.entities.SubscriptionPackage.update(id, d),
    onSuccess: () => { toast.success('Package updated'); close_(); queryClient.invalidateQueries(['admin-packages']); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SubscriptionPackage.delete(id),
    onSuccess: () => { toast.success('Deleted'); queryClient.invalidateQueries(['admin-packages']); },
  });

  const close_ = () => { setDialogOpen(false); setEditing(null); setForm(BLANK); setFeatInput(''); };

  const open = (pkg = null) => {
    if (pkg) { setEditing(pkg); setForm({ ...BLANK, ...pkg }); }
    else { setEditing(null); setForm(BLANK); }
    setDialogOpen(true);
  };

  const addFeature = () => {
    if (featInput.trim()) {
      setForm({ ...form, features: [...(form.features || []), featInput.trim()] });
      setFeatInput('');
    }
  };

  const removeFeature = (i) => setForm({ ...form, features: form.features.filter((_, idx) => idx !== i) });

  const submit = (e) => {
    e.preventDefault();
    const d = { ...form, price: parseFloat(form.price), duration_months: parseInt(form.duration_months), max_profiles: parseInt(form.max_profiles), max_documents: parseInt(form.max_documents) };
    if (editing) updateMutation.mutate({ id: editing.id, d });
    else createMutation.mutate(d);
  };

  return (
    <AdminLayout currentPageName="AdminPackages">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black" style={{ color: 'var(--hf-text)' }}>Packages</h1>
            <p className="text-sm" style={{ color: 'var(--hf-text-muted)' }}>Manage subscription plans</p>
          </div>
          <Button onClick={() => open()} className="rounded-2xl font-bold" style={{ background: '#d7f576', color: '#0a1200' }}>
            <Plus size={16} className="mr-2" /> New Package
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--hf-lemon-strong)' }} /></div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {packages.map((pkg, i) => {
              const bg = PASTEL[i % PASTEL.length];
              const tc = TEXT[i % TEXT.length];
              return (
                <div key={pkg.id} className="rounded-[24px] p-5 relative" style={{ background: bg }}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-xl font-black leading-tight" style={{ color: tc }}>{pkg.name}</p>
                      <p className="text-sm font-bold mt-0.5" style={{ color: tc, opacity: 0.65 }}>
                        ${pkg.price} / {pkg.duration_months}mo
                      </p>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => open(pkg)} className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-105"
                        style={{ background: 'rgba(0,0,0,0.1)' }}>
                        <Edit size={13} style={{ color: tc }} />
                      </button>
                      <button onClick={() => { if (confirm('Delete this package?')) deleteMutation.mutate(pkg.id); }}
                        className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:scale-105"
                        style={{ background: 'rgba(0,0,0,0.1)' }}>
                        <Trash2 size={13} style={{ color: tc }} />
                      </button>
                    </div>
                  </div>
                  {pkg.description && <p className="text-xs mb-3 line-clamp-2" style={{ color: tc, opacity: 0.7 }}>{pkg.description}</p>}
                  <div className="space-y-1.5 mb-3">
                    {(pkg.features || []).slice(0, 4).map((f, fi) => (
                      <div key={fi} className="flex items-center gap-2 text-xs">
                        <Check size={11} style={{ color: tc }} />
                        <span style={{ color: tc }}>{f}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: pkg.is_active ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.1)', color: tc }}>
                      {pkg.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <span className="text-[10px] font-bold" style={{ color: tc, opacity: 0.6 }}>
                      {pkg.max_profiles} profiles · {pkg.max_documents === 0 ? 'Unlimited' : pkg.max_documents} docs
                    </span>
                  </div>
                </div>
              );
            })}
            {packages.length === 0 && (
              <div className="col-span-full text-center py-12">
                <Package size={40} className="mx-auto mb-3" style={{ color: 'var(--hf-text-muted)' }} />
                <p className="text-sm" style={{ color: 'var(--hf-text-muted)' }}>No packages yet. Create your first plan.</p>
              </div>
            )}
          </div>
        )}
      </div>

      <AdaptiveOverlay open={dialogOpen} onOpenChange={o => !o && close_()} title={editing ? 'Edit Package' : 'Create Package'} size="md" showClose>
          <form onSubmit={submit} className="space-y-4">
            <div><Label style={{ color: 'var(--hf-text)' }}>Name *</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required className="rounded-xl mt-1"
                style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }} /></div>
            <div><Label style={{ color: 'var(--hf-text)' }}>Description</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="rounded-xl mt-1 min-h-[60px]"
                style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label style={{ color: 'var(--hf-text)' }}>Price (USD) *</Label>
                <Input type="number" min="0" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} required className="rounded-xl mt-1"
                  style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }} /></div>
              <div><Label style={{ color: 'var(--hf-text)' }}>Duration (months)</Label>
                <Input type="number" min="1" value={form.duration_months} onChange={e => setForm({ ...form, duration_months: e.target.value })} className="rounded-xl mt-1"
                  style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label style={{ color: 'var(--hf-text)' }}>Max Profiles</Label>
                <Input type="number" min="1" value={form.max_profiles} onChange={e => setForm({ ...form, max_profiles: e.target.value })} className="rounded-xl mt-1"
                  style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }} /></div>
              <div><Label style={{ color: 'var(--hf-text)' }}>Max Docs (0=∞)</Label>
                <Input type="number" min="0" value={form.max_documents} onChange={e => setForm({ ...form, max_documents: e.target.value })} className="rounded-xl mt-1"
                  style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }} /></div>
            </div>
            {/* Features */}
            <div>
              <Label style={{ color: 'var(--hf-text)' }}>Features</Label>
              <div className="flex gap-2 mt-1">
                <Input value={featInput} onChange={e => setFeatInput(e.target.value)} placeholder="Add feature…" className="rounded-xl"
                  style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addFeature(); } }} />
                <Button type="button" onClick={addFeature} className="rounded-xl flex-shrink-0" style={{ background: '#d7f576', color: '#0a1200' }}>Add</Button>
              </div>
              <div className="space-y-1 mt-2">
                {(form.features || []).map((f, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 rounded-xl text-xs"
                    style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)' }}>
                    <span style={{ color: 'var(--hf-text)' }}>{f}</span>
                    <button type="button" onClick={() => removeFeature(i)} className="text-red-400 font-bold ml-2">×</button>
                  </div>
                ))}
              </div>
            </div>
            {/* Toggles */}
            <div className="space-y-2">
              {[
                { key: 'ai_insights_enabled', label: 'AI Insights' },
                { key: 'predictive_analytics_enabled', label: 'Predictive Analytics' },
                { key: 'emergency_sharing_enabled', label: 'Emergency Sharing' },
                { key: 'is_active', label: 'Active' },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between p-3 rounded-xl"
                  style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)' }}>
                  <span className="text-sm" style={{ color: 'var(--hf-text)' }}>{label}</span>
                  <Switch checked={!!form[key]} onCheckedChange={v => setForm({ ...form, [key]: v })} />
                </div>
              ))}
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={close_} className="flex-1 rounded-xl">Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="flex-1 rounded-xl font-bold" style={{ background: '#d7f576', color: '#0a1200' }}>
                {(createMutation.isPending || updateMutation.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : editing ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
      </AdaptiveOverlay>
    </AdminLayout>
  );
}
