import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function VitalsChart({ data, dataKey, color, unit, title }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-xs" style={{ color: 'var(--hf-text-muted)' }}>
        No data yet
      </div>
    );
  }

  return (
    <div>
      {title && <p className="text-xs font-bold mb-2 uppercase tracking-wide" style={{ color: 'var(--hf-text-muted)' }}>{title}</p>}
      <ResponsiveContainer width="100%" height={120}>
        <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'var(--hf-text-muted)' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 9, fill: 'var(--hf-text-muted)' }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)', borderRadius: 16, fontSize: 12, color: 'var(--hf-text)' }}
            labelStyle={{ color: 'var(--hf-text-muted)' }}
          />
          <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} fill={`url(#grad-${dataKey})`} dot={{ r: 3, fill: color }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}