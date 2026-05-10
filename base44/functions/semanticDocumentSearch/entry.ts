import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { profileId, searchQuery, documents } = await req.json();
    if (!profileId || !searchQuery) return Response.json({ error: 'Missing parameters' }, { status: 400 });

    // Use LLM to understand search intent and extract semantic meaning
    const searchContext = await base44.integrations.Core.InvokeLLM({
      prompt: `Analyze this medical search query and extract semantic intent:
"${searchQuery}"

Return a JSON object with:
- intent: main intent (e.g., "find lab results", "search diagnoses", "find prescriptions")
- keywords: array of key medical terms
- dateRange: if mentioned, {from, to}
- conditions: array of mentioned health conditions
- scope: what type of documents (lab_report, prescription, etc.) or "all"

Be strict - return ONLY valid JSON.`,
      response_json_schema: {
        type: "object",
        properties: {
          intent: { type: "string" },
          keywords: { type: "array", items: { type: "string" } },
          dateRange: { type: "object" },
          conditions: { type: "array", items: { type: "string" } },
          scope: { type: "string" }
        }
      }
    });

    // Score and rank documents based on semantic relevance
    const scoredDocs = await Promise.all(documents.map(async (doc) => {
      const relevancePrompt = `Given this medical document and search query, rate relevance (0-100):

Search Intent: ${searchContext.intent}
Keywords: ${searchContext.keywords.join(', ')}
Conditions: ${searchContext.conditions.join(', ')}

Document:
- Title: ${doc.title}
- Type: ${doc.document_type}
- Facility: ${doc.facility_name || 'N/A'}
- Doctor: ${doc.doctor_name || 'N/A'}
- Date: ${doc.document_date || 'N/A'}
- Summary: ${doc.ai_summary || 'No summary'}
- Lab Results: ${doc.extracted_lab_results?.length || 0} items
- Medications: ${doc.extracted_medications?.length || 0} items

Return ONLY a JSON object with: { score: number, reason: string }`;

      try {
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: relevancePrompt,
          response_json_schema: {
            type: "object",
            properties: {
              score: { type: "number" },
              reason: { type: "string" }
            }
          }
        });
        return { ...doc, relevanceScore: result.score || 0, relevanceReason: result.reason };
      } catch {
        return { ...doc, relevanceScore: 0, relevanceReason: 'Error scoring' };
      }
    }));

    // Sort by relevance score
    const results = scoredDocs
      .filter(d => d.relevanceScore > 20)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 20);

    return Response.json({
      success: true,
      searchContext,
      results,
      totalFound: results.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});