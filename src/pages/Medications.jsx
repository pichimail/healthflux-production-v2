// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import MobileSelect from '@/components/MobileSelect';
import ResponsiveOverlay from '@/components/ui/responsive-overlay';
import { PrescriptionOCRPanel } from '@/components/forms/AddMedicationForm';
import Haptics from '@/components/utils/haptics';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Plus, Edit, Trash2, CheckCircle, XCircle,
  Bell, AlertTriangle, RefreshCw, Shield
} from 'lucide-react';
import { format, subDays, isToday } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useActiveProfile } from '../components/ActiveProfileContext';
import { toast } from 'sonner';
import { getDailyAdherenceCheck, getRefillAlerts } from '@/services/medications';

const FREQ_TIMES = {
  once_daily: ['08:00'],
  twice_daily: ['08:00', '20:00'],
  three_times_daily: ['08:00', '14:00', '20:00'],
  four_times_daily: ['08:00', '12:00', '16:00', '20:00'],
  as_needed: [],
  custom: ['08:00'],
};

const BLANK_FORM = {
  medication_name: '', dosage: '', frequency: 'once_daily',
  times: ['08:00'], start_date: new Date().toISOString().split('T')[0],
  end_date: '', purpose: '', prescriber: '', pharmacy: '',
  refills_remaining: '', side_effects: '', reminders_enabled: true, notes: ''
};

export default function Medications() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMed, setSelectedMed] = useState(null);
  const [formData, setFormData] = useState(BLANK_FORM);
  const [entryMode, setEntryMode] = useState('manual');
  const [activeTab, setActiveTab] = useState('meds');

  const queryClient = useQueryClient();
  const { activeProfileId, activeProfile } = useActiveProfile();

  const { data: medications = [], isLoading } = useQuery({
    queryKey: ['medications', activeProfileId],
    queryFn: () => base44.entities.Medication.filter({ profile_id: activeProfileId, is_active: true }, '-created_date'),
    enabled: !!activeProfileId,
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['medLogs30', activeProfileId],
    queryFn: () => base44.entities.MedicationLog.filter({ profile_id: activeProfileId }, '-scheduled_time', 100),
    enabled: !!activeProfileId,
  });

  const { data: refillAlerts = [] } = useQuery({
    queryKey: ['refill-alerts', activeProfileId],
    queryFn: () => getRefillAlerts(activeProfileId),
    enabled: !!activeProfileId,
  });

  const { data: adherenceCheck = null } = useQuery({
    queryKey: ['daily-adherence-check', activeProfileId],
    queryFn: () => getDailyAdherenceCheck(activeProfileId),
    enabled: !!activeProfileId,
  });

  const createMed = useMutation({
    mutationFn: (data) => base44.entities.Medication.create(data),
    onSuccess: () => { queryClient.invalidateQueries(['medications', activeProfileId]); setDialogOpen(false); resetForm(); toast.success('Medication added'); },
  });

  const updateMed = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Medication.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries(['medications', activeProfileId]); setDialogOpen(false); resetForm(); toast.success('Medication updated'); },
  });

  const logDose = useMutation({
    mutationFn: (data) => base44.entities.MedicationLog.create(data),
    onMutate: async (newLog) => {
      await queryClient.cancelQueries(['medLogs30', activeProfileId]);
      const prev = queryClient.getQueryData(['medLogs30', activeProfileId]);
      queryClient.setQueryData(['medLogs30', activeProfileId], (old = []) => [
        { ...newLog, id: `optimistic-${Date.now()}` },
        ...old,
      ]);
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) queryClient.setQueryData(['medLogs30', activeProfileId], context.prev);
    },
    onSettled: () => { queryClient.invalidateQueries(['medLogs30', activeProfileId]); },
    onSuccess: () => { toast.success('Dose logged'); },
  });

  const deactivate = useMutation({
    mutationFn: (med) => base44.entities.Medication.update(med.id, { ...med, is_active: false }),
    onSuccess: () => { queryClient.invalidateQueries(['medications', activeProfileId]); toast.success('Medication removed'); },
  });

  const resetForm = () => {
    setFormData(BLANK_FORM);
    setSelectedMed(null);
    setEntryMode('manual');
  };

  const openAddMedication = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (med) => {
    setSelectedMed(med);
    setEntryMode('manual');
    setFormData({
      medication_name: med.medication_name, dosage: med.dosage, frequency: med.frequency,
      times: med.times || ['08:00'], start_date: med.start_date,
      end_date: med.end_date || '', purpose: med.purpose || '', prescriber: med.prescriber || '',
      pharmacy: med.pharmacy || '', refills_remaining: med.refills_remaining ?? '',
      side_effects: med.side_effects || '', reminders_enabled: med.reminders_enabled ?? true, notes: ''
    });
    setDialogOpen(true);
  };

  const handleOCRResult = (meds) => {
    if (!meds?.length) return;

    const [first, ...rest] = meds;
    setFormData(f => ({
      ...f,
      medication_name: first.medication_name || f.medication_name,
      dosage: first.dosage || f.dosage,
      frequency: first.frequency || f.frequency,
      purpose: first.instructions || f.purpose,
      prescriber: first.prescriber || f.prescriber,
      times: first.suggested_times || f.times,
      side_effects: first.warnings || f.side_effects,
      refills_remaining: first.refills_remaining ?? f.refills_remaining,
    }));
    setEntryMode('manual');

    if (rest.length > 0) {
      Promise.allSettled(rest.map((med) => base44.entities.Medication.create({
        profile_id: activeProfileId,
        medication_name: med.medication_name,
        dosage: med.dosage,
        frequency: med.frequency || 'once_daily',
        purpose: med.instructions || '',
        prescriber: med.prescriber || '',
        times: med.suggested_times || [],
        side_effects: med.warnings || '',
        refills_remaining: med.refills_remaining || 0,
        is_active: true,
        reminders_enabled: true,
        start_date: new Date().toISOString().split('T')[0],
      }))).then(() => {
        queryClient.invalidateQueries(['medications', activeProfileId]);
        toast.success(`${rest.length} more medication(s) added from scan`);
      });
    }

    toast.success('Medication details filled from prescription');
  };

  const handleFreqChange = (freq) => {
    setFormData(f => ({ ...f, frequency: freq, times: FREQ_TIMES[freq] || ['08:00'] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!activeProfileId) { toast.error('No profile selected'); return; }
    // Drug interaction check
    if (!selectedMed) {
      try {
        const { data: ic } = await base44.functions.invoke('checkDrugInteractions', { profile_id: activeProfileId, medication_name: formData.medication_name });
        if (ic?.analysis?.overall_severity === 'major' || ic?.analysis?.overall_severity === 'severe') {
          if (!confirm(`⚠️ ${ic.analysis.overall_severity.toUpperCase()} interaction detected!\n${ic.analysis.interactions?.map(i => i.description).join('\n\n') || ''}\n\nProceed anyway?`)) return;
        }
      } catch {}
    }
    const payload = { ...formData, profile_id: activeProfileId, is_active: true,
      refills_remaining: formData.refills_remaining !== '' ? Number(formData.refills_remaining) : undefined };
    if (selectedMed) updateMed.mutate({ id: selectedMed.id, data: payload });
    else createMed.mutate(payload);
  };

  const handleLogDose = (med, status) => logDose.mutate({
    medication_id: med.id, profile_id: med.profile_id,
    scheduled_time: new Date().toISOString(),
    taken_at: status === 'taken' ? new Date().toISOString() : null, status
  });

  // Adherence stats
  const adherenceByMed = useMemo(() => {
    const result = {};
    medications.forEach(med => {
      const medLogs = logs.filter(l => l.medication_id === med.id && new Date(l.scheduled_time) >= subDays(new Date(), 30));
      const taken = medLogs.filter(l => l.status === 'taken').length;
      result[med.id] = { taken, total: medLogs.length, pct: medLogs.length > 0 ? Math.round((taken / medLogs.length) * 100) : 0 };
    });
    return result;
  }, [medications, logs]);

  const todayLogs = logs.filter(l => isToday(new Date(l.scheduled_time)));
  const overallPct = logs.length > 0 ? Math.round((logs.filter(l => l.status === 'taken').length / logs.length) * 100) : 0;

  // Weekly chart
  const chartData = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = subDays(new Date(), i);
      const dayStr = d.toISOString().split('T')[0];
      const dayLogs = logs.filter(l => l.scheduled_time?.startsWith(dayStr));
      const taken = dayLogs.filter(l => l.status === 'taken').length;
      const total = dayLogs.length;
      days.push({ day: format(d, 'EEE'), pct: total > 0 ? Math.round((taken / total) * 100) : 0, taken, total });
    }
    return days;
  }, [logs]);

  const TABS = ['meds', 'reminders', 'adherence', 'interactions'];

  return (
    <div className="bento-page">
      <div className="bento-header flex justify-between items-start">
        <div>
          <h1 className="bento-title">Medications</h1>
          <p className="bento-subtitle">{activeProfile?.full_name || 'Your'} prescriptions & reminders</p>
        </div>
        <Button onClick={() => { Haptics.light(); openAddMedication(); }}
          className="rounded-2xl font-bold h-11 px-5 active-press"
          style={{ background: '#f7c9a3', color: '#3d1a00' }}>
          <Plus className="w-4 h-4 mr-2" /> Add Med
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          { label: 'Active', value: medications.length, color: 'var(--hf-peach-strong)', text: '#3d1a00', icon: '💊' },
          { label: 'Today', value: todayLogs.filter(l => l.status === 'taken').length, color: 'var(--hf-mint-strong)', text: '#003d20', icon: '✅' },
          { label: 'Adherence', value: `${overallPct}%`, color: 'var(--hf-lavender-strong)', text: '#1a0a40', icon: '📊' },
          { label: 'Alerts', value: Object.values(adherenceByMed).filter(a => a.pct < 70 && a.total > 0).length, color: 'var(--hf-coral-strong)', text: '#3d0000', icon: '⚠️' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl p-3 text-center" style={{ background: s.color }}>
            <span className="text-base">{s.icon}</span>
            <p className="text-lg font-black mt-0.5" style={{ color: s.text }}>{s.value}</p>
            <p className="text-[8px] font-bold uppercase opacity-70" style={{ color: s.text }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto scrollbar-hide pb-1">
        {TABS.map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className="whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold transition-all flex-shrink-0 capitalize"
            style={{
              background: activeTab === t ? '#d7f576' : 'var(--hf-surface-2)',
              color: activeTab === t ? '#0a1200' : 'var(--hf-text-muted)',
              border: '1px solid var(--hf-border)',
            }}>
            {t === 'meds' ? '💊 Medications' : t === 'reminders' ? '🔔 Reminders' : t === 'adherence' ? '📊 Adherence' : '⚠️ Interactions'}
          </button>
        ))}
      </div>

      {/* ── MEDICATIONS TAB ── */}
      {activeTab === 'meds' && (
        <div>
          {isLoading ? (
            <div className="flex justify-center py-16"><div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#f7c9a3', borderTopColor: 'transparent' }} /></div>
          ) : medications.length === 0 ? (
            <div className="flex flex-col items-center py-20 gap-4 text-center">
              <div className="text-4xl">💊</div>
              <p className="text-sm font-bold" style={{ color: 'var(--hf-text)' }}>No medications yet</p>
              <Button onClick={openAddMedication} className="rounded-2xl h-10 px-6 font-bold" style={{ background: '#f7c9a3', color: '#3d1a00' }}>
                <Plus className="w-4 h-4 mr-2" /> Add Medication
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {medications.map(med => {
                const adh = adherenceByMed[med.id] || { pct: 0, total: 0 };
                const adhColor = adh.pct >= 80 ? '#a8e6cf' : adh.pct >= 50 ? '#f7c9a3' : '#f28c8c';
                const refillAlert = refillAlerts.find((alert) => alert.medication_id === med.id);
                return (
                  <div key={med.id} className="rounded-2xl overflow-hidden" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 text-xl" style={{ background: 'rgba(247,201,163,0.2)' }}>💊</div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-sm truncate" style={{ color: 'var(--hf-text)' }}>{med.medication_name}</h3>
                            <p className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>{med.dosage} · {med.frequency?.replace(/_/g, ' ')}</p>
                            {med.purpose && <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--hf-text-muted)' }}>{med.purpose}</p>}
                          </div>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button onClick={() => openEdit(med)} className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--hf-surface-2)' }}>
                            <Edit className="w-3.5 h-3.5" style={{ color: 'var(--hf-text-muted)' }} />
                          </button>
                          <button onClick={() => { if (confirm('Remove medication?')) deactivate.mutate(med); }}
                            className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(242,140,140,0.1)' }}>
                            <Trash2 className="w-3.5 h-3.5" style={{ color: 'var(--hf-coral-strong)' }} />
                          </button>
                        </div>
                      </div>

                      {/* Reminder times */}
                      {med.times?.length > 0 && med.frequency !== 'as_needed' && (
                        <div className="flex items-center gap-2 mb-3">
                          <Bell className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--hf-text-muted)' }} />
                          <div className="flex gap-1 flex-wrap">
                            {med.times.map((t, i) => (
                              <span key={i} className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(215,245,118,0.15)', color: 'var(--hf-lemon-strong)' }}>{t}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Adherence bar */}
                      {adh.total > 0 && (
                        <div className="mb-3">
                          <div className="flex justify-between text-[10px] mb-1">
                            <span style={{ color: 'var(--hf-text-muted)' }}>30-day adherence</span>
                            <span className="font-bold" style={{ color: adhColor }}>{adh.pct}%</span>
                          </div>
                          <Progress value={adh.pct} className="h-1.5 rounded-full" />
                        </div>
                      )}

                      {/* Log buttons */}
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => handleLogDose(med, 'taken')}
                          className="flex items-center justify-center gap-1.5 h-9 rounded-xl text-xs font-bold active-press"
                          style={{ background: '#a8e6cf', color: '#003d20' }}>
                          <CheckCircle className="w-3.5 h-3.5" /> Taken
                        </button>
                        <button onClick={() => handleLogDose(med, 'skipped')}
                          className="flex items-center justify-center gap-1.5 h-9 rounded-xl text-xs font-bold active-press"
                          style={{ background: 'var(--hf-surface-2)', color: 'var(--hf-text-muted)', border: '1px solid var(--hf-border)' }}>
                          <XCircle className="w-3.5 h-3.5" /> Skip
                        </button>
                      </div>
                    </div>

                    {/* Refill warning */}
                    {refillAlert && (
                      <div className="px-4 pb-3">
                        <div className="flex items-center gap-2 p-2 rounded-xl text-xs" style={{ background: 'rgba(247,201,163,0.2)', border: '1px solid rgba(247,201,163,0.4)' }}>
                          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--hf-peach-strong)' }} />
                          <span style={{ color: 'var(--hf-text)' }}>
                            {refillAlert.message || `Refill due${refillAlert.refills_remaining != null ? ` · ${refillAlert.refills_remaining} refill${refillAlert.refills_remaining !== 1 ? 's' : ''} remaining` : ''}${refillAlert.pharmacy ? ` · ${refillAlert.pharmacy}` : ''}`}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── REMINDERS TAB ── */}
      {activeTab === 'reminders' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl" style={{ background: 'rgba(215,245,118,0.1)', border: '1px solid rgba(215,245,118,0.25)' }}>
            <p className="text-xs font-bold mb-1" style={{ color: 'var(--hf-lemon-strong)' }}>How reminders work</p>
            <p className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>
              Scheduled medication times shown here come from your saved medication settings. This screen does not imply native push delivery unless reminder delivery is enabled on the backend.
            </p>
          </div>

          {/* Today's schedule */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest mb-3 px-1" style={{ color: 'var(--hf-text-muted)' }}>Today's Schedule</p>
            {medications.filter(m => m.times?.length > 0 && m.frequency !== 'as_needed').length === 0 ? (
              <p className="text-xs text-center py-8" style={{ color: 'var(--hf-text-muted)' }}>No scheduled medications. Add times in medication settings.</p>
            ) : (
              <div className="space-y-2">
                {medications.filter(m => m.times?.length > 0 && m.frequency !== 'as_needed').flatMap(med =>
                  med.times.map(time => ({ med, time }))
                ).sort((a, b) => a.time.localeCompare(b.time)).map(({ med, time }, i) => {
                  const todayTaken = todayLogs.find(l => l.medication_id === med.id && l.status === 'taken');
                  return (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-2xl" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
                      <div className="w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0"
                        style={{ background: todayTaken ? 'rgba(168,230,207,0.2)' : 'rgba(247,201,163,0.2)' }}>
                        <span className="text-xs font-black" style={{ color: todayTaken ? '#a8e6cf' : '#f7c9a3' }}>{time}</span>
                        <Bell className="w-3 h-3 mt-0.5" style={{ color: todayTaken ? '#a8e6cf' : '#f7c9a3' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate" style={{ color: 'var(--hf-text)' }}>{med.medication_name}</p>
                        <p className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>{med.dosage}</p>
                      </div>
                      {todayTaken ? (
                        <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background: 'rgba(168,230,207,0.2)', color: 'var(--hf-mint-strong)' }}>✓ Done</span>
                      ) : (
                        <button onClick={() => handleLogDose(med, 'taken')}
                          className="text-xs font-bold px-3 py-1.5 rounded-xl active-press"
                          style={{ background: '#d7f576', color: '#0a1200' }}>Take</button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Reminder settings per med */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest mb-3 px-1" style={{ color: 'var(--hf-text-muted)' }}>Reminder Settings</p>
            <div className="space-y-2">
              {medications.map(med => (
                <div key={med.id} className="flex items-center justify-between p-3 rounded-2xl" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-lg">💊</span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate" style={{ color: 'var(--hf-text)' }}>{med.medication_name}</p>
                      <p className="text-[10px]" style={{ color: 'var(--hf-text-muted)' }}>{med.times?.join(', ') || 'No times set'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={med.reminders_enabled ?? true}
                      onCheckedChange={(v) => updateMed.mutate({ id: med.id, data: { ...med, reminders_enabled: v } })} />
                    <button onClick={() => openEdit(med)} className="text-[10px] font-bold px-2 py-1 rounded-lg" style={{ background: 'var(--hf-surface-2)', color: 'var(--hf-text-muted)' }}>Edit</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── ADHERENCE TAB ── */}
      {activeTab === 'adherence' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl" style={{ background: 'rgba(201,187,255,0.08)', border: '1px solid rgba(201,187,255,0.2)' }}>
            <p className="text-xs font-bold mb-1" style={{ color: 'var(--hf-lavender-strong)' }}>Daily adherence check</p>
            <p className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>
              {adherenceCheck?.message || 'Dose logs below are real. Automated daily adherence messaging appears only when the backend dailyAdherenceCheck contract returns it.'}
            </p>
          </div>
          {/* Weekly chart */}
          <Card className="border-0 card-shadow rounded-2xl">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-bold" style={{ color: 'var(--hf-text)' }}>Weekly Adherence</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 h-[140px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barSize={24}>
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--hf-text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis hide domain={[0, 100]} />
                  <Tooltip formatter={v => [`${v}%`]} contentStyle={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)', borderRadius: 10, fontSize: 10 }} />
                  <Bar dataKey="pct" radius={[6, 6, 0, 0]}>
                    {chartData.map((e, i) => <Cell key={i} fill={e.pct >= 80 ? '#a8e6cf' : e.pct >= 50 ? '#f7c9a3' : e.total === 0 ? 'var(--hf-border)' : '#f28c8c'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Per-med adherence */}
          <div className="space-y-3">
            {medications.map(med => {
              const a = adherenceByMed[med.id] || { pct: 0, total: 0, taken: 0 };
              const adhColor = a.pct >= 80 ? '#a8e6cf' : a.pct >= 50 ? '#f7c9a3' : '#f28c8c';
              return (
                <div key={med.id} className="p-4 rounded-2xl" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-bold" style={{ color: 'var(--hf-text)' }}>{med.medication_name}</p>
                    <span className="text-sm font-black" style={{ color: adhColor }}>{a.total > 0 ? `${a.pct}%` : '–'}</span>
                  </div>
                  {a.total > 0 && (
                    <>
                      <Progress value={a.pct} className="h-1.5 rounded-full mb-1.5" />
                      <p className="text-[10px]" style={{ color: 'var(--hf-text-muted)' }}>{a.taken}/{a.total} doses taken in last 30 days</p>
                    </>
                  )}
                  {a.total === 0 && <p className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>No logs yet — start logging to track adherence</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── INTERACTIONS TAB ── */}
      {activeTab === 'interactions' && <DrugInteractionPanel profileId={activeProfileId} medications={medications} />}

      <ResponsiveOverlay
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) resetForm();
        }}
        title={selectedMed ? 'Edit Medication' : 'Add Medication'}
        desktopClassName="max-w-2xl"
      >
        <div className="space-y-4">
          {!selectedMed && (
            <>
              <div className="flex gap-2 p-1 rounded-2xl" style={{ background: 'var(--hf-surface-2)' }}>
                {[
                  { id: 'manual', label: '✍️ Manual Input' },
                  { id: 'scan', label: '📸 Scan / Upload' },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setEntryMode(mode.id)}
                    className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
                    style={{
                      background: entryMode === mode.id ? (mode.id === 'scan' ? '#d7f576' : '#f7c9a3') : 'transparent',
                      color: entryMode === mode.id ? (mode.id === 'scan' ? '#0a1200' : '#3d1a00') : 'var(--hf-text-muted)',
                    }}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>

              {entryMode === 'scan' && (
                <PrescriptionOCRPanel profileId={activeProfileId} onMedsExtracted={handleOCRResult} />
              )}

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px" style={{ background: 'var(--hf-border)' }} />
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--hf-text-muted)' }}>
                  Enter details
                </span>
                <div className="flex-1 h-px" style={{ background: 'var(--hf-border)' }} />
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Medication Name *</Label>
                <Input value={formData.medication_name} onChange={e => setFormData(f => ({ ...f, medication_name: e.target.value }))} placeholder="e.g., Aspirin" className="h-11 rounded-2xl" required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Dosage *</Label>
                <Input value={formData.dosage} onChange={e => setFormData(f => ({ ...f, dosage: e.target.value }))} placeholder="e.g., 500mg" className="h-11 rounded-2xl" required />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Frequency *</Label>
              <MobileSelect
                value={formData.frequency}
                onValueChange={handleFreqChange}
                options={[
                  { value: 'once_daily', label: 'Once Daily' },
                  { value: 'twice_daily', label: 'Twice Daily' },
                  { value: 'three_times_daily', label: 'Three Times Daily' },
                  { value: 'four_times_daily', label: 'Four Times Daily' },
                  { value: 'as_needed', label: 'As Needed' },
                  { value: 'custom', label: 'Custom' },
                ]}
                placeholder="Select frequency"
              />
            </div>

            {formData.frequency !== 'as_needed' && (
              <div className="space-y-2">
                <Label className="text-xs font-bold">🔔 Reminder Times</Label>
                <div className="space-y-2">
                  {formData.times.map((time, i) => (
                    <div key={i} className="flex gap-2">
                      <Input type="time" value={time} onChange={e => {
                        const t = [...formData.times]; t[i] = e.target.value; setFormData(f => ({ ...f, times: t }));
                      }} className="flex-1 h-11 rounded-2xl" />
                      {formData.times.length > 1 && (
                        <button type="button" onClick={() => setFormData(f => ({ ...f, times: f.times.filter((_, j) => j !== i) }))}
                          className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(242,140,140,0.1)', color: 'var(--hf-coral-strong)' }}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={() => setFormData(f => ({ ...f, times: [...f.times, '12:00'] }))}
                    className="w-full h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-1"
                    style={{ background: 'rgba(215,245,118,0.1)', border: '1px dashed rgba(215,245,118,0.4)', color: 'var(--hf-lemon-strong)' }}>
                    <Plus className="w-3.5 h-3.5" /> Add Time
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Start Date *</Label>
                <Input type="date" value={formData.start_date} onChange={e => setFormData(f => ({ ...f, start_date: e.target.value }))} className="h-11 rounded-2xl" required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">End Date</Label>
                <Input type="date" value={formData.end_date} onChange={e => setFormData(f => ({ ...f, end_date: e.target.value }))} className="h-11 rounded-2xl" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Purpose</Label>
                <Input value={formData.purpose} onChange={e => setFormData(f => ({ ...f, purpose: e.target.value }))} placeholder="e.g., Blood pressure" className="h-11 rounded-2xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Prescriber</Label>
                <Input value={formData.prescriber} onChange={e => setFormData(f => ({ ...f, prescriber: e.target.value }))} placeholder="Doctor's name" className="h-11 rounded-2xl" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Pharmacy</Label>
                <Input value={formData.pharmacy} onChange={e => setFormData(f => ({ ...f, pharmacy: e.target.value }))} placeholder="Pharmacy name" className="h-11 rounded-2xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Refills Remaining</Label>
                <Input type="number" min="0" value={formData.refills_remaining} onChange={e => setFormData(f => ({ ...f, refills_remaining: e.target.value }))} placeholder="e.g., 3" className="h-11 rounded-2xl" />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl" style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)' }}>
              <div>
                <Label className="text-xs font-bold cursor-pointer">Enable Reminders</Label>
                <p className="text-[10px]" style={{ color: 'var(--hf-text-muted)' }}>Get notified at reminder times</p>
              </div>
              <Switch checked={formData.reminders_enabled} onCheckedChange={v => setFormData(f => ({ ...f, reminders_enabled: v }))} />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="rounded-2xl h-11">Cancel</Button>
              <Button type="submit" onClick={() => Haptics.light()} className="rounded-2xl h-11 font-bold" style={{ background: '#f7c9a3', color: '#3d1a00' }}
                disabled={createMed.isPending || updateMed.isPending}>
                {selectedMed ? 'Update' : 'Add Medication'}
              </Button>
            </div>
          </form>
        </div>
      </ResponsiveOverlay>
    </div>
  );
}

function DrugInteractionPanel({ profileId, medications }) {
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState(null);
  const checkInteractions = async () => {
    if (!profileId || medications.length < 2) { toast.error('Need at least 2 medications to check interactions'); return; }
    setChecking(true);
    try {
      const { data } = await base44.functions.invoke('checkDrugInteractions', { profile_id: profileId, medication_name: medications.map(m => m.medication_name).join(', ') });
      setResult(data?.analysis);
    } catch { toast.error('Check failed'); }
    setChecking(false);
  };
  const SEV_COLOR = { none: '#a8e6cf', minor: '#f7c9a3', moderate: '#c9bbff', major: '#f28c8c', severe: '#f28c8c' };

  return (
    <div className="space-y-4">
      <Button onClick={checkInteractions} disabled={checking || medications.length < 2}
        className="w-full h-11 rounded-2xl font-bold" style={{ background: '#c9bbff', color: '#1a0a40' }}>
        {checking ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Checking...</> : <><Shield className="w-4 h-4 mr-2" />Check Drug Interactions</>}
      </Button>
      {medications.length < 2 && <p className="text-xs text-center" style={{ color: 'var(--hf-text-muted)' }}>Add at least 2 medications to check interactions.</p>}
      {result && (
        <div className="space-y-3">
          <div className="p-4 rounded-2xl" style={{ background: `${SEV_COLOR[result.overall_severity] || '#c9bbff'}22`, border: `1px solid ${SEV_COLOR[result.overall_severity] || '#c9bbff'}44` }}>
            <p className="text-xs font-black uppercase tracking-wider mb-1" style={{ color: 'var(--hf-text-muted)' }}>Overall Severity</p>
            <p className="text-lg font-black capitalize" style={{ color: SEV_COLOR[result.overall_severity] || '#c9bbff' }}>{result.overall_severity}</p>
            {result.summary && <p className="text-xs mt-1" style={{ color: 'var(--hf-text-muted)' }}>{result.summary}</p>}
          </div>
          {result.interactions?.map((int, i) => (
            <div key={i} className="p-3 rounded-xl" style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)' }}>
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: SEV_COLOR[int.severity] || '#f7c9a3' }} />
                <p className="text-xs font-bold" style={{ color: 'var(--hf-text)' }}>{int.drugs?.join(' + ')}</p>
                <span className="ml-auto text-[9px] font-black px-2 py-0.5 rounded-full capitalize" style={{ background: `${SEV_COLOR[int.severity]}33`, color: SEV_COLOR[int.severity] }}>{int.severity}</span>
              </div>
              <p className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>{int.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
