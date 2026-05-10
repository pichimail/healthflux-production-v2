import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Pill, Check, Clock, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const DEMO_SCHEDULE = [
  { id: 'd1', name: 'Metformin 500mg', time: '08:00', status: 'taken', dosage: '1 tablet' },
  { id: 'd2', name: 'Vitamin D3',      time: '12:00', status: 'upcoming', dosage: '1 capsule' },
  { id: 'd3', name: 'Lisinopril 10mg', time: '20:00', status: 'upcoming', dosage: '1 tablet' },
];

function statusMeta(status) {
  switch (status) {
    case 'taken':   return { dot: 'bg-[#d7f576]', icon: <Check className="w-3 h-3" />, label: 'Taken' };
    case 'missed':  return { dot: 'bg-[#f28c8c]', icon: <AlertCircle className="w-3 h-3" />, label: 'Missed' };
    default:        return { dot: 'border-2 border-[var(--hf-border-strong)] bg-transparent', icon: <Clock className="w-3 h-3" />, label: 'Upcoming' };
  }
}

export default function MedTimelineWidget({ profileId }) {
  const { data: medications = [] } = useQuery({
    queryKey: ['medications', profileId],
    queryFn: () => base44.entities.Medication.filter({ profile_id: profileId }, '-created_date'),
    enabled: !!profileId,
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['medLogs', profileId],
    queryFn: () => base44.entities.MedicationLog.filter({ profile_id: profileId }, '-created_date', 50),
    enabled: !!profileId,
  });

  const isDemo = medications.length === 0;

  const schedule = useMemo(() => {
    if (isDemo) return DEMO_SCHEDULE;

    const today = format(new Date(), 'yyyy-MM-dd');
    const todayLogs = logs.filter(l => l.date === today);

    const items = [];
    medications.forEach(med => {
      const times = med.reminder_times || ['09:00'];
      times.forEach(time => {
        const taken = todayLogs.some(l => l.medication_id === med.id && l.dose_time === time && l.status === 'taken');
        const [h] = time.split(':').map(Number);
        const missed = !taken && h < new Date().getHours();
        items.push({
          id: `${med.id}-${time}`,
          name: med.medication_name,
          time,
          status: taken ? 'taken' : missed ? 'missed' : 'upcoming',
          dosage: `${med.dosage || ''} ${med.dosage_unit || ''}`.trim(),
        });
      });
    });

    return items.sort((a, b) => a.time.localeCompare(b.time));
  }, [medications, logs, isDemo]);

  const takenCount = schedule.filter(s => s.status === 'taken').length;
  const totalCount = schedule.length;

  return (
    <div className="bento-tile bento-darker flex flex-col gap-3 h-full min-h-[220px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-[#f7c9a3] flex items-center justify-center">
            <Pill className="w-4 h-4 text-[#3d1a00]" />
          </div>
          <span className="bento-label text-xs font-semibold uppercase tracking-wider">Today's Schedule</span>
        </div>
        <span className="text-[11px] font-bold text-[var(--hf-text-muted)]">
          {takenCount}/{totalCount}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-[var(--hf-border)] overflow-hidden">
        <div
          className="h-full rounded-full bg-[#d7f576] transition-all duration-500"
          style={{ width: totalCount > 0 ? `${(takenCount / totalCount) * 100}%` : '0%' }}
        />
      </div>

      {/* Timeline */}
      <div className="relative flex flex-col gap-0 flex-1 overflow-y-auto scrollbar-none">
        <div className="absolute left-[11px] top-2 bottom-2 w-px bg-[var(--hf-border)]" />
        {schedule.map((item) => {
          const meta = statusMeta(item.status);
          return (
            <div key={item.id} className="flex items-start gap-3 py-1.5 relative">
              {/* Dot */}
              <div className={`w-[22px] h-[22px] rounded-full flex items-center justify-center z-10 flex-shrink-0 mt-0.5 ${meta.dot} text-[#0a1200]`}>
                {meta.icon}
              </div>
              {/* Content */}
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-[13px] font-semibold leading-tight truncate" style={{ color: 'var(--hf-text)' }}>
                  {item.name}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px]" style={{ color: 'var(--hf-text-muted)' }}>{item.time}</span>
                  {item.dosage && <span className="text-[11px]" style={{ color: 'var(--hf-text-muted)' }}>· {item.dosage}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Demo label */}
      {isDemo && (
        <p className="text-[9px] text-center opacity-40 mt-auto pt-1" style={{ color: 'var(--hf-text-muted)' }}>
          Demo data · Add medications to see your real schedule
        </p>
      )}
    </div>
  );
}
