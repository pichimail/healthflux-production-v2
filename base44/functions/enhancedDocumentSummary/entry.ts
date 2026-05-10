import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { documentId, documentData } = await req.json();
    if (!documentId || !documentData) return Response.json({ error: 'Missing parameters' }, { status: 400 });

    // Generate detailed AI summary with key findings and action items
    const summaryResult = await base44.integrations.Core.InvokeLLM({
      prompt: `Create a comprehensive medical document summary with actionable insights:

Document Information:
- Title: ${documentData.title}
- Type: ${documentData.document_type}
- Facility: ${documentData.facility_name || 'N/A'}
- Doctor: ${documentData.doctor_name || 'N/A'}
- Date: ${documentData.document_date || 'N/A'}

Content Summary:
${documentData.ai_summary || 'No prior summary'}

Extracted Data:
- Lab Results: ${JSON.stringify(documentData.extracted_lab_results || [])}
- Medications: ${JSON.stringify(documentData.extracted_medications || [])}
- Vitals: ${JSON.stringify(documentData.extracted_vitals || [])}

Risk Factors: ${JSON.stringify(documentData.risk_factors || [])}

Please provide:
1. A concise detailed summary (2-3 sentences)
2. Key findings (3-5 bullet points of critical information)
3. Action items (2-4 recommended next steps for the patient/doctor)

Return ONLY a JSON object with these exact keys: { summary, keyFindings, actionItems }
Where keyFindings and actionItems are arrays of strings.`,
      response_json_schema: {
        type: "object",
        properties: {
          summary: { type: "string" },
          keyFindings: { type: "array", items: { type: "string" } },
          actionItems: { type: "array", items: { type: "string" } }
        }
      }
    });

    // Update document with enhanced summary
    if (documentId) {
      await base44.entities.MedicalDocument.update(documentId, {
        ai_summary_detailed: summaryResult.summary,
        key_findings: summaryResult.keyFindings || [],
        action_items: summaryResult.actionItems || []
      });
    }

    return Response.json({
      success: true,
      summary: summaryResult.summary,
      keyFindings: summaryResult.keyFindings || [],
      actionItems: summaryResult.actionItems || []
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});