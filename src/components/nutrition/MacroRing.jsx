import React from 'react';

/**
 * MacroRing — circular progress ring for a macro.
 */
export default function MacroRing({ label, value, goal, color, unit = 'g' }) {
  const pct = goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : 0;
  const size = 56;
  const sw = 5;
  const r = (size - sw * 2) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * (pct / 100);

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={sw} />
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={sw}
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[10px] font-black leading-none" style={{ color }}>{pct}%</span>
        </div>
      </div>
      <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'var(--hf-text-muted)' }}>{label}</p>
      <p className="text-[9px] font-bold" style={{ color: 'var(--hf-text)' }}>{value}{unit}</p>
    </div>
  );
}