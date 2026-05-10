// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import { Plus, Trash2, UtensilsCrossed, Loader2, Sparkles, RefreshCw } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useActiveProfile } from '@/components/ActiveProfileContext';
import MobileSelect from '@/components/ui/MobileSelect';
import ResponsiveOverlay from '@/components/ui/responsive-overlay';
import PhotoScanner from '@/components/nutrition/PhotoScanner';
import NutritionDietSuggestions from '@/components/nutrition/NutritionDietSuggestions';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { getDailyHealthGoals } from '@/services/wellness';

const MEAL_TYPES = [
  { value: 'breakfast', label: '🌅 Breakfast' },
  { value: 'lunch',     label: '🌞 Lunch' },
  { value: 'dinner',    label: '🌙 Dinner' },
  { value: 'snack',     label: '🍎 Snack' },
];

const MEAL_COLORS = {
  breakfast: { bg: '#d7f576', tc: '#0a1200' },
  lunch:     { bg: '#9bb4ff', tc: '#0a1240' },
  dinner:    { bg: '#c9bbff', tc: '#1a0a40' },
  snack:     { bg: '#f7c9a3', tc: '#3d1a00' },
};

const EMPTY_FORM = {
  meal_type: 'breakfast', food_name: '', quantity: 1, quantity_unit: 'serving',
  calories: '', protein_g: '', carbs_g: '', fat_g: '', fiber_g: '', notes: '',
};

// ── Macro progress bar ──────────────────────────────────────────────────────
function MacroBar({ label, value, goal, color }) {
  const pct = goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : 0;
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-[10px] font-black uppercase tracking-wide" style={{ color: 'var(--hf-text-muted)' }}>{label}</span>
        <span className="text-[10px] font-bold" style={{ color }}>
          {value}g <span style={{ color: 'var(--hf-text-muted)' }}>/ {goal || '–'}g</span>
        </span>
      </div>
      <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--hf-surface-2)' }}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

// ── 7-day calorie chart ─────────────────────────────────────────────────────
function WeekChart({ allLogs, calorieGoal }) {
  const data = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = format(subDays(new Date(), 6 - i), 'yyyy-MM-dd');
    return {
      day: format(subDays(new Date(), 6 - i), 'EEE'),
      cal: allLogs.filter(l => l.logged_date === d).reduce((s, l) => s + (l.calories || 0), 0),
    };
  }), [allLogs]);

  return (
    <ResponsiveContainer width="100%" height={90}>
      <BarChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <XAxis dataKey="day" tick={{ fill: 'var(--hf-text-muted)', fontSize: 9, fontWeight: 700 }} axisLine={false} tickLine={false} />
        <Tooltip
          cursor={{ fill: 'rgba(255,255,255,0.04)' }}
          content={({ active, payload }) => active && payload?.length
            ? <div className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold"
                style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }}>
                {payload[0].value} kcal
              </div>
            : null}
        />
        {calorieGoal > 0 && <ReferenceLine y={calorieGoal} stroke="#d7f576" strokeDasharray="4 4" strokeWidth={1.5} />}
        <Bar dataKey="cal" radius={[6, 6, 0, 0]} fill="#d7f576" opacity={0.85} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Log / AI-Scan Form ──────────────────────────────────────────────────────
function LogForm({ form, setForm, onSubmit, onCancel, isPending, profileId }) {
  const [scanMode, setScanMode] = useState(false);

  const handleScanConfirm = (analysis) => {
    setForm(f => ({
      ...f,
      food_name: analysis.food_name ?? f.food_name,
      calories: analysis.calories ?? f.calories,
      protein_g: analysis.protein_g ?? f.protein_g,
      carbs_g: analysis.carbs_g ?? f.carbs_g,
      fat_g: analysis.fat_g ?? f.fat_g,
      fiber_g: analysis.fiber_g ?? f.fiber_g,
      quantity: analysis.quantity ?? f.quantity,
      quantity_unit: analysis.quantity_unit ?? f.quantity_unit,
      notes: analysis.description ? `AI scan: ${analysis.description}` : f.notes,
    }));
    setScanMode(false);
    toast.success('Values filled from AI photo!');
  };

  return (
    <div className="space-y-4">
      {/* Toggle: manual vs AI scan */}
      <div className="flex gap-2 p-1 rounded-2xl" style={{ background: 'var(--hf-surface-2)' }}>
        {[
          { id: false, label: '✍️ Enter Manually' },
          { id: true,  label: '📸 AI Photo Scan' },
        ].map(tab => (
          <button key={String(tab.id)} onClick={() => setScanMode(tab.id)}
            className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
            style={{
              background: scanMode === tab.id ? (tab.id ? '#a8e6cf' : '#d7f576') : 'transparent',
              color: scanMode === tab.id ? (tab.id ? '#003d20' : '#0a1200') : 'var(--hf-text-muted)',
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {scanMode ? (
        <PhotoScanner profileId={profileId} mealType={form.meal_type} onConfirm={handleScanConfirm} />
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-bold mb-1 block">Food Name *</Label>
              <Input value={form.food_name} onChange={e => setForm(f => ({ ...f, food_name: e.target.value }))}
                placeholder="Rice, Dal, Chicken…" className="h-10 rounded-2xl" required />
            </div>
            <div>
              <Label className="text-xs font-bold mb-1 block">Meal Type</Label>
              <MobileSelect value={form.meal_type} onValueChange={v => setForm(f => ({ ...f, meal_type: v }))}
                options={MEAL_TYPES} placeholder="Meal type" triggerClassName="h-10 rounded-2xl" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-bold mb-1 block">Quantity</Label>
              <Input type="number" step="0.1" min="0.1" value={form.quantity}
                onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} className="h-10 rounded-2xl" />
            </div>
            <div>
              <Label className="text-xs font-bold mb-1 block">Unit</Label>
              <Input value={form.quantity_unit} onChange={e => setForm(f => ({ ...f, quantity_unit: e.target.value }))}
                placeholder="serving, g, cup…" className="h-10 rounded-2xl" />
            </div>
          </div>

          {/* Macro inputs */}
          <div className="rounded-2xl p-3 space-y-3" style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)' }}>
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--hf-text-muted)' }}>Macros (or use AI photo scan above)</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'calories',  label: 'Calories (kcal)', color: 'var(--hf-lemon-strong)' },
                { key: 'protein_g', label: 'Protein (g)',      color: 'var(--hf-sky-strong)' },
                { key: 'carbs_g',   label: 'Carbs (g)',        color: 'var(--hf-mint-strong)' },
                { key: 'fat_g',     label: 'Fat (g)',           color: 'var(--hf-peach-strong)' },
              ].map(({ key, label, color }) => (
                <div key={key}>
                  <Label className="text-xs font-bold mb-1 block" style={{ color }}>{label}</Label>
                  <Input type="number" min="0" step="0.1" value={form[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder="0" className="h-10 rounded-2xl text-center font-bold" />
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <Button type="button" variant="outline" onClick={onCancel} className="h-11 rounded-2xl">Cancel</Button>
            <Button type="submit" disabled={isPending} className="h-11 rounded-2xl font-bold"
              style={{ background: '#d7f576', color: '#0a1200' }}>
              {isPending ? 'Saving…' : '+ Log Food'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

// ── Main Nutrition Page ─────────────────────────────────────────────────────
export default function Nutrition() {
  const { activeProfileId, activeProfile } = useActiveProfile();
  const qc = useQueryClient();
  const [logOpen, setLogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [generatingGoals, setGeneratingGoals] = useState(false);

  const { data: dailyTargets = null, isLoading: targetsLoading, refetch: refetchTargets } = useQuery({
    queryKey: ['daily-health-goals', activeProfileId],
    queryFn: () => getDailyHealthGoals(activeProfileId),
    enabled: !!activeProfileId,
    staleTime: 1000 * 60 * 30,
  });

  const { data: allLogs = [] } = useQuery({
    queryKey: ['meal-logs', activeProfileId],
    queryFn: () => base44.entities.MealLog.filter({ profile_id: activeProfileId }, '-logged_date', 200),
    enabled: !!activeProfileId,
  });

  const todayLogs = useMemo(() => allLogs.filter(l => l.logged_date === selectedDate), [allLogs, selectedDate]);

  const totals = useMemo(() => todayLogs.reduce((acc, l) => ({
    calories: acc.calories + (l.calories || 0),
    protein_g: acc.protein_g + (l.protein_g || 0),
    carbs_g: acc.carbs_g + (l.carbs_g || 0),
    fat_g: acc.fat_g + (l.fat_g || 0),
  }), { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }), [todayLogs]);

  const grouped = useMemo(() => {
    const g = {};
    todayLogs.forEach(l => { if (!g[l.meal_type]) g[l.meal_type] = []; g[l.meal_type].push(l); });
    return g;
  }, [todayLogs]);

  const createMut = useMutation({
    mutationFn: d => base44.entities.MealLog.create(d),
    onSuccess: () => {
      qc.invalidateQueries(['meal-logs', activeProfileId]);
      setLogOpen(false);
      setForm({ ...EMPTY_FORM });
      toast.success('Meal logged!');
    },
  });

  const deleteMut = useMutation({
    mutationFn: id => base44.entities.MealLog.delete(id),
    onSuccess: () => { qc.invalidateQueries(['meal-logs', activeProfileId]); toast.success('Removed'); },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createMut.mutate({
      profile_id: activeProfileId,
      logged_date: selectedDate,
      meal_type: form.meal_type,
      food_name: form.food_name,
      quantity: parseFloat(form.quantity) || 1,
      quantity_unit: form.quantity_unit,
      calories: parseFloat(form.calories) || 0,
      protein_g: parseFloat(form.protein_g) || 0,
      carbs_g: parseFloat(form.carbs_g) || 0,
      fat_g: parseFloat(form.fat_g) || 0,
      fiber_g: parseFloat(form.fiber_g) || 0,
      notes: form.notes,
    });
  };

  const generateGoals = async () => {
    if (!activeProfileId) return;
    setGeneratingGoals(true);
    try {
      await base44.functions.invoke('dailyHealthGoals', { profile_id: activeProfileId, regenerate: true });
      await refetchTargets();
      toast.success('AI nutrition goals generated!');
    } catch {
      toast.error('Could not generate goals');
    }
    setGeneratingGoals(false);
  };

  const calorieGoal = dailyTargets?.calories ?? 0;
  const caloriePct = calorieGoal > 0 ? Math.min(100, Math.round((totals.calories / calorieGoal) * 100)) : 0;
  const calorieLeft = calorieGoal > 0 ? calorieGoal - totals.calories : null;
  const calColor = caloriePct >= 100 ? '#f28c8c' : caloriePct >= 85 ? '#f7c9a3' : '#d7f576';

  return (
    <div className="bento-page">
      {/* Header */}
      <div className="bento-header flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="bento-title">Nutrition</h1>
          <p className="bento-subtitle">{activeProfile?.full_name || 'Your'} daily meal tracker</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
            className="h-9 px-3 rounded-2xl text-xs font-bold outline-none"
            style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }} />
          <Button onClick={() => setLogOpen(true)} className="h-9 px-4 rounded-2xl font-bold text-xs"
            style={{ background: '#d7f576', color: '#0a1200' }}>
            <Plus size={14} className="mr-1" /> Log Meal
          </Button>
        </div>
      </div>

      {/* Calorie + macro overview */}
      <div className="rounded-2xl p-4 mb-3" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest mb-0.5" style={{ color: 'var(--hf-text-muted)' }}>Calories Today</p>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-black" style={{ color: calColor }}>{totals.calories}</span>
              <span className="text-sm font-bold" style={{ color: 'var(--hf-text-muted)' }}>
                / {targetsLoading ? '…' : calorieGoal > 0 ? `${calorieGoal} kcal` : '—'}
              </span>
            </div>
          </div>
          <div className="text-right">
            {calorieGoal > 0 ? (
              <>
                <p className="text-[10px]" style={{ color: 'var(--hf-text-muted)' }}>
                  {calorieLeft >= 0 ? 'Remaining' : 'Over goal'}
                </p>
                <p className="text-xl font-black" style={{ color: calorieLeft >= 0 ? '#a8e6cf' : '#f28c8c' }}>
                  {Math.abs(calorieLeft)} kcal
                </p>
              </>
            ) : (
              <button onClick={generateGoals} disabled={generatingGoals}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all active:scale-95"
                style={{ background: 'rgba(215,245,118,0.12)', color: 'var(--hf-lemon-strong)', border: '1px solid rgba(215,245,118,0.25)' }}>
                {generatingGoals ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                {generatingGoals ? 'Generating…' : 'Generate AI Goals'}
              </button>
            )}
          </div>
        </div>

        {/* Calorie bar */}
        <div className="w-full h-3 rounded-full overflow-hidden mb-1" style={{ background: 'var(--hf-surface-2)' }}>
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${caloriePct}%`, background: calColor }} />
        </div>
        <p className="text-[10px] font-bold mb-3" style={{ color: 'var(--hf-text-muted)' }}>{caloriePct}% of daily goal</p>

        {/* Macro bars */}
        <div className="space-y-2.5">
          <MacroBar label="Protein" value={Math.round(totals.protein_g)} goal={dailyTargets?.protein_g || 0} color="#9bb4ff" />
          <MacroBar label="Carbs"   value={Math.round(totals.carbs_g)}   goal={dailyTargets?.carbs_g || 0}   color="#d7f576" />
          <MacroBar label="Fat"     value={Math.round(totals.fat_g)}     goal={dailyTargets?.fat_g || 0}     color="#f7c9a3" />
        </div>

        {dailyTargets?.summary && (
          <p className="text-[10px] mt-3 font-medium" style={{ color: 'var(--hf-text-muted)' }}>
            💡 {dailyTargets.summary}
          </p>
        )}

        {calorieGoal > 0 && (
          <button onClick={generateGoals} disabled={generatingGoals}
            className="flex items-center gap-1.5 mt-3 text-[10px] font-bold transition-all active:opacity-70"
            style={{ color: 'var(--hf-text-muted)' }}>
            {generatingGoals ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
            {generatingGoals ? 'Regenerating…' : 'Regenerate AI Goals'}
          </button>
        )}
      </div>

      {/* 7-day chart */}
      <div className="rounded-2xl p-4 mb-3" style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--hf-text-muted)' }}>7-Day Calorie Intake</p>
          {calorieGoal > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-5 border-t-2 border-dashed" style={{ borderColor: '#d7f576' }} />
              <p className="text-[9px] font-bold" style={{ color: 'var(--hf-text-muted)' }}>Goal: {calorieGoal} kcal</p>
            </div>
          )}
        </div>
        <WeekChart allLogs={allLogs} calorieGoal={calorieGoal} />
      </div>

      {/* AI Diet Suggestions */}
      <div className="mb-3">
        <NutritionDietSuggestions profileId={activeProfileId} totals={totals} dailyTargets={dailyTargets} />
      </div>

      {/* Meals by type */}
      <p className="text-[10px] font-black uppercase tracking-widest mb-2 px-1" style={{ color: 'var(--hf-text-muted)' }}>
        {format(new Date(selectedDate + 'T00:00:00'), 'EEE, MMM d')} — Meals
      </p>

      {MEAL_TYPES.map(({ value, label }) => {
        const items = grouped[value] || [];
        const mealCals = items.reduce((s, l) => s + (l.calories || 0), 0);
        const c = MEAL_COLORS[value];
        return (
          <div key={value} className="rounded-2xl overflow-hidden mb-3"
            style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
            <div className="flex items-center justify-between px-4 py-3"
              style={{ background: c.bg + '18', borderBottom: items.length > 0 ? '1px solid var(--hf-border)' : 'none' }}>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: c.bg }}>
                  <UtensilsCrossed size={12} style={{ color: c.tc }} />
                </div>
                <p className="text-sm font-black" style={{ color: 'var(--hf-text)' }}>{label}</p>
              </div>
              <div className="flex items-center gap-2">
                {mealCals > 0 && <span className="text-xs font-bold" style={{ color: c.bg }}>{mealCals} kcal</span>}
                <button onClick={() => { setForm(f => ({ ...f, meal_type: value })); setLogOpen(true); }}
                  className="w-7 h-7 rounded-xl flex items-center justify-center active:scale-90 transition-all"
                  style={{ background: c.bg + '33' }} aria-label={`Add to ${label}`}>
                  <Plus size={13} style={{ color: c.bg }} />
                </button>
              </div>
            </div>

            {items.length > 0 ? items.map(item => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-2.5"
                style={{ borderBottom: '1px solid var(--hf-border)' }}>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate" style={{ color: 'var(--hf-text)' }}>{item.food_name}</p>
                  <p className="text-[10px]" style={{ color: 'var(--hf-text-muted)' }}>
                    {item.quantity} {item.quantity_unit} · P:{item.protein_g}g · C:{item.carbs_g}g · F:{item.fat_g}g
                  </p>
                </div>
                <span className="text-xs font-black flex-shrink-0" style={{ color: c.bg }}>{item.calories} kcal</span>
                <button onClick={() => { if (confirm('Remove?')) deleteMut.mutate(item.id); }}
                  className="w-7 h-7 rounded-xl flex items-center justify-center active:scale-90 transition-all"
                  style={{ background: 'rgba(242,140,140,0.12)' }} aria-label="Remove">
                  <Trash2 size={12} style={{ color: 'var(--hf-coral-strong)' }} />
                </button>
              </div>
            )) : (
              <p className="text-xs px-4 py-2.5" style={{ color: 'var(--hf-text-muted)' }}>No food logged</p>
            )}
          </div>
        );
      })}

      {/* Log overlay */}
      <ResponsiveOverlay open={logOpen} onOpenChange={setLogOpen} title="Log Meal" desktopClassName="max-w-lg">
        <LogForm
          form={form}
          setForm={setForm}
          onSubmit={handleSubmit}
          onCancel={() => setLogOpen(false)}
          isPending={createMut.isPending}
          profileId={activeProfileId}
        />
      </ResponsiveOverlay>
    </div>
  );
}
