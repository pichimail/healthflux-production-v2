// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import Haptics from '../components/utils/haptics';
import { useSwipeTabs } from '../components/utils/useSwipeTabs';
import HealthPlatformSync from '../components/wellness/HealthPlatformSync';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import ResponsiveOverlay from '@/components/ui/responsive-overlay';
import { toast } from 'sonner';
import { Plus, Flame,
  Sparkles, CheckCircle, Loader2, Trash2, Calendar, BarChart3, RefreshCw
} from 'lucide-react';
import { useActiveProfile } from '../components/ActiveProfileContext';
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { callAI } from '../components/utils/aiService';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { MarkdownContent } from '@/components/ui/markdown-content';
import { getDailyHealthGoals } from '@/services/wellness';

const CAT = {
  steps:      { icon: '🚶', label: 'Steps',      unit: 'steps',   target: 10000, color: 'var(--hf-lemon-strong)', tc: '#0a1200' },
  water:      { icon: '💧', label: 'Water',      unit: 'glasses', target: 8,     color: 'var(--hf-sky-strong)', tc: '#0a1240' },
  sleep:      { icon: '😴', label: 'Sleep',      unit: 'hours',   target: 8,     color: 'var(--hf-lavender-strong)', tc: '#1a0a40' },
  weight:     { icon: '⚖️', label: 'Weight',     unit: 'kg',      target: 70,    color: 'var(--hf-peach-strong)', tc: '#3d1a00' },
  exercise:   { icon: '🏋️', label: 'Exercise',   unit: 'min',     target: 30,    color: 'var(--hf-mint-strong)', tc: '#003d20' },
  medication: { icon: '💊', label: 'Medication', unit: '%',       target: 100,   color: 'var(--hf-coral-strong)', tc: '#3d0000' },
  custom:     { icon: '⭐', label: 'Custom',     unit: 'units',   target: 1,     color: '#f7e6a3', tc: '#3d2a00' },
};

const MILESTONE_LEVELS = [
  { days: 3,   icon: '🌱', label: 'Sprout',     color: 'var(--hf-mint-strong)' },
  { days: 7,   icon: '🔥', label: 'On Fire',    color: 'var(--hf-peach-strong)' },
  { days: 14,  icon: '⚡', label: 'Powered',    color: 'var(--hf-lavender-strong)' },
  { days: 30,  icon: '🏆', label: 'Champion',   color: 'var(--hf-lemon-strong)' },
  { days: 60,  icon: '💎', label: 'Diamond',    color: 'var(--hf-sky-strong)' },
  { days: 100, icon: '👑', label: 'Legend',     color: '#ffd700' },
];

function getMilestone(streak) {
  let m = null;
  for (const ml of MILESTONE_LEVELS) { if (streak >= ml.days) m = ml; }
  return m;
}

function GoalCard({ goal, logs, onLog, onDelete }) {
  const cfg = CAT[goal.category] || CAT.custom;
  const today = format(new Date(), 'yyyy-MM-dd');
  const todayVal = logs.filter(l => l.goal_id === goal.id && l.logged_date === today).reduce((s, l) => s + l.logged_value, 0);
  const pct = Math.min(100, Math.round((todayVal / goal.target_value) * 100));
  const achieved = pct >= 100;
  const streak = goal.streak_count || 0;
  const milestone = getMilestone(streak);

  // 7-day sparkline
  const sparkData = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = format(subDays(new Date(), 6 - i), 'yyyy-MM-dd');
      const val = logs.filter(l => l.goal_id === goal.id && l.logged_date === d).reduce((s, l) => s + l.logged_value, 0);
      return { d: format(subDays(new Date(), 6 - i), 'EEE'), val, pct: Math.min(100, Math.round((val / goal.target_value) * 100)) };
    });
  }, [logs, goal]);

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--hf-surface)', border: `1px solid ${achieved ? cfg.color + '66' : 'var(--hf-border)'}` }}>
      {/* Progress bar top */}
      <div className="h-1.5" style={{ background: 'var(--hf-border)' }}>
        <div className="h-full transition-all duration-700 rounded-full" style={{ width: `${pct}%`, background: cfg.color }} />
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: `${cfg.color}22` }}>
              {cfg.icon}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-sm" style={{ color: 'var(--hf-text)' }}>{goal.title}</h3>
                {achieved && <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full" style={{ background: cfg.color, color: cfg.tc }}>✓ Done!</span>}
              </div>
              <p className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>{goal.frequency} · {goal.target_value} {goal.unit}</p>
            </div>
          </div>
          <button onClick={() => { if (confirm('Remove this goal?')) onDelete(goal.id); }}
            className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: 'rgba(242,140,140,0.1)' }}>
            <Trash2 size={13} style={{ color: 'var(--hf-coral-strong)' }} />
          </button>
        </div>

        {/* Progress */}
        <div className="mb-3">
          <div className="flex justify-between text-xs mb-1">
            <span style={{ color: 'var(--hf-text-muted)' }}>Today: {todayVal} / {goal.target_value} {goal.unit}</span>
            <span className="font-black" style={{ color: cfg.color }}>{pct}%</span>
          </div>
          <Progress value={pct} className="h-2 rounded-full" />
        </div>

        {/* Sparkline */}
        <div className="h-12 mb-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sparkData} barSize={12}>
              <XAxis dataKey="d" tick={{ fontSize: 8, fill: 'var(--hf-text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis hide domain={[0, 100]} />
              <Tooltip contentStyle={{ display: 'none' }} />
              <Bar dataKey="pct" radius={[3, 3, 0, 0]}>
                {sparkData.map((e, i) => <Cell key={i} fill={e.pct >= 100 ? cfg.color : e.pct > 0 ? `${cfg.color}66` : 'var(--hf-border)'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Flame size={14} style={{ color: streak > 0 ? '#f7c9a3' : 'var(--hf-text-muted)' }} />
              <span className="text-xs font-bold" style={{ color: streak > 0 ? '#f7c9a3' : 'var(--hf-text-muted)' }}>{streak}d</span>
            </div>
            {milestone && (
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full" style={{ background: `${milestone.color}33`, color: milestone.color }}>
                {milestone.icon} {milestone.label}
              </span>
            )}
          </div>
          <button onClick={() => onLog(goal)}
            className="h-8 px-4 rounded-xl text-xs font-bold active-press"
            style={{ background: cfg.color, color: cfg.tc }}>
            + Log
          </button>
        </div>
      </div>
    </div>
  );
}

function WeeklyReport({ goals, logs, profileName }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
      const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

      const goalSummaries = goals.map(g => {
        const weekLogs = logs.filter(l => {
          const d = new Date(l.logged_date);
          return l.goal_id === g.id && d >= weekStart && d <= weekEnd;
        });
        const daysHit = days.filter(day => {
          const ds = format(day, 'yyyy-MM-dd');
          const dayVal = weekLogs.filter(l => l.logged_date === ds).reduce((s, l) => s + l.logged_value, 0);
          return dayVal >= g.target_value;
        }).length;
        return `${g.title}: ${daysHit}/7 days achieved (streak: ${g.streak_count || 0} days)`;
      });

      // AI_FEATURE: Weekly wellness report | PROVIDER: grok
      const res = await callAI({
        prompt: `Generate a warm, motivating weekly wellness report for ${profileName || 'this user'}.

This week's goal data:
${goalSummaries.join('\n')}

Write a structured weekly report with these markdown sections:
## 🌟 Weekly Wellness Summary
## ✅ What You Achieved
## 📈 Progress Highlights
## 🎯 Focus Areas for Next Week
## 💪 Motivational Close

Be specific, reference actual numbers, keep each section to 2-3 sentences. End with an uplifting message.`,
      });
      setReport(res);
    } catch {
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <Button onClick={generate} disabled={loading || goals.length === 0}
        className="w-full h-11 rounded-2xl font-bold" style={{ background: '#d7f576', color: '#0a1200' }}>
        {loading ? <><Loader2 size={14} className="animate-spin mr-2" />Generating…</> : <><BarChart3 size={14} className="mr-2" />Generate Weekly Report</>}
      </Button>

      {loading && (
        <div className="flex flex-col items-center py-12 gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(215,245,118,0.15)' }}>
            <Sparkles size={24} className="animate-pulse" style={{ color: 'var(--hf-lemon-strong)' }} />
          </div>
          <p className="text-sm font-bold" style={{ color: 'var(--hf-text)' }}>Analyzing your week…</p>
        </div>
      )}

      {report && !loading && (
        <Card className="border-0 card-shadow rounded-2xl">
          <CardHeader className="p-4 pb-2 border-b" style={{ borderColor: 'var(--hf-border)' }}>
            <CardTitle className="text-sm font-bold flex items-center justify-between" style={{ color: 'var(--hf-text)' }}>
              <span className="flex items-center gap-2"><BarChart3 size={14} style={{ color: 'var(--hf-lemon-strong)' }} /> Weekly Report</span>
              <button onClick={() => setReport(null)} className="text-[10px]" style={{ color: 'var(--hf-text-muted)' }}>✕</button>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <MarkdownContent content={report} className="text-xs" />
            <Button onClick={generate} disabled={loading} variant="outline" className="w-full mt-3 rounded-xl h-9 text-xs gap-2">
              <RefreshCw size={11} /> Regenerate
            </Button>
          </CardContent>
        </Card>
      )}

      {!report && !loading && (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">📊</div>
          <p className="text-sm font-bold" style={{ color: 'var(--hf-text)' }}>Weekly Wellness Report</p>
          <p className="text-xs mt-1 max-w-xs mx-auto" style={{ color: 'var(--hf-text-muted)' }}>
            Get an AI-generated summary of your week: achievements, progress, and tips for next week.
          </p>
        </div>
      )}
    </div>
  );
}

export default function WellnessGoals() {
  const { activeProfileId, activeProfile } = useActiveProfile();
  const qc = useQueryClient();
  const [goalDialog, setGoalDialog] = useState(false);
  const [logDialog, setLogDialog] = useState(null);
  const [logValue, setLogValue] = useState('');
  const [logNotes, setLogNotes] = useState('');
  const [activeTab, setActiveTab] = useState('goals');
  const [aiFeedback, setAiFeedback] = useState(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [form, setForm] = useState({
    title: '', category: 'steps', target_value: 10000,
    unit: 'steps', frequency: 'daily',
    start_date: new Date().toISOString().split('T')[0], end_date: '', notes: ''
  });

  const { data: goals = [] } = useQuery({
    queryKey: ['wellnessGoals', activeProfileId],
    queryFn: () => base44.entities.WellnessGoal.filter({ profile_id: activeProfileId, is_active: true }, '-created_date'),
    enabled: !!activeProfileId,
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['goalLogs', activeProfileId],
    queryFn: () => base44.entities.GoalLog.filter({ profile_id: activeProfileId }, '-logged_date', 200),
    enabled: !!activeProfileId,
    staleTime: 0,
  });

  const { data: dailyTargets = null, isLoading: targetsLoading } = useQuery({
    queryKey: ['daily-health-goals', activeProfileId],
    queryFn: () => getDailyHealthGoals(activeProfileId),
    enabled: !!activeProfileId,
  });

  const createGoal = useMutation({
    mutationFn: (d) => base44.entities.WellnessGoal.create(d),
    onSuccess: () => { qc.invalidateQueries(['wellnessGoals']); setGoalDialog(false); toast.success('Goal created!'); },
  });

  const deleteGoal = useMutation({
    mutationFn: (id) => base44.entities.WellnessGoal.update(id, { is_active: false }),
    onSuccess: () => { qc.invalidateQueries(['wellnessGoals']); toast.success('Goal removed'); },
  });

  const logProgress = useMutation({
    mutationFn: (d) => base44.entities.GoalLog.create(d),
    onMutate: async (newLog) => {
      await qc.cancelQueries(['goalLogs', activeProfileId]);
      const prev = qc.getQueryData(['goalLogs', activeProfileId]);
      qc.setQueryData(['goalLogs', activeProfileId], (old = []) => [
        { ...newLog, id: `optimistic-${Date.now()}` },
        ...old,
      ]);
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) qc.setQueryData(['goalLogs', activeProfileId], context.prev);
    },
    onSettled: () => { qc.invalidateQueries(['goalLogs', activeProfileId]); },
    onSuccess: () => {
      // Update streak
      const goal = logDialog;
      if (goal) {
        const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
        const hadYesterday = logs.some(l => l.goal_id === goal.id && l.logged_date === yesterday);
        const newStreak = hadYesterday ? (goal.streak_count || 0) + 1 : 1;
        const bestStreak = Math.max(goal.best_streak || 0, newStreak);
        base44.entities.WellnessGoal.update(goal.id, { streak_count: newStreak, best_streak: bestStreak })
          .then(() => qc.invalidateQueries(['wellnessGoals']));
      }
      setLogDialog(null); setLogValue(''); setLogNotes('');
      toast.success('Progress logged! 🎉');
    },
  });

  const handleCatChange = (cat) => {
    const c = CAT[cat] || CAT.custom;
    setForm(f => ({ ...f, category: cat, unit: c.unit, target_value: c.target, title: c.label + ' Goal' }));
  };

  const getAIFeedback = async () => {
    if (!goals.length) return;
    setFeedbackLoading(true);
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const summary = goals.map(g => {
        const val = logs.filter(l => l.goal_id === g.id && l.logged_date === today).reduce((s, l) => s + l.logged_value, 0);
        const pct = Math.round((val / g.target_value) * 100);
        return `${g.title}: ${pct}% (streak: ${g.streak_count || 0} days)`;
      }).join(', ');
      // AI_FEATURE: Daily wellness encouragement | PROVIDER: grok
      const res = await callAI({
        prompt: `You are an encouraging health coach. Today's wellness: ${summary}. Give 2-3 sentence personalized encouragement referencing their actual progress. Mention their best streaks and give one specific actionable tip. End with a short motivational quote.`,
      });
      setAiFeedback(res);
    } catch { toast.error('Failed to get feedback'); }
    setFeedbackLoading(false);
  };

  const today = format(new Date(), 'yyyy-MM-dd');
  const todayLogs = logs.filter(l => l.logged_date === today);
  const totalStreak = goals.reduce((s, g) => s + (g.streak_count || 0), 0);
  const goalsAchievedToday = goals.filter(g => {
    const val = logs.filter(l => l.goal_id === g.id && l.logged_date === today).reduce((s, l) => s + l.logged_value, 0);
    return val >= g.target_value;
  }).length;

  // Weekly completion for each goal
  const weeklyStats = useMemo(() => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    return goals.map(g => {
      const days = eachDayOfInterval({ start: weekStart, end: new Date() });
      const hit = days.filter(day => {
        const ds = format(day, 'yyyy-MM-dd');
        const val = logs.filter(l => l.goal_id === g.id && l.logged_date === ds).reduce((s, l) => s + l.logged_value, 0);
        return val >= g.target_value;
      }).length;
      return { id: g.id, hit, total: days.length };
    });
  }, [goals, logs]);

  const TABS = [
    { key: 'goals',      label: '🎯 Goals' },
    { key: 'milestones', label: '🏆 Milestones' },
    { key: 'report',     label: '📊 Weekly Report' },
    { key: 'sync',       label: '⌚ Health Sync' },
  ];
  const tabKeys = TABS.map(t => t.key);
  const swipeHandlers = useSwipeTabs(tabKeys, activeTab, setActiveTab);

  return (
    <div className="bento-page" {...swipeHandlers}>
      <div className="bento-header flex justify-between items-start">
        <div>
          <h1 className="bento-title">Wellness Goals</h1>
          <p className="bento-subtitle">{activeProfile?.full_name || 'Your'} habits & streaks</p>
        </div>
        <Button onClick={() => { Haptics.medium(); setGoalDialog(true); }} className="h-10 px-5 rounded-2xl font-bold" style={{ background: '#d7f576', color: '#0a1200' }}>
          <Plus size={14} className="mr-1" /> New Goal
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          { v: goals.length, label: 'Goals', icon: '🎯', color: 'var(--hf-lemon-strong)', tc: '#0a1200' },
          { v: goalsAchievedToday, label: 'Done Today', icon: '✅', color: 'var(--hf-mint-strong)', tc: '#003d20' },
          { v: todayLogs.length, label: 'Logs Today', icon: '📝', color: 'var(--hf-lavender-strong)', tc: '#1a0a40' },
          { v: totalStreak, label: 'Total Streak', icon: '🔥', color: 'var(--hf-peach-strong)', tc: '#3d1a00' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl p-3 text-center" style={{ background: s.color }}>
            <span className="text-base">{s.icon}</span>
            <p className="text-xl font-black mt-0.5" style={{ color: s.tc }}>{s.v}</p>
            <p className="text-[8px] font-bold uppercase opacity-70" style={{ color: s.tc }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl p-4 mb-4" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--hf-text-muted)' }}>Backend Daily Targets</p>
            <p className="text-xs mt-1" style={{ color: 'var(--hf-text-muted)' }}>
              {targetsLoading
                ? 'Loading daily calorie, macro, activity, and health targets…'
                : dailyTargets?.summary || 'Targets load from the dailyHealthGoals contract when available.'}
            </p>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: 'rgba(215,245,118,0.15)', color: 'var(--hf-lemon-strong)' }}>
            {dailyTargets?.generated_at ? 'Live' : 'Backend'}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: 'Calories', value: dailyTargets?.calories, suffix: 'kcal', color: 'var(--hf-lemon-strong)' },
            { label: 'Protein', value: dailyTargets?.protein_g, suffix: 'g', color: 'var(--hf-sky-strong)' },
            { label: 'Activity', value: dailyTargets?.active_minutes ?? dailyTargets?.steps, suffix: dailyTargets?.active_minutes != null ? 'min' : dailyTargets?.steps != null ? 'steps' : '', color: 'var(--hf-mint-strong)' },
            { label: 'Health', value: dailyTargets?.health_score_target, suffix: '/100', color: 'var(--hf-lavender-strong)' },
          ].map((item) => (
            <div key={item.label} className="rounded-xl p-3" style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)' }}>
              <p className="text-[9px] font-black uppercase tracking-wide" style={{ color: 'var(--hf-text-muted)' }}>{item.label}</p>
              <p className="text-lg font-black mt-1" style={{ color: item.color }}>
                {item.value != null ? `${item.value}${item.suffix}` : '—'}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* AI Coach button */}
      {!aiFeedback ? (
        <button onClick={getAIFeedback} disabled={feedbackLoading || !goals.length}
          className="w-full h-10 rounded-2xl text-xs font-bold mb-4 flex items-center justify-center gap-2 active-press"
          style={{ background: 'rgba(215,245,118,0.1)', border: '1px dashed rgba(215,245,118,0.4)', color: 'var(--hf-lemon-strong)' }}>
          {feedbackLoading ? <><Loader2 size={12} className="animate-spin" /> Analyzing…</> : <><Sparkles size={12} /> Get AI Coach Feedback</>}
        </button>
      ) : (
        <div className="mb-4 p-4 rounded-2xl flex items-start gap-3" style={{ background: 'linear-gradient(135deg, rgba(215,245,118,0.15), rgba(168,230,207,0.1))', border: '1px solid rgba(215,245,118,0.3)' }}>
          <Sparkles size={16} style={{ color: 'var(--hf-lemon-strong)', flexShrink: 0, marginTop: 2 }} />
          <div className="flex-1">
            <p className="text-[10px] font-black uppercase tracking-wider mb-1" style={{ color: 'var(--hf-lemon-strong)' }}>AI Coach</p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--hf-text)' }}>{aiFeedback}</p>
            <button onClick={() => setAiFeedback(null)} className="text-[10px] mt-1.5" style={{ color: 'var(--hf-text-muted)' }}>Dismiss</button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto scrollbar-hide pb-1">
        {TABS.map(t => (
          <button key={t.key} onClick={() => { Haptics.light(); setActiveTab(t.key); }}
            className="px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex-shrink-0"
            style={{
              background: activeTab === t.key ? '#d7f576' : 'var(--hf-surface-2)',
              color: activeTab === t.key ? '#0a1200' : 'var(--hf-text-muted)',
              border: '1px solid var(--hf-border)',
            }}>{t.label}</button>
        ))}
      </div>
      {/* Swipe hint — mobile only */}
      <p className="text-[9px] text-center mb-3 md:hidden" style={{ color: 'var(--hf-text-muted)' }}>← swipe to switch tabs →</p>

      {/* ── GOALS TAB ── */}
      {activeTab === 'goals' && (
        goals.length === 0 ? (
          <div className="flex flex-col items-center py-20 gap-4 text-center">
            <div className="text-5xl">🎯</div>
            <p className="text-sm font-bold" style={{ color: 'var(--hf-text)' }}>No goals yet</p>
            <p className="text-xs max-w-xs" style={{ color: 'var(--hf-text-muted)' }}>Set your first wellness goal to start building healthy habits.</p>
            <Button onClick={() => setGoalDialog(true)} className="rounded-2xl h-10 px-6 font-bold" style={{ background: '#d7f576', color: '#0a1200' }}>
              <Plus size={14} className="mr-1" /> Create Goal
            </Button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {goals.map(g => (
              <GoalCard key={g.id} goal={g} logs={logs}
                onLog={(goal) => { setLogDialog(goal); setLogValue(''); setLogNotes(''); }}
                onDelete={(id) => deleteGoal.mutate(id)}
              />
            ))}
          </div>
        )
      )}

      {/* ── MILESTONES TAB ── */}
      {activeTab === 'milestones' && (
        <div className="space-y-4">
          {/* Milestone guide */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest mb-3 px-1" style={{ color: 'var(--hf-text-muted)' }}>Streak Milestones</p>
            <div className="grid grid-cols-3 gap-2">
              {MILESTONE_LEVELS.map(ml => (
                <div key={ml.days} className="p-3 rounded-2xl text-center" style={{ background: `${ml.color}18`, border: `1px solid ${ml.color}44` }}>
                  <div className="text-2xl mb-1">{ml.icon}</div>
                  <p className="text-xs font-black" style={{ color: ml.color }}>{ml.label}</p>
                  <p className="text-[10px]" style={{ color: 'var(--hf-text-muted)' }}>{ml.days} days</p>
                </div>
              ))}
            </div>
          </div>

          {/* Goal streaks */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest mb-3 px-1" style={{ color: 'var(--hf-text-muted)' }}>Your Streaks</p>
            {goals.length === 0 ? (
              <p className="text-xs text-center py-8" style={{ color: 'var(--hf-text-muted)' }}>Set goals to start earning streaks.</p>
            ) : (
              <div className="space-y-3">
                {goals.map(g => {
                  const cfg = CAT[g.category] || CAT.custom;
                  const streak = g.streak_count || 0;
                  const best = g.best_streak || 0;
                  const milestone = getMilestone(streak);
                  const weekStat = weeklyStats.find(w => w.id === g.id);
                  return (
                    <div key={g.id} className="p-4 rounded-2xl" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xl">{cfg.icon}</span>
                        <div className="flex-1">
                          <p className="text-sm font-bold" style={{ color: 'var(--hf-text)' }}>{g.title}</p>
                          <p className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>Best: {best} days</p>
                        </div>
                        {milestone && (
                          <div className="flex flex-col items-end">
                            <span className="text-xl">{milestone.icon}</span>
                            <span className="text-[9px] font-bold" style={{ color: milestone.color }}>{milestone.label}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <Flame size={14} style={{ color: streak > 0 ? '#f7c9a3' : 'var(--hf-text-muted)' }} />
                          <span className="text-sm font-black" style={{ color: streak > 0 ? '#f7c9a3' : 'var(--hf-text-muted)' }}>{streak}</span>
                          <span className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>day streak</span>
                        </div>
                        {weekStat && (
                          <div className="ml-auto flex items-center gap-1">
                            <Calendar size={11} style={{ color: 'var(--hf-text-muted)' }} />
                            <span className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>This week: <strong style={{ color: 'var(--hf-text)' }}>{weekStat.hit}/{weekStat.total}</strong></span>
                          </div>
                        )}
                      </div>
                      {/* Next milestone */}
                      {(() => {
                        const next = MILESTONE_LEVELS.find(ml => ml.days > streak);
                        if (!next) return null;
                        const pct = Math.round((streak / next.days) * 100);
                        return (
                          <div className="mt-2">
                            <div className="flex justify-between text-[9px] mb-1">
                              <span style={{ color: 'var(--hf-text-muted)' }}>Next: {next.icon} {next.label}</span>
                              <span style={{ color: next.color }}>{next.days - streak} days to go</span>
                            </div>
                            <Progress value={pct} className="h-1 rounded-full" />
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── WEEKLY REPORT TAB ── */}
      {activeTab === 'report' && (
        <WeeklyReport goals={goals} logs={logs} profileName={activeProfile?.full_name} />
      )}

      {/* ── HEALTH SYNC TAB ── */}
      {activeTab === 'sync' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl" style={{ background: 'rgba(215,245,118,0.06)', border: '1px dashed rgba(215,245,118,0.3)' }}>
            <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: 'var(--hf-lemon-strong)' }}>Automatic Goal Tracking</p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--hf-text-muted)' }}>Connect Apple Health or Google Fit to automatically sync steps, heart rate, sleep, and weight into your wellness goals. Data refreshes daily.</p>
          </div>
          <HealthPlatformSync
            profileId={activeProfileId}
            onDataSynced={() => {
              Haptics.success();
            }}
          />
          <div className="p-4 rounded-2xl" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
            <p className="text-xs font-black mb-3" style={{ color: 'var(--hf-text)' }}>What gets synced</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: '🚶', label: 'Steps', desc: '→ Steps Goal' },
                { icon: '💓', label: 'Heart Rate', desc: '→ Vitals' },
                { icon: '😴', label: 'Sleep', desc: '→ Sleep Goal' },
                { icon: '⚖️', label: 'Weight', desc: '→ Weight Goal & Vitals' },
              ].map(s => (
                <div key={s.label} className="p-3 rounded-xl" style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)' }}>
                  <span className="text-xl">{s.icon}</span>
                  <p className="text-xs font-bold mt-1" style={{ color: 'var(--hf-text)' }}>{s.label}</p>
                  <p className="text-[9px]" style={{ color: 'var(--hf-text-muted)' }}>{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <ResponsiveOverlay
        open={goalDialog}
        onOpenChange={setGoalDialog}
        title="New Wellness Goal"
        desktopClassName="max-w-md"
      >
        <form onSubmit={(e) => { e.preventDefault(); createGoal.mutate({ ...form, profile_id: activeProfileId, current_value: 0, streak_count: 0, best_streak: 0, is_active: true }); }} className="space-y-4">
            <div>
              <Label className="text-xs font-bold mb-2 block">Category</Label>
              <div className="grid grid-cols-4 gap-2">
                {Object.entries(CAT).map(([key, c]) => (
                  <button key={key} type="button" onClick={() => handleCatChange(key)}
                    className="p-2 rounded-xl flex flex-col items-center gap-1 transition-all"
                    style={{
                      background: form.category === key ? `${c.color}22` : 'var(--hf-surface-2)',
                      border: form.category === key ? `1.5px solid ${c.color}` : '1px solid var(--hf-border)',
                    }}>
                    <span className="text-lg">{c.icon}</span>
                    <span className="text-[9px] font-bold" style={{ color: form.category === key ? c.color : 'var(--hf-text-muted)' }}>{c.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Goal Title</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g., Walk 10,000 steps" className="h-11 rounded-2xl" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Target</Label>
                <Input type="number" value={form.target_value} onChange={e => setForm(f => ({ ...f, target_value: parseFloat(e.target.value) }))} className="h-11 rounded-2xl" required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Unit</Label>
                <Input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} className="h-11 rounded-2xl" required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Frequency</Label>
              <Select value={form.frequency} onValueChange={v => setForm(f => ({ ...f, frequency: v }))}>
                <SelectTrigger className="h-11 rounded-2xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button type="button" variant="outline" onClick={() => setGoalDialog(false)} className="rounded-2xl h-11">Cancel</Button>
              <Button type="submit" disabled={createGoal.isPending} className="rounded-2xl h-11 font-bold" style={{ background: '#d7f576', color: '#0a1200' }}>
                {createGoal.isPending ? <Loader2 size={14} className="animate-spin" /> : 'Create Goal'}
              </Button>
            </div>
        </form>
      </ResponsiveOverlay>

      <ResponsiveOverlay
        open={!!logDialog}
        onOpenChange={(o) => !o && setLogDialog(null)}
        title="Log Progress"
        desktopClassName="max-w-sm"
      >
        {logDialog && (
          <div className="space-y-4">
              <div className="p-3 rounded-xl text-center" style={{ background: `${(CAT[logDialog.category] || CAT.custom).color}15` }}>
                <span className="text-2xl">{(CAT[logDialog.category] || CAT.custom).icon}</span>
                <p className="text-sm font-bold mt-1" style={{ color: 'var(--hf-text)' }}>{logDialog.title}</p>
                <p className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>Target: {logDialog.target_value} {logDialog.unit}</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Value ({logDialog.unit})</Label>
                <Input type="number" step="0.1" value={logValue} onChange={e => { Haptics.typing(); setLogValue(e.target.value); }}
                  placeholder={`Enter ${logDialog.unit}`} className="h-14 rounded-2xl text-2xl font-black text-center" autoFocus />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Notes (optional)</Label>
                <Input value={logNotes} onChange={e => setLogNotes(e.target.value)} placeholder="How are you feeling?" className="h-10 rounded-2xl" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" onClick={() => setLogDialog(null)} className="rounded-2xl h-11">Cancel</Button>
                <Button onClick={() => logProgress.mutate({ goal_id: logDialog.id, profile_id: activeProfileId, logged_value: parseFloat(logValue), logged_date: today, notes: logNotes })}
                  disabled={!logValue || logProgress.isPending}
                  className="rounded-2xl h-11 font-bold" style={{ background: (CAT[logDialog.category] || CAT.custom).color, color: (CAT[logDialog.category] || CAT.custom).tc }}>
                  {logProgress.isPending ? <Loader2 size={14} className="animate-spin" /> : <><CheckCircle size={14} className="mr-1" /> Log It!</>}
                </Button>
              </div>
          </div>
        )}
      </ResponsiveOverlay>
    </div>
  );
}
