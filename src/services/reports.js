import { base44 } from "@/api/base44Client";
import { getFeatureAvailability, isFeatureAvailable } from "@/services/availability";

function unwrapResponse(response) {
  return response?.data ?? response ?? null;
}

function normalizeReport(report) {
  if (!report) {
    return null;
  }

  return {
    ...report,
    created_date:
      report.created_date ??
      report.generated_at ??
      report.generatedAt ??
      report.saved_at ??
      report.savedAt ??
      null,
  };
}

async function invokePersistAIReport(payload) {
  const response = await base44.functions.invoke("persistAIReport", payload);
  return unwrapResponse(response);
}

export function getAIReportPersistenceAvailability() {
  return getFeatureAvailability("aiReportPersistence");
}

export async function listAIHealthReports(profileId) {
  if (!profileId) {
    return [];
  }

  if (isFeatureAvailable("aiReportPersistence")) {
    try {
      const persisted = await invokePersistAIReport({
        action: "list",
        profile_id: profileId,
      });
      const reports =
        persisted?.reports ?? persisted?.items ?? persisted?.data ?? persisted;
      if (Array.isArray(reports)) {
        return reports.map(normalizeReport);
      }
    } catch {
      // fall through to the existing persisted entity store
    }
  }

  const reports = await base44.entities.AIHealthReport.filter(
    { profile_id: profileId },
    "-created_date",
    20
  );
  return reports.map(normalizeReport);
}

export async function generateAndPersistAIHealthReport(profileId, period) {
  if (!profileId) {
    throw new Error("No profile selected");
  }

  const generatedResponse = await base44.functions.invoke("generateAIHealthReport", {
    profile_id: profileId,
    report_period: period,
  });
  const generated = unwrapResponse(generatedResponse);
  const reportId = generated?.report_id ?? generated?.id ?? null;

  let reportRecord = null;
  if (reportId) {
    try {
      const reports = await base44.entities.AIHealthReport.filter({ id: reportId });
      reportRecord = reports?.[0] ?? null;
    } catch {
      reportRecord = null;
    }
  }

  if (isFeatureAvailable("aiReportPersistence")) {
    const persisted = await invokePersistAIReport({
      action: "save",
      profile_id: profileId,
      report_id: reportId,
      report: normalizeReport(reportRecord ?? generated),
    });

    if (persisted?.success === false) {
      throw new Error(persisted.error || "Report persistence failed");
    }
  }

  return normalizeReport(reportRecord ?? generated);
}

export async function deleteAIHealthReport(reportId, profileId) {
  if (!reportId) {
    throw new Error("Missing report id");
  }

  if (isFeatureAvailable("aiReportPersistence")) {
    const persisted = await invokePersistAIReport({
      action: "delete",
      profile_id: profileId,
      report_id: reportId,
    });

    if (persisted?.success === false) {
      throw new Error(persisted.error || "Could not delete saved report");
    }
  }

  try {
    return await base44.entities.AIHealthReport.delete(reportId);
  } catch {
    return { success: true };
  }
}
