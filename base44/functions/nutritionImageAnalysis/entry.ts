/**
 * nutritionImageAnalysis — AI meal image → calorie/macro estimation → personalized feedback.
 *
 * Now context-aware: pulls user's health profile, wellness goals, and active medications
 * to provide personalized nutritional feedback and flag medication-food interactions.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { file_url, profile_id, meal_type = 'snack', logged_date, save_to_log = false } = body;

    if (!file_url || !profile_id) {
      return Response.json({ error: 'file_url and profile_id are required' }, { status: 400 });
    }

    // Ownership check
    const profiles = await base44.entities.Profile.filter({ id: profile_id });
    if (!profiles.length) return Response.json({ error: 'Profile not found' }, { status: 404 });
    if (profiles[0].created_by !== user.email && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const profile = profiles[0];

    // ── Gather health context in parallel ──────────────────────────────────
    const [wellnessGoals, activeMedications, nutritionGoal, recentLogs] = await Promise.all([
      base44.entities.WellnessGoal.filter({ profile_id }).catch(() => []),
      base44.entities.Medication.filter({ profile_id, is_active: true }).catch(() => []),
      base44.entities.NutritionGoal.filter({ profile_id }).catch(() => []),
      base44.entities.MealLog.filter({ profile_id }, '-created_date', 20).catch(() => []),
    ]);

    const today = logged_date || new Date().toISOString().split('T')[0];
    const todayLogs = recentLogs.filter(l => l.logged_date === today);
    const todayTotals = todayLogs.reduce((acc, l) => ({
      calories: acc.calories + (l.calories || 0),
      protein_g: acc.protein_g + (l.protein_g || 0),
      carbs_g: acc.carbs_g + (l.carbs_g || 0),
      fat_g: acc.fat_g + (l.fat_g || 0),
    }), { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });

    const nutriGoal = nutritionGoal[0] || null;
    const medNames = activeMedications.map(m => m.medication_name).filter(Boolean);
    const goalTitles = wellnessGoals.map(g => g.title || g.goal_type).filter(Boolean);
    const chronicConditions = profile.chronic_conditions || [];
    const allergies = profile.allergies || [];

    // Build context string for the AI
    const healthContext = [
      profile.gender && profile.date_of_birth
        ? `Patient: ${profile.full_name}, ${profile.gender}, DOB ${profile.date_of_birth}`
        : `Patient: ${profile.full_name}`,
      chronicConditions.length ? `Chronic conditions: ${chronicConditions.join(', ')}` : null,
      allergies.length ? `Known allergies: ${allergies.join(', ')}` : null,
      medNames.length ? `Current medications: ${medNames.join(', ')}` : null,
      goalTitles.length ? `Health goals: ${goalTitles.join(', ')}` : null,
      nutriGoal ? `Daily nutrition targets: ${nutriGoal.daily_calories} kcal, Protein ${nutriGoal.protein_g}g, Carbs ${nutriGoal.carbs_g}g, Fat ${nutriGoal.fat_g}g` : null,
      todayTotals.calories > 0
        ? `Already consumed today: ${Math.round(todayTotals.calories)} kcal, Protein ${Math.round(todayTotals.protein_g)}g, Carbs ${Math.round(todayTotals.carbs_g)}g, Fat ${Math.round(todayTotals.fat_g)}g`
        : null,
      `Meal type: ${meal_type}`,
    ].filter(Boolean).join('\n');

    // ── Vision-based food analysis + personalized feedback ─────────────────
    const analysis = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a registered dietitian and food recognition AI with expertise in clinical nutrition and pharmacology.

PATIENT HEALTH CONTEXT:
${healthContext}

Analyze the meal photo carefully and provide:
1. Food identification and macro estimation
2. Personalized nutritional feedback specific to this patient's health goals, conditions, and medications

IMPORTANT GUIDELINES:
- Flag any food-medication interactions (e.g., grapefruit with statins, high-vitamin-K foods with warfarin, tyramine-rich foods with MAOIs, high-potassium foods with ACE inhibitors/ARBs, etc.)
- Flag foods that may worsen their chronic conditions (e.g., high-sodium for hypertension, high-sugar for diabetes, high-purine for gout)
- Note if this meal aligns with or conflicts with their stated health goals
- Consider the day's cumulative intake when giving feedback
- Be specific, practical, and encouraging — not generic
- Keep feedback concise (2–3 sentences max per item)

Provide realistic macro estimates based on visible portion sizes.`,
      file_urls: [file_url],
      response_json_schema: {
        type: 'object',
        properties: {
          food_name: { type: 'string' },
          description: { type: 'string' },
          calories: { type: 'number' },
          protein_g: { type: 'number' },
          carbs_g: { type: 'number' },
          fat_g: { type: 'number' },
          fiber_g: { type: 'number' },
          quantity: { type: 'number' },
          quantity_unit: { type: 'string' },
          identified_items: { type: 'array', items: { type: 'string' } },
          confidence: { type: 'number' },
          // Personalized feedback fields
          goal_alignment: {
            type: 'string',
            description: 'How well this meal aligns with the patient health goals (1-2 sentences)'
          },
          medication_warnings: {
            type: 'array',
            items: { type: 'string' },
            description: 'Specific food-medication interaction warnings if any'
          },
          condition_notes: {
            type: 'array',
            items: { type: 'string' },
            description: 'Notes about how this meal affects their chronic conditions'
          },
          personalized_tips: {
            type: 'array',
            items: { type: 'string' },
            description: 'Specific actionable tips for this patient based on their health profile'
          },
          daily_progress: {
            type: 'string',
            description: 'Brief comment on how this meal fits into their daily nutrition targets so far'
          },
          overall_score: {
            type: 'number',
            description: 'Meal health score for this patient 0-100 based on their specific context'
          },
          overall_feedback: {
            type: 'string',
            description: 'One encouraging sentence summarizing overall meal assessment for this patient'
          }
        },
        required: ['food_name', 'calories', 'overall_feedback']
      }
    });

    let savedLog = null;

    if (save_to_log && analysis.food_name) {
      const medWarnings = analysis.medication_warnings?.length
        ? `⚠️ Med interactions: ${analysis.medication_warnings.join('; ')}. ` : '';
      const aiNotes = `AI scanned. Confidence: ${Math.round((analysis.confidence || 0.7) * 100)}%. ${medWarnings}Items: ${analysis.identified_items?.join(', ') || 'Mixed meal'}`;

      savedLog = await base44.entities.MealLog.create({
        profile_id,
        food_name: analysis.food_name,
        meal_type: ['breakfast','lunch','dinner','snack'].includes(meal_type) ? meal_type : 'snack',
        quantity: analysis.quantity || 1,
        quantity_unit: analysis.quantity_unit || 'serving',
        calories: Math.round(analysis.calories || 0),
        protein_g: Math.round((analysis.protein_g || 0) * 10) / 10,
        carbs_g: Math.round((analysis.carbs_g || 0) * 10) / 10,
        fat_g: Math.round((analysis.fat_g || 0) * 10) / 10,
        fiber_g: Math.round((analysis.fiber_g || 0) * 10) / 10,
        logged_date: today,
        notes: aiNotes,
      });
    }

    return Response.json({
      success: true,
      analysis: {
        food_name: analysis.food_name,
        description: analysis.description,
        calories: Math.round(analysis.calories || 0),
        protein_g: Math.round((analysis.protein_g || 0) * 10) / 10,
        carbs_g: Math.round((analysis.carbs_g || 0) * 10) / 10,
        fat_g: Math.round((analysis.fat_g || 0) * 10) / 10,
        fiber_g: Math.round((analysis.fiber_g || 0) * 10) / 10,
        quantity: analysis.quantity || 1,
        quantity_unit: analysis.quantity_unit || 'serving',
        identified_items: analysis.identified_items || [],
        confidence: analysis.confidence || 0.7,
        // Personalized fields
        goal_alignment: analysis.goal_alignment || null,
        medication_warnings: analysis.medication_warnings || [],
        condition_notes: analysis.condition_notes || [],
        personalized_tips: analysis.personalized_tips || [],
        daily_progress: analysis.daily_progress || null,
        overall_score: analysis.overall_score || null,
        overall_feedback: analysis.overall_feedback || null,
      },
      saved_log: savedLog,
      meal_type,
      logged_date: today,
    });

  } catch (error) {
    console.error('nutritionImageAnalysis error:', error);
    return Response.json({ error: error.message, success: false }, { status: 500 });
  }
});