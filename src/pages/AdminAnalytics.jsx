import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../components/admin/AdminLayout.jsx';
import {
  format, subDays, subWeeks, subMonths,
  eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval,
  startOfWeek, endOfWeek, startOfMonth, endOfMonth
} from 'date-fns';
import { BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid, Legend
} from 'recharts';
import { Users, FileText, Activity, Brain, Pill, ChevronRight, ArrowUpRight } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { getAdminStats } from '@/services/admin-stats';

const PIE_COLORS = ['#d7f576', '#c9bbff', '#f7c9a3', '#9bb4ff', '#a8e6cf', '#f28c8c'];
const TEXT_COLORS = ['#0a1200', '#1a0a40', '#3d1a00', '#0a1240', '#003d20', '#3d0000'];

const PERIODS = [
  { label: 'Day', value: 'day' },
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
];

function useChartData(period, users, documents, vitals, profiles) {
  return useMemo(() => {
    const now = new Date();
    if (period === 'day') {
      const days = eachDayOfInterval({ start: subDays(now, 29), end: now });
      return days.map(d => {
        const ds = d.toDateString();
        return {
          label: format(d, 'MMM d'),
          users: users.filter(u => u.created_date && new Date(u.created_date).toDateString() === ds).length,
          docs: documents.filter(doc => doc.created_date && new Date(doc.created_date).toDateString() === ds).length,
          vitals: vitals.filter(v => v.measured_at && new Date(v.measured_at).toDateString() === ds).length,
          profiles: profiles.filter(p => p.created_date && new Date(p.created_date).toDateString() === ds).length,
        };
      });
    }
    if (period === 'week') {
      const weeks = eachWeekOfInterval({ start: subWeeks(now, 11), end: now });
      return weeks.map(w => {
        const start = startOfWeek(w);
        const end = endOfWeek(w);
        const inRange = (date) => date >= start && date <= end;
        return {
          label: `W${format(w, 'ww')}`,
          users: users.filter(u => u.created_date && inRange(new Date(u.created_date))).length,
          docs: documents.filter(d => d.created_date && inRange(new Date(d.created_date))).length,
          vitals: vitals.filter(v => v.measured_at && inRange(new Date(v.measured_at))).length,
          profiles: profiles.filter(p => p.created_date && inRange(new Date(p.created_date))).length,
        };
      });
    }
    // month
    const months = eachMonthOfInterval({ start: subMonths(now, 11), end: now });
    return months.map(m => {
      const start = startOfMonth(m);
      const end = endOfMonth(m);
      const inRange = (date) => date >= start && date <= end;
      return {
        label: format(m, 'MMM yy'),
        users: users.filter(u => u.created_date && inRange(new Date(u.created_date))).length,
        docs: documents.filter(d => d.created_date && inRange(new Date(d.created_date))).length,
        vitals: vitals.filter(v => v.measured_at && inRange(new Date(v.measured_at))).length,
        profiles: profiles.filter(p => p.created_date && inRange(new Date(p.created_date))).length,
      };
    });
  }, [period, users, documents, vitals, profiles]);
}

function useCohortData(users) {
  return useMemo(() => {
    if (!users.length) return [];
    const now = new Date();
    const months = eachMonthOfInterval({ start: subMonths(now, 5), end: now });
    return months.map(m => {
      const cohortStart = startOfMonth(m);
      const cohortEnd = endOfMonth(m);
      const cohortUsers = users.filter(u => {
        const d = u.created_date ? new Date(u.created_date) : null;
        return d && d >= cohortStart && d <= cohortEnd;
      });
      // Use last_active date when available; fall back to updated_date, then created_date.
      // Users with activity recorded after 30 days post-sign-up are counted as retained.
      const thirtyDaysPostCohort = new Date(cohortEnd);
      thirtyDaysPostCohort.setDate(thirtyDaysPostCohort.getDate() + 30);
      const retained = cohortUsers.filter(u => {
        const activity = u.last_active || u.updated_date || u.created_date;
        return activity ? new Date(activity) >= thirtyDaysPostCohort : false;
      }).length;
      return {
        label: format(m, 'MMM yy'),
        cohort_size: cohortUsers.length,
        retained,
        retention_pct: cohortUsers.length ? Math.round((retained / cohortUsers.length) * 100) : 0,
      };
    });
  }, [users]);
}

const chartStyle = { background: 'var(--hf-surface)', border: '1px solid var(--hf-border)', borderRadius: 22, padding: '1.25rem' };
const tooltipStyle = { background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)', borderRadius: 12, fontSize: 11, color: 'var(--hf-text)' };

function PeriodTabs({ value, onChange }) {
  return (
    <div className="flex gap-1 rounded-[12px] p-1" style={{ background: 'var(--hf-surface-2)' }}>
      {PERIODS.map(p => (
        <button key={p.value} onClick={() => onChange(p.value)}
          className="px-3 py-1 rounded-[10px] text-xs font-bold transition-all"
          style={{
            background: value === p.value ? 'var(--hf-accent)' : 'transparent',
            color: value === p.value ? '#0a1200' : 'var(--hf-text-muted)',
          }}>
          {p.label}
        </button>
      ))}
    </div>
  );
}

export default function AdminAnalytics() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState('day');

  const { data: users = [] } = useQuery({ queryKey: ['an-users'], queryFn: () => base44.entities.User.list('-created_date', 500) });
  const { data: profiles = [] } = useQuery({ queryKey: ['an-profiles'], queryFn: () => base44.entities.Profile.list('-created_date', 500) });
  const { data: documents = [] } = useQuery({ queryKey: ['an-docs'], queryFn: () => base44.entities.MedicalDocument.list('-created_date', 500) });
  const { data: vitals = [] } = useQuery({ queryKey: ['an-vitals'], queryFn: () => base44.entities.VitalMeasurement.list('-measured_at', 500) });
  const { data: medications = [] } = useQuery({ queryKey: ['an-meds'], queryFn: () => base44.entities.Medication.list('-created_date', 500) });
  const { data: insights = [] } = useQuery({ queryKey: ['an-insights'], queryFn: () => base44.entities.HealthInsight.list('-created_date', 500) });
  const { data: statsData = null } = useQuery({ queryKey: ['admin-stats-analytics'], queryFn: () => getAdminStats('analytics') });

  const metrics = statsData?.metrics || {};
  const localChartData = useChartData(period, users, documents, vitals, profiles);
  const localCohortData = useCohortData(users);
  const chartData = Array.isArray(statsData?.activity) && statsData.activity.length > 0 ? statsData.activity : localChartData;
  const cohortData = Array.isArray(statsData?.cohorts) && statsData.cohorts.length > 0 ? statsData.cohorts : localCohortData;

  const docTypes = useMemo(() => {
    if (Array.isArray(statsData?.documents_by_type) && statsData.documents_by_type.length > 0) {
      return statsData.documents_by_type.map((item) => ({ name: (item.name || item.type || 'other').replace(/_/g, ' '), value: item.value ?? item.count ?? 0 }));
    }
    const t = {};
    documents.forEach(d => { const k = d.document_type || 'other'; t[k] = (t[k] || 0) + 1; });
    return Object.entries(t).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }));
  }, [documents, statsData]);

  const vitalTypes = useMemo(() => {
    if (Array.isArray(statsData?.vitals_by_type) && statsData.vitals_by_type.length > 0) {
      return statsData.vitals_by_type.map((item) => ({ name: (item.name || item.type || 'other').replace(/_/g, ' '), value: item.value ?? item.count ?? 0 }));
    }
    const t = {};
    vitals.forEach(v => { t[v.vital_type] = (t[v.vital_type] || 0) + 1; });
    return Object.entries(t).map(([name, value]) => ({ name: name.replace(/_/g, ' '), value }));
  }, [vitals, statsData]);

  const topStats = [
    { label: 'Total Users', value: metrics.total_users ?? users.length, icon: Users, bg: '#d7f576', tc: '#0a1200', page: 'AdminUsers' },
    { label: 'Total Profiles', value: metrics.total_profiles ?? profiles.length, icon: Users, bg: '#c9bbff', tc: '#1a0a40', page: 'AdminProfiles' },
    { label: 'Documents', value: metrics.total_documents ?? documents.length, icon: FileText, bg: '#f7c9a3', tc: '#3d1a00', page: 'AdminDocuments' },
    { label: 'Vitals Logged', value: metrics.total_vitals ?? vitals.length, icon: Activity, bg: '#9bb4ff', tc: '#0a1240', page: 'AdminVitals' },
    { label: 'Medications', value: metrics.total_medications ?? medications.length, icon: Pill, bg: '#a8e6cf', tc: '#003d20', page: 'AdminMedications' },
    { label: 'AI Insights', value: metrics.total_insights ?? insights.length, icon: Brain, bg: '#f28c8c', tc: '#3d0000', page: 'AdminInsights' },
  ];

  const navTo = (page) => { navigate(createPageUrl(page)); };

  const handleBarClick = (data, page) => {
    if (data && page) navTo(page);
  };

  return (
    <AdminLayout currentPageName="AdminAnalytics">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black" style={{ color: 'var(--hf-text)' }}>Analytics</h1>
            <p className="text-sm" style={{ color: 'var(--hf-text-muted)' }}>Platform-wide insights & growth</p>
          </div>
          <PeriodTabs value={period} onChange={setPeriod} />
        </div>

        {/* Clickable Top Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {topStats.map((s, i) => (
            <button key={i} onClick={() => navTo(s.page)}
              className="rounded-[20px] p-4 text-left group relative transition-transform hover:scale-[1.03] active:scale-[0.97]"
              style={{ background: s.bg }}>
              <s.icon size={18} style={{ color: s.tc, opacity: 0.6 }} />
              <p className="text-2xl font-black mt-2" style={{ color: s.tc }}>{s.value}</p>
              <p className="text-[10px] font-bold uppercase tracking-wide mt-0.5" style={{ color: s.tc, opacity: 0.7 }}>{s.label}</p>
              <ArrowUpRight size={12} className="absolute top-3 right-3 opacity-0 group-hover:opacity-60 transition-opacity" style={{ color: s.tc }} />
            </button>
          ))}
        </div>

        {/* Key Metrics Bar+Line Chart */}
        <div style={chartStyle}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--hf-text-muted)' }}>Key Metrics Over Time</p>
            <p className="text-[10px]" style={{ color: 'var(--hf-text-muted)' }}>Click bars to navigate</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--hf-border)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'var(--hf-text-muted)' }} tickLine={false} axisLine={false}
                interval={Math.max(0, Math.floor(chartData.length / 8) - 1)} />
              <YAxis tick={{ fontSize: 9, fill: 'var(--hf-text-muted)' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 10, color: 'var(--hf-text-muted)' }} />
              <Bar dataKey="users" fill="#d7f576" radius={[4, 4, 0, 0]} name="New Users"
                onClick={(d) => handleBarClick(d, 'AdminUsers')} cursor="pointer" />
              <Bar dataKey="docs" fill="#c9bbff" radius={[4, 4, 0, 0]} name="Documents"
                onClick={(d) => handleBarClick(d, 'AdminDocuments')} cursor="pointer" />
              <Bar dataKey="vitals" fill="#9bb4ff" radius={[4, 4, 0, 0]} name="Vitals"
                onClick={(d) => handleBarClick(d, 'AdminVitals')} cursor="pointer" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* User Growth Line Chart */}
        <div style={chartStyle}>
          <p className="text-xs font-bold uppercase tracking-wide mb-4" style={{ color: 'var(--hf-text-muted)' }}>
            Cumulative User & Profile Growth
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--hf-border)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'var(--hf-text-muted)' }} tickLine={false} axisLine={false}
                interval={Math.max(0, Math.floor(chartData.length / 8) - 1)} />
              <YAxis tick={{ fontSize: 9, fill: 'var(--hf-text-muted)' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 10, color: 'var(--hf-text-muted)' }} />
              <Line type="monotone" dataKey="users" stroke="#d7f576" strokeWidth={2} dot={false} name="New Users" />
              <Line type="monotone" dataKey="profiles" stroke="#c9bbff" strokeWidth={2} dot={false} name="New Profiles" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Cohort Retention */}
        <div style={chartStyle}>
          <p className="text-xs font-bold uppercase tracking-wide mb-4" style={{ color: 'var(--hf-text-muted)' }}>
            User Cohort Retention (by signup month)
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ color: 'var(--hf-text-muted)' }}>
                  <th className="text-left py-2 pr-4 font-semibold">Cohort</th>
                  <th className="text-right py-2 pr-4 font-semibold">Users</th>
                  <th className="text-right py-2 pr-4 font-semibold">Active</th>
                  <th className="text-right py-2 font-semibold">Retention</th>
                </tr>
              </thead>
              <tbody>
                {cohortData.map((row, i) => (
                  <tr key={i} className="border-t" style={{ borderColor: 'var(--hf-border)' }}>
                    <td className="py-2 pr-4 font-medium" style={{ color: 'var(--hf-text)' }}>{row.label}</td>
                    <td className="py-2 pr-4 text-right" style={{ color: 'var(--hf-text-muted)' }}>{row.cohort_size}</td>
                    <td className="py-2 pr-4 text-right" style={{ color: 'var(--hf-text-muted)' }}>{row.retained}</td>
                    <td className="py-2 text-right">
                      <span className="inline-flex items-center gap-1">
                        <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--hf-border)' }}>
                          <div className="h-full rounded-full" style={{ width: `${row.retention_pct}%`, background: row.retention_pct > 70 ? '#d7f576' : row.retention_pct > 40 ? '#f7c9a3' : '#f28c8c' }} />
                        </div>
                        <span className="font-bold" style={{ color: 'var(--hf-text)' }}>{row.retention_pct}%</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ResponsiveContainer width="100%" height={140} className="mt-4">
            <BarChart data={cohortData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--hf-border)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'var(--hf-text-muted)' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 9, fill: 'var(--hf-text-muted)' }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="cohort_size" fill="#c9bbff" radius={[4, 4, 0, 0]} name="Cohort Size" />
              <Bar dataKey="retained" fill="#d7f576" radius={[4, 4, 0, 0]} name="Retained" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Doc Types + Vital Types */}
        <div className="grid md:grid-cols-2 gap-4">
          <div style={{ ...chartStyle, cursor: 'pointer' }} onClick={() => navTo('AdminDocuments')}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--hf-text-muted)' }}>Document Types</p>
              <ChevronRight size={14} style={{ color: 'var(--hf-text-muted)' }} />
            </div>
            {docTypes.length > 0 ? (
              <div className="flex items-center gap-4">
                <div style={{ width: 120, height: 120 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={docTypes} dataKey="value" cx="50%" cy="50%" innerRadius={30} outerRadius={52} paddingAngle={3}>
                        {docTypes.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-1.5">
                  {docTypes.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-2 text-xs">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="capitalize truncate" style={{ color: 'var(--hf-text)' }}>{d.name}</span>
                      <span className="ml-auto font-bold" style={{ color: 'var(--hf-text-muted)' }}>{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm" style={{ color: 'var(--hf-text-muted)' }}>No documents yet</p>
            )}
          </div>

          <div style={{ ...chartStyle, cursor: 'pointer' }} onClick={() => navTo('AdminVitals')}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--hf-text-muted)' }}>Vitals by Type</p>
              <ChevronRight size={14} style={{ color: 'var(--hf-text-muted)' }} />
            </div>
            {vitalTypes.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {vitalTypes.map((v, i) => (
                  <div key={v.name} className="rounded-[14px] p-3 text-center" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}>
                    <p className="text-xl font-black" style={{ color: TEXT_COLORS[i % TEXT_COLORS.length] }}>{v.value}</p>
                    <p className="text-[9px] font-bold capitalize mt-0.5 truncate" style={{ color: TEXT_COLORS[i % TEXT_COLORS.length], opacity: 0.7 }}>{v.name}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm" style={{ color: 'var(--hf-text-muted)' }}>No vitals yet</p>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
