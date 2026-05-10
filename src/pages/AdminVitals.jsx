import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from '../components/admin/AdminLayout';
import { Search } from 'lucide-react';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

const VITAL_TYPES = ['blood_pressure','heart_rate','temperature','weight','height','bmi','blood_glucose','oxygen_saturation','respiratory_rate'];

export default function AdminVitals() {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');

  const { data: vitals = [], isLoading } = useQuery({
    queryKey: ['admin-vitals-full'],
    queryFn: () => base44.entities.VitalMeasurement.list('-measured_at', 500),
  });

  const filtered = vitals.filter(v => {
    const matchSearch = !search || v.created_by?.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || v.vital_type === filterType;
    return matchSearch && matchType;
  });

  // Chart: vitals per day (last 14 days)
  const last14 = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    const ds = d.toDateString();
    return {
      day: format(d, 'MM/dd'),
      count: vitals.filter(v => new Date(v.measured_at).toDateString() === ds).length,
    };
  });

  const displayValue = (v) => {
    if (v.vital_type === 'blood_pressure') return `${v.systolic}/${v.diastolic} mmHg`;
    return `${v.value ?? '—'} ${v.unit || ''}`;
  };

  return (
    <AdminLayout currentPageName="AdminVitals">
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--hf-text)' }}>Vitals Logged</h1>
          <p className="text-sm" style={{ color: 'var(--hf-text-muted)' }}>{vitals.length} total measurements</p>
        </div>

        {/* Chart */}
        <div className="rounded-[22px] p-5" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
          <p className="text-xs font-bold uppercase tracking-wide mb-4" style={{ color: 'var(--hf-text-muted)' }}>Vitals Per Day (Last 14 days)</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={last14}>
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--hf-text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--hf-text-muted)' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)', borderRadius: 12, fontSize: 11, color: 'var(--hf-text)' }} />
              <Bar dataKey="count" fill="#a8e6cf" radius={[6, 6, 0, 0]} name="Vitals" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--hf-text-muted)' }} />
            <Input placeholder="Search by owner..." value={search} onChange={e => setSearch(e.target.value)}
              className="pl-9 h-10 rounded-xl" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }} />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="h-10 w-48 rounded-xl" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }}>
              <SelectValue placeholder="Vital Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {VITAL_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g,' ')}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-[22px] overflow-hidden" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--hf-border)' }}>
                  {['Metric', 'Value', 'Owner', 'Measured At'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--hf-text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={4} className="text-center py-12 text-sm" style={{ color: 'var(--hf-text-muted)' }}>Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-12 text-sm" style={{ color: 'var(--hf-text-muted)' }}>No vitals found</td></tr>
                ) : filtered.slice(0, 200).map(v => (
                  <tr key={v.id} style={{ borderBottom: '1px solid var(--hf-border)' }}>
                    <td className="px-4 py-3 text-sm font-semibold capitalize" style={{ color: 'var(--hf-text)' }}>{v.vital_type?.replace(/_/g,' ')}</td>
                    <td className="px-4 py-3 text-sm font-bold" style={{ color: 'var(--hf-lemon-strong)' }}>{displayValue(v)}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--hf-text-muted)' }}>{v.created_by || '—'}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--hf-text-muted)' }}>{v.measured_at ? format(new Date(v.measured_at), 'MMM d, yyyy HH:mm') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length > 200 && (
            <p className="text-center text-xs py-3" style={{ color: 'var(--hf-text-muted)' }}>Showing 200 of {filtered.length} records</p>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}