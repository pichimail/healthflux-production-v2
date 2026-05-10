import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { documentId, documentData } = await req.json();
    if (!documentId || !documentData) return Response.json({ error: 'Missing parameters' }, { status: 400 });

    // Extract tags using AI
    const taggingResult = await base44.integrations.Core.InvokeLLM({
      prompt: `Analyze this medical document and suggest 3-5 relevant category tags:

Title: ${documentData.title}
Type: ${documentData.document_type}
Facility: ${documentData.facility_name || 'N/A'}
Doctor: ${documentData.doctor_name || 'N/A'}
Date: ${documentData.document_date || 'N/A'}
Summary: ${documentData.ai_summary || 'No summary'}
Lab Results: ${documentData.extracted_lab_results?.length || 0} items
Medications: ${documentData.extracted_medications?.length || 0} items
Vitals: ${documentData.extracted_vitals?.length || 0} items

Available tag categories:
- Billing/Insurance
- Referral
- Lab Result
- Prescription/Medication
- Imaging
- Consultation
- Vaccination
- Discharge Summary
- Follow-up Required
- Chronic Condition
- Emergency
- Preventive Care

Return ONLY a JSON object with:
{
  "tags": ["tag1", "tag2", ...],
  "confidence": 0-1,
  "reasoning": "brief explanation"
}`,
      response_json_schema: {
        type: "object",
        properties: {
          tags: { type: "array", items: { type: "string" } },
          confidence: { type: "number" },
          reasoning: { type: "string" }
        }
      }
    });

    // Update document with AI tags
    if (documentId) {
      await base44.entities.MedicalDocument.update(documentId, {
        ai_tags: taggingResult.tags || []
      });
    }

    return Response.json({
      success: true,
      tags: taggingResult.tags || [],
      confidence: taggingResult.confidence,
      reasoning: taggingResult.reasoning
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});