// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import ResponsiveOverlay from '@/components/ui/responsive-overlay';
import { Plus, AlertTriangle, Trash2 } from 'lucide-react';
import MobileSelect from '@/components/MobileSelect';
import Haptics from '@/components/utils/haptics';
import { format } from 'date-fns';
import { useActiveProfile } from '../components/ActiveProfileContext';
import { toast } from 'sonner';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const CATEGORIES = ['all', 'blood', 'urine', 'lipid', 'liver', 'kidney', 'thyroid', 'diabetes', 'vitamin', 'other'];

const FLAG_STYLE = {
  high:   { bg: 'rgba(242,140,140,0.15)', border: 'rgba(242,140,140,0.4)', text: '#f28c8c', label: '↑ High' },
  low:    { bg: 'rgba(155,180,255,0.15)', border: 'rgba(155,180,255,0.4)', text: '#9bb4ff', label: '↓ Low' },
  normal: { bg: 'rgba(168,230,207,0.12)', border: 'rgba(168,230,207,0.3)', text: '#a8e6cf', label: '✓ Normal' },
};

const BLANK = {
  test_name: '', test_category: 'blood', value: '', unit: '',
  reference_low: '', reference_high: '', test_date: new Date().toISOString().split('T')[0],
  facility: '', notes: ''
};

function calcFlag(val, low, high) {
  const v = parseFloat(val), l = parseFloat(low), h = parseFloat(high);
  if (isNaN(v)) return 'normal';
  if (!isNaN(l) && v < l) return 'low';
  if (!isNaN(h) && v > h) return 'high';
  return 'normal';
}

function RangeBar({ value, low, high }) {
  if (!low && !high) return null;
  const l = parseFloat(low), h = parseFloat(high), v = parseFloat(value);
  const min = Math.min(l, v) * 0.85, max = Math.max(h, v) * 1.15;
  const pct = Math.min(100, Math.max(0, ((v - min) / (max - min)) * 100));
  const lowPct = Math.min(100, Math.max(0, ((l - min) / (max - min)) * 100));
  const highPct = Math.min(100, Math.max(0, ((h - min) / (max - min)) * 100));
  return (
    <div className="relative h-2 rounded-full mt-2" style={{ background: 'var(--hf-border)' }}>
      <div className="absolute h-full rounded-full" style={{ left: `${lowPct}%`, width: `${highPct - lowPct}%`, background: 'rgba(168,230,207,0.5)' }} />
      <div className="absolute w-3 h-3 rounded-full -top-0.5 -translate-x-1/2" style={{ left: `${pct}%`, background: v < l ? '#9bb4ff' : v > h ? '#f28c8c' : '#a8e6cf', border: '2px solid var(--hf-surface)' }} />
    </div>
  );
}

export default function LabResults() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterFlag, setFilterFlag] = useState('all');
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState(BLANK);
  const [activeTab, setActiveTab] = useState('results');

  const queryClient = useQueryClient();
  const { activeProfileId, activeProfile } = useActiveProfile();

  const { data: allResults = [], isLoading } = useQuery({
    queryKey: ['labResults', activeProfileId],
    queryFn: () => base44.entities.LabResult.filter({ profile_id: activeProfileId }, '-test_date'),
    enabled: !!activeProfileId,
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setFormData(BLANK);
  };

  const createMut = useMutation({
    mutationFn: (data) => base44.entities.LabResult.create(data),
    onSuccess: () => { queryClient.invalidateQueries(['labResults', activeProfileId]); closeDialog(); toast.success('Lab result added'); },
  });

  const deleteMut = useMutation({
    mutationFn: (id) => base44.entities.LabResult.delete(id),
    onSuccess: () => { queryClient.invalidateQueries(['labResults', activeProfileId]); toast.success('Deleted'); },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!activeProfileId) { toast.error('No profile selected'); return; }
    const flag = calcFlag(formData.value, formData.reference_low, formData.reference_high);
    createMut.mutate({
      ...formData, profile_id: activeProfileId,
      value: parseFloat(formData.value),
      reference_low: formData.reference_low ? parseFloat(formData.reference_low) : undefined,
      reference_high: formData.reference_high ? parseFloat(formData.reference_high) : undefined,
      flag,
    });
  };

  const filtered = useMemo(() => {
    return allResults.filter(r => {
      const catOk = filterCategory === 'all' || r.test_category === filterCategory;
      const flagOk = filterFlag === 'all' || r.flag === filterFlag;
      const searchOk = !search || r.test_name.toLowerCase().includes(search.toLowerCase());
      return catOk && flagOk && searchOk;
    });
  }, [allResults, filterCategory, filterFlag, search]);

  const abnormal = allResults.filter(r => r.flag !== 'normal');
  const normal = allResults.filter(r => r.flag === 'normal');

  // Trend data for overview
  const testGroups = useMemo(() => {
    const g = {};
    allResults.forEach(r => {
      if (!g[r.test_name]) g[r.test_name] = [];
      g[r.test_name].push({ date: format(new Date(r.test_date), 'MMM d'), value: r.value, flag: r.flag });
    });
    Object.values(g).forEach(arr => arr.sort((a, b) => new Date(a.date) - new Date(b.date)));
    return g;
  }, [allResults]);

  return (
    <div className="bento-page">
      <div className="bento-header flex justify-between items-start">
        <div>
          <h1 className="bento-title">Lab Results</h1>
          <p className="bento-subtitle">{activeProfile?.full_name || 'Your'} lab history</p>
        </div>
        <Button onClick={() => { Haptics.light(); closeDialog(); setDialogOpen(true); }} className="rounded-2xl font-bold h-11 px-5 active-press" style={{ background: '#a8e6cf', color: '#003d20' }}>
          <Plus className="w-4 h-4 mr-2" /> Add
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { label: 'Total', value: allResults.length, color: 'var(--hf-mint-strong)', text: '#003d20', icon: '🔬' },
          { label: 'Abnormal', value: abnormal.length, color: 'var(--hf-coral-strong)', text: '#3d0000', icon: '⚠️' },
          { label: 'Normal', value: normal.length, color: 'var(--hf-lemon-strong)', text: '#0a1200', icon: '✅' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl p-3 text-center" style={{ background: s.color }}>
            <span className="text-lg">{s.icon}</span>
            <p className="text-xl font-black mt-0.5" style={{ color: s.text }}>{s.value}</p>
            <p className="text-[8px] font-bold uppercase opacity-70" style={{ color: s.text }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 mb-4">
        {['results', 'trends', 'abnormal'].map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className="px-4 py-2 rounded-xl text-xs font-bold transition-all capitalize"
            style={{
              background: activeTab === t ? '#d7f576' : 'var(--hf-surface-2)',
              color: activeTab === t ? '#0a1200' : 'var(--hf-text-muted)',
              border: '1px solid var(--hf-border)',
            }}>
            {t === 'results' ? '🔬 Results' : t === 'trends' ? '📈 Trends' : '⚠️ Abnormal'}
          </button>
        ))}
      </div>

      {/* ── RESULTS TAB ── */}
      {activeTab === 'results' && (
        <div className="space-y-3">
          {/* Search & filters */}
          <div className="flex gap-2">
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tests…" className="h-10 rounded-xl text-xs flex-1" />
            <div className="w-32">
              <MobileSelect
                value={filterCategory}
                onValueChange={setFilterCategory}
                options={CATEGORIES.map(c => ({ value: c, label: c }))}
                placeholder="Category"
              />
            </div>
            <div className="w-28">
              <MobileSelect
                value={filterFlag}
                onValueChange={setFilterFlag}
                options={[
                  { value: 'all', label: 'All flags' },
                  { value: 'normal', label: 'Normal' },
                  { value: 'high', label: 'High' },
                  { value: 'low', label: 'Low' },
                ]}
                placeholder="Flag"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-16"><div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#a8e6cf', borderTopColor: 'transparent' }} /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-4xl mb-3">🔬</div>
              <p className="text-sm font-bold" style={{ color: 'var(--hf-text)' }}>No results found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(result => {
                const fs = FLAG_STYLE[result.flag] || FLAG_STYLE.normal;
                return (
                  <div key={result.id} className="p-4 rounded-2xl" style={{ background: fs.bg, border: `1px solid ${fs.border}` }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-bold truncate" style={{ color: 'var(--hf-text)' }}>{result.test_name}</h3>
                          <span className="text-[9px] font-black px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: fs.border, color: fs.text }}>{fs.label}</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-black" style={{ color: fs.text }}>{result.value}</span>
                          <span className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>{result.unit}</span>
                          {result.reference_low != null && result.reference_high != null && (
                            <span className="text-[10px]" style={{ color: 'var(--hf-text-muted)' }}>ref {result.reference_low}–{result.reference_high}</span>
                          )}
                        </div>
                        <RangeBar value={result.value} low={result.reference_low} high={result.reference_high} />
                        <div className="flex items-center gap-3 mt-2 text-[10px]" style={{ color: 'var(--hf-text-muted)' }}>
                          <span>{format(new Date(result.test_date), 'MMM d, yyyy')}</span>
                          {result.facility && <span>· {result.facility}</span>}
                          <span className="capitalize">· {result.test_category}</span>
                        </div>
                      </div>
                      <button onClick={() => { if (confirm('Delete this result?')) deleteMut.mutate(result.id); }}
                        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(242,140,140,0.15)' }}>
                        <Trash2 className="w-3.5 h-3.5" style={{ color: 'var(--hf-coral-strong)' }} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TRENDS TAB ── */}
      {activeTab === 'trends' && (
        <div className="space-y-4">
          {Object.keys(testGroups).length === 0 ? (
            <div className="text-center py-16"><p className="text-sm font-bold" style={{ color: 'var(--hf-text)' }}>No lab data yet</p></div>
          ) : (
            Object.entries(testGroups).filter(([, data]) => data.length >= 2).map(([name, data]) => (
              <Card key={name} className="border-0 card-shadow rounded-2xl">
                <CardHeader className="p-4 pb-0">
                  <CardTitle className="text-sm font-bold" style={{ color: 'var(--hf-text)' }}>{name}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-2 h-[120px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                      <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'var(--hf-text-muted)' }} axisLine={false} tickLine={false} />
                      <YAxis hide domain={['auto', 'auto']} />
                      <Tooltip contentStyle={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)', borderRadius: 10, fontSize: 10 }} />
                      <Area type="monotone" dataKey="value" stroke="#c9bbff" fill="rgba(201,187,255,0.15)" strokeWidth={2} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            ))
          )}
          {Object.keys(testGroups).filter(name => testGroups[name].length < 2).length > 0 && (
            <p className="text-xs text-center" style={{ color: 'var(--hf-text-muted)' }}>Tests with a single entry don't show a trend chart.</p>
          )}
        </div>
      )}

      {/* ── ABNORMAL TAB ── */}
      {activeTab === 'abnormal' && (
        <div className="space-y-3">
          {abnormal.length === 0 ? (
            <div className="flex flex-col items-center py-16 gap-3">
              <div className="text-4xl">🟢</div>
              <p className="text-sm font-bold" style={{ color: 'var(--hf-mint-strong)' }}>All results are normal!</p>
            </div>
          ) : (
            <>
              <div className="p-3 rounded-xl flex items-center gap-2" style={{ background: 'rgba(242,140,140,0.1)', border: '1px solid rgba(242,140,140,0.25)' }}>
                <AlertTriangle size={14} style={{ color: 'var(--hf-coral-strong)' }} />
                <p className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>{abnormal.length} result{abnormal.length > 1 ? 's' : ''} outside normal range. Consult your doctor.</p>
              </div>
              {abnormal.map(result => {
                const fs = FLAG_STYLE[result.flag] || FLAG_STYLE.normal;
                return (
                  <div key={result.id} className="p-4 rounded-2xl" style={{ background: fs.bg, border: `1px solid ${fs.border}` }}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-bold" style={{ color: 'var(--hf-text)' }}>{result.test_name}</p>
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-full" style={{ background: fs.border, color: fs.text }}>{fs.label}</span>
                    </div>
                    <p className="text-xl font-black" style={{ color: fs.text }}>{result.value} <span className="text-xs font-normal">{result.unit}</span></p>
                    {result.reference_low != null && result.reference_high != null && (
                      <p className="text-[10px] mt-0.5" style={{ color: 'var(--hf-text-muted)' }}>Normal range: {result.reference_low} – {result.reference_high} {result.unit}</p>
                    )}
                    <RangeBar value={result.value} low={result.reference_low} high={result.reference_high} />
                    <p className="text-[10px] mt-2" style={{ color: 'var(--hf-text-muted)' }}>{format(new Date(result.test_date), 'MMM d, yyyy')}</p>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      <ResponsiveOverlay
        open={dialogOpen}
        onOpenChange={(value) => {
          if (!value) {
            closeDialog();
            return;
          }
          setDialogOpen(true);
        }}
        title="Add Lab Result"
        desktopClassName="max-w-xl"
      >
        <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Test Name *</Label>
                <Input value={formData.test_name} onChange={e => setFormData(f => ({ ...f, test_name: e.target.value }))} placeholder="e.g., Hemoglobin" className="h-11 rounded-2xl" required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Category *</Label>
                <MobileSelect
                  value={formData.test_category}
                  onValueChange={v => setFormData(f => ({ ...f, test_category: v }))}
                  options={CATEGORIES.filter(c => c !== 'all').map(c => ({ value: c, label: c }))}
                  placeholder="Select category"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Value *</Label>
                <Input type="number" step="0.01" value={formData.value} onChange={e => setFormData(f => ({ ...f, value: e.target.value }))} placeholder="13.5" className="h-11 rounded-2xl" required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Unit *</Label>
                <Input value={formData.unit} onChange={e => setFormData(f => ({ ...f, unit: e.target.value }))} placeholder="g/dL" className="h-11 rounded-2xl" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Reference Low</Label>
                <Input type="number" step="0.01" value={formData.reference_low} onChange={e => setFormData(f => ({ ...f, reference_low: e.target.value }))} placeholder="12.0" className="h-11 rounded-2xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Reference High</Label>
                <Input type="number" step="0.01" value={formData.reference_high} onChange={e => setFormData(f => ({ ...f, reference_high: e.target.value }))} placeholder="16.0" className="h-11 rounded-2xl" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Test Date *</Label>
                <Input type="date" value={formData.test_date} onChange={e => setFormData(f => ({ ...f, test_date: e.target.value }))} className="h-11 rounded-2xl" required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Lab Facility</Label>
                <Input value={formData.facility} onChange={e => setFormData(f => ({ ...f, facility: e.target.value }))} placeholder="City Lab" className="h-11 rounded-2xl" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Notes</Label>
              <Textarea value={formData.notes} onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))} placeholder="Additional notes" rows={2} className="rounded-2xl text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <Button type="button" variant="outline" onClick={closeDialog} className="rounded-2xl h-11">Cancel</Button>
              <Button type="submit" onClick={() => Haptics.light()} className="rounded-2xl h-11 font-bold" style={{ background: '#a8e6cf', color: '#003d20' }} disabled={createMut.isPending}>Add Result</Button>
            </div>
        </form>
      </ResponsiveOverlay>
    </div>
  );
}
