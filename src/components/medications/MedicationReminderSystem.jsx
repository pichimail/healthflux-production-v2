/**
 * MedicationReminderSystem
 * - Shows today's medication schedule
 * - Mark doses as taken / skipped
 * - View weekly adherence report
 */
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useActiveProfile } from '../ActiveProfileContext';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isToday } from 'date-fns';
import { Check, X, Clock, BarChart2, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

function getTodayDoses(medications) {
  const today = new Date();
  const doses = [];
  medications.filter(m => m.is_active).forEach(med => {
    const times = med.times?.length ? med.times : ['08:00'];
    times.forEach(time => {
      doses.push({
        medication_id: med.id,
        medication_name: med.medication_name,
        dosage: med.dosage,
        time,
        scheduled_at: `${format(today, 'yyyy-MM-dd')}T${time}:00`,
      });
    });
  });
  return doses.sort((a, b) => a.time.localeCompare(b.time));
}

export default function MedicationReminderSystem() {
  const { activeProfileId } = useActiveProfile();
  const [medications, setMedications] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState({});
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    if (!activeProfileId) return;
    setLoading(true);
    Promise.all([
      base44.entities.Medication.filter({ profile_id: activeProfileId }),
      base44.entities.MedicationLog.filter({ profile_id: activeProfileId }),
    ]).then(([meds, logData]) => {
      setMedications(meds);
      setLogs(logData);
    }).finally(() => setLoading(false));
  }, [activeProfileId]);

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const getLogForDose = (medication_id, scheduled_at) =>
    logs.find(l => l.medication_id === medication_id && l.scheduled_time?.startsWith(scheduled_at.slice(0, 16)));

  const markDose = async (dose, status) => {
    const key = `${dose.medication_id}_${dose.time}`;
    setMarking(m => ({ ...m, [key]: true }));
    try {
      const existing = getLogForDose(dose.medication_id, dose.scheduled_at);
      if (existing) {
        const updated = await base44.entities.MedicationLog.update(existing.id, {
          status, taken_at: status === 'taken' ? new Date().toISOString() : null,
        });
        setLogs(l => l.map(x => x.id === existing.id ? { ...x, ...updated } : x));
      } else {
        const created = await base44.entities.MedicationLog.create({
          medication_id: dose.medication_id,
          profile_id: activeProfileId,
          scheduled_time: dose.scheduled_at,
          status,
          taken_at: status === 'taken' ? new Date().toISOString() : null,
        });
        setLogs(l => [...l, created]);
      }
      toast.success(status === 'taken' ? '✅ Dose marked as taken' : '⏭ Dose marked as skipped');
    } catch {
      toast.error('Failed to log dose');
    } finally {
      setMarking(m => ({ ...m, [key]: false }));
    }
  };

  // Weekly adherence calculation
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const weeklyStats = weekDays.map(day => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const dayLogs = logs.filter(l => l.scheduled_time?.startsWith(dayStr));
    const taken = dayLogs.filter(l => l.status === 'taken').length;
    const skipped = dayLogs.filter(l => l.status === 'skipped').length;
    const total = dayLogs.length;
    return { day, dayStr, taken, skipped, total, pct: total ? Math.round((taken / total) * 100) : null };
  });

  const totalTaken = weeklyStats.reduce((s, d) => s + d.taken, 0);
  const totalDoses = weeklyStats.reduce((s, d) => s + d.total, 0);
  const weeklyPct = totalDoses ? Math.round((totalTaken / totalDoses) * 100) : null;

  if (loading) return (
    <div className="flex justify-center p-8"><Loader2 size={20} className="animate-spin" style={{ color: 'var(--hf-text-muted)' }} /></div>
  );

  const todayDoses = getTodayDoses(medications);

  return (
    <div className="space-y-4 p-4">
      {/* Today's Schedule */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
        <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--hf-border)' }}>
          <Clock size={15} style={{ color: 'var(--hf-lemon-strong)' }} />
          <p className="font-bold text-sm" style={{ color: 'var(--hf-text)' }}>Today's Schedule</p>
          <span className="ml-auto text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(215,245,118,0.15)', color: 'var(--hf-lemon-strong)' }}>
            {format(new Date(), 'MMM d')}
          </span>
        </div>
        {todayDoses.length === 0 ? (
          <p className="text-sm p-4 text-center" style={{ color: 'var(--hf-text-muted)' }}>No medications scheduled today</p>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--hf-border)' }}>
            {todayDoses.map(dose => {
              const log = getLogForDose(dose.medication_id, dose.scheduled_at);
              const key = `${dose.medication_id}_${dose.time}`;
              const isMarking = !!marking[key];
              const statusColor = log?.status === 'taken' ? '#a8e6cf' : log?.status === 'skipped' ? '#f28c8c' : 'var(--hf-text-muted)';
              return (
                <div key={key} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
                    style={{ background: log?.status === 'taken' ? 'rgba(168,230,207,0.15)' : log?.status === 'skipped' ? 'rgba(242,140,140,0.15)' : 'var(--hf-surface-2)' }}>
                    💊
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--hf-text)' }}>{dose.medication_name}</p>
                    <p className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>{dose.dosage} · {dose.time}</p>
                    {log && <p className="text-[10px] font-bold mt-0.5 capitalize" style={{ color: statusColor }}>{log.status}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {isMarking ? (
                      <Loader2 size={16} className="animate-spin" style={{ color: 'var(--hf-text-muted)' }} />
                    ) : (
                      <>
                        <button onClick={() => markDose(dose, 'taken')}
                          className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90"
                          style={{ background: log?.status === 'taken' ? 'rgba(168,230,207,0.3)' : 'rgba(168,230,207,0.1)', border: '1px solid rgba(168,230,207,0.3)' }}>
                          <Check size={14} style={{ color: 'var(--hf-mint-strong)' }} />
                        </button>
                        <button onClick={() => markDose(dose, 'skipped')}
                          className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90"
                          style={{ background: log?.status === 'skipped' ? 'rgba(242,140,140,0.3)' : 'rgba(242,140,140,0.1)', border: '1px solid rgba(242,140,140,0.3)' }}>
                          <X size={14} style={{ color: 'var(--hf-coral-strong)' }} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Weekly Adherence Report */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
        <button className="w-full px-4 py-3 border-b flex items-center gap-2 text-left" style={{ borderColor: 'var(--hf-border)' }}
          onClick={() => setShowReport(r => !r)}>
          <BarChart2 size={15} style={{ color: 'var(--hf-sky-strong)' }} />
          <p className="font-bold text-sm flex-1" style={{ color: 'var(--hf-text)' }}>Weekly Adherence Report</p>
          {weeklyPct !== null && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: weeklyPct >= 80 ? 'rgba(168,230,207,0.2)' : 'rgba(242,140,140,0.2)', color: weeklyPct >= 80 ? '#a8e6cf' : '#f28c8c' }}>
              {weeklyPct}%
            </span>
          )}
          {showReport ? <ChevronUp size={14} style={{ color: 'var(--hf-text-muted)' }} /> : <ChevronDown size={14} style={{ color: 'var(--hf-text-muted)' }} />}
        </button>
        {showReport && (
          <div className="p-4">
            <div className="grid grid-cols-7 gap-1 mb-3">
              {weeklyStats.map(({ day, taken, total, pct }) => (
                <div key={day.toISOString()} className="flex flex-col items-center gap-1">
                  <span className="text-[9px] font-bold" style={{ color: isToday(day) ? '#d7f576' : 'var(--hf-text-muted)' }}>
                    {format(day, 'EEE')[0]}
                  </span>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-black"
                    style={{
                      background: pct === null ? 'var(--hf-surface-2)' : pct >= 80 ? 'rgba(168,230,207,0.25)' : pct > 0 ? 'rgba(247,201,163,0.25)' : 'rgba(242,140,140,0.15)',
                      color: pct === null ? 'var(--hf-text-muted)' : pct >= 80 ? '#a8e6cf' : pct > 0 ? '#f7c9a3' : '#f28c8c',
                      border: isToday(day) ? '1.5px solid #d7f576' : '1px solid transparent',
                    }}>
                    {pct !== null ? `${pct}` : '—'}
                  </div>
                  <span className="text-[8px]" style={{ color: 'var(--hf-text-muted)' }}>{taken}/{total || '?'}</span>
                </div>
              ))}
            </div>
            <div className="rounded-xl p-3 text-xs" style={{ background: 'var(--hf-surface-2)' }}>
              <p style={{ color: 'var(--hf-text-muted)' }}>
                This week: <span className="font-bold" style={{ color: 'var(--hf-text)' }}>{totalTaken} of {totalDoses} doses taken</span>
                {weeklyPct !== null && (
                  <> — <span className="font-bold" style={{ color: weeklyPct >= 80 ? '#a8e6cf' : '#f7c9a3' }}>{weeklyPct}% adherence</span></>
                )}
              </p>
              {weeklyPct !== null && weeklyPct < 80 && (
                <p className="mt-1" style={{ color: 'var(--hf-peach-strong)' }}>⚠️ Adherence below 80% — share this report with your care provider.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}