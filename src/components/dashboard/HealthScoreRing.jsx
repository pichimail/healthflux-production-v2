import React from 'react';

export default function HealthScoreRing({ score = 0, size = 100, strokeWidth = 8, label = 'Health Score' }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 75 ? '#a8e6cf' : score >= 50 ? '#f7c9a3' : '#f28c8c';

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--hf-surface-2)" strokeWidth={strokeWidth} />
          <circle
            cx={size / 2} cy={size / 2} r={radius} fill="none"
            stroke={color} strokeWidth={strokeWidth}
            strokeDasharray={circumference} strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-black" style={{ color: 'var(--hf-text)' }}>{score}</span>
          <span className="text-[8px] font-bold uppercase tracking-wider" style={{ color: 'var(--hf-text-muted)' }}>%</span>
        </div>
      </div>
      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--hf-text-muted)' }}>{label}</p>
    </div>
  );
}