import React, { useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import HealthScoreRing from './HealthScoreRing';

export default function MedAdherenceWidget({ profileId, medications }) {
  const { data: logs = [] } = useQuery({
    queryKey: ['medLogs-dash', profileId],
    queryFn: () => base44.entities.MedicationLog.filter({ profile_id: profileId }, '-scheduled_time', 30),
    enabled: !!profileId,
  });

  const stats = useMemo(() => {
    if (logs.length === 0) return { rate: 0, taken: 0, missed: 0, weekData: [] };
    const taken = logs.filter(l => l.status === 'taken').length;
    const missed = logs.filter(l => l.status === 'skipped').length;
    const rate = logs.length > 0 ? Math.round((taken / logs.length) * 100) : 0;

    const days = {};
    logs.forEach(l => {
      if (!l.scheduled_time) return;
      const d = new Date(l.scheduled_time);
      if (isNaN(d.getTime())) return;
      const day = d.toLocaleDateString('en', { weekday: 'short' });
      if (!days[day]) days[day] = { day, taken: 0, missed: 0 };
      if (l.status === 'taken') days[day].taken++;
      else days[day].missed++;
    });

    return { rate, taken, missed, weekData: Object.values(days).slice(0, 7) };
  }, [logs]);

  return (
    <div className="bento-tile bento-dark" style={{ minHeight: 'unset' }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--hf-text-muted)' }}>Medication</p>
          <p className="text-base font-extrabold" style={{ color: 'var(--hf-text)' }}>Adherence</p>
        </div>
        <HealthScoreRing score={stats.rate} size={64} strokeWidth={6} label="" />
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="rounded-2xl p-2.5 text-center" style={{ background: 'rgba(168,230,207,0.15)' }}>
          <p className="text-lg font-black" style={{ color: 'var(--hf-mint-strong)' }}>{stats.taken}</p>
          <p className="text-[9px] font-bold" style={{ color: 'var(--hf-text-muted)' }}>Taken</p>
        </div>
        <div className="rounded-2xl p-2.5 text-center" style={{ background: 'rgba(242,140,140,0.15)' }}>
          <p className="text-lg font-black" style={{ color: 'var(--hf-coral-strong)' }}>{stats.missed}</p>
          <p className="text-[9px] font-bold" style={{ color: 'var(--hf-text-muted)' }}>Missed</p>
        </div>
        <div className="rounded-2xl p-2.5 text-center" style={{ background: 'rgba(155,180,255,0.15)' }}>
          <p className="text-lg font-black" style={{ color: 'var(--hf-sky-strong)' }}>{medications?.length || 0}</p>
          <p className="text-[9px] font-bold" style={{ color: 'var(--hf-text-muted)' }}>Active</p>
        </div>
      </div>

      {stats.weekData.length > 0 && (
        <ResponsiveContainer width="100%" height={60}>
          <BarChart data={stats.weekData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <XAxis dataKey="day" tick={{ fontSize: 8, fill: 'var(--hf-text-muted)' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)', borderRadius: 12, fontSize: 11, color: 'var(--hf-text)' }} />
            <Bar dataKey="taken" stackId="a" fill="#a8e6cf" radius={[4, 4, 0, 0]} />
            <Bar dataKey="missed" stackId="a" fill="#f28c8c" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}