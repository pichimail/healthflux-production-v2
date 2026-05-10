import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import AdminLayout from '../components/admin/AdminLayout.jsx';
import { FileText, Bell,
  ArrowUpRight
} from 'lucide-react';
import { format } from 'date-fns';
import { XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, CartesianGrid
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { getAdminStats } from '@/services/admin-stats';

const PIE_COLORS = ['#d7f576','#c9bbff','#f7c9a3','#9bb4ff','#a8e6cf','#f28c8c'];
const tooltipStyle = { background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)', borderRadius: 12, fontSize: 11, color: 'var(--hf-text)' };

const TABS = [
  { id: 'overview',   label: '🏠 Overview',    },
  { id: 'users',      label: '👥 Users',       },
  { id: 'health',     label: '💓 Health Data', },
  { id: 'system',     label: '⚙️ System',      },
];

// ── Stat chip ──
function StatChip({ label, value, bg, tc, onClick }) {
  return (
    <button onClick={onClick}
      className="rounded-[22px] p-4 text-left active:scale-[0.97] transition-transform group relative"
      style={{ background: bg }}>
      <ArrowUpRight size={12} className="absolute top-3 right-3 opacity-0 group-hover:opacity-60 transition-opacity" style={{ color: tc }} />
      <p className="text-2xl font-black leading-none" style={{ color: tc }}>{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-wide mt-1" style={{ color: tc, opacity: 0.65 }}>{label}</p>
    </button>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  const { data: users = [] }     = useQuery({ queryKey: ['admin-users'],     queryFn: () => base44.entities.User.list('-created_date') });
  const { data: profiles = [] }  = useQuery({ queryKey: ['admin-profiles'],  queryFn: () => base44.entities.Profile.list('-created_date', 200) });
  const { data: documents = [] } = useQuery({ queryKey: ['admin-documents'], queryFn: () => base44.entities.MedicalDocument.list('-created_date', 200) });
  const { data: vitals = [] }    = useQuery({ queryKey: ['admin-vitals'],    queryFn: () => base44.entities.VitalMeasurement.list('-measured_at', 200) });
  const { data: insights = [] }  = useQuery({ queryKey: ['admin-insights'],  queryFn: () => base44.entities.HealthInsight.list('-created_date', 100) });
  const { data: meds = [] }      = useQuery({ queryKey: ['admin-meds'],      queryFn: () => base44.entities.Medication.list('-created_date', 200) });
  const { data: subs = [] }      = useQuery({ queryKey: ['admin-subs'],      queryFn: () => base44.entities.UserSubscription.list('-created_date', 200) });
  const { data: notifs = [] }    = useQuery({ queryKey: ['admin-notifs-dash'],queryFn: () => base44.entities.Notification.list('-created_date', 20) });
  const { data: statsData = null } = useQuery({ queryKey: ['admin-stats-dashboard'], queryFn: () => getAdminStats('dashboard') });

  const today = new Date().toDateString();
  const metrics = statsData?.metrics || {};
  const todayDocs = statsData?.today?.documents ?? documents.filter(d => new Date(d.created_date).toDateString() === today).length;
  const todayVitals = statsData?.today?.vitals ?? vitals.filter(v => new Date(v.measured_at).toDateString() === today).length;
  const activeUsers = metrics.active_users ?? new Set(profiles.map(p => p.created_by)).size;
  const activeSubs = metrics.active_subscriptions ?? subs.filter(s => s.status === 'active').length;

  const last7Days = useMemo(() => {
    if (Array.isArray(statsData?.activity) && statsData.activity.length > 0) {
      return statsData.activity;
    }

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i));
      const ds = d.toDateString();
      return {
        day: format(d, 'EEE'),
        docs: documents.filter(doc => new Date(doc.created_date).toDateString() === ds).length,
        vitals: vitals.filter(v => new Date(v.measured_at).toDateString() === ds).length,
        users: users.filter(u => u.created_date && new Date(u.created_date).toDateString() === ds).length,
      };
    });
  }, [documents, vitals, users, statsData]);

  const docPieData = useMemo(() => {
    if (Array.isArray(statsData?.documents_by_type) && statsData.documents_by_type.length > 0) {
      return statsData.documents_by_type.map((item) => ({
        name: (item.name || item.type || 'other').replace(/_/g,' '),
        value: item.value ?? item.count ?? 0,
      }));
    }
    const t = {};
    documents.forEach(d => { const k = d.document_type || 'other'; t[k] = (t[k] || 0) + 1; });
    return Object.entries(t).map(([name, value]) => ({ name: name.replace(/_/g,' '), value }));
  }, [documents, statsData]);

  const vitalPieData = useMemo(() => {
    if (Array.isArray(statsData?.vitals_by_type) && statsData.vitals_by_type.length > 0) {
      return statsData.vitals_by_type.map((item) => ({
        name: (item.name || item.type || 'other').replace(/_/g,' '),
        value: item.value ?? item.count ?? 0,
      }));
    }
    const t = {};
    vitals.forEach(v => { t[v.vital_type] = (t[v.vital_type] || 0) + 1; });
    return Object.entries(t).map(([name, value]) => ({ name: name.replace(/_/g,' '), value }));
  }, [vitals, statsData]);

  const tabContent = {
    overview: (
      <div className="space-y-5">
        {/* Today strip */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: '📄 Docs Today',    value: todayDocs,   bg: '#c9bbff33', tc: '#c9bbff' },
            { label: '💓 Vitals Today',  value: todayVitals, bg: '#d7f57633', tc: '#a8d600' },
            { label: '🟢 Active Users',  value: activeUsers, bg: '#a8e6cf33', tc: '#a8e6cf' },
          ].map(s => (
            <div key={s.label} className="rounded-[18px] p-4 text-center" style={{ background: s.bg }}>
              <p className="text-2xl font-black leading-none" style={{ color: s.tc }}>{s.value}</p>
              <p className="text-[9px] font-bold mt-1" style={{ color: s.tc, opacity: 0.7 }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* 7-day activity chart */}
        <div className="rounded-[22px] p-4" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
          <p className="text-[9px] font-black uppercase tracking-widest mb-3" style={{ color: 'var(--hf-text-muted)' }}>📈 7-Day Activity</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={last7Days} barGap={3}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--hf-border)" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 9, fill: 'var(--hf-text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: 'var(--hf-text-muted)' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="docs"   fill="#c9bbff" radius={[5,5,0,0]} name="Docs" />
              <Bar dataKey="vitals" fill="#d7f576" radius={[5,5,0,0]} name="Vitals" />
              <Bar dataKey="users"  fill="#a8e6cf" radius={[5,5,0,0]} name="New Users" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Main stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <StatChip label="👥 Total Users"   value={metrics.total_users ?? users.length}    bg="#d7f576" tc="#0a1200" onClick={() => navigate(createPageUrl('AdminUsers'))} />
          <StatChip label="📄 Documents"     value={metrics.total_documents ?? documents.length} bg="#c9bbff" tc="#1a0a40" onClick={() => navigate(createPageUrl('AdminDocuments'))} />
          <StatChip label="💓 Vitals"        value={metrics.total_vitals ?? vitals.length}   bg="#f7c9a3" tc="#3d1a00" onClick={() => navigate(createPageUrl('AdminVitals'))} />
          <StatChip label="🧠 AI Insights"   value={metrics.total_insights ?? insights.length} bg="#9bb4ff" tc="#0a1240" onClick={() => navigate(createPageUrl('AdminInsights'))} />
          <StatChip label="💊 Medications"   value={metrics.total_medications ?? meds.length}     bg="#a8e6cf" tc="#003d20" onClick={() => navigate(createPageUrl('AdminMedications'))} />
          <StatChip label="💳 Subscriptions" value={activeSubs}      bg="#f28c8c" tc="#3d0000" onClick={() => navigate(createPageUrl('AdminSubscriptions'))} />
        </div>
      </div>
    ),

    users: (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <StatChip label="👥 Total Users" value={users.length} bg="#d7f576" tc="#0a1200" onClick={() => navigate(createPageUrl('AdminUsers'))} />
          <StatChip label="🛡️ Admins"     value={users.filter(u => u.role === 'admin').length} bg="#c9bbff" tc="#1a0a40" onClick={() => navigate(createPageUrl('AdminRoles'))} />
          <StatChip label="💳 Active Subs" value={activeSubs} bg="#a8e6cf" tc="#003d20" onClick={() => navigate(createPageUrl('AdminSubscriptions'))} />
          <StatChip label="👤 Profiles"    value={profiles.length} bg="#f7c9a3" tc="#3d1a00" onClick={() => navigate(createPageUrl('AdminProfiles'))} />
        </div>

        {/* Recent users */}
        <div className="rounded-[22px] overflow-hidden" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--hf-border)' }}>
            <p className="text-xs font-black" style={{ color: 'var(--hf-text)' }}>👥 Recent Users</p>
          </div>
          <div className="p-3 space-y-2">
            {users.slice(0, 8).map(u => (
              <button key={u.id} onClick={() => navigate(createPageUrl('AdminUsers'))}
                className="w-full flex items-center gap-3 p-3 rounded-2xl text-left active:scale-[0.98] transition-transform"
                style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)' }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: u.role === 'admin' ? '#d7f576' : '#c9bbff' }}>
                  <span className="text-xs font-black" style={{ color: u.role === 'admin' ? '#0a1200' : '#1a0a40' }}>
                    {u.full_name?.[0] || u.email?.[0]}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate" style={{ color: 'var(--hf-text)' }}>{u.full_name || 'No name'}</p>
                  <p className="text-[10px] truncate" style={{ color: 'var(--hf-text-muted)' }}>{u.email}</p>
                </div>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{ background: u.role === 'admin' ? '#d7f576' : 'var(--hf-surface)', color: u.role === 'admin' ? '#0a1200' : 'var(--hf-text-muted)', border: '1px solid var(--hf-border)' }}>
                  {u.role}
                </span>
              </button>
            ))}
            {users.length === 0 && <p className="text-xs text-center py-6" style={{ color: 'var(--hf-text-muted)' }}>No users yet</p>}
          </div>
        </div>
      </div>
    ),

    health: (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatChip label="📄 Documents" value={documents.length} bg="#c9bbff" tc="#1a0a40" onClick={() => navigate(createPageUrl('AdminDocuments'))} />
          <StatChip label="💓 Vitals"    value={vitals.length}   bg="#d7f576" tc="#0a1200" onClick={() => navigate(createPageUrl('AdminVitals'))} />
          <StatChip label="💊 Meds"      value={meds.length}     bg="#a8e6cf" tc="#003d20" onClick={() => navigate(createPageUrl('AdminMedications'))} />
          <StatChip label="🧠 Insights"  value={insights.length} bg="#f7c9a3" tc="#3d1a00" onClick={() => navigate(createPageUrl('AdminInsights'))} />
        </div>

        {/* Doc breakdown */}
        <div className="rounded-[22px] p-4" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
          <p className="text-[9px] font-black uppercase tracking-widest mb-3" style={{ color: 'var(--hf-text-muted)' }}>📄 Documents by Type</p>
          {docPieData.length > 0 ? (
            <div className="flex items-center gap-4">
              <div style={{ width: 100, height: 100, flexShrink: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={docPieData} dataKey="value" cx="50%" cy="50%" innerRadius={25} outerRadius={45} paddingAngle={3}>
                      {docPieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-1.5">
                {docPieData.slice(0,5).map((d,i) => (
                  <div key={d.name} className="flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="capitalize truncate flex-1" style={{ color: 'var(--hf-text)' }}>{d.name}</span>
                    <span className="font-bold" style={{ color: 'var(--hf-text-muted)' }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <p className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>No documents yet</p>}
        </div>

        {/* Vitals breakdown */}
        <div className="rounded-[22px] p-4" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
          <p className="text-[9px] font-black uppercase tracking-widest mb-3" style={{ color: 'var(--hf-text-muted)' }}>💓 Vitals by Type</p>
          {vitalPieData.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {vitalPieData.map((v,i) => (
                <div key={v.name} className="rounded-[14px] p-3 text-center" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}>
                  <p className="text-xl font-black" style={{ color: '#0a1200' }}>{v.value}</p>
                  <p className="text-[9px] font-bold capitalize mt-0.5 truncate" style={{ color: '#0a1200', opacity: 0.65 }}>{v.name}</p>
                </div>
              ))}
            </div>
          ) : <p className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>No vitals yet</p>}
        </div>

        {/* Recent docs */}
        <div className="rounded-[22px] overflow-hidden" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--hf-border)' }}>
            <p className="text-xs font-black" style={{ color: 'var(--hf-text)' }}>📄 Recent Documents</p>
          </div>
          <div className="p-3 space-y-2">
            {documents.slice(0,6).map(d => (
              <div key={d.id} className="flex items-center gap-3 p-3 rounded-2xl" style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)' }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#9bb4ff' }}>
                  <FileText size={14} className="text-[#0a1240]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate" style={{ color: 'var(--hf-text)' }}>{d.title}</p>
                  <p className="text-[10px]" style={{ color: 'var(--hf-text-muted)' }}>{format(new Date(d.created_date), 'MMM d, yyyy')}</p>
                </div>
                <span className="text-[9px] capitalize" style={{ color: 'var(--hf-text-muted)' }}>{d.document_type?.replace(/_/g,' ')}</span>
              </div>
            ))}
            {documents.length === 0 && <p className="text-xs text-center py-6" style={{ color: 'var(--hf-text-muted)' }}>No documents yet</p>}
          </div>
        </div>
      </div>
    ),

    system: (
      <div className="space-y-4">
        {/* Quick links grid */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: '🔔 Notifications', value: notifs.length, bg: '#f7c9a3', tc: '#3d1a00', page: 'AdminNotifications' },
            { label: '🚩 Feature Flags', value: '—', bg: '#c9bbff', tc: '#1a0a40', page: 'AdminFeatureFlags' },
            { label: '🤖 AI Assistant',  value: '—', bg: '#9bb4ff', tc: '#0a1240', page: 'AdminAssistant' },
            { label: '🔗 Integrations',  value: '—', bg: '#a8e6cf', tc: '#003d20', page: 'AdminIntegrations' },
            { label: '🧬 AI Ops',        value: '—', bg: '#d7f576', tc: '#0a1200', page: 'AdminAIOps' },
            { label: '🛡️ Roles',         value: '—', bg: '#f28c8c', tc: '#3d0000', page: 'AdminRoles' },
          ].map(s => (
            <StatChip key={s.label} label={s.label} value={s.value} bg={s.bg} tc={s.tc} onClick={() => navigate(createPageUrl(s.page))} />
          ))}
        </div>

        {/* Recent notifications */}
        <div className="rounded-[22px] overflow-hidden" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
          <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--hf-border)' }}>
            <p className="text-xs font-black" style={{ color: 'var(--hf-text)' }}>🔔 Recent Notifications</p>
            <button onClick={() => navigate(createPageUrl('AdminNotifications'))}
              className="text-[10px] font-bold" style={{ color: 'var(--hf-lemon-strong)' }}>View all →</button>
          </div>
          <div className="p-3 space-y-2">
            {notifs.slice(0,5).map(n => {
              const pColors = { low: '#a8e6cf', medium: '#9bb4ff', high: '#f7c9a3', urgent: '#f28c8c' };
              const pc = pColors[n.priority] || '#9bb4ff';
              return (
                <div key={n.id} className="flex items-start gap-3 p-3 rounded-2xl" style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)' }}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: pc + '22' }}>
                    <Bell size={13} style={{ color: pc }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate" style={{ color: 'var(--hf-text)' }}>{n.title}</p>
                    <p className="text-[10px] line-clamp-1" style={{ color: 'var(--hf-text-muted)' }}>{n.message}</p>
                  </div>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: pc + '22', color: pc }}>{n.priority}</span>
                </div>
              );
            })}
            {notifs.length === 0 && <p className="text-xs text-center py-6" style={{ color: 'var(--hf-text-muted)' }}>No notifications</p>}
          </div>
        </div>
      </div>
    ),
  };

  return (
    <AdminLayout currentPageName="AdminDashboard">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: 'var(--hf-text-muted)' }}>
              {format(new Date(), 'EEE, MMM d')}
            </p>
            <h1 className="text-2xl font-black" style={{ color: 'var(--hf-text)' }}>Admin Dashboard 🛡️</h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--hf-text-muted)' }}>Platform overview</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-[12px]" style={{ background: 'rgba(215,245,118,0.12)', border: '1px solid rgba(215,245,118,0.2)' }}>
              <div className="w-2 h-2 rounded-full bg-[#d7f576] animate-pulse" />
              <span className="text-[10px] font-bold" style={{ color: 'var(--hf-lemon-strong)' }}>Live</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 p-1 rounded-[14px] overflow-x-auto scrollbar-hide" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
          {TABS.map(({ id, label }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className="flex-shrink-0 flex-1 min-w-0 px-3 py-2 rounded-[10px] text-[10px] font-bold transition-all whitespace-nowrap"
              style={{
                background: activeTab === id ? '#d7f576' : 'transparent',
                color: activeTab === id ? '#0a1200' : 'var(--hf-text-muted)',
              }}>
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.16 }}>
            {tabContent[activeTab]}
          </motion.div>
        </AnimatePresence>
      </div>
    </AdminLayout>
  );
}
