/**
 * DailyCalorieChart — visualises caloric intake vs. goal for the past 7 days.
 * Used on the Dashboard nutrition widget.
 */
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, Cell } from 'recharts';
import { format, subDays } from 'date-fns';

export default function DailyCalorieChart({ mealLogs, goalCalories = 2000 }) {
  const hasGoal = Number.isFinite(goalCalories) && goalCalories > 0;
  // Build last 7 days
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = format(subDays(new Date(), 6 - i), 'yyyy-MM-dd');
    const label = format(subDays(new Date(), 6 - i), 'EEE');
    const calories = mealLogs
      .filter(l => l.logged_date === date)
      .reduce((sum, l) => sum + (l.calories || 0), 0);
    return { date, label, calories };
  });

  return (
    <ResponsiveContainer width="100%" height={100}>
      <BarChart data={days} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
        <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'var(--hf-text-muted)' }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 9, fill: 'var(--hf-text-muted)' }} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)', borderRadius: 10, fontSize: 10, color: 'var(--hf-text)' }}
          formatter={v => [`${v} kcal`, 'Intake']}
        />
        {hasGoal && (
          <ReferenceLine y={goalCalories} stroke="#d7f576" strokeDasharray="4 3" strokeWidth={1.5} />
        )}
        <Bar dataKey="calories" radius={[4, 4, 0, 0]}>
          {days.map((d, i) => (
            <Cell
              key={i}
              fill={
                !hasGoal
                  ? '#9bb4ff'
                  : d.calories >= goalCalories
                    ? '#d7f576'
                    : d.calories >= goalCalories * 0.7
                      ? '#9bb4ff'
                      : '#f28c8c'
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
