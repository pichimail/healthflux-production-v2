import { base44 } from "@/api/base44Client";
import { getFeatureAvailability } from "@/services/availability";

function unwrapResponse(response) {
  return response?.data ?? response ?? null;
}

function normalizeInsightItem(item, index) {
  if (!item) {
    return null;
  }

  if (typeof item === "string") {
    return {
      id: `insight-${index}`,
      title: "Cross-document insight",
      description: item,
      severity: "info",
    };
  }

  return {
    id: item.id ?? `insight-${index}`,
    title: item.title ?? item.label ?? item.metric ?? "Cross-document insight",
    description:
      item.description ?? item.summary ?? item.detail ?? item.value ?? "",
    severity: item.severity ?? item.level ?? "info",
    value: item.value ?? null,
  };
}

export function getCrossDocumentInsightsAvailability() {
  return getFeatureAvailability("crossDocumentInsights");
}

export function normalizeCrossDocumentInsights(data) {
  const payload = data?.dashboard ?? data?.insights ?? data ?? {};
  const cards = (payload.cards ?? payload.summary_cards ?? [])
    .map(normalizeInsightItem)
    .filter(Boolean);
  const correlations = (payload.correlations ?? payload.relationships ?? [])
    .map(normalizeInsightItem)
    .filter(Boolean);

  const summaryMarkdown =
    payload.summary_markdown ??
    payload.summaryMarkdown ??
    payload.markdown ??
    payload.report ??
    data?.summary ??
    "";

  return {
    summaryMarkdown,
    cards,
    correlations,
    raw: data ?? null,
  };
}

export async function getCrossDocumentInsights(profileId) {
  if (!profileId) {
    return null;
  }

  const response = await base44.functions.invoke("crossDocumentInsights", {
    profile_id: profileId,
  });

  return normalizeCrossDocumentInsights(unwrapResponse(response));
}
