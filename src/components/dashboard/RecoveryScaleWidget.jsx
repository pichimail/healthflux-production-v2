import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, TrendingUp, FlaskConical, AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';

// Wellness score: computed from vitals + medications + lab results
function computeWellnessScore(vitals, medications, labs) {
  let score = 50; // baseline

  if (vitals.length > 0) {
    score += Math.min(25, vitals.length * 5);
    // Weight toward recent data
    const recent = vitals[0];
    if (recent?.systolic_bp) {
      const sbp = Number(recent.systolic_bp);
      if (sbp >= 90 && sbp <= 120) score += 10;
      else if (sbp > 140 || sbp < 80) score -= 10;
    }
  }

  if (medications.length > 0) score += Math.min(10, medications.length * 2);

  if (labs.length > 0) {
    score += Math.min(5, labs.length * 1);
    const abnormal = labs.filter(l => l.status === 'abnormal' || l.flag === 'high' || l.flag === 'low').length;
    score -= abnormal * 5;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

function ScaleTrack({ score }) {
  const pct = score;
  const color = pct >= 70 ? '#d7f576' : pct >= 45 ? '#f7c9a3' : '#f28c8c';

  return (
    <div className="relative w-full">
      {/* Gradient bar */}
      <div
        className="h-4 rounded-full w-full"
        style={{
          background: 'linear-gradient(to right, #f28c8c 0%, #f7c9a3 35%, #d7f576 70%, #a8e6cf 100%)',
        }}
      />
      {/* Tick marker */}
      <div
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all duration-700"
        style={{ left: `${pct}%` }}
      >
        <div className="w-5 h-5 rounded-full border-2 border-white shadow-md" style={{ backgroundColor: color }} />
      </div>
      {/* Labels */}
      <div className="flex justify-between mt-1.5">
        <span className="text-[9px] font-medium" style={{ color: 'var(--hf-coral-strong)' }}>Poor</span>
        <span className="text-[9px] font-medium" style={{ color: 'var(--hf-peach-strong)' }}>Fair</span>
        <span className="text-[9px] font-medium" style={{ color: 'var(--hf-lemon-strong)' }}>Good</span>
        <span className="text-[9px] font-medium" style={{ color: 'var(--hf-mint-strong)' }}>Great</span>
      </div>
    </div>
  );
}

export default function RecoveryScaleWidget({ profileId }) {
  const { data: vitals = [] } = useQuery({
    queryKey: ['vitals', profileId],
    queryFn: () => base44.entities.VitalMeasurement.filter({ profile_id: profileId }, '-measured_at', 20),
    enabled: !!profileId,
  });

  const { data: medications = [] } = useQuery({
    queryKey: ['medications', profileId],
    queryFn: () => base44.entities.Medication.filter({ profile_id: profileId }, '-created_date'),
    enabled: !!profileId,
  });

  const { data: labs = [] } = useQuery({
    queryKey: ['labs', profileId],
    queryFn: () => base44.entities.LabResult.filter({ profile_id: profileId }, '-test_date', 50),
    enabled: !!profileId,
  });

  const hasData = vitals.length > 0 || medications.length > 0 || labs.length > 0;

  // Demo data
  const demoVitals = hasData ? vitals : [{ systolic_bp: 118, diastolic_bp: 76 }, { systolic_bp: 122, diastolic_bp: 80 }];
  const demoMeds   = hasData ? medications : [{ id: 'd1' }, { id: 'd2' }];
  const demoLabs   = hasData ? labs : [{ id: 'd1', status: 'normal' }];

  const score = useMemo(() => computeWellnessScore(
    hasData ? vitals : demoVitals,
    hasData ? medications : demoMeds,
    hasData ? labs : demoLabs,
  ), [vitals, medications, labs, hasData]);

  const labAlerts = labs.filter(l => l.status === 'abnormal' || l.flag === 'high' || l.flag === 'low').length;

  const scoreLabel = score >= 70 ? 'Good' : score >= 45 ? 'Fair' : 'Needs attention';

  return (
    <div className="bento-tile bento-dark flex flex-col gap-4 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-[#a8e6cf] flex items-center justify-center">
            <Activity className="w-4 h-4 text-[#003d20]" />
          </div>
          <span className="bento-label text-xs font-semibold uppercase tracking-wider">Wellness Score</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[22px] font-black leading-none" style={{ color: 'var(--hf-text)' }}>{score}</span>
          <span className="text-[11px] font-medium" style={{ color: 'var(--hf-text-muted)' }}>/100</span>
        </div>
      </div>

      {/* Scale track */}
      <ScaleTrack score={score} />

      {/* Score label */}
      <p className="text-[12px] font-semibold text-center -mt-1" style={{ color: 'var(--hf-text-muted)' }}>
        {scoreLabel}
      </p>

      {/* Micro stats */}
      <div className="grid grid-cols-3 gap-2 mt-auto">
        <MicroStat
          icon={<TrendingUp className="w-3.5 h-3.5" />}
          value={hasData ? vitals.length : '2*'}
          label="Vitals"
          color="#c9bbff"
          textColor="#1a0a40"
        />
        <MicroStat
          icon={<FlaskConical className="w-3.5 h-3.5" />}
          value={hasData ? medications.length : '2*'}
          label="Meds"
          color="#f7c9a3"
          textColor="#3d1a00"
        />
        <MicroStat
          icon={<AlertTriangle className="w-3.5 h-3.5" />}
          value={hasData ? labAlerts : '0*'}
          label="Alerts"
          color={labAlerts > 0 ? '#f28c8c' : '#a8e6cf'}
          textColor={labAlerts > 0 ? '#3d0000' : '#003d20'}
        />
      </div>

      {!hasData && (
        <p className="text-[9px] text-center opacity-40" style={{ color: 'var(--hf-text-muted)' }}>
          Demo data · Add your health records to see real scores
        </p>
      )}
    </div>
  );
}

function MicroStat({ icon, value, label, color, textColor }) {
  return (
    <div
      className="rounded-xl flex flex-col items-center justify-center py-2 gap-0.5"
      style={{ backgroundColor: color }}
    >
      <div style={{ color: textColor }}>{icon}</div>
      <span className="text-sm font-black leading-tight" style={{ color: textColor }}>{value}</span>
      <span className="text-[9px] opacity-70 font-medium" style={{ color: textColor }}>{label}</span>
    </div>
  );
}
