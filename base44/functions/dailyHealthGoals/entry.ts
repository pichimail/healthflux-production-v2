/**
 * dailyHealthGoals — AI-powered daily health goal generator.
 * 
 * Reads user's vitals, labs, medications, nutrition history, and medical documents.
 * Generates personalized daily caloric, macro, activity, and health targets.
 * Persists goals to WellnessGoal entity and returns structured dashboard-ready data.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { profile_id, regenerate = false } = body;

    if (!profile_id) return Response.json({ error: 'profile_id required' }, { status: 400 });

    // Ownership check
    const profiles = await base44.entities.Profile.filter({ id: profile_id });
    if (!profiles.length) return Response.json({ error: 'Profile not found' }, { status: 404 });
    if (profiles[0].created_by !== user.email && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    const profile = profiles[0];

    // If goals already exist and not regenerating, return existing
    if (!regenerate) {
      const existing = await base44.entities.WellnessGoal.filter({ profile_id, is_active: true });
      if (existing.length > 0) {
        return Response.json({ success: true, goals: existing, generated: false });
      }
    }

    // Fetch health context
    const [vitals, labs, medications, mealLogs, documents] = await Promise.all([
      base44.entities.VitalMeasurement.filter({ profile_id }, '-measured_at', 20),
      base44.entities.LabResult.filter({ profile_id }, '-test_date', 20),
      base44.entities.Medication.filter({ profile_id, is_active: true }),
      base44.entities.MealLog.filter({ profile_id }, '-logged_date', 30),
      base44.entities.MedicalDocument.filter({ profile_id }, '-created_date', 5)
    ]);

    // Calculate recent nutrition averages
    const recentMeals = mealLogs.slice(0, 30);
    const avgCalories = recentMeals.length > 0
      ? Math.round(recentMeals.reduce((s, l) => s + (l.calories || 0), 0) / recentMeals.length)
      : 0;
    const avgProtein = recentMeals.length > 0
      ? Math.round(recentMeals.reduce((s, l) => s + (l.protein_g || 0), 0) / recentMeals.length)
      : 0;

    // Latest vitals
    const latestBP = vitals.find(v => v.vital_type === 'blood_pressure');
    const latestWeight = vitals.find(v => v.vital_type === 'weight');
    const latestGlucose = vitals.find(v => v.vital_type === 'blood_glucose');
    const latestBMI = vitals.find(v => v.vital_type === 'bmi');

    // Abnormal labs
    const abnormalLabs = labs.filter(l => l.flag !== 'normal');

    // Doc AI summaries
    const docSummaries = documents.slice(0, 3).map(d => d.ai_summary || '').filter(Boolean);

    const age = profile.date_of_birth
      ? Math.floor((new Date() - new Date(profile.date_of_birth)) / 31557600000)
      : null;

    const contextStr = `
Patient:
- Age: ${age || 'Unknown'}
- Gender: ${profile.gender || 'Unknown'}
- Height: ${profile.height ? profile.height + 'cm' : 'Unknown'}
- Chronic Conditions: ${profile.chronic_conditions?.join(', ') || 'None'}
- Allergies: ${profile.allergies?.join(', ') || 'None'}

Latest Vitals:
- Blood Pressure: ${latestBP ? `${latestBP.systolic}/${latestBP.diastolic} mmHg` : 'Not recorded'}
- Weight: ${latestWeight ? `${latestWeight.value} ${latestWeight.unit}` : 'Not recorded'}
- Blood Glucose: ${latestGlucose ? `${latestGlucose.value} ${latestGlucose.unit}` : 'Not recorded'}
- BMI: ${latestBMI ? latestBMI.value : 'Not recorded'}

Abnormal Lab Results (${abnormalLabs.length}):
${abnormalLabs.slice(0, 5).map(l => `- ${l.test_name}: ${l.value} ${l.unit} [${l.flag}]`).join('\n') || 'None'}

Active Medications: ${medications.map(m => m.medication_name).join(', ') || 'None'}

Recent Nutrition (avg over ${recentMeals.length} meals):
- Average Calories: ${avgCalories} kcal
- Average Protein: ${avgProtein}g

Medical Document Insights:
${docSummaries.join('\n') || 'No recent documents'}
`.trim();

    // Generate personalized goals with AI
    const aiGoals = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a clinical health coach. Based on this patient's real health data, generate specific daily health goals.

${contextStr}

Create the following daily goals (be specific with numbers based on their actual health data):
1. Daily calorie target (exact kcal based on weight, conditions, activity needs)
2. Daily protein target (grams)
3. Daily carbohydrate target (grams)
4. Daily fat target (grams)
5. Daily water intake (glasses)
6. Daily steps goal (based on their cardiovascular health)
7. Daily sleep goal (hours, considering any medications that affect sleep)
8. (Optional) A condition-specific goal based on their diagnoses

For each goal explain why you chose that specific number based on their health data. Keep explanations concise (one sentence).`,
      response_json_schema: {
        type: 'object',
        properties: {
          daily_calories: { type: 'number' },
          calories_rationale: { type: 'string' },
          daily_protein_g: { type: 'number' },
          protein_rationale: { type: 'string' },
          daily_carbs_g: { type: 'number' },
          daily_fat_g: { type: 'number' },
          daily_water_glasses: { type: 'number' },
          daily_steps: { type: 'number' },
          daily_sleep_hours: { type: 'number' },
          condition_specific_goal: { type: 'string' },
          condition_specific_unit: { type: 'string' },
          condition_specific_target: { type: 'number' },
          overall_health_note: { type: 'string' }
        }
      }
    });

    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysOut = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

    // Deactivate old goals before creating new ones
    if (regenerate) {
      const oldGoals = await base44.entities.WellnessGoal.filter({ profile_id, is_active: true });
      for (const g of oldGoals) {
        await base44.entities.WellnessGoal.update(g.id, { is_active: false });
      }
    }

    // Persist new goals
    const goalDefinitions = [
      { title: 'Daily Calories', category: 'custom', target: aiGoals.daily_calories || 2000, unit: 'kcal', notes: aiGoals.calories_rationale },
      { title: 'Daily Protein', category: 'custom', target: aiGoals.daily_protein_g || 50, unit: 'g', notes: aiGoals.protein_rationale },
      { title: 'Daily Carbohydrates', category: 'custom', target: aiGoals.daily_carbs_g || 250, unit: 'g', notes: null },
      { title: 'Daily Fat', category: 'custom', target: aiGoals.daily_fat_g || 65, unit: 'g', notes: null },
      { title: 'Daily Water Intake', category: 'water', target: aiGoals.daily_water_glasses || 8, unit: 'glasses', notes: null },
      { title: 'Daily Steps', category: 'steps', target: aiGoals.daily_steps || 8000, unit: 'steps', notes: null },
      { title: 'Sleep', category: 'sleep', target: aiGoals.daily_sleep_hours || 7, unit: 'hours', notes: null },
    ];

    if (aiGoals.condition_specific_goal && aiGoals.condition_specific_target) {
      goalDefinitions.push({
        title: aiGoals.condition_specific_goal,
        category: 'custom',
        target: aiGoals.condition_specific_target,
        unit: aiGoals.condition_specific_unit || 'units',
        notes: 'Condition-specific goal based on your health records'
      });
    }

    const createdGoals = [];
    for (const g of goalDefinitions) {
      const goal = await base44.entities.WellnessGoal.create({
        profile_id,
        title: g.title,
        category: g.category,
        target_value: g.target,
        current_value: 0,
        unit: g.unit,
        frequency: 'daily',
        start_date: today,
        end_date: thirtyDaysOut,
        is_active: true,
        streak_count: 0,
        best_streak: 0,
        notes: g.notes || null
      });
      createdGoals.push(goal);
    }

    // Also store/update NutritionGoal for the nutrition page
    const existingNutrGoals = await base44.entities.NutritionGoal.filter({ profile_id });
    const nutritionData = {
      profile_id,
      daily_calories: aiGoals.daily_calories || 2000,
      protein_g: aiGoals.daily_protein_g || 50,
      carbs_g: aiGoals.daily_carbs_g || 250,
      fat_g: aiGoals.daily_fat_g || 65,
      notes: aiGoals.overall_health_note || null
    };

    if (existingNutrGoals.length > 0) {
      await base44.entities.NutritionGoal.update(existingNutrGoals[0].id, nutritionData);
    } else {
      await base44.entities.NutritionGoal.create(nutritionData);
    }

    return Response.json({
      success: true,
      goals: createdGoals,
      generated: true,
      nutrition_targets: {
        daily_calories: aiGoals.daily_calories,
        protein_g: aiGoals.daily_protein_g,
        carbs_g: aiGoals.daily_carbs_g,
        fat_g: aiGoals.daily_fat_g
      },
      overall_note: aiGoals.overall_health_note,
      data_points_used: {
        vitals: vitals.length,
        labs: labs.length,
        medications: medications.length,
        meals_analyzed: recentMeals.length
      }
    });

  } catch (error) {
    console.error('dailyHealthGoals error:', error);
    return Response.json({ error: error.message, success: false }, { status: 500 });
  }
});