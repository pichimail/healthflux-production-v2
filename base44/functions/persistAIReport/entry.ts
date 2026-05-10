/**
 * persistAIReport — Saves AI-generated health report permanently with ownership, timestamps, retrieval, export support.
 * 
 * Called after any AI report generation to ensure reports survive session and support:
 * - Retrieval by report_id
 * - User/admin secure access
 * - Export (returns structured data for PDF generation)
 * - List history for a profile
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action = 'save', profile_id, report_data, report_type = 'custom', period_label, report_id } = body;

    // --- LIST ---
    if (action === 'list') {
      if (!profile_id) return Response.json({ error: 'profile_id required' }, { status: 400 });
      const reports = await base44.entities.AIHealthReport.filter({ profile_id }, '-created_date', 50);
      // Filter by ownership
      const owned = reports.filter(r => r.created_by === user.email || user.role === 'admin');
      return Response.json({ success: true, reports: owned.map(r => ({
        id: r.id,
        report_type: r.report_type,
        period_label: r.period_label,
        overall_score: r.overall_score,
        status: r.status,
        created_date: r.created_date
      }))});
    }

    // --- GET ---
    if (action === 'get') {
      if (!report_id) return Response.json({ error: 'report_id required' }, { status: 400 });
      const reports = await base44.entities.AIHealthReport.filter({ id: report_id });
      if (!reports.length) return Response.json({ error: 'Report not found' }, { status: 404 });
      const report = reports[0];
      if (report.created_by !== user.email && user.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
      return Response.json({ success: true, report });
    }

    // --- SAVE ---
    if (action === 'save') {
      if (!profile_id || !report_data) return Response.json({ error: 'profile_id and report_data required' }, { status: 400 });

      // Ownership check
      const profiles = await base44.entities.Profile.filter({ id: profile_id });
      if (!profiles.length) return Response.json({ error: 'Profile not found' }, { status: 404 });
      if (profiles[0].created_by !== user.email && user.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }

      const savedReport = await base44.entities.AIHealthReport.create({
        profile_id,
        report_type,
        period_label: period_label || `Report - ${new Date().toLocaleDateString()}`,
        start_date: report_data.start_date || new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0],
        end_date: report_data.end_date || new Date().toISOString().split('T')[0],
        summary: report_data.summary || report_data.vitals_summary || '',
        health_score: report_data.overall_score || report_data.health_score || null,
        key_metrics: {
          vitals_summary: report_data.vitals_summary,
          medication_adherence_summary: report_data.medication_adherence_summary,
          trend_analysis: report_data.trend_analysis
        },
        risk_factors: (report_data.risk_predictions || report_data.risk_factors || []).map(r =>
          typeof r === 'string' ? r : (r.risk || r.factor || JSON.stringify(r))
        ),
        recommendations: report_data.lifestyle_suggestions || report_data.recommendations || [],
        data_points_analyzed: report_data.data_points_count || 0,
        status: 'ready'
      });

      return Response.json({ success: true, report_id: savedReport.id, report: savedReport });
    }

    // --- DELETE ---
    if (action === 'delete') {
      if (!report_id) return Response.json({ error: 'report_id required' }, { status: 400 });
      const reports = await base44.entities.AIHealthReport.filter({ id: report_id });
      if (!reports.length) return Response.json({ error: 'Not found' }, { status: 404 });
      if (reports[0].created_by !== user.email && user.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
      await base44.entities.AIHealthReport.delete(report_id);
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Invalid action. Use: save, list, get, delete' }, { status: 400 });

  } catch (error) {
    console.error('persistAIReport error:', error);
    return Response.json({ error: error.message, success: false }, { status: 500 });
  }
});