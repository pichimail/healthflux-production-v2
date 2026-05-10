/**
 * MIGRATION: POST-EXPORT
 * Route: /api/gamification/award
 * InvokeLLM calls: 0
 * DB calls: 2 (GamificationProfile.filter, GamificationProfile.update)
 * Note: Gamification logic, no AI calls
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const POINT_VALUES = {
  log_vital: 10,
  log_medication: 15,
  upload_document: 20,
  log_lab_result: 15,
  complete_profile: 50,
  seven_day_streak: 100,
  thirty_day_streak: 500,
};

const BADGES = [
  // Streaks
  { id: 'streak_3',   condition: (p) => p.current_streak >= 3    },
  { id: 'streak_7',   condition: (p) => p.current_streak >= 7    },
  { id: 'streak_14',  condition: (p) => p.current_streak >= 14   },
  { id: 'streak_30',  condition: (p) => p.current_streak >= 30   },
  { id: 'streak_60',  condition: (p) => p.current_streak >= 60   },
  // First logs
  { id: 'first_vital',   condition: (p, action) => action === 'log_vital'       },
  { id: 'first_med',     condition: (p, action) => action === 'log_medication'  },
  { id: 'first_lab',     condition: (p, action) => action === 'log_lab_result'  },
  { id: 'first_doc',     condition: (p, action) => action === 'upload_document' },
  // Points
  { id: 'points_100',  condition: (p) => p.total_points >= 100  },
  { id: 'points_500',  condition: (p) => p.total_points >= 500  },
  { id: 'points_1000', condition: (p) => p.total_points >= 1000 },
  { id: 'points_5000', condition: (p) => p.total_points >= 5000 },
  // Health milestones (based on point_history action counts)
  { id: 'marathon_runner',   condition: (p) => {
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const activityDays = new Set((p.points_history || []).filter(h => h.date >= monthStart && h.action === 'log_vital').map(h => h.date));
    return activityDays.size >= 20;
  }},
  { id: 'glucose_guardian', condition: (p) => {
    return (p.points_history || []).filter(h => h.action === 'log_lab_result').length >= 10;
  }},
  { id: 'weight_warrior', condition: (p) => {
    return (p.points_history || []).filter(h => h.action === 'log_vital').length >= 14;
  }},
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action } = await req.json();
    const pts = POINT_VALUES[action] || 5;
    const today = new Date().toISOString().split('T')[0];

    // Get or create gamification profile
    let profiles = await base44.entities.GamificationProfile.filter({ user_email: user.email });
    let profile = profiles[0];

    if (!profile) {
      profile = await base44.entities.GamificationProfile.create({
        user_email: user.email,
        total_points: 0,
        current_streak: 0,
        longest_streak: 0,
        level: 1,
        badges: [],
        points_history: [],
      });
    }

    // Update streak
    let newStreak = profile.current_streak || 0;
    const lastDate = profile.last_activity_date;
    if (lastDate) {
      const diff = (new Date(today) - new Date(lastDate)) / 86400000;
      if (diff === 1) newStreak += 1;
      else if (diff > 1) newStreak = 1;
      // diff === 0 means same day, no change to streak
    } else {
      newStreak = 1;
    }

    const newTotal = (profile.total_points || 0) + pts;
    const newLevel = Math.floor(newTotal / 200) + 1;
    const newLongest = Math.max(profile.longest_streak || 0, newStreak);

    // Bonus for streaks
    let bonusPoints = 0;
    if (newStreak === 7) bonusPoints += POINT_VALUES.seven_day_streak;
    if (newStreak === 30) bonusPoints += POINT_VALUES.thirty_day_streak;

    const historyEntry = { date: today, action, points: pts + bonusPoints };
    const history = [...(profile.points_history || []).slice(-99), historyEntry];

    // Check new badges
    const currentBadgeIds = (profile.badges || []).map(b => b.id);
    const updatedProfile = {
      total_points: newTotal + bonusPoints,
      current_streak: newStreak,
      longest_streak: newLongest,
      last_activity_date: today,
      level: newLevel,
      points_history: history,
    };

    const newBadges = BADGES.filter(b =>
      !currentBadgeIds.includes(b.id) &&
      b.condition({ ...profile, ...updatedProfile }, action)
    ).map(b => ({ id: b.id, earned_at: new Date().toISOString() }));

    updatedProfile.badges = [...(profile.badges || []), ...newBadges];

    await base44.entities.GamificationProfile.update(profile.id, updatedProfile);

    return Response.json({
      points_awarded: pts + bonusPoints,
      total_points: updatedProfile.total_points,
      current_streak: newStreak,
      level: newLevel,
      new_badges: newBadges,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});