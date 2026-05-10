/**
 * Shared frontend contracts and availability states.
 * These are frontend-facing DTO shapes while backend contracts are being finalized.
 */

export const AsyncResourceStatus = Object.freeze({
  IDLE: "idle",
  LOADING: "loading",
  READY: "ready",
  READ_ONLY: "read_only",
  UNAVAILABLE: "unavailable",
  ERROR: "error",
});

export const FeatureAvailability = Object.freeze({
  READY: "ready",
  READ_ONLY: "read_only",
  UNAVAILABLE: "unavailable",
});

export const TODO_DATA_CONTRACTS = Object.freeze({
  nutritionAnalysis:
    "TODO: backend contract for persisted meal image analyses and history is not confirmed.",
  deviceSync:
    "TODO: backend/native integration contract for device sync is not confirmed.",
  adminAds:
    "TODO: backend contract for admin-managed ad placements is not confirmed.",
  telehealthProviders:
    "TODO: provider directory, slot availability, and meeting-link generation contract is not confirmed.",
  aiReportPersistence:
    "TODO: confirm persistAIReport action names and payload envelope for list/save/delete across all environments.",
  dailyHealthGoals:
    "TODO: confirm dailyHealthGoals response shape for calorie, macro, activity, and health targets.",
  crossDocumentInsights:
    "TODO: confirm crossDocumentInsights payload shape for summary markdown, cards, and correlations.",
  refillAlerts:
    "TODO: confirm refillAlerts response shape for medication-linked refill warnings and due-soon alerts.",
  dailyAdherenceCheck:
    "TODO: confirm dailyAdherenceCheck response shape for adherence summaries, schedule checks, and messaging.",
  adminStats:
    "TODO: confirm adminStats response shape for dashboard metrics, time-series data, and cohort analytics.",
});
