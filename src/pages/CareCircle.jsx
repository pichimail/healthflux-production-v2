// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AdaptiveOverlay } from '@/components/ui/adaptive-overlay';
import { toast } from 'sonner';
import { Users, Plus, X, Activity, Pill, FileText, TestTube, Brain, Mail, Loader2, MessageCircle } from 'lucide-react';
import ChatThread from '@/components/care/ChatThread';
import { format } from 'date-fns';

const PERMS = [
  { key: 'view_vitals',      label: 'Vitals',       icon: Activity, color: 'var(--hf-sky-strong)' },
  { key: 'view_medications', label: 'Medications',  icon: Pill,     color: 'var(--hf-peach-strong)' },
  { key: 'view_documents',   label: 'Documents',    icon: FileText, color: 'var(--hf-lavender-strong)' },
  { key: 'view_labs',        label: 'Lab Results',  icon: TestTube, color: 'var(--hf-mint-strong)' },
  { key: 'view_insights',    label: 'AI Insights',  icon: Brain,    color: 'var(--hf-lemon-strong)' },
  { key: 'add_notes',        label: 'Add Notes',    icon: FileText, color: 'var(--hf-coral-strong)' },
];

const DEFAULT_PERMS = { view_vitals: true, view_medications: true, view_documents: false, view_labs: true, view_insights: false, add_notes: true };
const BLANK_FORM = { caregiver_email: '', caregiver_name: '', relationship: 'Family', message: '', permissions: DEFAULT_PERMS };

const STATUS = {
  active:  { bg: 'rgba(168,230,207,0.15)', color: 'var(--hf-mint-strong)', dot: '●' },
  pending: { bg: 'rgba(247,201,163,0.15)', color: 'var(--hf-peach-strong)', dot: '◌' },
  revoked: { bg: 'rgba(242,140,140,0.1)',  color: 'var(--hf-coral-strong)', dot: '✕' },
};

export default function CareCircle() {
  const [user, setUser] = useState(null);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [form, setForm] = useState(BLANK_FORM);
  const [chatWith, setChatWith] = useState(null);
  const qc = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      base44.entities.Profile.filter({ relationship: 'self', created_by: u.email }).then(p => p.length > 0 && setSelectedProfile(p[0].id));
    });
  }, []);

  const { data: profiles = [] } = useQuery({ queryKey: ['profiles', user?.email], queryFn: () => base44.entities.Profile.filter({ created_by: user.email }, '-created_date'), enabled: !!user });
  const { data: circle = [] } = useQuery({ queryKey: ['careCircle', selectedProfile, user?.email], queryFn: () => base44.entities.CareCircle.filter({ profile_id: selectedProfile, created_by: user.email }), enabled: !!selectedProfile && !!user });
  const { data: sharedWithMe = [] } = useQuery({ queryKey: ['sharedWithMe', user?.email], queryFn: () => base44.entities.CareCircle.filter({ caregiver_email: user.email, status: 'active' }), enabled: !!user?.email });

  const inviteMut = useMutation({
    mutationFn: (d) => base44.entities.CareCircle.create(d),
    onSuccess: () => { qc.invalidateQueries(['careCircle']); setInviteOpen(false); setForm(BLANK_FORM); toast.success('Invitation sent! 🎉'); },
  });
  const revokeMut = useMutation({
    mutationFn: (id) => base44.entities.CareCircle.update(id, { status: 'revoked' }),
    onSuccess: () => { qc.invalidateQueries(['careCircle']); toast.success('Access revoked'); },
  });

  const handleInvite = (e) => {
    e.preventDefault();
    if (!user?.email || !selectedProfile) return;
    inviteMut.mutate({ ...form, owner_email: user.email, profile_id: selectedProfile, status: 'active', invited_at: new Date().toISOString() });
  };

  const activeCount = circle.filter(c => c.status === 'active').length;
  const selectedProfileData = profiles.find(p => p.id === selectedProfile);

  if (!user) return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 rounded-full border-2 border-[#d7f576] border-t-transparent animate-spin" /></div>;

  // Chat view
  if (chatWith) {
    return (
      <div className="bento-page p-0" style={{ minHeight: '100vh' }}>
        <ChatThread careCircle={chatWith} user={user} onBack={() => setChatWith(null)} />
      </div>
    );
  }

  const FormContent = (
    <form onSubmit={handleInvite} className="space-y-4 mt-2">
      <div className="space-y-1.5">
        <Label className="text-xs font-bold">Caregiver Email *</Label>
        <Input type="email" value={form.caregiver_email} onChange={e => setForm(f => ({ ...f, caregiver_email: e.target.value }))} placeholder="doctor@hospital.com" className="h-11 rounded-2xl" required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-bold">Name</Label>
          <Input value={form.caregiver_name} onChange={e => setForm(f => ({ ...f, caregiver_name: e.target.value }))} placeholder="Dr. Smith" className="h-11 rounded-2xl" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-bold">Relationship</Label>
          <Select value={form.relationship} onValueChange={v => setForm(f => ({ ...f, relationship: v }))}>
            <SelectTrigger className="h-11 rounded-2xl"><SelectValue /></SelectTrigger>
            <SelectContent>{['Doctor', 'Spouse', 'Child', 'Parent', 'Sibling', 'Nurse', 'Caregiver', 'Family'].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className="text-xs font-bold mb-2 block">Data Access Permissions</Label>
        <div className="grid grid-cols-2 gap-2">
          {PERMS.map(p => {
            const Icon = p.icon;
            const on = form.permissions[p.key];
            return (
              <button key={p.key} type="button" onClick={() => setForm(f => ({ ...f, permissions: { ...f.permissions, [p.key]: !f.permissions[p.key] } }))}
                className="flex items-center gap-2 p-2.5 rounded-xl transition-all text-left"
                style={{ background: on ? `${p.color}18` : 'var(--hf-surface-2)', border: on ? `1.5px solid ${p.color}55` : '1px solid var(--hf-border)' }}>
                <Icon size={14} style={{ color: on ? p.color : 'var(--hf-text-muted)', flexShrink: 0 }} />
                <span className="text-xs font-bold" style={{ color: on ? p.color : 'var(--hf-text-muted)' }}>{p.label}</span>
                <div className="ml-auto w-3 h-3 rounded-full flex-shrink-0" style={{ background: on ? p.color : 'var(--hf-border)' }} />
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-bold">Personal Message (optional)</Label>
        <Input value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder="I'd like you to monitor my health..." className="h-11 rounded-2xl" />
      </div>

      {profiles.length > 1 && (
        <div className="space-y-1.5">
          <Label className="text-xs font-bold">Profile to Share</Label>
          <Select value={selectedProfile} onValueChange={setSelectedProfile}>
            <SelectTrigger className="h-11 rounded-2xl"><SelectValue /></SelectTrigger>
            <SelectContent>{profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 pt-1">
        <Button type="button" variant="outline" onClick={() => { setInviteOpen(false); setForm(BLANK_FORM); }} className="h-11 rounded-2xl">Cancel</Button>
        <Button type="submit" disabled={inviteMut.isPending} className="h-11 rounded-2xl font-bold" style={{ background: '#d7f576', color: '#0a1200' }}>
          {inviteMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <><Mail size={13} className="mr-1" /> Send Invite</>}
        </Button>
      </div>
    </form>
  );

  return (
    <div className="bento-page">
      <div className="bento-header flex justify-between items-start">
        <div>
          <h1 className="bento-title">Care Circle</h1>
          <p className="bento-subtitle">Share health data with trusted people</p>
        </div>
        <Button onClick={() => setInviteOpen(true)} className="h-10 px-5 rounded-2xl font-bold" style={{ background: '#d7f576', color: '#0a1200' }}>
          <Plus size={14} className="mr-1" /> Invite
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { v: activeCount, label: 'Active Caregivers', color: 'var(--hf-mint-strong)', tc: '#003d20', icon: '🤝' },
          { v: circle.length, label: 'Total Invited', color: 'var(--hf-lavender-strong)', tc: '#1a0a40', icon: '📨' },
          { v: sharedWithMe.length, label: 'Caring For', color: 'var(--hf-peach-strong)', tc: '#3d1a00', icon: '❤️' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl p-3 text-center" style={{ background: s.color }}>
            <span className="text-base">{s.icon}</span>
            <p className="text-xl font-black" style={{ color: s.tc }}>{s.v}</p>
            <p className="text-[8px] font-black uppercase opacity-70" style={{ color: s.tc }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Profile selector if multiple */}
      {profiles.length > 1 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 mb-4">
          {profiles.map(p => (
            <button key={p.id} onClick={() => setSelectedProfile(p.id)}
              className="flex items-center gap-2 px-3 py-2 rounded-2xl whitespace-nowrap text-xs font-bold flex-shrink-0 transition-all"
              style={{ background: selectedProfile === p.id ? '#d7f576' : 'var(--hf-surface-2)', color: selectedProfile === p.id ? '#0a1200' : 'var(--hf-text-muted)', border: '1px solid var(--hf-border)' }}>
              <span>{p.full_name[0]}</span><span>{p.full_name.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      )}

      {/* My care circle */}
      <div className="mb-4">
        <p className="text-[10px] font-black uppercase tracking-widest mb-3 px-1" style={{ color: 'var(--hf-text-muted)' }}>
          People with access to {selectedProfileData?.full_name || 'your'} profile
        </p>
        {circle.length === 0 ? (
          <div className="flex flex-col items-center py-12 gap-3 text-center rounded-2xl" style={{ background: 'var(--hf-surface)', border: '1px dashed var(--hf-border)' }}>
            <div className="text-4xl">🤝</div>
            <p className="text-sm font-bold" style={{ color: 'var(--hf-text)' }}>No caregivers yet</p>
            <p className="text-xs max-w-xs" style={{ color: 'var(--hf-text-muted)' }}>Invite a family member or doctor to securely view your health data.</p>
            <Button onClick={() => setInviteOpen(true)} className="h-9 px-5 rounded-2xl font-bold text-xs" style={{ background: '#d7f576', color: '#0a1200' }}><Plus size={12} className="mr-1" /> Invite Caregiver</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {circle.map(c => {
              const s = STATUS[c.status] || STATUS.pending;
              const enabledPerms = PERMS.filter(p => c.permissions?.[p.key]);
              return (
                <div key={c.id} className="p-4 rounded-2xl" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0" style={{ background: '#d7f576', color: '#0a1200' }}>
                        {(c.caregiver_name || c.caregiver_email)?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-sm" style={{ color: 'var(--hf-text)' }}>{c.caregiver_name || c.caregiver_email}</p>
                        <p className="text-[10px]" style={{ color: 'var(--hf-text-muted)' }}>{c.caregiver_email}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[9px] font-black px-2 py-0.5 rounded-full" style={{ background: s.bg, color: s.color }}>{s.dot} {c.status}</span>
                          <span className="text-[9px]" style={{ color: 'var(--hf-text-muted)' }}>{c.relationship}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      {c.status === 'active' && (
                        <button onClick={() => setChatWith(c)} title="Chat"
                          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(155,180,255,0.15)', color: 'var(--hf-sky-strong)' }}>
                          <MessageCircle size={14} />
                        </button>
                      )}
                      {c.status === 'active' && (
                        <button onClick={() => { if (confirm('Revoke this caregiver\'s access?')) revokeMut.mutate(c.id); }}
                          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(242,140,140,0.1)', color: 'var(--hf-coral-strong)' }}>
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Permission badges */}
                  <div className="flex flex-wrap gap-1">
                    {enabledPerms.map(p => (
                      <span key={p.key} className="text-[8px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"
                        style={{ background: `${p.color}18`, color: p.color }}>
                        <p.icon size={8} /> {p.label}
                      </span>
                    ))}
                  </div>
                  {c.invited_at && <p className="text-[9px] mt-2" style={{ color: 'var(--hf-text-muted)' }}>Invited {format(new Date(c.invited_at), 'MMM d, yyyy')}</p>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Shared with me */}
      {sharedWithMe.length > 0 && (
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest mb-3 px-1" style={{ color: 'var(--hf-text-muted)' }}>Profiles you're caring for</p>
          <div className="space-y-2">
            {sharedWithMe.map(c => (
              <div key={c.id} className="p-3 rounded-2xl flex items-center gap-3" style={{ background: 'rgba(168,230,207,0.08)', border: '1px solid rgba(168,230,207,0.2)' }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm" style={{ background: '#c9bbff', color: '#1a0a40' }}>{c.owner_email[0].toUpperCase()}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold" style={{ color: 'var(--hf-mint-strong)' }}>{c.owner_email}</p>
                  <p className="text-[9px]" style={{ color: 'var(--hf-text-muted)' }}>Shared their health data with you</p>
                </div>
                <button onClick={() => setChatWith(c)} title="Chat"
                  className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(155,180,255,0.15)', color: 'var(--hf-sky-strong)' }}>
                  <MessageCircle size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <AdaptiveOverlay
        open={inviteOpen}
        onOpenChange={v => { if (!v) { setInviteOpen(false); setForm(BLANK_FORM); } }}
        title="Invite to Care Circle"
        size="md"
        showClose
      >
        {FormContent}
      </AdaptiveOverlay>
    </div>
  );
}
