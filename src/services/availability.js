import { FeatureAvailability, TODO_DATA_CONTRACTS } from "@/services/contracts";

export const availabilityRegistry = Object.freeze({
  documentProcessing: {
    state: FeatureAvailability.READY,
    reason: "",
  },
  documentSemanticSearch: {
    state: FeatureAvailability.READ_ONLY,
    reason:
      "Semantic document search is available only when the backend search function is configured.",
  },
  documentChat: {
    state: FeatureAvailability.READ_ONLY,
    reason:
      "Document chat is available only when the backend question-answering function is configured.",
  },
  aiReportPersistence: {
    state: FeatureAvailability.READY,
    reason: "",
  },
  dailyHealthGoals: {
    state: FeatureAvailability.READY,
    reason: "",
  },
  crossDocumentInsights: {
    state: FeatureAvailability.READY,
    reason: "",
  },
  refillAlerts: {
    state: FeatureAvailability.READY,
    reason: "",
  },
  dailyAdherenceCheck: {
    state: FeatureAvailability.READY,
    reason: "",
  },
  nutritionMealImageAnalysis: {
    state: FeatureAvailability.READY,
    reason: "",
  },
  nutritionAnalysisHistory: {
    state: FeatureAvailability.UNAVAILABLE,
    reason: TODO_DATA_CONTRACTS.nutritionAnalysis,
  },
  adminStats: {
    state: FeatureAvailability.READY,
    reason: "",
  },
  wearableSync: {
    state: FeatureAvailability.UNAVAILABLE,
    reason: TODO_DATA_CONTRACTS.deviceSync,
  },
  telehealthBooking: {
    state: FeatureAvailability.READY,
    reason: "",
  },
  adminAds: {
    state: FeatureAvailability.UNAVAILABLE,
    reason: TODO_DATA_CONTRACTS.adminAds,
  },
});

export const isFeatureAvailable = (key) =>
  availabilityRegistry[key]?.state === FeatureAvailability.READY;

export const getFeatureAvailability = (key) =>
  availabilityRegistry[key] ?? {
    state: FeatureAvailability.READY,
    reason: "",
  };
