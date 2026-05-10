/**
 * MIGRATION: POST-EXPORT
 * Route: /api/ai/triage
 * InvokeLLM calls: 1 (symptom assessment with JSON schema)
 * Replace with: Claude API (medical accuracy)
 * DB calls: 4 (Profile, Medication, VitalMeasurement, LabResult)
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { profileId, symptoms, conversationHistory = [] } = body;

    // Fetch patient context
    const profile = await base44.entities.Profile.filter({ id: profileId }).then(res => res[0]);
    const medications = await base44.entities.Medication.filter({ profile_id: profileId, is_active: true });
    const recentVitals = await base44.entities.VitalMeasurement.filter({ profile_id: profileId }, '-measured_at', 10);
    const recentLabs = await base44.entities.LabResult.filter({ profile_id: profileId }, '-test_date', 10);

    // Build comprehensive context
    const patientContext = `
Patient Profile:
- Age: ${profile?.date_of_birth ? new Date().getFullYear() - new Date(profile.date_of_birth).getFullYear() : 'Unknown'}
- Gender: ${profile?.gender || 'Unknown'}
- Allergies: ${profile?.allergies?.join(', ') || 'None'}
- Chronic Conditions: ${profile?.chronic_conditions?.join(', ') || 'None'}

Current Medications:
${medications.map(m => `- ${m.medication_name} ${m.dosage} (${m.purpose || 'Not specified'})`).join('\n') || 'None'}

Recent Vital Signs:
${recentVitals.slice(0, 5).map(v => `- ${v.vital_type}: ${v.value || `${v.systolic}/${v.diastolic}`} ${v.unit || ''}`).join('\n') || 'None recorded'}

Recent Lab Results (if any abnormal):
${recentLabs.filter(l => l.flag !== 'normal').map(l => `- ${l.test_name}: ${l.value} ${l.unit} [${l.flag}]`).join('\n') || 'All normal'}
`.trim();

    // Build conversation history for context
    const conversationContext = conversationHistory.length > 0 
      ? '\n\nPrevious Conversation:\n' + conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')
      : '';

    const prompt = `You are a medical triage AI assistant for HealthFlux. Your role is to:
1. Assess the urgency of the patient's symptoms
2. Ask relevant follow-up questions to gather more information
3. Provide a preliminary assessment and recommendation

${patientContext}

Current Symptoms/Question: ${symptoms}
${conversationContext}

Provide a response in the following JSON format:
{
  "urgency": "emergency" | "urgent" | "consult_soon" | "monitor" | "self_care",
  "assessment": "Brief assessment of the situation",
  "questions": ["Follow-up question 1", "Follow-up question 2", ...],
  "recommendations": {
    "immediate_action": "What to do right now",
    "when_to_seek_care": "When to see a doctor",
    "self_care_tips": ["Tip 1", "Tip 2", ...],
    "red_flags": ["Warning sign 1", "Warning sign 2", ...]
  },
  "reasoning": "Brief explanation of the assessment"
}

CRITICAL GUIDELINES:
- Always err on the side of caution - if unsure, recommend professional evaluation
- For chest pain, difficulty breathing, severe bleeding, or altered consciousness: urgency = "emergency"
- Consider medication interactions and chronic conditions
- Be empathetic and clear in communication
- Never provide specific diagnoses, only guidance on next steps
- Always include disclaimer that this is not a substitute for professional medical advice`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: false,
      response_json_schema: {
        type: 'object',
        properties: {
          urgency: { type: 'string' },
          assessment: { type: 'string' },
          questions: { type: 'array', items: { type: 'string' } },
          recommendations: {
            type: 'object',
            properties: {
              immediate_action: { type: 'string' },
              when_to_seek_care: { type: 'string' },
              self_care_tips: { type: 'array', items: { type: 'string' } },
              red_flags: { type: 'array', items: { type: 'string' } }
            }
          },
          reasoning: { type: 'string' }
        }
      }
    });

    return Response.json({
      success: true,
      triage: response
    });

  } catch (error) {
    console.error('Symptom triage error:', error);
    return Response.json({
      error: error.message,
      success: false
    }, { status: 500 });
  }
});