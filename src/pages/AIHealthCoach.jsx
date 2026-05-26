// @ts-nocheck
import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AdaptiveOverlay } from '@/components/ui/adaptive-overlay';
import { Progress } from '@/components/ui/progress';
import {
  Brain, Sparkles, CheckCircle, Loader2,
  ArrowRight, Plus, Zap, MessageSquare, RefreshCw, Video, Trash2
} from 'lucide-react';
import { format, subDays, isToday } from 'date-fns';
import { callAI } from '../components/utils/aiService';
import DietPlanTab from '../components/coach/DietPlanTab';
import ExercisePlanTab from '../components/coach/ExercisePlanTab';
import DrugInteractionTab from '../components/coach/DrugInteractionTab';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';
import { useActiveProfile } from '../components/ActiveProfileContext';
import { MarkdownContent } from '@/components/ui/markdown-content';

const TYPE_COLORS = {
  tip:         { bg: '#d7f576', text: '#0a1200', label: '💡 Tip' },
  reminder:    { bg: '#f7c9a3', text: '#3d1a00', label: '⏰ Reminder' },
  motivation:  { bg: '#c9bbff', text: '#1a0a40', label: '🌟 Motivation' },
  alert:       { bg: '#f28c8c', text: '#3d0000', label: '⚠️ Alert' },
  goal_feedback: { bg: '#a8e6cf', text: '#003d20', label: '🎯 Goal' },
  checkup:     { bg: '#9bb4ff', text: '#0a1240', label: '🩺 Check-up' },
};

const GOAL_CATS = [
  { key: 'steps', icon: '🚶', label: 'Steps', unit: 'steps', defaultTarget: 10000 },
  { key: 'water', icon: '💧', label: 'Water', unit: 'glasses', defaultTarget: 8 },
  { key: 'sleep', icon: '😴', label: 'Sleep', unit: 'hours', defaultTarget: 8 },
  { key: 'weight', icon: '⚖️', label: 'Weight', unit: 'kg', defaultTarget: 70 },
  { key: 'exercise', icon: '🏋️', label: 'Exercise', unit: 'min', defaultTarget: 30 },
  { key: 'medication', icon: '💊', label: 'Medication', unit: 'doses', defaultTarget: 1 },
  { key: 'custom', icon: '⭐', label: 'Custom', unit: '', defaultTarget: 1 },
];

const COACH_AREAS = ['overall', 'diet', 'exercise', 'sleep', 'medication_adherence'];

export default function AIHealthCoach() {
  const { activeProfileId, activeProfile } = useActiveProfile();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('coach');
  const [generating, setGenerating] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [goalDialog, setGoalDialog] = useState(false);
  const [logDialog, setLogDialog] = useState(null); // goal to log
  const [checkinResult, setCheckinResult] = useState(null);
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [goalForm, setGoalForm] = useState({
    title: '', category: 'steps', target_value: '', unit: 'steps', frequency: 'daily',
    start_date: new Date().toISOString().split('T')[0], end_date: '', notes: ''
  });
  const chatEndRef = useRef(null);

  const { data: coachMessages = [], refetch: refetchMsgs } = useQuery({
    queryKey: ['coachMessages', activeProfileId],
    queryFn: () => base44.entities.CoachMessage.filter({ profile_id: activeProfileId, is_read: false }, '-created_date', 20),
    enabled: !!activeProfileId,
  });

  const { data: goals = [] } = useQuery({
    queryKey: ['wellnessGoals', activeProfileId],
    queryFn: () => base44.entities.WellnessGoal.filter({ profile_id: activeProfileId, is_active: true }),
    enabled: !!activeProfileId,
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['goalLogs', activeProfileId],
    queryFn: () => base44.entities.GoalLog.filter({ profile_id: activeProfileId }, '-logged_date', 60),
    enabled: !!activeProfileId,
  });

  const { data: vitals = [] } = useQuery({
    queryKey: ['vitals-coach', activeProfileId],
    queryFn: () => base44.entities.VitalMeasurement.filter({ profile_id: activeProfileId }, '-measured_at', 20),
    enabled: !!activeProfileId,
  });

  const { data: meds = [] } = useQuery({
    queryKey: ['meds-coach', activeProfileId],
    queryFn: () => base44.entities.Medication.filter({ profile_id: activeProfileId, is_active: true }),
    enabled: !!activeProfileId,
  });

  const { data: doctors = [] } = useQuery({
    queryKey: ['coaches-doctors'],
    queryFn: () => base44.entities.TelehealthDoctor.list('-rating', 5),
  });

  const markRead = useMutation({
    mutationFn: (id) => base44.entities.CoachMessage.update(id, { is_read: true }),
    onSuccess: refetchMsgs,
  });

  const createGoal = useMutation({
    mutationFn: (data) => base44.entities.WellnessGoal.create(data),
    onSuccess: () => { queryClient.invalidateQueries(['wellnessGoals', activeProfileId]); setGoalDialog(false); toast.success('Goal created!'); },
  });

  const deleteGoal = useMutation({
    mutationFn: (id) => base44.entities.WellnessGoal.update(id, { is_active: false }),
    onSuccess: () => { queryClient.invalidateQueries(['wellnessGoals', activeProfileId]); toast.success('Goal removed'); },
  });

  const logGoal = useMutation({
    mutationFn: ({ goal, value }) => base44.entities.GoalLog.create({
      goal_id: goal.id, profile_id: activeProfileId,
      logged_value: parseFloat(value), logged_date: new Date().toISOString().split('T')[0],
    }),
    onSuccess: () => { queryClient.invalidateQueries(['goalLogs', activeProfileId]); setLogDialog(null); toast.success('Progress logged!'); },
  });

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages, chatLoading]);

  const buildContext = () => {
    const vStr = vitals.slice(0, 8).map(v => `${v.vital_type}: ${v.value || `${v.systolic}/${v.diastolic}`}`).join(', ');
    const mStr = meds.map(m => m.medication_name).join(', ');
    const gStr = goals.map(g => `${g.title} (target: ${g.target_value} ${g.unit})`).join('; ');
    return `Patient: ${activeProfile?.full_name}, Vitals: ${vStr || 'none'}, Meds: ${mStr || 'none'}, Goals: ${gStr || 'none'}`;
  };

  const generateCoachSession = async (area = 'overall') => {
    if (!activeProfileId) return;
    setGenerating(true);
    try {
      // AI_FEATURE: Generate coaching session | PROVIDER: grok
      const result = await callAI({
        prompt: `You are a proactive AI health coach. Generate 5 personalized coaching messages for ${activeProfile?.full_name || 'this user'}.

Context: ${buildContext()}
Focus area: ${area}
Today: ${format(new Date(), 'MMM d yyyy')}

Generate messages covering: daily tip, medication reminder (if applicable), goal progress, motivation, and health insight.
Include action links where relevant from: Vitals, Medications, WellnessGoals, Trends, Telehealth.`,
        response_json_schema: {
          type: 'object',
          properties: {
            messages: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  message: { type: 'string' },
                  message_type: { type: 'string' },
                  category: { type: 'string' },
                  priority: { type: 'string' },
                  action_label: { type: 'string' },
                  action_page: { type: 'string' }
                }
              }
            }
          }
        }
      });
      if (result?.messages?.length > 0) {
        await Promise.all(result.messages.map(msg =>
          base44.entities.CoachMessage.create({ ...msg, profile_id: activeProfileId, is_read: false })
        ));
        refetchMsgs();
        toast.success('Coach session ready!');
      }
    } catch { toast.error('Session generation failed'); }
    setGenerating(false);
  };

  const runProactiveCheckin = async () => {
    setCheckinLoading(true);
    setCheckinResult(null);
    try {
      // AI_FEATURE: Daily health check-in analysis | PROVIDER: claude
      const response = await callAI({
        prompt: `You are a proactive AI health coach performing a daily check-in for ${activeProfile?.full_name || 'a patient'}.

${buildContext()}

Recent goal logs (last 7 days):
${logs.filter(l => new Date(l.logged_date) >= subDays(new Date(), 7)).slice(0, 10).map(l => `${l.logged_date}: ${l.logged_value}`).join('\n')}

Analyze their health trends and produce a proactive check-in report with:
## Today's Health Check-in
## What's Going Well
## Areas Needing Attention
## Today's Action Plan (3 specific actions)
## Risk Alerts (if any based on vitals/labs)

Be specific, warm, and motivating. Reference actual data.`,
      });
      setCheckinResult(response);
    } catch { toast.error('Check-in failed'); }
    setCheckinLoading(false);
  };

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setChatLoading(true);
    try {
      const history = chatMessages.slice(-4).map(m => `${m.role === 'user' ? 'You' : 'Coach'}: ${m.content}`).join('\n');
      // AI_FEATURE: Health coaching chat | PROVIDER: grok
      const res = await callAI({
        prompt: `You are a warm, motivating AI health coach. Context: ${buildContext()}\n\n${history}\n\nUser: ${userMsg}\n\nRespond as an empathetic coach in 2-3 sentences, be specific and end with encouragement.`
      });
      setChatMessages(prev => [...prev, { role: 'coach', content: res }]);
    } catch {
      setChatMessages(prev => [...prev, { role: 'coach', content: "I'm here for you! Keep up the great work with your health journey." }]);
    }
    setChatLoading(false);
  };

  const handleGoalCatChange = (cat) => {
    const c = GOAL_CATS.find(g => g.key === cat);
    setGoalForm(f => ({ ...f, category: cat, unit: c?.unit || '', target_value: c?.defaultTarget || '', title: c?.label || '' }));
  };

  const highPriority = coachMessages.filter(m => m.priority === 'high');
  const others = coachMessages.filter(m => m.priority !== 'high');

  const TABS = [
    { key: 'coach', label: '🤖 Coach' },
    { key: 'goals', label: `🎯 Goals (${goals.length})` },
    { key: 'checkin', label: '📊 Check-in' },
    { key: 'diet', label: '🥗 Diet' },
    { key: 'exercise', label: '🏋️ Exercise' },
    { key: 'drugs', label: '💊 Interactions' },
    { key: 'chat', label: '💬 Chat' },
  ];

  return (
    <div className="bento-page">
      <div className="bento-header flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="bento-title">AI Health Coach</h1>
          <p className="bento-subtitle">{activeProfile?.full_name || 'Your'} personalized coach</p>
        </div>
        <Button onClick={() => generateCoachSession()} disabled={generating}
          className="rounded-2xl h-10 font-bold" style={{ background: '#d7f576', color: '#0a1200' }}>
          {generating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
          {generating ? 'Coaching…' : 'New Session'}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { v: coachMessages.length, label: 'Messages', icon: '📬', color: 'var(--hf-lemon-strong)', tc: '#0a1200' },
          { v: highPriority.length, label: 'Alerts', icon: '⚠️', color: 'var(--hf-coral-strong)', tc: '#3d0000' },
          { v: goals.length, label: 'Goals', icon: '🎯', color: 'var(--hf-mint-strong)', tc: '#003d20' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl p-3 text-center" style={{ background: s.color }}>
            <span className="text-lg">{s.icon}</span>
            <p className="text-xl font-black mt-0.5" style={{ color: s.tc }}>{s.v}</p>
            <p className="text-[8px] font-bold uppercase opacity-70" style={{ color: s.tc }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto scrollbar-hide pb-1">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className="whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold flex-shrink-0"
            style={{
              background: activeTab === t.key ? '#d7f576' : 'var(--hf-surface-2)',
              color: activeTab === t.key ? '#0a1200' : 'var(--hf-text-muted)',
              border: '1px solid var(--hf-border)',
            }}>{t.label}</button>
        ))}
      </div>

      {/* ── COACH TAB ── */}
      {activeTab === 'coach' && (
        <div className="space-y-4">
          {/* Focus area selector */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {COACH_AREAS.map(area => (
              <button key={area} onClick={() => generateCoachSession(area)} disabled={generating}
                className="whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-bold flex-shrink-0 capitalize"
                style={{ background: 'var(--hf-surface-2)', color: 'var(--hf-text-muted)', border: '1px solid var(--hf-border)' }}>
                {area.replace(/_/g, ' ')}
              </button>
            ))}
          </div>

          {/* High priority */}
          {highPriority.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest px-1" style={{ color: 'var(--hf-coral-strong)' }}>Priority Alerts</p>
              {highPriority.map(msg => {
                const cs = TYPE_COLORS[msg.message_type] || TYPE_COLORS.tip;
                return (
                  <div key={msg.id} className="p-4 rounded-2xl" style={{ background: cs.bg }}>
                    <div className="flex items-start gap-3">
                      <div>
                        <p className="text-[9px] font-black uppercase mb-1" style={{ color: cs.text, opacity: 0.7 }}>{cs.label}</p>
                        <p className="text-sm font-medium leading-relaxed" style={{ color: cs.text }}>{msg.message}</p>
                        {msg.action_label && msg.action_page && (
                          <Link to={createPageUrl(msg.action_page)}
                            className="inline-flex items-center gap-1 mt-2 text-xs font-bold underline" style={{ color: cs.text, opacity: 0.8 }}>
                            {msg.action_label} <ArrowRight className="w-3 h-3" />
                          </Link>
                        )}
                      </div>
                      <button onClick={() => markRead.mutate(msg.id)} className="ml-auto flex-shrink-0">
                        <CheckCircle size={18} style={{ color: cs.text, opacity: 0.6 }} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Other messages */}
          {others.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest px-1" style={{ color: 'var(--hf-text-muted)' }}>Today's Coaching</p>
              {others.map(msg => {
                const cs = TYPE_COLORS[msg.message_type] || TYPE_COLORS.tip;
                return (
                  <div key={msg.id} className="p-3 rounded-2xl flex items-start gap-3"
                    style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: cs.bg }}>
                      <span className="text-sm">{cs.label.split(' ')[0]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold mb-0.5" style={{ color: 'var(--hf-text-muted)' }}>{cs.label.split(' ').slice(1).join(' ')}</p>
                      <p className="text-sm leading-relaxed" style={{ color: 'var(--hf-text)' }}>{msg.message}</p>
                      {msg.action_label && msg.action_page && (
                        <Link to={createPageUrl(msg.action_page)}
                          className="inline-flex items-center gap-1 mt-1.5 text-xs font-bold" style={{ color: 'var(--hf-lemon-strong)' }}>
                          {msg.action_label} <ArrowRight className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                    <button onClick={() => markRead.mutate(msg.id)}>
                      <CheckCircle size={16} style={{ color: 'var(--hf-text-muted)' }} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {coachMessages.length === 0 && !generating && (
            <div className="flex flex-col items-center py-16 gap-4 text-center">
              <div className="text-4xl">🤖</div>
              <p className="text-sm font-bold" style={{ color: 'var(--hf-text)' }}>Your coach is ready!</p>
              <p className="text-xs max-w-xs" style={{ color: 'var(--hf-text-muted)' }}>Tap "New Session" to get personalized tips, reminders, and motivation.</p>
            </div>
          )}

          {/* Telehealth integration */}
          {doctors.length > 0 && (
            <Link to={createPageUrl('Telehealth')}>
              <div className="p-4 rounded-2xl flex items-center justify-between cursor-pointer active-press mt-4"
                style={{ background: 'rgba(155,180,255,0.12)', border: '1px solid rgba(155,180,255,0.3)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(155,180,255,0.2)' }}>
                    <Video size={18} style={{ color: 'var(--hf-sky-strong)' }} />
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: 'var(--hf-sky-strong)' }}>Need a Doctor?</p>
                    <p className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>Book a telehealth consultation</p>
                  </div>
                </div>
                <ArrowRight size={16} style={{ color: 'var(--hf-sky-strong)' }} />
              </div>
            </Link>
          )}
        </div>
      )}

      {/* ── GOALS TAB ── */}
      {activeTab === 'goals' && (
        <div className="space-y-4">
          <Button onClick={() => setGoalDialog(true)}
            className="w-full h-11 rounded-2xl font-bold" style={{ background: '#a8e6cf', color: '#003d20' }}>
            <Plus className="w-4 h-4 mr-2" /> Add Health Goal
          </Button>

          {goals.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">🎯</div>
              <p className="text-sm font-bold" style={{ color: 'var(--hf-text)' }}>No goals set yet</p>
              <p className="text-xs mt-1" style={{ color: 'var(--hf-text-muted)' }}>Set personalized health goals for your coach to track.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {goals.map(goal => {
                const catIcon = GOAL_CATS.find(c => c.key === goal.category)?.icon || '⭐';
                const goalLogs = logs.filter(l => l.goal_id === goal.id);
                const todayLog = goalLogs.find(l => isToday(new Date(l.logged_date)));
                const progress = goal.target_value > 0 ? Math.min(100, Math.round(((todayLog?.logged_value || 0) / goal.target_value) * 100)) : 0;
                const streak = goal.streak_count || 0;
                return (
                  <div key={goal.id} className="p-4 rounded-2xl" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                        style={{ background: 'rgba(168,230,207,0.15)' }}>{catIcon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm" style={{ color: 'var(--hf-text)' }}>{goal.title}</p>
                        <p className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>Target: {goal.target_value} {goal.unit} · {goal.frequency}</p>
                        {streak > 0 && <p className="text-xs mt-0.5" style={{ color: 'var(--hf-lemon-strong)' }}>🔥 {streak}-day streak</p>}
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => setLogDialog(goal)}
                          className="text-xs font-bold px-3 py-1.5 rounded-xl" style={{ background: '#d7f576', color: '#0a1200' }}>
                          Log
                        </button>
                        <button onClick={() => { if (confirm('Remove goal?')) deleteGoal.mutate(goal.id); }}
                          className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(242,140,140,0.1)' }}>
                          <Trash2 size={13} style={{ color: 'var(--hf-coral-strong)' }} />
                        </button>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] mb-1">
                        <span style={{ color: 'var(--hf-text-muted)' }}>Today: {todayLog?.logged_value || 0} / {goal.target_value} {goal.unit}</span>
                        <span className="font-bold" style={{ color: progress >= 100 ? '#a8e6cf' : '#d7f576' }}>{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-1.5 rounded-full" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Log dialog */}
          <AdaptiveOverlay open={!!logDialog} onOpenChange={o => !o && setLogDialog(null)} title={`Log Progress: ${logDialog?.title || ''}`} size="sm" showClose>
              <div className="space-y-3 mt-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Value ({logDialog?.unit})</Label>
                  <Input type="number" step="0.1" id="log-value" placeholder={`Enter ${logDialog?.unit}`} className="h-11 rounded-2xl" />
                </div>
                <Button className="w-full h-11 rounded-2xl font-bold" style={{ background: '#d7f576', color: '#0a1200' }}
                  onClick={() => {
                    const val = document.getElementById('log-value')?.value;
                    if (val && logDialog) logGoal.mutate({ goal: logDialog, value: val });
                  }}
                  disabled={logGoal.isPending}>
                  {logGoal.isPending ? 'Saving…' : 'Save Progress'}
                </Button>
              </div>
          </AdaptiveOverlay>

          {/* Add goal dialog */}
          <AdaptiveOverlay open={goalDialog} onOpenChange={setGoalDialog} title="New Health Goal" size="md" showClose>
              <div className="space-y-3 mt-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Category</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {GOAL_CATS.map(c => (
                      <button key={c.key} onClick={() => handleGoalCatChange(c.key)}
                        className="flex flex-col items-center p-2 rounded-xl text-xs font-bold"
                        style={{
                          background: goalForm.category === c.key ? 'rgba(168,230,207,0.2)' : 'var(--hf-surface-2)',
                          border: goalForm.category === c.key ? '1.5px solid #a8e6cf' : '1px solid var(--hf-border)',
                        }}>
                        <span className="text-lg">{c.icon}</span>
                        <span className="text-[9px] mt-0.5" style={{ color: goalForm.category === c.key ? '#a8e6cf' : 'var(--hf-text-muted)' }}>{c.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Goal Title</Label>
                  <Input value={goalForm.title} onChange={e => setGoalForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g., Daily Steps" className="h-11 rounded-2xl" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Target Value</Label>
                    <Input type="number" value={goalForm.target_value} onChange={e => setGoalForm(f => ({ ...f, target_value: e.target.value }))} className="h-11 rounded-2xl" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Unit</Label>
                    <Input value={goalForm.unit} onChange={e => setGoalForm(f => ({ ...f, unit: e.target.value }))} className="h-11 rounded-2xl" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Frequency</Label>
                  <Select value={goalForm.frequency} onValueChange={v => setGoalForm(f => ({ ...f, frequency: v }))}>
                    <SelectTrigger className="h-11 rounded-2xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Start Date</Label>
                    <Input type="date" value={goalForm.start_date} onChange={e => setGoalForm(f => ({ ...f, start_date: e.target.value }))} className="h-11 rounded-2xl" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">End Date</Label>
                    <Input type="date" value={goalForm.end_date} onChange={e => setGoalForm(f => ({ ...f, end_date: e.target.value }))} className="h-11 rounded-2xl" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <Button type="button" variant="outline" onClick={() => setGoalDialog(false)} className="rounded-2xl h-11">Cancel</Button>
                  <Button onClick={() => createGoal.mutate({ ...goalForm, profile_id: activeProfileId, target_value: parseFloat(goalForm.target_value), is_active: true, current_value: 0, streak_count: 0 })}
                    disabled={!goalForm.title || !goalForm.target_value || createGoal.isPending}
                    className="rounded-2xl h-11 font-bold" style={{ background: '#a8e6cf', color: '#003d20' }}>
                    Create Goal
                  </Button>
                </div>
              </div>
          </AdaptiveOverlay>
        </div>
      )}

      {/* ── CHECKIN TAB ── */}
      {activeTab === 'checkin' && (
        <div className="space-y-4">
          <Button onClick={runProactiveCheckin} disabled={checkinLoading}
            className="w-full h-11 rounded-2xl font-bold" style={{ background: '#9bb4ff', color: '#0a1240' }}>
            {checkinLoading ? <><Loader2 size={14} className="animate-spin mr-2" />Running Check-in…</> : <><Zap size={14} className="mr-2" />Run Proactive Check-in</>}
          </Button>

          {checkinLoading && (
            <div className="flex flex-col items-center py-12 gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(155,180,255,0.15)' }}>
                <Brain size={24} className="animate-pulse" style={{ color: 'var(--hf-sky-strong)' }} />
              </div>
              <p className="text-sm font-bold" style={{ color: 'var(--hf-text)' }}>Analyzing your health trends…</p>
            </div>
          )}

          {checkinResult && (
            <Card className="border-0 card-shadow rounded-2xl">
              <CardHeader className="p-4 pb-2 border-b" style={{ borderColor: 'var(--hf-border)' }}>
                <CardTitle className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--hf-text)' }}>
                  <Zap size={14} style={{ color: 'var(--hf-sky-strong)' }} /> Daily Health Check-in
                  <span className="text-[10px] ml-auto font-normal" style={{ color: 'var(--hf-text-muted)' }}>{format(new Date(), 'MMM d')}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <MarkdownContent content={checkinResult} />
                <Button onClick={runProactiveCheckin} variant="outline" className="w-full mt-3 rounded-xl h-9 text-xs gap-2">
                  <RefreshCw size={11} /> Refresh Check-in
                </Button>
              </CardContent>
            </Card>
          )}

          {!checkinResult && !checkinLoading && (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">📊</div>
              <p className="text-sm font-bold" style={{ color: 'var(--hf-text)' }}>Proactive AI Check-in</p>
              <p className="text-xs mt-1 max-w-xs mx-auto" style={{ color: 'var(--hf-text-muted)' }}>
                Get a daily analysis of your health trends, risks, and personalized action plan.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── DIET TAB ── */}
      {activeTab === 'diet' && (
        <DietPlanTab activeProfile={activeProfile} vitals={vitals} meds={meds} />
      )}

      {/* ── EXERCISE TAB ── */}
      {activeTab === 'exercise' && (
        <ExercisePlanTab activeProfile={activeProfile} vitals={vitals} meds={meds} />
      )}

      {/* ── DRUG INTERACTIONS TAB ── */}
      {activeTab === 'drugs' && (
        <DrugInteractionTab meds={meds} />
      )}

      {/* ── CHAT TAB ── */}
      {activeTab === 'chat' && (
        <Card className="border-0 card-shadow rounded-2xl">
          <CardHeader className="p-4 pb-2 border-b" style={{ borderColor: 'var(--hf-border)' }}>
            <CardTitle className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--hf-text)' }}>
              <MessageSquare size={14} style={{ color: 'var(--hf-lemon-strong)' }} /> Chat with Coach
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="min-h-[220px] max-h-[340px] overflow-y-auto mb-3 space-y-2">
              {chatMessages.length === 0 && (
                <p className="text-xs text-center py-8" style={{ color: 'var(--hf-text-muted)' }}>
                  Ask your coach about your goals, habits, or get motivation…
                </p>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className="max-w-[85%] px-3 py-2 rounded-2xl text-sm"
                    style={msg.role === 'user'
                      ? { background: '#d7f576', color: '#0a1200' }
                      : { background: 'var(--hf-surface-2)', color: 'var(--hf-text)', border: '1px solid var(--hf-border)' }}>
                    {msg.role === 'coach' && <p className="text-[9px] font-bold mb-0.5" style={{ color: 'var(--hf-text-muted)' }}>Coach</p>}
                    <p className="text-xs leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="px-3 py-2 rounded-2xl" style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)' }}>
                    <Loader2 size={13} className="animate-spin" style={{ color: 'var(--hf-lemon-strong)' }} />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div className="flex gap-2">
              <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendChat()}
                placeholder="Ask your coach…" className="flex-1 h-11 px-4 rounded-2xl text-sm outline-none"
                style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }} />
              <Button onClick={sendChat} disabled={!chatInput.trim() || chatLoading}
                className="rounded-2xl h-11 px-4 font-bold" style={{ background: '#d7f576', color: '#0a1200' }}>
                <MessageSquare size={14} />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
