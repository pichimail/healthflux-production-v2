/**
 * parseVoiceLog — Parse voice transcript into health categories
 * Categorizes into: vitals, symptoms, nutrition, medication, or general
 * Auto-saves to appropriate entity in the backend
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { transcript, profile_id } = await req.json();
    if (!transcript?.trim()) return Response.json({ error: 'No transcript provided' }, { status: 400 });

    // Use AI to categorize and extract structured data
    const parsed = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are a health data parser. Parse this voice input from a patient and extract structured health data.

Voice input: "${transcript}"

Determine the category:
- "vital": blood pressure, heart rate, weight, temperature, glucose, oxygen saturation
- "symptom": symptoms like headache, fever, pain, nausea, fatigue
- "nutrition": food/drink intake, calories, meal descriptions
- "medication": taking/adding a medication, dosage, timing
- "general": anything else

Extract data accordingly and return JSON.`,
      response_json_schema: {
        type: 'object',
        properties: {
          category: { type: 'string' },
          summary: { type: 'string' },
          // Vitals
          vital_type: { type: 'string' },
          systolic: { type: 'number' },
          diastolic: { type: 'number' },
          value: { type: 'number' },
          unit: { type: 'string' },
          // Symptom
          symptom_description: { type: 'string' },
          severity: { type: 'string' },
          // Nutrition
          food_description: { type: 'string' },
          calories: { type: 'number' },
          // Medication
          medication_name: { type: 'string' },
          dosage: { type: 'string' },
        },
      },
    });

    let savedEntity = null;
    const now = new Date().toISOString();

    if (parsed.category === 'vital' && parsed.vital_type && profile_id) {
      const vitalData = {
        profile_id,
        vital_type: parsed.vital_type,
        measured_at: now,
        source: 'manual',
        notes: `Voice log: "${transcript}"`,
      };
      if (parsed.vital_type === 'blood_pressure') {
        vitalData.systolic = parsed.systolic;
        vitalData.diastolic = parsed.diastolic;
      } else if (parsed.value) {
        vitalData.value = parsed.value;
        vitalData.unit = parsed.unit || '';
      }
      savedEntity = await base44.asServiceRole.entities.VitalMeasurement.create(vitalData);
    }

    if (parsed.category === 'nutrition' && profile_id) {
      // Save as a MedicalDocument note with nutrition tag
      savedEntity = await base44.asServiceRole.entities.MedicalDocument.create({
        profile_id,
        title: `Voice Nutrition Log — ${now.slice(0, 16).replace('T', ' ')} IST`,
        document_type: 'other',
        file_url: '',
        document_date: now.slice(0, 10),
        ai_summary: parsed.food_description || parsed.summary,
        key_findings: parsed.calories ? [`Estimated calories: ${parsed.calories} kcal`] : [],
        ai_tags: ['Nutrition', 'Voice Log'],
        status: 'completed',
      });
    }

    return Response.json({
      success: true,
      category: parsed.category,
      summary: parsed.summary,
      saved: !!savedEntity,
      data: parsed,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});