// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useActiveProfile } from '../components/ActiveProfileContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, Trophy, Zap } from 'lucide-react';
import { useFeatureFlags } from '@/lib/FeatureFlagsContext';

// ── Badge catalog (expanded) ──────────────────────────────────────────────────
export const ALL_BADGES = [
  // Streak badges
  { id: 'streak_3',   label: '3-Day Warrior',      icon: '🔥', description: '3-day tracking streak',          category: 'streaks',  rarity: 'common'   },
  { id: 'streak_7',   label: 'Week Champion',       icon: '⚡', description: '7-day streak',                   category: 'streaks',  rarity: 'uncommon' },
  { id: 'streak_14',  label: 'Fortnight Force',     icon: '💪', description: '14-day streak',                  category: 'streaks',  rarity: 'rare'     },
  { id: 'streak_30',  label: 'Month Master',        icon: '🏆', description: '30-day streak',                  category: 'streaks',  rarity: 'epic'     },
  { id: 'streak_60',  label: 'Iron Will',           icon: '🦾', description: '60-day streak',                  category: 'streaks',  rarity: 'legendary'},
  // First logs
  { id: 'first_vital',   label: 'First Steps',      icon: '🩺', description: 'Log your first vital',           category: 'milestones', rarity: 'common' },
  { id: 'first_med',     label: 'Med Starter',      icon: '💊', description: 'Log your first medication',      category: 'milestones', rarity: 'common' },
  { id: 'first_lab',     label: 'Lab Pioneer',      icon: '🔬', description: 'Log your first lab result',      category: 'milestones', rarity: 'common' },
  { id: 'first_doc',     label: 'Doc Uploader',     icon: '📄', description: 'Upload your first document',     category: 'milestones', rarity: 'common' },
  // Points milestones
  { id: 'points_100',  label: 'Century Club',       icon: '💯', description: 'Earn 100 points',                category: 'points',   rarity: 'common'   },
  { id: 'points_500',  label: 'Health Hero',        icon: '🦸', description: 'Earn 500 points',                category: 'points',   rarity: 'uncommon' },
  { id: 'points_1000', label: 'Wellness Legend',    icon: '🌟', description: 'Earn 1,000 points',              category: 'points',   rarity: 'rare'     },
  { id: 'points_5000', label: 'Elite Tracker',      icon: '💎', description: 'Earn 5,000 points',              category: 'points',   rarity: 'epic'     },
  // Health achievements
  { id: 'marathon_runner',  label: 'Marathon Runner',   icon: '🏃', description: 'Log activity 20+ days in a month', category: 'health', rarity: 'rare'     },
  { id: 'cholesterol_crusher', label: 'Cholesterol Crusher', icon: '❤️‍🔥', description: 'Improve lipid panel results',  category: 'health', rarity: 'epic'  },
  { id: 'bp_buster',       label: 'BP Buster',         icon: '🫀', description: 'Maintain healthy BP for 7 days',   category: 'health', rarity: 'uncommon' },
  { id: 'glucose_guardian', label: 'Glucose Guardian', icon: '🍬', description: 'Log blood glucose 10+ times',       category: 'health', rarity: 'uncommon' },
  { id: 'med_perfect',     label: 'Perfect Adherence', icon: '✅', description: '100% medication adherence for a week', category: 'health', rarity: 'rare'  },
  { id: 'weight_warrior',  label: 'Weight Warrior',    icon: '⚖️', description: 'Log weight consistently for 2 weeks', category: 'health', rarity: 'uncommon'},
  { id: 'sleep_champion',  label: 'Sleep Champion',    icon: '😴', description: 'Maintain healthy sleep vitals',      category: 'health', rarity: 'uncommon' },
  { id: 'lab_all_clear',   label: 'All Clear',         icon: '🟢', description: 'All lab results in normal range',    category: 'health', rarity: 'epic'     },
  // Social
  { id: 'care_sharer',  label: 'Care Sharer',        icon: '🤝', description: 'Invite a caregiver to Care Circle',  category: 'social',  rarity: 'uncommon' },
  { id: 'profile_pro',  label: 'Profile Pro',        icon: '👤', description: 'Complete your health profile 100%',  category: 'social',  rarity: 'common'   },
];

// ── Tier / level system ───────────────────────────────────────────────────────
const TIERS = [
  { name: 'Beginner',    minPts: 0,     color: 'var(--hf-sky-strong)', textColor: '#0a1240', icon: '🌱', badge: 'Bronze'   },
  { name: 'Active',      minPts: 200,   color: 'var(--hf-mint-strong)', textColor: '#003d20', icon: '⚡', badge: 'Silver'   },
  { name: 'Committed',   minPts: 500,   color: 'var(--hf-peach-strong)', textColor: '#3d1a00', icon: '🔥', badge: 'Gold'     },
  { name: 'Advanced',    minPts: 1000,  color: 'var(--hf-lavender-strong)', textColor: '#1a0a40', icon: '💪', badge: 'Platinum' },
  { name: 'Expert',      minPts: 2000,  color: 'var(--hf-lemon-strong)', textColor: '#0a1200', icon: '⭐', badge: 'Diamond'  },
  { name: 'Elite',       minPts: 4000,  color: 'var(--hf-coral-strong)', textColor: '#3d0000', icon: '🏆', badge: 'Master'   },
  { name: 'Legend',      minPts: 7500,  color: '#ffd700', textColor: '#3d2a00', icon: '👑', badge: 'Legend'   },
];

const LEVEL_THRESHOLDS = [0, 200, 400, 700, 1000, 1500, 2000, 3000, 5000, 7500, 10000];

function getTier(pts) {
  let tier = TIERS[0];
  for (const t of TIERS) { if (pts >= t.minPts) tier = t; }
  return tier;
}

function getLevelInfo(pts) {
  let lvl = 0;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (pts >= LEVEL_THRESHOLDS[i]) lvl = i + 1;
  }
  const current = LEVEL_THRESHOLDS[lvl - 1] || 0;
  const next = LEVEL_THRESHOLDS[lvl] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  const progress = next > current ? Math.round(((pts - current) / (next - current)) * 100) : 100;
  return { level: lvl, current, next, progress };
}

const RARITY_STYLE = {
  common:    { bg: 'var(--hf-surface-2)', border: 'var(--hf-border)',                 label: 'Common',    color: 'var(--hf-text-muted)' },
  uncommon:  { bg: 'rgba(168,230,207,0.1)', border: 'rgba(168,230,207,0.4)',          label: 'Uncommon',  color: 'var(--hf-mint-strong)' },
  rare:      { bg: 'rgba(201,187,255,0.12)', border: 'rgba(201,187,255,0.5)',         label: 'Rare',      color: 'var(--hf-lavender-strong)' },
  epic:      { bg: 'rgba(215,245,118,0.1)', border: 'rgba(215,245,118,0.45)',         label: 'Epic',      color: 'var(--hf-lemon-strong)' },
  legendary: { bg: 'rgba(255,215,0,0.1)',   border: 'rgba(255,215,0,0.5)',            label: 'Legendary', color: '#ffd700' },
};

const CATEGORY_ICONS = {
  streaks: '🔥', milestones: '🎯', points: '💎', health: '❤️', social: '🤝',
};

const ACTIONS = [
  { key: 'log_vital',      label: 'Log a Vital',       pts: 10, emoji: '🩺' },
  { key: 'log_medication', label: 'Log Medication',    pts: 15, emoji: '💊' },
  { key: 'upload_document',label: 'Upload Document',   pts: 20, emoji: '📄' },
  { key: 'log_lab_result', label: 'Log Lab Result',    pts: 15, emoji: '🔬' },
];

// ── Badge component ───────────────────────────────────────────────────────────
function BadgeCard({ badge, earned, earnedAt }) {
  const rs = RARITY_STYLE[badge.rarity] || RARITY_STYLE.common;
  return (
    <div className="flex flex-col items-center p-3 rounded-2xl text-center gap-1.5 transition-all relative"
      style={{
        background: earned ? rs.bg : 'var(--hf-surface-2)',
        border: `1.5px solid ${earned ? rs.border : 'var(--hf-border)'}`,
        opacity: earned ? 1 : 0.45,
      }}>
      {badge.rarity !== 'common' && (
        <span className="absolute top-1.5 right-1.5 text-[7px] font-black px-1.5 py-0.5 rounded-full"
          style={{ background: rs.border, color: earned ? '#0a1200' : 'transparent', opacity: earned ? 1 : 0 }}>
          {rs.label}
        </span>
      )}
      <span className="text-2xl" style={{ filter: earned ? 'none' : 'grayscale(1)' }}>{badge.icon}</span>
      <p className="text-[10px] font-black leading-tight" style={{ color: 'var(--hf-text)' }}>{badge.label}</p>
      <p className="text-[9px] leading-tight" style={{ color: 'var(--hf-text-muted)' }}>{badge.description}</p>
      {earned && earnedAt && (
        <p className="text-[8px] font-bold" style={{ color: rs.color }}>
          {new Date(earnedAt).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
        </p>
      )}
    </div>
  );
}

// ── Leaderboard ───────────────────────────────────────────────────────────────
function Leaderboard({ tiersEnabled }) {
  // Build anonymized leaderboard from all GamificationProfiles the admin can see
  // For non-admin: we show only other users' points anonymized
  const { data: allGameProfiles = [] } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: () => base44.entities.GamificationProfile.list('-total_points', 20),
  });

  const rows = allGameProfiles.map((gp, i) => {
    const initial = gp.user_email ? gp.user_email[0].toUpperCase() : '?';
    const anon = `${initial}${'*'.repeat(Math.min(5, (gp.user_email || '').split('@')[0].length - 1))}`;
    return { ...gp, anon, rank: i + 1 };
  });

  const RANK_COLORS = ['#ffd700', '#c0c0c0', '#cd7f32'];
  const RANK_ICONS  = ['👑', '🥈', '🥉'];

  return (
    <div className="space-y-2">
      {rows.length === 0 && (
        <p className="text-xs text-center py-8" style={{ color: 'var(--hf-text-muted)' }}>No leaderboard data yet — start tracking to compete!</p>
      )}
      {rows.map(row => (
        <div key={row.id} className="flex items-center gap-3 p-3 rounded-2xl transition-all"
          style={{
            background: row.rank <= 3 ? `${RANK_COLORS[row.rank - 1]}15` : 'var(--hf-surface-2)',
            border: row.rank <= 3 ? `1px solid ${RANK_COLORS[row.rank - 1]}40` : '1px solid var(--hf-border)',
          }}>
          <div className="w-8 text-center flex-shrink-0">
            {row.rank <= 3
              ? <span className="text-lg">{RANK_ICONS[row.rank - 1]}</span>
              : <span className="text-xs font-black" style={{ color: 'var(--hf-text-muted)' }}>#{row.rank}</span>
            }
          </div>
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-black"
            style={{ background: getTier(row.total_points || 0).color, color: getTier(row.total_points || 0).textColor }}>
            {row.anon[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold" style={{ color: 'var(--hf-text)' }}>{row.anon}</p>
                <p className="text-[9px]" style={{ color: 'var(--hf-text-muted)' }}>
                  {tiersEnabled ? `${getTier(row.total_points || 0).name} · ` : ''}Streak {row.current_streak || 0}d
                </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-sm font-black" style={{ color: 'var(--hf-lemon-strong)' }}>{(row.total_points || 0).toLocaleString()}</p>
            <p className="text-[8px]" style={{ color: 'var(--hf-text-muted)' }}>pts</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function GamificationDashboard() {
  const { user } = useActiveProfile();
  const { hasFeature, loading: flagsLoading } = useFeatureFlags();
  const [awarding, setAwarding] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);
  const [activeTab, setActiveTab] = useState('progress');
  const [badgeFilter, setBadgeFilter] = useState('all');

  const { data: profile, refetch } = useQuery({
    queryKey: ['gamification', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const res = await base44.entities.GamificationProfile.filter({ user_email: user.email });
      return res[0] || null;
    },
    enabled: !!user?.email,
  });

  const handleAward = async (action) => {
    if (awarding) return;
    setAwarding(action.key);
    try {
      const res = await base44.functions.invoke('awardPoints', { action: action.key });
      const d = res.data;
      const msg = `+${d.points_awarded} pts${d.new_badges?.length ? ' · 🎖 New badge!' : ''}`;
      setToastMsg(msg);
      setTimeout(() => setToastMsg(null), 3500);
      refetch();
    } finally {
      setAwarding(null);
    }
  };

  const pts = profile?.total_points || 0;
  const tiersEnabled = !flagsLoading && hasFeature('gamification_tiers');
  const healthBadgesEnabled = !flagsLoading && hasFeature('gamification_health_badges');
  const activityFeedEnabled = !flagsLoading && hasFeature('activity_feed');
  const { level, progress, next } = getLevelInfo(pts);
  const tier = getTier(pts);
  const nextTier = TIERS.find(t => t.minPts > pts) || TIERS[TIERS.length - 1];
  const tierProgress = nextTier.minPts > tier.minPts
    ? Math.round(((pts - tier.minPts) / (nextTier.minPts - tier.minPts)) * 100)
    : 100;

  const earnedBadgeIds = (profile?.badges || []).map(b => b.id);

  const chartData = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
      const dayPts = (profile?.points_history || []).filter(h => h.date === d).reduce((s, h) => s + h.points, 0);
      days.push({ day: new Date(d).toLocaleDateString('en', { weekday: 'short' }), pts: dayPts });
    }
    return days;
  }, [profile]);

  const availableBadges = healthBadgesEnabled ? ALL_BADGES : ALL_BADGES.filter((b) => b.category !== 'health');
  const earnedVisibleBadgeCount = availableBadges.filter((b) => earnedBadgeIds.includes(b.id)).length;
  const categories = ['all', ...new Set(availableBadges.map((b) => b.category))];
  const filteredBadges = badgeFilter === 'all' ? availableBadges : availableBadges.filter((b) => b.category === badgeFilter);

  const TABS = [
    { key: 'progress', label: '⭐ Progress' },
    { key: 'badges',   label: `🏅 Badges (${earnedVisibleBadgeCount}/${availableBadges.length})` },
    { key: 'leaderboard', label: '🏆 Leaderboard' },
  ];

  return (
    <div className="bento-page">
      {toastMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] px-5 py-2.5 rounded-2xl font-bold text-sm shadow-xl"
          style={{ background: '#d7f576', color: '#0a1200' }}>
          {toastMsg}
        </div>
      )}

      <div className="bento-header">
        <h1 className="bento-title">Health Rewards</h1>
        <p className="bento-subtitle">Level up your health journey</p>
      </div>

      {/* Tier banner */}
      {tiersEnabled && (
        <div className="p-4 rounded-2xl mb-4 flex items-center gap-4"
          style={{ background: `linear-gradient(135deg, ${tier.color}33, ${tier.color}11)`, border: `1px solid ${tier.color}44` }}>
          <div className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center flex-shrink-0"
            style={{ background: tier.color }}>
            <span className="text-2xl">{tier.icon}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                style={{ background: `${tier.color}44`, color: tier.color }}>{tier.badge}</span>
              <span className="text-xs font-black" style={{ color: 'var(--hf-text)' }}>{tier.name} · Level {level}</span>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>
                {pts.toLocaleString()} / {nextTier.minPts.toLocaleString()} pts to {nextTier.name}
              </span>
            </div>
            <Progress value={tierProgress} className="h-2 rounded-full" />
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          { label: 'Points',    value: pts.toLocaleString(), color: 'var(--hf-lemon-strong)', textColor: '#0a1200', icon: '💎' },
          { label: 'Level',     value: level,                 color: 'var(--hf-lavender-strong)', textColor: '#1a0a40', icon: '⭐' },
          { label: 'Streak',    value: `${profile?.current_streak || 0}d`, color: 'var(--hf-peach-strong)', textColor: '#3d1a00', icon: '🔥' },
          { label: 'Badges',    value: earnedVisibleBadgeCount, color: 'var(--hf-mint-strong)', textColor: '#003d20', icon: '🏅' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl p-3 flex flex-col gap-0.5 text-center" style={{ background: s.color }}>
            <span className="text-base">{s.icon}</span>
            <p className="text-lg font-black leading-none" style={{ color: s.textColor }}>{s.value}</p>
            <p className="text-[8px] font-bold uppercase opacity-70" style={{ color: s.textColor }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto scrollbar-hide pb-1">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className="whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold transition-all flex-shrink-0"
            style={{
              background: activeTab === t.key ? '#d7f576' : 'var(--hf-surface-2)',
              color: activeTab === t.key ? '#0a1200' : 'var(--hf-text-muted)',
              border: '1px solid var(--hf-border)',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── PROGRESS TAB ── */}
      {activeTab === 'progress' && (
        <div className="space-y-4">
          {/* Level progress */}
          <Card className="border-0 card-shadow rounded-2xl">
            <CardContent className="p-4">
              <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: 'var(--hf-text-muted)' }}>Level Progression</p>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-full flex items-center justify-center font-black text-sm" style={{ background: '#d7f576', color: '#0a1200' }}>
                  {level}
                </div>
                <div className="flex-1">
                  <Progress value={progress} className="h-2.5 rounded-full" />
                </div>
                <div className="w-9 h-9 rounded-full flex items-center justify-center font-black text-sm opacity-40" style={{ background: 'var(--hf-border)', color: 'var(--hf-text)' }}>
                  {level + 1}
                </div>
              </div>
              <p className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>{next - pts} pts to Level {level + 1}</p>
            </CardContent>
          </Card>

          {/* Tier roadmap */}
          {tiersEnabled && (
          <Card className="border-0 card-shadow rounded-2xl">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-bold" style={{ color: 'var(--hf-text)' }}>Tier Roadmap</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide pb-2">
                {TIERS.map((t, i) => {
                  const reached = pts >= t.minPts;
                  const current = tier.name === t.name;
                  return (
                    <React.Fragment key={t.name}>
                      <div className="flex flex-col items-center gap-1 flex-shrink-0 min-w-[52px]">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all"
                          style={{
                            background: reached ? t.color : 'var(--hf-surface-2)',
                            border: current ? `2px solid ${t.color}` : '1px solid var(--hf-border)',
                            opacity: reached ? 1 : 0.4,
                          }}>
                          {t.icon}
                        </div>
                        <p className="text-[8px] font-black text-center" style={{ color: current ? t.color : 'var(--hf-text-muted)' }}>{t.name}</p>
                        <p className="text-[7px]" style={{ color: 'var(--hf-text-muted)' }}>{t.minPts >= 1000 ? `${t.minPts/1000}k` : t.minPts}</p>
                      </div>
                      {i < TIERS.length - 1 && (
                        <div className="h-px w-4 flex-shrink-0" style={{ background: pts >= TIERS[i + 1]?.minPts ? '#d7f576' : 'var(--hf-border)' }} />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </CardContent>
          </Card>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            {/* Earn points */}
            <Card className="border-0 card-shadow rounded-2xl">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--hf-text)' }}>
                  <Zap size={13} style={{ color: 'var(--hf-lemon-strong)' }} /> Earn Points
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-2">
                {ACTIONS.map(a => (
                  <button key={a.key} onClick={() => handleAward(a)}
                    disabled={awarding === a.key}
                    className="w-full flex items-center justify-between p-3 rounded-2xl transition-all active:scale-[0.98] disabled:opacity-60"
                    style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)' }}>
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">{a.emoji}</span>
                      <span className="text-sm font-semibold" style={{ color: 'var(--hf-text)' }}>{a.label}</span>
                    </div>
                    <span className="text-xs font-black px-2.5 py-1 rounded-full" style={{ background: '#d7f576', color: '#0a1200' }}>
                      +{a.pts}
                    </span>
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* Points chart */}
            <Card className="border-0 card-shadow rounded-2xl">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--hf-text)' }}>
                  <TrendingUp size={13} /> This Week
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 h-[170px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} barSize={22}>
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--hf-text-muted)' }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)', borderRadius: 12, fontSize: 11 }}
                      formatter={v => [`${v} pts`]}
                    />
                    <Bar dataKey="pts" radius={[6, 6, 0, 0]}>
                      {chartData.map((entry, i) => (
                        <Cell key={i} fill={entry.pts > 0 ? '#d7f576' : 'var(--hf-border)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Recent activity */}
          {activityFeedEnabled && profile?.points_history?.length > 0 && (
            <Card className="border-0 card-shadow rounded-2xl">
              <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-bold" style={{ color: 'var(--hf-text)' }}>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-1.5">
                {[...(profile.points_history || [])].reverse().slice(0, 8).map((h, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b" style={{ borderColor: 'var(--hf-border)' }}>
                    <div className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>{h.action?.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px]" style={{ color: 'var(--hf-text-muted)' }}>{h.date}</span>
                      <span className="text-xs font-black" style={{ color: 'var(--hf-lemon-strong)' }}>+{h.points}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── BADGES TAB ── */}
      {activeTab === 'badges' && (
        <div className="space-y-4">
          {/* Category filter */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {categories.map(cat => (
              <button key={cat} onClick={() => setBadgeFilter(cat)}
                className="whitespace-nowrap px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex-shrink-0"
                style={{
                  background: badgeFilter === cat ? '#d7f576' : 'var(--hf-surface-2)',
                  color: badgeFilter === cat ? '#0a1200' : 'var(--hf-text-muted)',
                  border: '1px solid var(--hf-border)',
                }}>
                {cat === 'all' ? '⭐ All' : `${CATEGORY_ICONS[cat] || '•'} ${cat}`}
              </button>
            ))}
          </div>

          {/* Earned count */}
          <div className="flex items-center justify-between px-1">
            <p className="text-xs font-bold" style={{ color: 'var(--hf-text)' }}>
              {filteredBadges.filter(b => earnedBadgeIds.includes(b.id)).length} / {filteredBadges.length} earned
            </p>
            <div className="flex gap-2">
              {Object.entries(RARITY_STYLE).map(([r, s]) => (
                <span key={r} className="text-[8px] font-black px-1.5 py-0.5 rounded-full" style={{ background: s.border, color: '#0a1200' }}>
                  {s.label}
                </span>
              ))}
            </div>
          </div>

          {/* Badge grid — earned first */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {[
              ...filteredBadges.filter(b => earnedBadgeIds.includes(b.id)),
              ...filteredBadges.filter(b => !earnedBadgeIds.includes(b.id)),
            ].map(badge => (
              <BadgeCard
                key={badge.id}
                badge={badge}
                earned={earnedBadgeIds.includes(badge.id)}
                earnedAt={(profile?.badges || []).find(b => b.id === badge.id)?.earned_at}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── LEADERBOARD TAB ── */}
      {activeTab === 'leaderboard' && (
        <div className="space-y-4">
          {/* User's own rank callout */}
          {profile && (
            <div className="p-4 rounded-2xl flex items-center gap-3"
              style={{ background: 'rgba(215,245,118,0.1)', border: '1px solid rgba(215,245,118,0.3)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                style={{ background: tier.color }}>
                {tier.icon}
              </div>
              <div className="flex-1">
              <p className="text-sm font-black" style={{ color: 'var(--hf-text)' }}>You{tiersEnabled ? ` · ${tier.name}` : ''}</p>
                <p className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>
                  {pts.toLocaleString()} pts · {profile.current_streak || 0}-day streak · {earnedVisibleBadgeCount} badges
                </p>
              </div>
            </div>
          )}

          <Card className="border-0 card-shadow rounded-2xl">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--hf-text)' }}>
                <Trophy size={13} style={{ color: '#ffd700' }} /> Global Rankings
                <span className="text-[9px] ml-auto font-normal px-2 py-0.5 rounded-full" style={{ background: 'var(--hf-surface-2)', color: 'var(--hf-text-muted)' }}>Anonymized</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <Leaderboard tiersEnabled={tiersEnabled} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
