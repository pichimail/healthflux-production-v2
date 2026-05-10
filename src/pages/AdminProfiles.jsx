import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from '../components/admin/AdminLayout';
import { Search } from 'lucide-react';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AdminProfiles() {
  const [search, setSearch] = useState('');
  const [filterRelationship, setFilterRelationship] = useState('all');

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['admin-profiles-full'],
    queryFn: () => base44.entities.Profile.list('-created_date', 500),
  });

  const { data: careCircle = [] } = useQuery({
    queryKey: ['admin-carecircle'],
    queryFn: () => base44.entities.CareCircle.list('-created_date', 500),
  });

  const filtered = profiles.filter(p => {
    const matchSearch = !search ||
      p.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.created_by?.toLowerCase().includes(search.toLowerCase());
    const matchRel = filterRelationship === 'all' || p.relationship === filterRelationship;
    return matchSearch && matchRel;
  });

  const getCaregiverCount = (profileId) => {
    return careCircle.filter(cc => cc.profile_id === profileId && cc.status === 'active').length;
  };

  return (
    <AdminLayout currentPageName="AdminProfiles">
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--hf-text)' }}>Profiles</h1>
          <p className="text-sm" style={{ color: 'var(--hf-text-muted)' }}>{profiles.length} total profiles</p>
        </div>

        {/* Stat tiles */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {['self','spouse','child','parent','sibling','other'].map(rel => {
            const count = profiles.filter(p => p.relationship === rel).length;
            return (
              <div key={rel} className="rounded-[22px] p-3" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
                <p className="text-xl font-black" style={{ color: 'var(--hf-text)' }}>{count}</p>
                <p className="text-[10px] font-bold capitalize mt-0.5" style={{ color: 'var(--hf-text-muted)' }}>{rel}</p>
              </div>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--hf-text-muted)' }} />
            <Input placeholder="Search by name or owner..." value={search} onChange={e => setSearch(e.target.value)}
              className="pl-9 h-10 rounded-xl" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }} />
          </div>
          <Select value={filterRelationship} onValueChange={setFilterRelationship}>
            <SelectTrigger className="h-10 w-40 rounded-xl" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }}>
              <SelectValue placeholder="Relationship" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {['self','spouse','child','parent','sibling','other'].map(r => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
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
                  {['Name', 'Relationship', 'Owner', 'Blood Group', 'Caregivers', 'Created'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--hf-text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={6} className="text-center py-12 text-sm" style={{ color: 'var(--hf-text-muted)' }}>Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-sm" style={{ color: 'var(--hf-text-muted)' }}>No profiles found</td></tr>
                ) : filtered.slice(0, 200).map(profile => (
                  <tr key={profile.id} style={{ borderBottom: '1px solid var(--hf-border)' }}>
                    <td className="px-4 py-3 text-sm font-semibold" style={{ color: 'var(--hf-text)' }}>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#c9bbff' }}>
                          <span className="text-xs font-bold text-[#1a0a40]">{profile.full_name?.[0]}</span>
                        </div>
                        {profile.full_name}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-bold px-2 py-1 rounded-full capitalize"
                        style={{ background: profile.relationship === 'self' ? '#d7f576' : 'var(--hf-surface-2)', color: profile.relationship === 'self' ? '#0a1200' : 'var(--hf-text-muted)' }}>
                        {profile.relationship}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--hf-text-muted)' }}>{profile.created_by || '—'}</td>
                    <td className="px-4 py-3 text-xs font-bold" style={{ color: 'var(--hf-lemon-strong)' }}>{profile.blood_group || '—'}</td>
                    <td className="px-4 py-3 text-xs font-bold" style={{ color: 'var(--hf-text)' }}>{getCaregiverCount(profile.id)}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--hf-text-muted)' }}>{profile.created_date ? format(new Date(profile.created_date), 'MMM d, yyyy') : '—'}</td>
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