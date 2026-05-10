import { base44 } from "@/api/base44Client";
import { getFeatureAvailability } from "@/services/availability";

function unwrapResponse(response) {
  return response?.data ?? response ?? null;
}

export function getAdminStatsAvailability() {
  return getFeatureAvailability("adminStats");
}

export function normalizeAdminStats(data) {
  const payload = data?.stats ?? data?.dashboard ?? data ?? {};

  return {
    metrics: payload.metrics ?? payload.counts ?? {},
    today: payload.today ?? payload.daily ?? {},
    activity: (payload.activity ?? payload.time_series ?? payload.timeSeries ?? []).map(
      (item) => ({
        day: item.day ?? item.label ?? item.date ?? "",
        label: item.label ?? item.day ?? item.date ?? "",
        docs: item.docs ?? item.documents ?? 0,
        vitals: item.vitals ?? item.vital_logs ?? 0,
        users: item.users ?? item.new_users ?? 0,
        profiles: item.profiles ?? item.new_profiles ?? 0,
      })
    ),
    documents_by_type:
      payload.documents_by_type ??
      payload.documentsByType ??
      payload.doc_types ??
      [],
    vitals_by_type:
      payload.vitals_by_type ?? payload.vitalsByType ?? payload.vital_types ?? [],
    cohorts: (payload.cohorts ?? payload.cohort_data ?? payload.cohortData ?? []).map(
      (item) => ({
        label: item.label ?? item.cohort ?? "",
        cohort_size: item.cohort_size ?? item.size ?? 0,
        retained: item.retained ?? item.active ?? 0,
        retention_pct: item.retention_pct ?? item.retention ?? 0,
      })
    ),
    raw: data ?? null,
  };
}

export async function getAdminStats(view = "dashboard") {
  const response = await base44.functions.invoke("adminStats", { view });
  return normalizeAdminStats(unwrapResponse(response));
}
