/**
 * MIGRATION: POST-EXPORT
 * Route: /api/ai/health-report
 * InvokeLLM calls: 1 (comprehensive health report with JSON schema)
 * Replace with: Claude API
 * DB calls: 6 (Profile, VitalMeasurement, LabResult, Medication, MedicationLog, HealthInsight)
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { profile_id, report_period = 'weekly' } = await req.json();

    // Create a placeholder report
    const periodLabel = report_period === 'weekly'
      ? `Week of ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
      : `${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;

    const reportRecord = await base44.entities.AIHealthReport.create({
      profile_id,
      report_period,
      period_label: periodLabel,
      status: 'generating',
    });

    // Fetch data
    const daysBack = report_period === 'weekly' ? 7 : 30;
    const since = new Date(Date.now() - daysBack * 86400000).toISOString();

    const [vitals, meds, labs, medLogs] = await Promise.all([
      base44.entities.VitalMeasurement.filter({ profile_id }),
      base44.entities.Medication.filter({ profile_id }),
      base44.entities.LabResult.filter({ profile_id }),
      base44.entities.MedicationLog.filter({ profile_id }),
    ]);

    const recentVitals = vitals.filter(v => v.measured_at >= since);
    const recentMedLogs = medLogs.filter(l => l.scheduled_time >= since);

    const adherenceRate = recentMedLogs.length > 0
      ? Math.round((recentMedLogs.filter(l => l.status === 'taken').length / recentMedLogs.length) * 100)
      : null;

    const dataContext = `
Period: ${periodLabel} (${report_period})

VITALS (recent ${daysBack} days, ${recentVitals.length} entries):
${recentVitals.slice(-20).map(v => `- ${v.vital_type}: ${v.value || `${v.systolic}/${v.diastolic}`} ${v.unit || ''} at ${v.measured_at}`).join('\n') || 'No vitals logged'}

ACTIVE MEDICATIONS (${meds.filter(m => m.is_active).length}):
${meds.filter(m => m.is_active).map(m => `- ${m.medication_name} ${m.dosage} (${m.frequency}) for ${m.purpose || 'unspecified'}`).join('\n') || 'None'}

MEDICATION ADHERENCE: ${adherenceRate !== null ? `${adherenceRate}%` : 'No data'} (${recentMedLogs.filter(l => l.status === 'taken').length} taken out of ${recentMedLogs.length} scheduled)

RECENT LAB RESULTS (${labs.length} total):
${labs.slice(-10).map(l => `- ${l.test_name}: ${l.value} ${l.unit} (flag: ${l.flag || 'normal'})`).join('\n') || 'No lab results'}
    `.trim();

    const prompt = `You are a medical AI assistant analyzing a patient's health data for a ${report_period} report. Based on the following data, generate a comprehensive health summary.

${dataContext}

Generate a health report with these sections. Be specific, actionable, and clinically thoughtful. Use plain language.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          vitals_summary: { type: 'string' },
          medication_adherence_summary: { type: 'string' },
          trend_analysis: { type: 'string' },
          risk_predictions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                risk: { type: 'string' },
                level: { type: 'string', enum: ['low', 'medium', 'high'] },
                description: { type: 'string' }
              }
            }
          },
          lifestyle_suggestions: { type: 'array', items: { type: 'string' } },
          recommended_checks: { type: 'array', items: { type: 'string' } },
          overall_score: { type: 'number', description: 'Health score 0-100' },
        }
      }
    });

    // Persist report permanently with all sections
    await base44.entities.AIHealthReport.update(reportRecord.id, {
      summary: result.vitals_summary || '',
      health_score: result.overall_score || null,
      key_metrics: {
        vitals_summary: result.vitals_summary,
        medication_adherence_summary: result.medication_adherence_summary,
        trend_analysis: result.trend_analysis
      },
      risk_factors: (result.risk_predictions || []).map(r => r.risk || JSON.stringify(r)),
      recommendations: result.lifestyle_suggestions || [],
      data_points_analyzed: recentVitals.length + recentMedLogs.length + labs.length,
      status: 'ready',
    });

    return Response.json({ report_id: reportRecord.id, ...result, status: 'ready' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});