// @ts-nocheck
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer } from 'vaul';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const REL_CONFIG = {
  self:    { color: 'var(--hf-lemon-strong)', tc: '#0a1200', icon: '👤', label: 'You' },
  spouse:  { color: 'var(--hf-peach-strong)', tc: '#3d1a00', icon: '💑', label: 'Spouse' },
  child:   { color: 'var(--hf-mint-strong)', tc: '#003d20', icon: '🧒', label: 'Child' },
  parent:  { color: 'var(--hf-lavender-strong)', tc: '#1a0a40', icon: '👴', label: 'Parent' },
  sibling: { color: 'var(--hf-sky-strong)', tc: '#0a1240', icon: '🧑‍🤝‍🧑', label: 'Sibling' },
  other:   { color: 'var(--hf-coral-strong)', tc: '#3d0000', icon: '👥', label: 'Other' },
};

function calcAge(dob) {
  if (!dob) return null;
  const today = new Date(), b = new Date(dob);
  let age = today.getFullYear() - b.getFullYear();
  if (today.getMonth() < b.getMonth() || (today.getMonth() === b.getMonth() && today.getDate() < b.getDate())) age--;
  return age;
}

const BLANK = { full_name: '', relationship: 'child', date_of_birth: '', gender: '', blood_group: '', height: '', allergies: '', chronic_conditions: '', emergency_contact: '' };

export default function Profiles() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [isMobile] = useState(() => window.innerWidth < 768);

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['profiles', user?.email],
    queryFn: () => base44.entities.Profile.filter({ created_by: user.email }, '-created_date'),
    enabled: !!user,
  });

  const createMut = useMutation({
    mutationFn: (d) => base44.entities.Profile.create(d),
    onSuccess: () => { qc.invalidateQueries(['profiles']); close_(); toast.success('Profile added!'); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, d }) => base44.entities.Profile.update(id, d),
    onSuccess: () => { qc.invalidateQueries(['profiles']); close_(); toast.success('Profile updated!'); },
  });
  const deleteMut = useMutation({
    mutationFn: (id) => base44.entities.Profile.delete(id),
    onSuccess: () => { qc.invalidateQueries(['profiles']); toast.success('Profile removed'); },
  });

  const open_ = (profile = null) => {
    if (profile) {
      setEditing(profile);
      setForm({ full_name: profile.full_name || '', relationship: profile.relationship || 'child', date_of_birth: profile.date_of_birth || '', gender: profile.gender || '', blood_group: profile.blood_group || '', height: profile.height?.toString() || '', allergies: (profile.allergies || []).join(', '), chronic_conditions: (profile.chronic_conditions || []).join(', '), emergency_contact: profile.emergency_contact || '' });
    } else {
      setEditing(null);
      setForm(BLANK);
    }
    setOpen(true);
  };
  const close_ = () => { setOpen(false); setEditing(null); setForm(BLANK); };

  const submit = (e) => {
    e.preventDefault();
    const d = { ...form, height: form.height ? parseFloat(form.height) : undefined, allergies: form.allergies ? form.allergies.split(',').map(s => s.trim()).filter(Boolean) : [], chronic_conditions: form.chronic_conditions ? form.chronic_conditions.split(',').map(s => s.trim()).filter(Boolean) : [] };
    if (editing) updateMut.mutate({ id: editing.id, d });
    else createMut.mutate(d);
  };

  const FormContent = (
    <form onSubmit={submit} className="space-y-4 mt-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2 space-y-1.5">
          <Label className="text-xs font-bold">Full Name *</Label>
          <Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="e.g. Arjun Sharma" className="h-12 rounded-2xl" required />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-bold">Relationship</Label>
          <div className="grid grid-cols-3 gap-1.5">
            {Object.entries(REL_CONFIG).map(([k, c]) => (
              <button key={k} type="button" onClick={() => setForm(f => ({ ...f, relationship: k }))}
                className="p-2 rounded-xl text-center text-xs font-bold transition-all"
                style={{ background: form.relationship === k ? `${c.color}` : 'var(--hf-surface-2)', color: form.relationship === k ? c.tc : 'var(--hf-text-muted)', border: form.relationship === k ? 'none' : '1px solid var(--hf-border)' }}>
                {c.icon} {c.label}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-bold">Date of Birth</Label>
          <Input type="text" placeholder="YYYY-MM-DD" value={form.date_of_birth} onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))} className="h-11 rounded-2xl font-mono" maxLength={10} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-bold">Gender</Label>
          <Select value={form.gender} onValueChange={v => setForm(f => ({ ...f, gender: v }))}>
            <SelectTrigger className="h-11 rounded-2xl"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-bold">Blood Group</Label>
          <div className="grid grid-cols-4 gap-1">
            {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(g => (
              <button key={g} type="button" onClick={() => setForm(f => ({ ...f, blood_group: g }))}
                className="p-1.5 rounded-xl text-xs font-bold transition-all"
                style={{ background: form.blood_group === g ? '#f28c8c' : 'var(--hf-surface-2)', color: form.blood_group === g ? '#3d0000' : 'var(--hf-text-muted)', border: form.blood_group === g ? 'none' : '1px solid var(--hf-border)' }}>
                {g}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-bold">Height (cm)</Label>
          <Input type="number" value={form.height} onChange={e => setForm(f => ({ ...f, height: e.target.value }))} placeholder="170" className="h-11 rounded-2xl" />
        </div>
        <div className="sm:col-span-2 space-y-1.5">
          <Label className="text-xs font-bold">Allergies <span className="text-[9px] font-normal opacity-70">(comma separated)</span></Label>
          <Input value={form.allergies} onChange={e => setForm(f => ({ ...f, allergies: e.target.value }))} placeholder="Penicillin, Peanuts..." className="h-11 rounded-2xl" />
        </div>
        <div className="sm:col-span-2 space-y-1.5">
          <Label className="text-xs font-bold">Chronic Conditions <span className="text-[9px] font-normal opacity-70">(comma separated)</span></Label>
          <Input value={form.chronic_conditions} onChange={e => setForm(f => ({ ...f, chronic_conditions: e.target.value }))} placeholder="Diabetes, Hypertension..." className="h-11 rounded-2xl" />
        </div>
        <div className="sm:col-span-2 space-y-1.5">
          <Label className="text-xs font-bold">Emergency Contact</Label>
          <Input value={form.emergency_contact} onChange={e => setForm(f => ({ ...f, emergency_contact: e.target.value }))} placeholder="+91 98765 43210 — Dr. Rao" className="h-11 rounded-2xl" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 pt-2">
        <Button type="button" variant="outline" onClick={close_} className="h-11 rounded-2xl">Cancel</Button>
        <Button type="submit" disabled={createMut.isPending || updateMut.isPending} className="h-11 rounded-2xl font-bold" style={{ background: '#d7f576', color: '#0a1200' }}>
          {editing ? 'Update' : 'Add Profile'}
        </Button>
      </div>
    </form>
  );

  return (
    <div className="bento-page">
      <div className="bento-header flex justify-between items-start">
        <div>
          <h1 className="bento-title">Family Profiles</h1>
          <p className="bento-subtitle">{profiles.length} member{profiles.length !== 1 ? 's' : ''} in your health family</p>
        </div>
        <Button onClick={() => open_()} className="h-10 px-5 rounded-2xl font-bold" style={{ background: '#d7f576', color: '#0a1200' }}>
          <Plus size={14} className="mr-1" /> Add
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 rounded-full border-2 border-[#d7f576] border-t-transparent animate-spin" /></div>
      ) : profiles.length === 0 ? (
        <div className="flex flex-col items-center py-20 gap-4 text-center">
          <div className="text-5xl">👨‍👩‍👧‍👦</div>
          <p className="text-sm font-bold" style={{ color: 'var(--hf-text)' }}>No profiles yet</p>
          <Button onClick={() => open_()} className="h-10 px-6 rounded-2xl font-bold" style={{ background: '#d7f576', color: '#0a1200' }}><Plus size={14} className="mr-1" /> Create Your Profile</Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {profiles.map(p => {
            const cfg = REL_CONFIG[p.relationship] || REL_CONFIG.other;
            const age = calcAge(p.date_of_birth);
            const isSelf = p.relationship === 'self';
            return (
              <div key={p.id} className="rounded-2xl overflow-hidden transition-all hover:shadow-lg" style={{ background: 'var(--hf-surface)', border: `1px solid ${cfg.color}33` }}>
                <div className="h-1.5" style={{ background: cfg.color }} />
                <div className="p-4">
                  {/* Avatar + name */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: `${cfg.color}22` }}>
                      {cfg.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-sm truncate" style={{ color: 'var(--hf-text)' }}>{p.full_name}</p>
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-full" style={{ background: cfg.color, color: cfg.tc }}>{cfg.label}</span>
                    </div>
                  </div>

                  {/* Info grid */}
                  <div className="grid grid-cols-2 gap-1.5 mb-3">
                    {age && <div className="p-2 rounded-xl" style={{ background: 'var(--hf-surface-2)' }}>
                      <p className="text-[9px] font-bold uppercase" style={{ color: 'var(--hf-text-muted)' }}>Age</p>
                      <p className="text-sm font-black" style={{ color: 'var(--hf-text)' }}>{age}y</p>
                    </div>}
                    {p.blood_group && <div className="p-2 rounded-xl" style={{ background: 'rgba(242,140,140,0.1)' }}>
                      <p className="text-[9px] font-bold uppercase" style={{ color: 'var(--hf-coral-strong)' }}>Blood</p>
                      <p className="text-sm font-black" style={{ color: 'var(--hf-coral-strong)' }}>{p.blood_group}</p>
                    </div>}
                    {p.gender && <div className="p-2 rounded-xl capitalize" style={{ background: 'var(--hf-surface-2)' }}>
                      <p className="text-[9px] font-bold uppercase" style={{ color: 'var(--hf-text-muted)' }}>Gender</p>
                      <p className="text-xs font-bold capitalize" style={{ color: 'var(--hf-text)' }}>{p.gender}</p>
                    </div>}
                    {p.height && <div className="p-2 rounded-xl" style={{ background: 'var(--hf-surface-2)' }}>
                      <p className="text-[9px] font-bold uppercase" style={{ color: 'var(--hf-text-muted)' }}>Height</p>
                      <p className="text-xs font-bold" style={{ color: 'var(--hf-text)' }}>{p.height}cm</p>
                    </div>}
                  </div>

                  {/* Allergies / Conditions pills */}
                  {(p.allergies?.length > 0 || p.chronic_conditions?.length > 0) && (
                    <div className="mb-3 flex flex-wrap gap-1">
                      {(p.allergies || []).slice(0, 2).map((a, i) => (
                        <span key={i} className="text-[8px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(242,140,140,0.15)', color: 'var(--hf-coral-strong)' }}>⚠ {a}</span>
                      ))}
                      {(p.chronic_conditions || []).slice(0, 2).map((c, i) => (
                        <span key={i} className="text-[8px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(201,187,255,0.15)', color: 'var(--hf-lavender-strong)' }}>{c}</span>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button onClick={() => open_(p)} className="flex-1 h-9 rounded-xl text-xs font-bold transition-all" style={{ background: `${cfg.color}22`, color: cfg.color, border: `1px solid ${cfg.color}44` }}>
                      ✏ Edit
                    </button>
                    {!isSelf && (
                      <button onClick={() => { if (confirm(`Delete ${p.full_name}'s profile?`)) deleteMut.mutate(p.id); }}
                        className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(242,140,140,0.12)', color: 'var(--hf-coral-strong)' }}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isMobile ? (
        <Drawer.Root open={open} onOpenChange={v => !v && close_()}>
          <Drawer.Portal>
            <Drawer.Overlay className="fixed inset-0 bg-black/60 z-50" />
            <Drawer.Content className="fixed bottom-0 left-0 right-0 z-[60] rounded-t-3xl max-h-[95dvh] overflow-y-auto" style={{ background: 'var(--hf-surface)' }}>
              <div className="flex justify-center pt-3 pb-2"><div className="w-10 h-1.5 rounded-full" style={{ background: 'var(--hf-border-strong)' }} /></div>
              <div className="px-5 pb-10"><h2 className="text-base font-bold mb-1" style={{ color: 'var(--hf-text)' }}>{editing ? 'Edit Profile' : 'Add Family Member'}</h2>{FormContent}</div>
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>
      ) : (
        <Dialog open={open} onOpenChange={v => !v && close_()}>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl" style={{ background: 'var(--hf-surface)', color: 'var(--hf-text)' }}>
            <DialogHeader><DialogTitle>{editing ? 'Edit Profile' : 'Add Family Member'}</DialogTitle></DialogHeader>
            {FormContent}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
