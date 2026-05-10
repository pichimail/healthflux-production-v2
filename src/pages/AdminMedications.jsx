import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from '../components/admin/AdminLayout';
import { Pill, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AdminMedications() {
  const [search, setSearch] = useState('');
  const [filterFreq, setFilterFreq] = useState('all');
  const [filterActive, setFilterActive] = useState('all');

  const { data: medications = [], isLoading } = useQuery({
    queryKey: ['admin-medications-full'],
    queryFn: () => base44.entities.Medication.list('-created_date', 500),
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['admin-med-logs'],
    queryFn: () => base44.entities.MedicationLog.list('-created_date', 1000),
  });

  const filtered = medications.filter(m => {
    const matchSearch = !search ||
      m.medication_name?.toLowerCase().includes(search.toLowerCase()) ||
      m.created_by?.toLowerCase().includes(search.toLowerCase());
    const matchFreq = filterFreq === 'all' || m.frequency === filterFreq;
    const matchActive = filterActive === 'all' ||
      (filterActive === 'active' ? m.is_active : !m.is_active);
    return matchSearch && matchFreq && matchActive;
  });

  const getAdherence = (medId) => {
    const medLogs = logs.filter(l => l.medication_id === medId);
    if (medLogs.length === 0) return '—';
    const taken = medLogs.filter(l => l.status === 'taken').length;
    return `${Math.round((taken / medLogs.length) * 100)}%`;
  };

  return (
    <AdminLayout currentPageName="AdminMedications">
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--hf-text)' }}>Medications</h1>
          <p className="text-sm" style={{ color: 'var(--hf-text-muted)' }}>{medications.length} total medications</p>
        </div>

        {/* Stat tiles */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total', value: medications.length, bg: '#d7f576', text: '#0a1200' },
            { label: 'Active', value: medications.filter(m => m.is_active).length, bg: '#a8e6cf', text: '#003d20' },
            { label: 'Inactive', value: medications.filter(m => !m.is_active).length, bg: '#f7c9a3', text: '#3d1a00' },
          ].map(s => (
            <div key={s.label} className="rounded-[22px] p-4" style={{ background: s.bg, color: s.text }}>
              <p className="text-2xl font-black">{s.value}</p>
              <p className="text-xs font-bold mt-0.5 opacity-70">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--hf-text-muted)' }} />
            <Input placeholder="Search medication or owner..." value={search} onChange={e => setSearch(e.target.value)}
              className="pl-9 h-10 rounded-xl" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }} />
          </div>
          <Select value={filterActive} onValueChange={setFilterActive}>
            <SelectTrigger className="h-10 w-32 rounded-xl" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }}>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterFreq} onValueChange={setFilterFreq}>
            <SelectTrigger className="h-10 w-44 rounded-xl" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }}>
              <SelectValue placeholder="Frequency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Frequencies</SelectItem>
              {['once_daily','twice_daily','three_times_daily','four_times_daily','as_needed','custom'].map(f => (
                <SelectItem key={f} value={f}>{f.replace(/_/g,' ')}</SelectItem>
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
                  {['Medication', 'Dosage', 'Frequency', 'Owner', 'Adherence', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--hf-text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="text-center py-12 text-sm" style={{ color: 'var(--hf-text-muted)' }}>Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-sm" style={{ color: 'var(--hf-text-muted)' }}>No medications found</td></tr>
                ) : filtered.slice(0, 200).map(med => (
                  <tr key={med.id} style={{ borderBottom: '1px solid var(--hf-border)' }}>
                    <td className="px-4 py-3 text-sm font-semibold" style={{ color: 'var(--hf-text)' }}>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#f7c9a3' }}>
                          <Pill size={12} style={{ color: '#3d1a00' }} />
                        </div>
                        <span className="truncate max-w-[120px]">{med.medication_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--hf-text-muted)' }}>{med.dosage || '—'}</td>
                    <td className="px-4 py-3 text-xs capitalize" style={{ color: 'var(--hf-text-muted)' }}>{med.frequency?.replace(/_/g,' ')}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--hf-text-muted)' }}>{med.created_by || '—'}</td>
                    <td className="px-4 py-3 text-xs font-bold" style={{ color: 'var(--hf-lemon-strong)' }}>{getAdherence(med.id)}</td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-bold px-2 py-1 rounded-full"
                        style={{ background: med.is_active ? '#a8e6cf' : 'var(--hf-surface-2)', color: med.is_active ? '#003d20' : 'var(--hf-text-muted)' }}>
                        {med.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}