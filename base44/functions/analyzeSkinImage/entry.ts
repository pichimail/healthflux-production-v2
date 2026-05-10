import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { profile_id, image_url, body_location } = await req.json();
  if (!profile_id || !image_url) {
    return Response.json({ error: 'profile_id and image_url are required' }, { status: 400 });
  }

  const record = await base44.entities.SkinAnalysis.create({
    profile_id, image_url, body_location,
    analysis_date: new Date().toISOString(),
    status: 'processing'
  });

  try {
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a dermatology AI assistant. Analyze this skin image${body_location ? ` from the ${body_location}` : ''}.

Provide a thorough skin condition assessment in JSON:
{
  "conditions_detected": ["list of conditions like acne, eczema, psoriasis, rosacea, potential lesion, etc."],
  "severity": "clear|mild|moderate|severe",
  "severity_score": 0-100,
  "triage_advice": "Compassionate 3-4 sentence advice on what this means and immediate steps",
  "skincare_routine": ["Step 1: ...", "Step 2: ...", "Step 3: ..."],
  "ingredients_to_avoid": ["ingredient1", "ingredient2"],
  "see_doctor_urgency": "no|within_month|within_week|immediately",
  "tracking_notes": "What to monitor over time and how changes might indicate improvement or worsening",
  "ai_confidence": 0.0 to 1.0
}

Important: If you see anything that could potentially be a malignant lesion (asymmetry, border irregularity, color variation, large diameter), set see_doctor_urgency to "immediately". This is AI analysis only, not medical diagnosis.`,
      file_urls: [image_url],
      model: 'gemini_3_1_pro',
      response_json_schema: {
        type: 'object',
        properties: {
          conditions_detected: { type: 'array', items: { type: 'string' } },
          severity: { type: 'string' },
          severity_score: { type: 'number' },
          triage_advice: { type: 'string' },
          skincare_routine: { type: 'array', items: { type: 'string' } },
          ingredients_to_avoid: { type: 'array', items: { type: 'string' } },
          see_doctor_urgency: { type: 'string' },
          tracking_notes: { type: 'string' },
          ai_confidence: { type: 'number' }
        }
      }
    });

    const updated = await base44.entities.SkinAnalysis.update(record.id, {
      conditions_detected: result.conditions_detected || [],
      severity: result.severity || 'mild',
      severity_score: result.severity_score || 0,
      triage_advice: result.triage_advice,
      skincare_routine: result.skincare_routine || [],
      ingredients_to_avoid: result.ingredients_to_avoid || [],
      see_doctor_urgency: result.see_doctor_urgency || 'no',
      tracking_notes: result.tracking_notes,
      ai_confidence: result.ai_confidence || 0.7,
      status: 'completed'
    });

    return Response.json({ success: true, result: updated });
  } catch (err) {
    await base44.entities.SkinAnalysis.update(record.id, { status: 'failed' });
    return Response.json({ error: err.message }, { status: 500 });
  }
});