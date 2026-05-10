import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { profile_id } = await req.json();
  if (!profile_id) return Response.json({ error: 'profile_id is required' }, { status: 400 });

  // Create a generating record immediately
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const record = await base44.entities.PersonalizedDietPlan.create({
    profile_id,
    week_start: weekStart.toISOString().split('T')[0],
    status: 'generating'
  });

  try {
    // Gather all health data in parallel
    const [profile, labs, vitals, goals] = await Promise.all([
      base44.entities.Profile.filter({ id: profile_id }),
      base44.entities.LabResult.filter({ profile_id }, '-test_date', 30),
      base44.entities.VitalMeasurement.filter({ profile_id }, '-measured_at', 20),
      base44.entities.WellnessGoal.filter({ profile_id, is_active: true }),
    ]);

    const profileData = profile[0] || {};
    const latestLabs = labs.slice(0, 15);
    const latestVitals = vitals.slice(0, 10);

    // Build health context summary
    const healthContext = {
      age: profileData.date_of_birth ? Math.floor((Date.now() - new Date(profileData.date_of_birth)) / (365.25 * 24 * 60 * 60 * 1000)) : null,
      gender: profileData.gender,
      blood_group: profileData.blood_group,
      allergies: profileData.allergies || [],
      chronic_conditions: profileData.chronic_conditions || [],
      height_cm: profileData.height,
      recent_labs: latestLabs.map(l => ({ test: l.test_name, value: l.value, unit: l.unit, flag: l.flag })),
      recent_vitals: latestVitals.map(v => ({ type: v.vital_type, value: v.value, unit: v.unit })),
      goals: goals.map(g => ({ category: g.category, target: g.target_value, unit: g.unit }))
    };

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an expert clinical dietitian and nutritionist. Create a personalized 7-day meal plan for a patient with the following health profile:

${JSON.stringify(healthContext, null, 2)}

Pay special attention to:
- Any abnormal lab results (flagged as "high" or "low")
- Chronic conditions like diabetes, hypertension, high cholesterol
- Allergies and blood group dietary recommendations
- Weight and fitness goals

Generate a comprehensive diet plan in this exact JSON structure:
{
  "daily_plans": [
    {
      "day": "Monday",
      "breakfast": "detailed breakfast description with portions",
      "lunch": "detailed lunch description with portions",
      "dinner": "detailed dinner description with portions",
      "snacks": "healthy snack options",
      "calories": 1800,
      "notes": "any specific notes for this day"
    }
    // repeat for all 7 days
  ],
  "nutritional_goals": {
    "calories": 1800,
    "protein_g": 90,
    "carbs_g": 200,
    "fat_g": 60,
    "fiber_g": 30,
    "sodium_mg": 2000
  },
  "foods_to_avoid": ["specific foods to avoid based on conditions"],
  "foods_to_include": ["beneficial foods to prioritize"],
  "lifestyle_tips": ["tip 1", "tip 2", "tip 3", "tip 4"],
  "health_conditions_addressed": ["condition 1", "condition 2"],
  "ai_rationale": "2-3 sentence explanation of why this plan was designed this way"
}

Make meals practical, culturally appropriate for Indian cuisine when possible, and enjoyable.`,
      model: 'claude_sonnet_4_6',
      response_json_schema: {
        type: 'object',
        properties: {
          daily_plans: { type: 'array', items: { type: 'object' } },
          nutritional_goals: { type: 'object' },
          foods_to_avoid: { type: 'array', items: { type: 'string' } },
          foods_to_include: { type: 'array', items: { type: 'string' } },
          lifestyle_tips: { type: 'array', items: { type: 'string' } },
          health_conditions_addressed: { type: 'array', items: { type: 'string' } },
          ai_rationale: { type: 'string' }
        }
      }
    });

    const updated = await base44.entities.PersonalizedDietPlan.update(record.id, {
      health_context: healthContext,
      daily_plans: result.daily_plans || [],
      nutritional_goals: result.nutritional_goals || {},
      foods_to_avoid: result.foods_to_avoid || [],
      foods_to_include: result.foods_to_include || [],
      lifestyle_tips: result.lifestyle_tips || [],
      health_conditions_addressed: result.health_conditions_addressed || [],
      ai_rationale: result.ai_rationale || '',
      status: 'ready'
    });

    return Response.json({ success: true, plan: updated });
  } catch (err) {
    await base44.entities.PersonalizedDietPlan.update(record.id, { status: 'archived' });
    return Response.json({ error: err.message }, { status: 500 });
  }
});