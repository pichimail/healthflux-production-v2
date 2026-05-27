import { base44 } from "@/api/base44Client";
import { getFeatureAvailability, isFeatureAvailable } from "@/services/availability";
import { uploadFile } from "@/components/utils/storageService";

function unwrapResponse(response) {
  return response?.data ?? response ?? null;
}

function normalizeDocumentRecord(record, fallback = {}) {
  if (!record) {
    return null;
  }

  return {
    ...fallback,
    ...record,
    created_date:
      record.created_date ??
      record.uploaded_at ??
      record.uploadedAt ??
      fallback.created_date ??
      null,
    updated_date:
      record.updated_date ??
      record.generated_at ??
      record.generatedAt ??
      record.processed_at ??
      record.processedAt ??
      fallback.updated_date ??
      null,
    file_type: record.file_type ?? fallback.file_type ?? "",
    status: record.status ?? fallback.status ?? "pending",
  };
}

function mapProcessedDocumentUpdates(processed, fallbackDocument) {
  const extractedData = processed?.extractedData ?? processed?.extracted_data ?? {};
  const aiAnalysis = processed?.aiAnalysis ?? processed?.ai_analysis ?? {};
  const resultDocument =
    processed?.document ?? processed?.record ?? processed?.medical_document ?? null;

  if (resultDocument) {
    return normalizeDocumentRecord(resultDocument, fallbackDocument);
  }

  return normalizeDocumentRecord(
    {
      ...fallbackDocument,
      status: processed?.status ?? "completed",
      title:
        extractedData.document_title ??
        processed?.document_title ??
        fallbackDocument.title,
      document_type:
        extractedData.document_type ??
        processed?.document_type ??
        fallbackDocument.document_type,
      document_date:
        extractedData.document_date ??
        processed?.document_date ??
        fallbackDocument.document_date,
      facility_name:
        extractedData.facility_name ??
        processed?.facility_name ??
        fallbackDocument.facility_name,
      doctor_name:
        extractedData.doctor_name ??
        processed?.doctor_name ??
        fallbackDocument.doctor_name,
      extracted_lab_results:
        extractedData.lab_results ??
        processed?.extracted_lab_results ??
        fallbackDocument.extracted_lab_results,
      extracted_medications:
        extractedData.medications ??
        processed?.extracted_medications ??
        fallbackDocument.extracted_medications,
      extracted_vitals:
        extractedData.vitals ??
        processed?.extracted_vitals ??
        fallbackDocument.extracted_vitals,
      ai_summary:
        aiAnalysis.summary ??
        processed?.ai_summary ??
        extractedData.summary ??
        fallbackDocument.ai_summary,
      key_findings:
        aiAnalysis.key_findings ??
        processed?.key_findings ??
        extractedData.key_findings ??
        fallbackDocument.key_findings,
      action_items:
        aiAnalysis.action_items ??
        processed?.action_items ??
        fallbackDocument.action_items,
      risk_factors:
        aiAnalysis.risk_factors ??
        processed?.risk_factors ??
        fallbackDocument.risk_factors,
      health_score:
        aiAnalysis.health_score ??
        processed?.health_score ??
        fallbackDocument.health_score,
      updated_date:
        processed?.generated_at ??
        processed?.generatedAt ??
        processed?.processed_at ??
        processed?.processedAt ??
        fallbackDocument.updated_date ??
        new Date().toISOString(),
    },
    fallbackDocument
  );
}

async function invokeDocumentProcessor(document, options = {}) {
  const response = await base44.functions.invoke("documentProcessor", {
    document_id: document.id,
    file_url: document.file_url,
    file_name: document.file_name,
    file_type: document.file_type,
    profile_id: document.profile_id,
    notes: options.notes ?? document.notes ?? "",
    source:
      options.source ??
      (document.file_type?.startsWith("image/") ? "scan" : "upload"),
    auto_link_profiles: options.autoLinkProfiles ?? true,
  });

  return unwrapResponse(response);
}

export async function listDocuments(profileId) {
  if (!profileId) {
    return [];
  }

  const documents = await base44.entities.MedicalDocument.filter(
    { profile_id: profileId },
    "-document_date"
  );

  return documents.map((document) => normalizeDocumentRecord(document));
}

export async function deleteDocument(documentId) {
  return base44.entities.MedicalDocument.delete(documentId);
}

export async function createUploadedDocument({ file, profileId, notes = "", documentType = "other" }) {
  const { file_url } = await uploadFile(file);

  const document = await base44.entities.MedicalDocument.create({
    profile_id: profileId,
    title: file.name.replace(/\.[^.]+$/, ""),
    document_type: documentType,
    file_url,
    file_name: file.name,
    file_type: file.type,
    notes,
    status: "processing",
  });

  return normalizeDocumentRecord(document, {
    file_url,
    file_name: file.name,
    file_type: file.type,
  });
}

export async function processUploadedDocument(document, options = {}) {
  try {
    const processed = await invokeDocumentProcessor(document, options);

    if (!processed) {
      return document;
    }

    if (processed.success === false || processed.status === "failed") {
      throw new Error(processed.error || "Document processing failed");
    }

    const nextDocument = mapProcessedDocumentUpdates(processed, document);

    return await base44.entities.MedicalDocument.update(document.id, nextDocument);
  } catch (error) {
    await base44.entities.MedicalDocument.update(document.id, {
      status: "failed",
      updated_date: new Date().toISOString(),
    });
    throw error;
  }
}

export async function reprocessDocument(document) {
  const nextDocument = normalizeDocumentRecord(document, {
    status: "processing",
  });

  await base44.entities.MedicalDocument.update(document.id, {
    status: "processing",
    updated_date: new Date().toISOString(),
  });

  try {
    const processed = await invokeDocumentProcessor(nextDocument, {
      source: "reprocess",
    });

    if (!processed) {
      return nextDocument;
    }

    if (processed.success === false || processed.status === "failed") {
      throw new Error(processed.error || "Document processing failed");
    }

    const updatedDocument = mapProcessedDocumentUpdates(processed, nextDocument);

    return base44.entities.MedicalDocument.update(document.id, updatedDocument);
  } catch (error) {
    await base44.entities.MedicalDocument.update(document.id, {
      status: "failed",
      updated_date: new Date().toISOString(),
    });
    throw error;
  }
}

export async function semanticDocumentSearch({ profileId, searchQuery, documents }) {
  const availability = getFeatureAvailability("documentSemanticSearch");
  if (!isFeatureAvailable("documentSemanticSearch")) {
    return {
      results: documents ?? [],
      availability,
    };
  }

  const { data } = await base44.functions.invoke("semanticDocumentSearch", {
    profileId,
    searchQuery,
    documents,
  });

  return {
    results: data?.results ?? [],
    availability,
  };
}

export async function askDocumentQuestion({
  documentId,
  profileId,
  question,
  conversationHistory,
}) {
  const availability = getFeatureAvailability("documentChat");
  if (!isFeatureAvailable("documentChat")) {
    return {
      answer: availability.reason,
      availability,
    };
  }

  const { data } = await base44.functions.invoke("askDocumentQuestion", {
    document_id: documentId,
    profile_id: profileId,
    question,
    conversation_history: conversationHistory,
  });

  return {
    answer: data?.answer ?? "",
    availability,
  };
}
