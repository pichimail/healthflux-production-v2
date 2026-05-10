import { base44 } from "@/api/base44Client";
import { uploadFile } from "@/components/utils/storageService";
import { getFeatureAvailability } from "@/services/availability";

function unwrapResponse(response) {
  return response?.data ?? response ?? null;
}

function numberOrZero(value) {
  const next = Number(value);
  return Number.isFinite(next) ? next : 0;
}

export function getNutritionImageAnalysisAvailability() {
  return getFeatureAvailability("nutritionMealImageAnalysis");
}

export function normalizeNutritionImageAnalysis(data) {
  const payload = data?.analysis ?? data?.meal ?? data ?? {};

  return {
    food_name:
      payload.food_name ?? payload.foodName ?? payload.name ?? "Detected meal",
    calories: numberOrZero(payload.calories ?? payload.calorie_estimate),
    protein_g: numberOrZero(payload.protein_g ?? payload.protein),
    carbs_g: numberOrZero(payload.carbs_g ?? payload.carbs),
    fat_g: numberOrZero(payload.fat_g ?? payload.fat),
    fiber_g: numberOrZero(payload.fiber_g ?? payload.fiber),
    quantity: numberOrZero(payload.quantity ?? 1) || 1,
    quantity_unit: payload.quantity_unit ?? payload.quantityUnit ?? "serving",
    description: payload.description ?? payload.summary ?? "",
    raw: data ?? null,
  };
}

export async function analyzeNutritionImage({ file, profileId }) {
  const { file_url } = await uploadFile(file);
  const response = await base44.functions.invoke("nutritionImageAnalysis", {
    profile_id: profileId,
    file_url,
    file_name: file.name,
    file_type: file.type,
  });

  return normalizeNutritionImageAnalysis(unwrapResponse(response));
}
