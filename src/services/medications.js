import { base44 } from "@/api/base44Client";
import { getFeatureAvailability } from "@/services/availability";

function unwrapResponse(response) {
  return response?.data ?? response ?? null;
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

export function getRefillAlertsAvailability() {
  return getFeatureAvailability("refillAlerts");
}

export function getDailyAdherenceCheckAvailability() {
  return getFeatureAvailability("dailyAdherenceCheck");
}

export function normalizeRefillAlerts(data) {
  const alerts = data?.alerts ?? data?.refills ?? data?.items ?? data ?? [];
  return normalizeArray(alerts).map((alert, index) => ({
    id: alert.id ?? `refill-${index}`,
    medication_id: alert.medication_id ?? alert.medicationId ?? null,
    medication_name:
      alert.medication_name ?? alert.medicationName ?? alert.name ?? "",
    due_date:
      alert.refill_due_date ??
      alert.due_date ??
      alert.refillDueDate ??
      alert.dueDate ??
      null,
    refills_remaining:
      alert.refills_remaining ?? alert.refillsRemaining ?? null,
    pharmacy: alert.pharmacy ?? alert.pharmacy_name ?? alert.pharmacyName ?? "",
    message: alert.message ?? alert.summary ?? "",
    severity: alert.severity ?? alert.level ?? "warning",
    raw: alert,
  }));
}

export async function getRefillAlerts(profileId) {
  if (!profileId) {
    return [];
  }

  const response = await base44.functions.invoke("refillAlerts", {
    profile_id: profileId,
  });
  return normalizeRefillAlerts(unwrapResponse(response));
}

export function normalizeDailyAdherenceCheck(data) {
  const payload = data?.summary ?? data?.adherence ?? data ?? {};

  return {
    overall_adherence:
      payload.overall_adherence ??
      payload.overallAdherence ??
      payload.adherence_rate ??
      null,
    message: payload.message ?? payload.summary ?? payload.status_message ?? "",
    checked_at:
      payload.checked_at ??
      payload.checkedAt ??
      payload.generated_at ??
      payload.generatedAt ??
      null,
    medication_statuses: normalizeArray(
      payload.medication_statuses ?? payload.medications ?? []
    ),
    raw: data ?? null,
  };
}

export async function getDailyAdherenceCheck(profileId) {
  if (!profileId) {
    return null;
  }

  const response = await base44.functions.invoke("dailyAdherenceCheck", {
    profile_id: profileId,
    date: new Date().toISOString().slice(0, 10),
  });
  return normalizeDailyAdherenceCheck(unwrapResponse(response));
}
