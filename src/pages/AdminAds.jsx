import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import AdminLayout from '../components/admin/AdminLayout.jsx';
import { Switch } from '@/components/ui/switch';
import { AdaptiveOverlay } from '@/components/ui/adaptive-overlay';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, Megaphone, Eye, MousePointer, SkipForward, TrendingUp, Image, Video, Maximize2, Loader2, ExternalLink } from 'lucide-react';

const PLACEMENTS = ['home_top','home_bottom','health_top','wellness_top','nutrition_top','interstitial_global'];
const AD_TYPES = ['banner','video','interstitial'];

const TYPE_ICON = { banner: <Image size={14} />, video: <Video size={14} />, interstitial: <Maximize2 size={14} /> };
const TYPE_COLOR = { banner: '#d7f576', video: '#c9bbff', interstitial: '#f7c9a3' };
const TYPE_TC = { banner: '#0a1200', video: '#1a0a40', interstitial: '#3d1a00' };

function StatCard({ label, value, color = '#d7f576', tc = '#0a1200', icon }) {
  return (
    <div className="rounded-[20px] p-4" style={{ background: color }}>
      <div className="flex items-center justify-between mb-1">
        <span style={{ color: tc, opacity: 0.7 }}>{icon}</span>
      </div>
      <p className="text-2xl font-black" style={{ color: tc }}>{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-widest mt-0.5" style={{ color: tc, opacity: 0.7 }}>{label}</p>
    </div>
  );
}

function AdForm({ initial, onSave, onClose, saving }) {
  const [form, setForm] = useState(initial || {
    title: '', ad_type: 'banner', placement: 'home_top',
    media_url: '', redirect_url: '', skip_after_seconds: 5,
    is_active: false, frequency_cap_daily: 3,
    schedule_start: '', schedule_end: '', notes: '',
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
      <div>
        <label className="text-[10px] font-black uppercase tracking-widest block mb-1.5" style={{ color: 'var(--hf-text-muted)' }}>Ad Title *</label>
        <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Summer Health Campaign"
          className="w-full h-11 px-4 rounded-2xl text-sm outline-none"
          style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest block mb-1.5" style={{ color: 'var(--hf-text-muted)' }}>Type</label>
          <select value={form.ad_type} onChange={e => set('ad_type', e.target.value)}
            className="w-full h-11 px-3 rounded-2xl text-sm outline-none"
            style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }}>
            {AD_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest block mb-1.5" style={{ color: 'var(--hf-text-muted)' }}>Placement</label>
          <select value={form.placement} onChange={e => set('placement', e.target.value)}
            className="w-full h-11 px-3 rounded-2xl text-sm outline-none"
            style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }}>
            {PLACEMENTS.map(p => <option key={p} value={p}>{p.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="text-[10px] font-black uppercase tracking-widest block mb-1.5" style={{ color: 'var(--hf-text-muted)' }}>Media URL (Image / Video)</label>
        <input value={form.media_url} onChange={e => set('media_url', e.target.value)} placeholder="https://..."
          className="w-full h-11 px-4 rounded-2xl text-sm outline-none"
          style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }} />
        {form.media_url && form.ad_type !== 'video' && (
          <img src={form.media_url} alt="preview" className="mt-2 w-full h-24 object-cover rounded-2xl" onError={e => e.target.style.display='none'} />
        )}
      </div>

      <div>
        <label className="text-[10px] font-black uppercase tracking-widest block mb-1.5" style={{ color: 'var(--hf-text-muted)' }}>Redirect URL</label>
        <input value={form.redirect_url} onChange={e => set('redirect_url', e.target.value)} placeholder="https://..."
          className="w-full h-11 px-4 rounded-2xl text-sm outline-none"
          style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {(form.ad_type === 'interstitial' || form.ad_type === 'video') && (
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest block mb-1.5" style={{ color: 'var(--hf-text-muted)' }}>Skip after (sec)</label>
            <input type="number" min={1} max={30} value={form.skip_after_seconds} onChange={e => set('skip_after_seconds', +e.target.value)}
              className="w-full h-11 px-4 rounded-2xl text-sm outline-none"
              style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }} />
          </div>
        )}
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest block mb-1.5" style={{ color: 'var(--hf-text-muted)' }}>Daily Cap</label>
          <input type="number" min={1} value={form.frequency_cap_daily} onChange={e => set('frequency_cap_daily', +e.target.value)}
            className="w-full h-11 px-4 rounded-2xl text-sm outline-none"
            style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest block mb-1.5" style={{ color: 'var(--hf-text-muted)' }}>Schedule Start</label>
          <input type="datetime-local" value={form.schedule_start} onChange={e => set('schedule_start', e.target.value)}
            className="w-full h-11 px-4 rounded-2xl text-sm outline-none"
            style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }} />
        </div>
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest block mb-1.5" style={{ color: 'var(--hf-text-muted)' }}>Schedule End</label>
          <input type="datetime-local" value={form.schedule_end} onChange={e => set('schedule_end', e.target.value)}
            className="w-full h-11 px-4 rounded-2xl text-sm outline-none"
            style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }} />
        </div>
      </div>

      <div className="flex items-center justify-between p-3 rounded-2xl" style={{ background: 'var(--hf-surface-2)' }}>
        <div>
          <p className="text-xs font-bold" style={{ color: 'var(--hf-text)' }}>Active</p>
          <p className="text-[10px]" style={{ color: 'var(--hf-text-muted)' }}>Show this ad to users</p>
        </div>
        <Switch checked={!!form.is_active} onCheckedChange={v => set('is_active', v)} />
      </div>

      <div className="flex gap-3 pt-2">
        <button onClick={onClose} className="flex-1 h-11 rounded-2xl text-sm font-bold"
          style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)', color: 'var(--hf-text-muted)' }}>
          Cancel
        </button>
        <button onClick={() => onSave(form)} disabled={saving || !form.title}
          className="flex-1 h-11 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
          style={{ background: '#d7f576', color: '#0a1200' }}>
          {saving ? <Loader2 size={14} className="animate-spin" /> : null}
          Save Ad
        </button>
      </div>
    </div>
  );
}

export default function AdminAds() {
  const queryClient = useQueryClient();
  const [editAd, setEditAd] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const { data: ads = [], isLoading } = useQuery({
    queryKey: ['admin-ads'],
    queryFn: () => base44.entities.Ad.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Ad.create(data),
    onSuccess: () => { queryClient.invalidateQueries(['admin-ads']); setCreateOpen(false); toast.success('Ad created!'); },
    onError: e => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Ad.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries(['admin-ads']); setEditAd(null); toast.success('Ad updated!'); },
    onError: e => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Ad.delete(id),
    onSuccess: () => { queryClient.invalidateQueries(['admin-ads']); setDeleteId(null); toast.success('Ad deleted.'); },
    onError: e => toast.error(e.message),
  });

  const totalImpressions = ads.reduce((a, d) => a + (d.impressions || 0), 0);
  const totalClicks = ads.reduce((a, d) => a + (d.clicks || 0), 0);
  const totalSkips = ads.reduce((a, d) => a + (d.skips || 0), 0);
  const ctr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(1) : '0.0';
  const activeCount = ads.filter(a => a.is_active).length;

  return (
    <AdminLayout currentPageName="AdminAds">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black" style={{ color: 'var(--hf-text)' }}>Ads Studio</h1>
            <p className="text-sm" style={{ color: 'var(--hf-text-muted)' }}>Create, manage, and track ad campaigns</p>
          </div>
          <button onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 px-4 h-10 rounded-2xl text-sm font-bold transition-all active:scale-95"
            style={{ background: '#d7f576', color: '#0a1200' }}>
            <Plus size={16} /> Create Ad
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total Ads" value={ads.length} color="#d7f576" tc="#0a1200" icon={<Megaphone size={14} />} />
          <StatCard label="Active" value={activeCount} color="#a8e6cf" tc="#003d20" icon={<Eye size={14} />} />
          <StatCard label="Impressions" value={totalImpressions.toLocaleString()} color="#c9bbff" tc="#1a0a40" icon={<TrendingUp size={14} />} />
          <StatCard label={`Clicks / CTR`} value={`${totalClicks} / ${ctr}%`} color="#f7c9a3" tc="#3d1a00" icon={<MousePointer size={14} />} />
        </div>

        {/* Ads Table */}
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin" style={{ color: 'var(--hf-text-muted)' }} /></div>
        ) : ads.length === 0 ? (
          <div className="text-center py-16 rounded-[22px]" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
            <Megaphone size={40} className="mx-auto mb-3" style={{ color: 'var(--hf-text-muted)' }} />
            <p className="font-bold mb-1" style={{ color: 'var(--hf-text)' }}>No ads yet</p>
            <p className="text-sm mb-4" style={{ color: 'var(--hf-text-muted)' }}>Create your first ad campaign to get started</p>
            <button onClick={() => setCreateOpen(true)} className="px-4 h-10 rounded-2xl text-sm font-bold" style={{ background: '#d7f576', color: '#0a1200' }}>
              + Create First Ad
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {ads.map(ad => {
              const ctrAd = ad.impressions > 0 ? ((ad.clicks / ad.impressions) * 100).toFixed(1) : '0.0';
              return (
                <div key={ad.id} className="rounded-[20px] p-4"
                  style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
                  <div className="flex items-start gap-3">
                    {/* Type badge */}
                    <div className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ background: TYPE_COLOR[ad.ad_type], color: TYPE_TC[ad.ad_type] }}>
                      {TYPE_ICON[ad.ad_type]}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-black truncate" style={{ color: 'var(--hf-text)' }}>{ad.title}</p>
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full"
                          style={{ background: TYPE_COLOR[ad.ad_type] + '30', color: TYPE_COLOR[ad.ad_type] }}>
                          {ad.ad_type}
                        </span>
                        <span className="text-[9px] px-2 py-0.5 rounded-full font-bold"
                          style={{ background: 'var(--hf-surface-2)', color: 'var(--hf-text-muted)' }}>
                          {ad.placement?.replace(/_/g, ' ')}
                        </span>
                      </div>

                      {/* Analytics row */}
                      <div className="flex items-center gap-4 mt-2 flex-wrap">
                        <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--hf-text-muted)' }}>
                          <Eye size={10} /> {(ad.impressions || 0).toLocaleString()} imp
                        </span>
                        <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--hf-text-muted)' }}>
                          <MousePointer size={10} /> {ad.clicks || 0} clicks
                        </span>
                        <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--hf-text-muted)' }}>
                          <SkipForward size={10} /> {ad.skips || 0} skips
                        </span>
                        <span className="flex items-center gap-1 text-[10px] font-bold" style={{ color: '#d7f576' }}>
                          <TrendingUp size={10} /> {ctrAd}% CTR
                        </span>
                        {ad.redirect_url && (
                          <a href={ad.redirect_url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--hf-text-muted)' }}>
                            <ExternalLink size={10} /> URL
                          </a>
                        )}
                      </div>

                      {ad.schedule_start && (
                        <p className="text-[9px] mt-1" style={{ color: 'var(--hf-text-muted)' }}>
                          {new Date(ad.schedule_start).toLocaleDateString('en-IN')} → {ad.schedule_end ? new Date(ad.schedule_end).toLocaleDateString('en-IN') : '∞'}
                        </p>
                      )}
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Switch checked={!!ad.is_active}
                        onCheckedChange={v => updateMutation.mutate({ id: ad.id, data: { is_active: v } })}
                        disabled={updateMutation.isPending} />
                      <button onClick={() => setEditAd(ad)}
                        className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:opacity-80"
                        style={{ background: 'var(--hf-surface-2)', color: 'var(--hf-text-muted)' }}>
                        <Edit2 size={13} />
                      </button>
                      <button onClick={() => setDeleteId(ad.id)}
                        className="w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:opacity-80"
                        style={{ background: 'rgba(242,140,140,0.1)', color: 'var(--hf-coral-strong)' }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <AdaptiveOverlay open={createOpen} onOpenChange={setCreateOpen} title="Create Ad" size="md" showClose>
          <AdForm onSave={data => createMutation.mutate(data)} onClose={() => setCreateOpen(false)} saving={createMutation.isPending} />
      </AdaptiveOverlay>

      {/* Edit Dialog */}
      <AdaptiveOverlay open={!!editAd} onOpenChange={v => { if (!v) setEditAd(null); }} title="Edit Ad" size="md" showClose>
          {editAd && (
            <AdForm initial={editAd} onSave={data => updateMutation.mutate({ id: editAd.id, data })}
              onClose={() => setEditAd(null)} saving={updateMutation.isPending} />
          )}
      </AdaptiveOverlay>

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setDeleteId(null)}>
          <div className="rounded-[22px] p-5 max-w-sm w-full space-y-4" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}
            onClick={e => e.stopPropagation()}>
            <p className="font-black text-center text-base" style={{ color: 'var(--hf-text)' }}>Delete this ad?</p>
            <p className="text-xs text-center" style={{ color: 'var(--hf-text-muted)' }}>This is permanent and cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 h-11 rounded-2xl text-sm font-bold"
                style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)', color: 'var(--hf-text-muted)' }}>
                Cancel
              </button>
              <button onClick={() => deleteMutation.mutate(deleteId)} disabled={deleteMutation.isPending}
                className="flex-1 h-11 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: 'rgba(242,140,140,0.15)', color: 'var(--hf-coral-strong)', border: '1px solid rgba(242,140,140,0.35)' }}>
                {deleteMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}