import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from '../components/admin/AdminLayout';
import { Search, X } from 'lucide-react';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Drawer } from 'vaul';

export default function AdminInsights() {
  const [search, setSearch] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [selectedInsight, setSelectedInsight] = useState(null);

  const { data: insights = [], isLoading } = useQuery({
    queryKey: ['admin-insights-full'],
    queryFn: () => base44.entities.HealthInsight.list('-created_date', 500),
  });

  const filtered = insights.filter(i => {
    const matchSearch = !search ||
      i.title?.toLowerCase().includes(search.toLowerCase()) ||
      i.created_by?.toLowerCase().includes(search.toLowerCase());
    const matchSeverity = filterSeverity === 'all' || i.severity === filterSeverity;
    const matchType = filterType === 'all' || i.insight_type === filterType;
    return matchSearch && matchSeverity && matchType;
  });

  const severityColor = (s) => {
    if (s === 'critical') return { bg: '#f28c8c', text: '#3d0000' };
    if (s === 'high') return { bg: '#f7c9a3', text: '#3d1a00' };
    if (s === 'medium') return { bg: '#d7f576', text: '#0a1200' };
    if (s === 'low') return { bg: '#a8e6cf', text: '#003d20' };
    return { bg: 'var(--hf-surface-2)', text: 'var(--hf-text-muted)' };
  };

  return (
    <AdminLayout currentPageName="AdminInsights">
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--hf-text)' }}>AI Insights</h1>
          <p className="text-sm" style={{ color: 'var(--hf-text-muted)' }}>{insights.length} total insights</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--hf-text-muted)' }} />
            <Input placeholder="Search title or owner..." value={search} onChange={e => setSearch(e.target.value)}
              className="pl-9 h-10 rounded-xl" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }} />
          </div>
          <Select value={filterSeverity} onValueChange={setFilterSeverity}>
            <SelectTrigger className="h-10 w-36 rounded-xl" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }}>
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severity</SelectItem>
              {['info','low','medium','high','critical'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="h-10 w-44 rounded-xl" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }}>
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {['risk_assessment','trend_analysis','recommendation','alert','summary'].map(t => (
                <SelectItem key={t} value={t}>{t.replace(/_/g,' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-[22px] overflow-hidden" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--hf-border)' }}>
                  {['Title', 'Type', 'Owner', 'Severity', 'Created'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--hf-text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={5} className="text-center py-12 text-sm" style={{ color: 'var(--hf-text-muted)' }}>Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-12 text-sm" style={{ color: 'var(--hf-text-muted)' }}>No insights found</td></tr>
                ) : filtered.slice(0, 200).map(insight => {
                  const sc = severityColor(insight.severity);
                  return (
                    <tr key={insight.id} className="cursor-pointer hover:bg-white/3 transition-colors"
                      style={{ borderBottom: '1px solid var(--hf-border)' }}
                      onClick={() => setSelectedInsight(insight)}>
                      <td className="px-4 py-3 text-sm font-semibold max-w-[200px] truncate" style={{ color: 'var(--hf-text)' }}>{insight.title}</td>
                      <td className="px-4 py-3 text-xs capitalize" style={{ color: 'var(--hf-text-muted)' }}>{insight.insight_type?.replace(/_/g,' ')}</td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--hf-text-muted)' }}>{insight.created_by || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-bold px-2 py-1 rounded-full capitalize" style={{ background: sc.bg, color: sc.text }}>{insight.severity}</span>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--hf-text-muted)' }}>{insight.created_date ? format(new Date(insight.created_date), 'MMM d, yyyy') : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Insight Detail Drawer */}
      <Drawer.Root open={!!selectedInsight} onOpenChange={v => { if (!v) setSelectedInsight(null); }}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/60 z-50" />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 z-[60] rounded-t-3xl"
            style={{ backgroundColor: 'var(--hf-surface)', maxHeight: '75dvh', border: '1px solid var(--hf-border)', borderBottom: 'none' }}>
            <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1.5 rounded-full" style={{ background: 'var(--hf-border-strong)' }} /></div>
            {selectedInsight && (
              <div className="overflow-y-auto px-5 pb-10 pt-2">
                <div className="flex items-start justify-between mb-4 gap-3">
                  <h2 className="text-base font-bold" style={{ color: 'var(--hf-text)' }}>{selectedInsight.title}</h2>
                  <button onClick={() => setSelectedInsight(null)}><X size={18} style={{ color: 'var(--hf-text-muted)' }} /></button>
                </div>
                <div className="space-y-3 text-sm">
                  {[
                    ['Type', selectedInsight.insight_type?.replace(/_/g,' ')],
                    ['Severity', selectedInsight.severity],
                    ['Owner', selectedInsight.created_by],
                    ['Confidence', selectedInsight.ai_confidence ? `${(selectedInsight.ai_confidence * 100).toFixed(0)}%` : null],
                    ['Created', selectedInsight.created_date ? format(new Date(selectedInsight.created_date), 'PPP') : '—'],
                  ].map(([label, val]) => val ? (
                    <div key={label} className="flex justify-between">
                      <span style={{ color: 'var(--hf-text-muted)' }}>{label}</span>
                      <span className="font-semibold capitalize" style={{ color: 'var(--hf-text)' }}>{val}</span>
                    </div>
                  ) : null)}
                  {selectedInsight.description && (
                    <div className="mt-4 p-3 rounded-2xl" style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)' }}>
                      <p className="text-xs font-bold mb-1" style={{ color: 'var(--hf-text-muted)' }}>Description</p>
                      <p className="text-xs" style={{ color: 'var(--hf-text)' }}>{selectedInsight.description}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </AdminLayout>
  );
}