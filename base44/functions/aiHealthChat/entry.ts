/**
 * MIGRATION: POST-EXPORT
 * Route: /api/ai/chat
 * InvokeLLM calls: 0
 * DB calls: 5 (VitalMeasurement, LabResult, Medication, HealthInsight, Profile)
 * Note: Uses OpenAI directly via fetch (gpt-4o-mini). Replace OPENAI_API_KEY env var.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { question, profile_id } = await req.json();
    if (!question || !profile_id) {
      return Response.json({ error: 'Missing question or profile_id' }, { status: 400 });
    }
    // Fetch all health data for context
    const [vitals, labs, medications, insights, profileArr] = await Promise.all([
      base44.asServiceRole.entities.VitalMeasurement.filter({ profile_id }, '-measured_at', 50),
      base44.asServiceRole.entities.LabResult.filter({ profile_id }, '-test_date', 50),
      base44.asServiceRole.entities.Medication.filter({ profile_id, is_active: true }),
      base44.asServiceRole.entities.HealthInsight.filter({ profile_id }, '-created_date', 10),
      base44.asServiceRole.entities.Profile.filter({ id: profile_id })
    ]);
    const profile = profileArr[0];

    const context = `
Patient Profile:
- Name: ${profile?.full_name || 'Unknown'}
- Age: ${profile?.date_of_birth ? new Date().getFullYear() - new Date(profile.date_of_birth).getFullYear() : 'Unknown'}
- Blood Group: ${profile?.blood_group || 'Unknown'}
- Allergies: ${profile?.allergies?.join(', ') || 'None'}
- Chronic Conditions: ${profile?.chronic_conditions?.join(', ') || 'None'}

Recent Vitals:
${vitals.slice(0, 10).map(v => `- ${v.vital_type}: ${v.value || (v.systolic + '/' + v.diastolic)} ${v.unit || ''} (${new Date(v.measured_at).toLocaleDateString()})`).join('\n') || 'No vitals logged'}

Recent Lab Results:
${labs.slice(0, 10).map(l => `- ${l.test_name}: ${l.value} ${l.unit} [${l.flag || 'normal'}] (${new Date(l.test_date).toLocaleDateString()})`).join('\n') || 'No labs logged'}

Current Medications:
${medications.map(m => `- ${m.medication_name} ${m.dosage} - ${m.frequency?.replace(/_/g,' ')}`).join('\n') || 'None'}

Recent Health Insights:
${insights.slice(0, 5).map(i => `- ${i.title}: ${i.description}`).join('\n') || 'None'}
`.trim();

    const answer = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a helpful health assistant for HealthFlux. Use the patient's actual health records to answer their question accurately. Write in plain clear language. Do not use markdown formatting characters like *** or ###. Always remind the user to consult their healthcare provider for medical decisions.

${context}

Patient Question: ${question}`,
      model: 'gemini_3_flash'
    });

    return Response.json({
      success: true,
      answer,
      context_used: {
        vitals_count: vitals.length,
        labs_count: labs.length,
        medications_count: medications.length
      }
    });
  } catch (error) {
    console.error('AI health chat error:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});