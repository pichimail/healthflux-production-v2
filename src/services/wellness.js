import { base44 } from "@/api/base44Client";
import { getFeatureAvailability } from "@/services/availability";

function unwrapResponse(response) {
  return response?.data ?? response ?? null;
}

function numberOrNull(value) {
  const next = Number(value);
  return Number.isFinite(next) ? next : null;
}

export function getDailyHealthGoalsAvailability() {
  return getFeatureAvailability("dailyHealthGoals");
}

export function normalizeDailyHealthGoals(data) {
  const payload = data?.targets ?? data?.goal ?? data?.goals ?? data ?? {};

  return {
    calories:
      numberOrNull(
        payload.daily_calories ??
          payload.calories ??
          payload.calorie_target ??
          payload.calories_target
      ) ?? null,
    protein_g:
      numberOrNull(
        payload.protein_g ?? payload.protein ?? payload.protein_target
      ) ?? null,
    carbs_g:
      numberOrNull(payload.carbs_g ?? payload.carbs ?? payload.carbs_target) ??
      null,
    fat_g:
      numberOrNull(payload.fat_g ?? payload.fat ?? payload.fat_target) ?? null,
    steps:
      numberOrNull(payload.steps ?? payload.steps_target ?? payload.step_goal) ??
      null,
    active_minutes:
      numberOrNull(
        payload.active_minutes ??
          payload.exercise_minutes ??
          payload.activity_minutes
      ) ?? null,
    sleep_hours:
      numberOrNull(payload.sleep_hours ?? payload.sleep_target_hours) ?? null,
    water_glasses:
      numberOrNull(payload.water_glasses ?? payload.water_target) ?? null,
    health_score_target:
      numberOrNull(
        payload.health_score_target ??
          payload.health_target ??
          payload.wellness_score_target
      ) ?? null,
    summary: payload.summary ?? data?.summary ?? "",
    generated_at:
      payload.generated_at ??
      payload.generatedAt ??
      data?.generated_at ??
      data?.generatedAt ??
      null,
    raw: data ?? null,
  };
}

export async function getDailyHealthGoals(profileId) {
  if (!profileId) return null;
  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 8000)
    );
    const fetchPromise = base44.functions.invoke("dailyHealthGoals", {
      profile_id: profileId,
      date: new Date().toISOString().slice(0, 10),
    });
    const response = await Promise.race([fetchPromise, timeoutPromise]);
    return normalizeDailyHealthGoals(unwrapResponse(response));
  } catch (e) {
    console.warn('getDailyHealthGoals failed:', e.message);
    return null;
  }
}