/**
 * MIGRATION: POST-EXPORT
 * Route: /api/ai/coaching
 * InvokeLLM calls: 1 (health coaching response with JSON schema)
 * Replace with: Grok API
 * DB calls: 6 (Profile, VitalMeasurement, Medication, LabResult, WellnessGoal, GoalLog)
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
    const { profileId, focusArea } = body; // focusArea: 'diet', 'exercise', 'sleep', 'medication_adherence', 'overall'

    // Fetch comprehensive health data
    const profile = await base44.entities.Profile.filter({ id: profileId }).then(res => res[0]);
    const medications = await base44.entities.Medication.filter({ profile_id: profileId, is_active: true });
    const vitals = await base44.entities.VitalMeasurement.filter({ profile_id: profileId }, '-measured_at', 100);
    const labs = await base44.entities.LabResult.filter({ profile_id: profileId }, '-test_date', 50);
    const insights = await base44.entities.HealthInsight.filter({ profile_id: profileId }, '-created_date', 50);
    const medLogs = await base44.entities.MedicationLog.filter({ profile_id: profileId }, '-scheduled_time', 500);

    // Calculate medication adherence
    const adherenceByMed = {};
    medications.forEach(med => {
      const logs = medLogs.filter(l => l.medication_id === med.id);
      const taken = logs.filter(l => l.status === 'taken').length;
      const total = logs.length;
      adherenceByMed[med.medication_name] = {
        rate: total > 0 ? Math.round((taken / total) * 100) : 0,
        taken,
        total
      };
    });

    const overallAdherence = Object.values(adherenceByMed).reduce((sum, m) => sum + m.rate, 0) / Math.max(medications.length, 1);

    // Analyze vitals trends
    const vitalsTrends = {};
    ['blood_pressure', 'weight', 'blood_glucose'].forEach(type => {
      const readings = vitals.filter(v => v.vital_type === type).slice(0, 30);
      if (readings.length >= 2) {
        const latest = readings[0];
        const oldest = readings[readings.length - 1];
        vitalsTrends[type] = {
          latest: type === 'blood_pressure' ? `${latest.systolic}/${latest.diastolic}` : latest.value,
          trend: type === 'blood_pressure' 
            ? latest.systolic - oldest.systolic 
            : latest.value - oldest.value,
          count: readings.length
        };
      }
    });

    // Analyze labs
    const abnormalLabs = labs.filter(l => l.flag !== 'normal');
    const recentAbnormal = abnormalLabs.slice(0, 5);

    const healthData = `
Patient: ${profile?.full_name}
Age: ${profile?.date_of_birth ? new Date().getFullYear() - new Date(profile.date_of_birth).getFullYear() : 'Unknown'}
Chronic Conditions: ${profile?.chronic_conditions?.join(', ') || 'None'}

Medication Adherence: ${overallAdherence.toFixed(0)}%
${Object.entries(adherenceByMed).map(([name, data]) => `- ${name}: ${data.rate}% (${data.taken}/${data.total})`).join('\n')}

Recent Vitals Trends (30 days):
${Object.entries(vitalsTrends).map(([type, data]) => 
  `- ${type}: ${data.latest} (${data.trend > 0 ? '+' : ''}${data.trend.toFixed(1)} change, ${data.count} readings)`
).join('\n') || 'Limited data'}

Recent Abnormal Labs:
${recentAbnormal.map(l => `- ${l.test_name}: ${l.value} ${l.unit} [${l.flag}]`).join('\n') || 'None'}

Recent Health Insights:
${insights.slice(0, 5).map(i => `- [${i.severity}] ${i.title}`).join('\n') || 'None'}
`.trim();

    const focusPrompts = {
      diet: 'Analyze the patient\'s health data and provide personalized nutrition advice. Consider their conditions, lab results, and medications.',
      exercise: 'Create a safe and effective exercise plan based on the patient\'s health status, vitals trends, and any limitations.',
      sleep: 'Provide sleep optimization strategies considering their health data, medications, and any patterns you observe.',
      medication_adherence: 'Analyze medication adherence patterns and provide strategies to improve compliance.',
      overall: 'Provide comprehensive health coaching covering diet, exercise, sleep, and lifestyle improvements.'
    };

    const prompt = `You are an AI health coach for HealthFlux. ${focusPrompts[focusArea] || focusPrompts.overall}

${healthData}

Provide a comprehensive coaching plan in the following JSON format:
{
  "current_assessment": {
    "strengths": ["What they're doing well", ...],
    "areas_for_improvement": ["What needs work", ...],
    "key_insights": "Overall assessment"
  },
  "goals": [
    {
      "goal": "Specific, measurable goal",
      "timeframe": "2 weeks" | "1 month" | "3 months",
      "priority": "high" | "medium" | "low",
      "why_important": "Explanation"
    }
  ],
  "action_plan": {
    "immediate_actions": ["Action 1", "Action 2", ...],
    "daily_habits": ["Habit 1", "Habit 2", ...],
    "weekly_goals": ["Goal 1", "Goal 2", ...]
  },
  "specific_recommendations": {
    "diet": ["Recommendation 1", ...],
    "exercise": ["Recommendation 1", ...],
    "sleep": ["Recommendation 1", ...],
    "stress_management": ["Recommendation 1", ...]
  },
  "tracking_metrics": ["Metric to monitor 1", "Metric 2", ...],
  "motivation": {
    "encouragement": "Positive, personalized message",
    "milestones": ["Milestone 1 (1 week)", "Milestone 2 (2 weeks)", ...]
  },
  "warnings": ["Important safety consideration 1", ...]
}

Guidelines:
- Make recommendations realistic and achievable
- Consider their current health conditions and medications
- Provide specific, actionable advice (not generic)
- Be encouraging and supportive
- Include safety warnings where appropriate
- Tailor advice to their age and health status`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: false,
      response_json_schema: {
        type: 'object',
        properties: {
          current_assessment: {
            type: 'object',
            properties: {
              strengths: { type: 'array', items: { type: 'string' } },
              areas_for_improvement: { type: 'array', items: { type: 'string' } },
              key_insights: { type: 'string' }
            }
          },
          goals: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                goal: { type: 'string' },
                timeframe: { type: 'string' },
                priority: { type: 'string' },
                why_important: { type: 'string' }
              }
            }
          },
          action_plan: {
            type: 'object',
            properties: {
              immediate_actions: { type: 'array', items: { type: 'string' } },
              daily_habits: { type: 'array', items: { type: 'string' } },
              weekly_goals: { type: 'array', items: { type: 'string' } }
            }
          },
          specific_recommendations: {
            type: 'object',
            properties: {
              diet: { type: 'array', items: { type: 'string' } },
              exercise: { type: 'array', items: { type: 'string' } },
              sleep: { type: 'array', items: { type: 'string' } },
              stress_management: { type: 'array', items: { type: 'string' } }
            }
          },
          tracking_metrics: { type: 'array', items: { type: 'string' } },
          motivation: {
            type: 'object',
            properties: {
              encouragement: { type: 'string' },
              milestones: { type: 'array', items: { type: 'string' } }
            }
          },
          warnings: { type: 'array', items: { type: 'string' } }
        }
      }
    });

    return Response.json({
      success: true,
      coaching: response,
      focusArea
    });

  } catch (error) {
    console.error('Health coaching error:', error);
    return Response.json({
      error: error.message,
      success: false
    }, { status: 500 });
  }
});