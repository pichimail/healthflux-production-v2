import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '../components/admin/AdminLayout.jsx';
import UserDetailDrawer from '../components/admin/UserDetailDrawer.jsx';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Search, Loader2, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

const PLAN_COLORS = {
  free: { bg: '#a8e6cf22', color: 'var(--hf-mint-strong)', label: 'Free' },
  pro: { bg: '#d7f57622', color: 'var(--hf-lemon-strong)', label: 'Pro' },
  enterprise: { bg: '#c9bbff22', color: 'var(--hf-lavender-strong)', label: 'Enterprise' },
};

export default function AdminUsers() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const qc = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users-page'],
    queryFn: () => base44.entities.User.list('-created_date'),
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['admin-all-profiles'],
    queryFn: () => base44.entities.Profile.list('-created_date', 500),
  });

  const { data: subs = [] } = useQuery({
    queryKey: ['admin-all-subs'],
    queryFn: () => base44.entities.UserSubscription.list('-created_date', 500),
  });

  const { data: credits = [] } = useQuery({
    queryKey: ['admin-all-credits'],
    queryFn: () => base44.entities.UserCredits.list('-created_date', 500),
  });

  const getPlan = (email) => {
    const sub = subs.find(s => s.user_email === email && (s.status === 'active' || s.status === 'trialing'));
    return sub?.plan_key || 'free';
  };

  const getCredits = (email) => {
    const c = credits.find(c => c.user_email === email);
    return c?.credits_balance ?? 0;
  };

  const getProfileCount = (email) => profiles.filter(p => p.created_by === email).length;

  const roleColor = (role) => role === 'admin'
    ? { bg: '#d7f576', color: '#0a1200' }
    : { bg: 'rgba(155,180,255,0.15)', color: 'var(--hf-sky-strong)' };

  const filteredUsers = users.filter(u => {
    const matchSearch = u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.full_name?.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const adminCount = users.filter(u => u.role === 'admin').length;
  const proCount = subs.filter(s => s.plan_key === 'pro' && s.status === 'active').length;
  const entCount = subs.filter(s => s.plan_key === 'enterprise' && s.status === 'active').length;

  return (
    <AdminLayout currentPageName="AdminUsers">
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row justify-between gap-3 items-start sm:items-center">
          <div>
            <h1 className="text-2xl font-black" style={{ color: 'var(--hf-text)' }}>Users</h1>
            <p className="text-sm" style={{ color: 'var(--hf-text-muted)' }}>{users.length} registered · {adminCount} admins</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-56">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--hf-text-muted)' }} />
              <Input placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}
                className="pl-8 rounded-2xl text-sm h-9"
                style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }} />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="rounded-2xl h-9 w-28 text-sm"
                style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="user">Users</SelectItem>
                <SelectItem value="admin">Admins</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Users', value: users.length, bg: '#d7f576', color: '#0a1200' },
            { label: 'Admins', value: adminCount, bg: '#c9bbff', color: '#1a0a40' },
            { label: 'Pro Plans', value: proCount, bg: '#f7c9a3', color: '#3d1a00' },
            { label: 'Enterprise', value: entCount, bg: '#a8e6cf', color: '#003d20' },
          ].map(s => (
            <div key={s.label} className="rounded-[20px] p-4" style={{ background: s.bg }}>
              <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs font-bold mt-0.5" style={{ color: s.color, opacity: 0.7 }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="rounded-[22px] overflow-hidden" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
          {/* Header */}
          <div className="grid grid-cols-12 gap-2 px-4 py-3 border-b" style={{ borderColor: 'var(--hf-border)' }}>
            {[
              { label: 'User', cls: 'col-span-4' },
              { label: 'Plan', cls: 'col-span-2 hidden sm:block' },
              { label: 'Credits', cls: 'col-span-2 hidden md:block' },
              { label: 'Profiles', cls: 'col-span-1 hidden sm:block' },
              { label: 'Joined', cls: 'col-span-2 hidden lg:block' },
              { label: '', cls: 'col-span-1' },
            ].map(h => (
              <div key={h.label} className={`${h.cls} text-[10px] font-black uppercase tracking-wider`} style={{ color: 'var(--hf-text-muted)' }}>
                {h.label}
              </div>
            ))}
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--hf-lemon-strong)' }} />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--hf-text-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--hf-text-muted)' }}>No users found</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--hf-border)' }}>
              {filteredUsers.map(u => {
                const rc = roleColor(u.role);
                const plan = getPlan(u.email);
                const pc = PLAN_COLORS[plan] || PLAN_COLORS.free;
                const cr = getCredits(u.email);
                return (
                  <div key={u.id}
                    className="grid grid-cols-12 gap-2 items-center px-4 py-3 hover:bg-white/2 transition-colors cursor-pointer"
                    onClick={() => setSelectedUser(u)}>
                    {/* User */}
                    <div className="col-span-4 flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center"
                        style={{ background: u.role === 'admin' ? '#d7f576' : '#c9bbff' }}>
                        <span className="text-[11px] font-black" style={{ color: u.role === 'admin' ? '#0a1200' : '#1a0a40' }}>
                          {u.full_name?.[0] || u.email?.[0] || '?'}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate" style={{ color: 'var(--hf-text)' }}>{u.full_name || 'No name'}</p>
                        <p className="text-[10px] truncate" style={{ color: 'var(--hf-text-muted)' }}>{u.email}</p>
                      </div>
                    </div>
                    {/* Plan */}
                    <div className="col-span-2 hidden sm:flex items-center">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: pc.bg, color: pc.color }}>
                        {pc.label}
                      </span>
                    </div>
                    {/* Credits */}
                    <div className="col-span-2 hidden md:block">
                      <span className="text-xs font-bold" style={{ color: cr > 0 ? '#d7f576' : 'var(--hf-text-muted)' }}>{cr}</span>
                    </div>
                    {/* Profiles */}
                    <div className="col-span-1 hidden sm:block">
                      <span className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>{getProfileCount(u.email)}</span>
                    </div>
                    {/* Joined */}
                    <div className="col-span-2 hidden lg:block">
                      <span className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>
                        {u.created_date ? format(new Date(u.created_date), 'MMM d, yyyy') : '—'}
                      </span>
                    </div>
                    {/* Role + action */}
                    <div className="col-span-1 flex justify-end items-center gap-2">
                      <ArrowRight size={14} style={{ color: 'var(--hf-text-muted)' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {selectedUser && (
        <UserDetailDrawer user={selectedUser} onClose={() => setSelectedUser(null)} />
      )}
    </AdminLayout>
  );
}