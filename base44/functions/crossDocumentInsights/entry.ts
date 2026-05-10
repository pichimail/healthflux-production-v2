/**
 * crossDocumentInsights — Cross-document health trend correlation engine.
 * 
 * Correlates vitals, lab results, medications, nutrition, and documents over time.
 * Returns dashboard-ready correlation data with explainable insights.
 * Persists insights to HealthInsight entity for history.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { profile_id, days_back = 90, save_insights = true } = body;

    if (!profile_id) return Response.json({ error: 'profile_id required' }, { status: 400 });

    // Ownership check
    const profiles = await base44.entities.Profile.filter({ id: profile_id });
    if (!profiles.length) return Response.json({ error: 'Profile not found' }, { status: 404 });
    if (profiles[0].created_by !== user.email && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    const profile = profiles[0];

    const since = new Date(Date.now() - days_back * 86400000).toISOString();

    // Fetch all data sources in parallel
    const [vitals, labs, medications, medLogs, mealLogs, documents] = await Promise.all([
      base44.entities.VitalMeasurement.filter({ profile_id }, '-measured_at', 200),
      base44.entities.LabResult.filter({ profile_id }, '-test_date', 100),
      base44.entities.Medication.filter({ profile_id }),
      base44.entities.MedicationLog.filter({ profile_id }, '-scheduled_time', 200),
      base44.entities.MealLog.filter({ profile_id }, '-logged_date', 100),
      base44.entities.MedicalDocument.filter({ profile_id }, '-created_date', 20)
    ]);

    // Filter to date window
    const recentVitals = vitals.filter(v => v.measured_at >= since);
    const recentLabs = labs.filter(l => l.test_date >= since.split('T')[0]);
    const recentMealLogs = mealLogs.filter(m => m.logged_date >= since.split('T')[0]);
    const recentMedLogs = medLogs.filter(l => l.scheduled_time >= since);

    // Build trend data per vital type
    const vitalTrends = {};
    recentVitals.forEach(v => {
      if (!vitalTrends[v.vital_type]) vitalTrends[v.vital_type] = [];
      vitalTrends[v.vital_type].push({
        date: v.measured_at?.split('T')[0],
        value: v.vital_type === 'blood_pressure' ? v.systolic : v.value,
        systolic: v.systolic,
        diastolic: v.diastolic,
        unit: v.unit
      });
    });

    // Build lab trends per test
    const labTrends = {};
    recentLabs.forEach(l => {
      if (!labTrends[l.test_name]) labTrends[l.test_name] = [];
      labTrends[l.test_name].push({
        date: l.test_date,
        value: l.value,
        unit: l.unit,
        flag: l.flag,
        reference_low: l.reference_low,
        reference_high: l.reference_high
      });
    });

    // Nutrition averages by week
    const weeklyNutrition = {};
    recentMealLogs.forEach(meal => {
      if (!meal.logged_date) return;
      const weekStart = new Date(meal.logged_date);
      if (isNaN(weekStart.getTime())) return;
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const key = weekStart.toISOString().split('T')[0];
      if (!weeklyNutrition[key]) weeklyNutrition[key] = { calories: 0, protein: 0, carbs: 0, fat: 0, count: 0 };
      weeklyNutrition[key].calories += meal.calories || 0;
      weeklyNutrition[key].protein += meal.protein_g || 0;
      weeklyNutrition[key].carbs += meal.carbs_g || 0;
      weeklyNutrition[key].fat += meal.fat_g || 0;
      weeklyNutrition[key].count++;
    });

    // Medication adherence by week
    const weeklyAdherence = {};
    recentMedLogs.forEach(log => {
      if (!log.scheduled_time) return;
      const d = new Date(log.scheduled_time);
      if (isNaN(d.getTime())) return;
      const weekStart = new Date(d);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const key = weekStart.toISOString().split('T')[0];
      if (!weeklyAdherence[key]) weeklyAdherence[key] = { taken: 0, total: 0 };
      weeklyAdherence[key].total++;
      if (log.status === 'taken') weeklyAdherence[key].taken++;
    });

    // Abnormal trends (repeated abnormal labs)
    const abnormalTrends = Object.entries(labTrends)
      .filter(([, readings]) => readings.filter(r => r.flag !== 'normal').length >= 2)
      .map(([name, readings]) => ({
        test_name: name,
        abnormal_count: readings.filter(r => r.flag !== 'normal').length,
        total_readings: readings.length,
        latest_value: readings[0]?.value,
        latest_flag: readings[0]?.flag,
        trend_direction: readings.length >= 2
          ? (readings[0].value > readings[readings.length - 1].value ? 'increasing' : 'decreasing')
          : 'stable'
      }));

    // Build comprehensive summary for AI correlation
    const summaryForAI = `
Patient: ${profile.full_name}, Age: ${profile.date_of_birth ? Math.floor((new Date() - new Date(profile.date_of_birth)) / 31557600000) : 'Unknown'}
Conditions: ${profile.chronic_conditions?.join(', ') || 'None'}
Analysis Period: ${days_back} days

VITAL TYPES TRACKED: ${Object.keys(vitalTrends).join(', ') || 'None'}
Total Vital Readings: ${recentVitals.length}

LAB TESTS WITH MULTIPLE READINGS:
${Object.entries(labTrends).filter(([,v]) => v.length > 1).map(([name, readings]) => 
  `- ${name}: ${readings.length} readings, latest: ${readings[0]?.value} ${readings[0]?.unit} [${readings[0]?.flag}]`
).join('\n') || 'No repeated labs'}

CONSISTENTLY ABNORMAL LABS:
${abnormalTrends.map(t => `- ${t.test_name}: ${t.abnormal_count}/${t.total_readings} abnormal, trend: ${t.trend_direction}`).join('\n') || 'None'}

ACTIVE MEDICATIONS: ${medications.filter(m => m.is_active).map(m => m.medication_name).join(', ') || 'None'}

MEDICATION ADHERENCE (by week):
${Object.entries(weeklyAdherence).slice(-4).map(([week, data]) => 
  `- Week of ${week}: ${data.taken}/${data.total} (${Math.round(data.taken/data.total*100)}%)`
).join('\n') || 'No medication logs'}

NUTRITION (weekly averages):
${Object.entries(weeklyNutrition).slice(-4).map(([week, data]) => 
  `- Week of ${week}: avg ${Math.round(data.calories/data.count)} kcal, ${Math.round(data.protein/data.count)}g protein`
).join('\n') || 'No nutrition logged'}

MEDICAL DOCUMENTS (${documents.length}):
${documents.slice(0,5).map(d => `- ${d.title} (${d.document_type}, ${d.document_date}): ${d.ai_summary?.substring(0,100) || 'No summary'}`).join('\n') || 'None'}
`.trim();

    // AI correlation analysis
    const aiCorrelations = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a clinical data analyst. Analyze these health trends and identify meaningful correlations and insights.

${summaryForAI}

Identify:
1. Correlations between nutrition/diet and lab results (e.g., high calorie intake correlating with elevated glucose)
2. Correlations between medication adherence and vitals improvement/decline
3. Temporal patterns (are things getting better or worse over time?)
4. Risk patterns from document analysis
5. Specific actionable recommendations based on the correlations found

For each correlation, explain:
- What you observed (specific numbers/data)
- Why it matters clinically  
- What the user can do about it

Keep all text plain (no markdown characters like *** ### ##).`,
      response_json_schema: {
        type: 'object',
        properties: {
          correlations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                description: { type: 'string' },
                data_points: { type: 'array', items: { type: 'string' } },
                significance: { type: 'string', enum: ['high', 'medium', 'low'] },
                recommendation: { type: 'string' }
              }
            }
          },
          overall_health_trend: { type: 'string', enum: ['improving', 'stable', 'declining', 'mixed'] },
          trend_summary: { type: 'string' },
          top_risk: { type: 'string' },
          top_opportunity: { type: 'string' }
        }
      }
    });

    // Persist significant correlations as HealthInsights
    if (save_insights) {
      const highCorrelations = (aiCorrelations.correlations || []).filter(c => c.significance === 'high');
      for (const corr of highCorrelations.slice(0, 5)) {
        try {
          await base44.entities.HealthInsight.create({
            profile_id,
            insight_type: 'trend_analysis',
            title: corr.title,
            description: `${corr.description} ${corr.recommendation ? 'Recommendation: ' + corr.recommendation : ''}`.trim(),
            severity: corr.significance === 'high' ? 'medium' : 'low',
            data_source: [],
            ai_confidence: 0.75,
            is_read: false,
            is_dismissed: false
          });
        } catch (e) {
          console.warn('Insight persist failed:', e.message);
        }
      }
    }

    // Build chart-ready trend data
    const chartData = {
      vitals_timeline: Object.entries(vitalTrends).map(([type, readings]) => ({
        type,
        readings: readings.slice(0, 30).reverse(),
        unit: readings[0]?.unit
      })),
      lab_trends: Object.entries(labTrends)
        .filter(([, r]) => r.length >= 2)
        .map(([name, readings]) => ({
          test_name: name,
          readings: readings.slice(0, 10).reverse(),
          abnormal_pct: Math.round(readings.filter(r => r.flag !== 'normal').length / readings.length * 100)
        })),
      weekly_nutrition: Object.entries(weeklyNutrition)
        .slice(-8)
        .map(([week, data]) => ({
          week,
          avg_calories: Math.round(data.calories / data.count),
          avg_protein: Math.round(data.protein / data.count),
          avg_carbs: Math.round(data.carbs / data.count),
          avg_fat: Math.round(data.fat / data.count),
          meal_count: data.count
        })),
      weekly_adherence: Object.entries(weeklyAdherence)
        .slice(-8)
        .map(([week, data]) => ({
          week,
          adherence_pct: data.total > 0 ? Math.round(data.taken / data.total * 100) : 0,
          taken: data.taken,
          total: data.total
        }))
    };

    return Response.json({
      success: true,
      correlations: aiCorrelations.correlations || [],
      overall_health_trend: aiCorrelations.overall_health_trend || 'stable',
      trend_summary: aiCorrelations.trend_summary || '',
      top_risk: aiCorrelations.top_risk || '',
      top_opportunity: aiCorrelations.top_opportunity || '',
      chart_data: chartData,
      abnormal_trends: abnormalTrends,
      data_summary: {
        vitals_count: recentVitals.length,
        labs_count: recentLabs.length,
        meals_count: recentMealLogs.length,
        med_logs_count: recentMedLogs.length,
        documents_count: documents.length,
        period_days: days_back
      },
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('crossDocumentInsights error:', error);
    return Response.json({ error: error.message, success: false }, { status: 500 });
  }
});