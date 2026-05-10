import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { profile_id, image_url, image_type, body_part, scan_date, notes } = await req.json();
  if (!profile_id || !image_url || !image_type) {
    return Response.json({ error: 'profile_id, image_url, image_type are required' }, { status: 400 });
  }

  // Create a pending record
  const record = await base44.entities.AIMedicalImagingResult.create({
    profile_id, image_url, image_type, body_part, scan_date, notes, status: 'processing'
  });

  try {
    const prompt = `You are an expert radiologist and clinical AI assistant. Analyze this ${image_type.replace('_', ' ')} medical image${body_part ? ` of the ${body_part}` : ''}.

Provide a comprehensive analysis in JSON format with these exact fields:
{
  "plain_summary": "A clear, compassionate 3-4 sentence summary for a non-medical patient explaining what you see, completely avoiding medical jargon",
  "clinical_findings": "Detailed technical findings for a healthcare provider including location, density, size estimates, patterns, and any notable features",
  "anomalies": ["list", "of", "specific", "anomalies", "detected", "or", "empty", "array", "if", "none"],
  "risk_level": "low|moderate|high|critical",
  "diet_suggestions": ["specific diet suggestion 1 based on findings", "suggestion 2", "suggestion 3"],
  "follow_up_actions": ["recommended action 1", "action 2", "action 3"],
  "ai_confidence": 0.0 to 1.0
}

Be thorough but remember this is AI-assisted analysis only and not a replacement for professional medical diagnosis. If the image quality is poor or it's unclear what the image shows, reflect that in your confidence score.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      file_urls: [image_url],
      model: 'gemini_3_1_pro',
      response_json_schema: {
        type: 'object',
        properties: {
          plain_summary: { type: 'string' },
          clinical_findings: { type: 'string' },
          anomalies: { type: 'array', items: { type: 'string' } },
          risk_level: { type: 'string' },
          diet_suggestions: { type: 'array', items: { type: 'string' } },
          follow_up_actions: { type: 'array', items: { type: 'string' } },
          ai_confidence: { type: 'number' }
        }
      }
    });

    const updated = await base44.entities.AIMedicalImagingResult.update(record.id, {
      plain_summary: result.plain_summary,
      clinical_findings: result.clinical_findings,
      anomalies: result.anomalies || [],
      risk_level: result.risk_level || 'low',
      diet_suggestions: result.diet_suggestions || [],
      follow_up_actions: result.follow_up_actions || [],
      ai_confidence: result.ai_confidence || 0.7,
      status: 'completed'
    });

    return Response.json({ success: true, result: updated });
  } catch (err) {
    await base44.entities.AIMedicalImagingResult.update(record.id, { status: 'failed' });
    return Response.json({ error: err.message }, { status: 500 });
  }
});