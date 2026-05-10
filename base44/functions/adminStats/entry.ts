/**
 * adminStats — Admin-only platform analytics endpoint.
 * Returns real aggregated stats: user counts, document counts, subscription revenue, feature usage.
 * Strictly admin-only.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin only' }, { status: 403 });

    const [users, documents, vitals, medications, labs, subscriptions, insights, medLogs] = await Promise.all([
      base44.asServiceRole.entities.User.list('-created_date', 1000),
      base44.asServiceRole.entities.MedicalDocument.list('-created_date', 1000),
      base44.asServiceRole.entities.VitalMeasurement.list('-measured_at', 500),
      base44.asServiceRole.entities.Medication.list('-created_date', 500),
      base44.asServiceRole.entities.LabResult.list('-test_date', 500),
      base44.asServiceRole.entities.Subscription.list('-created_date', 500),
      base44.asServiceRole.entities.HealthInsight.list('-created_date', 500),
      base44.asServiceRole.entities.MedicationLog.list('-scheduled_time', 1000)
    ]);

    const now = new Date();
    const last30 = new Date(now - 30 * 86400000).toISOString();
    const last7 = new Date(now - 7 * 86400000).toISOString();

    const activeSubscriptions = subscriptions.filter(s => s.status === 'active');
    const totalRevenue = activeSubscriptions.reduce((s, sub) => s + (sub.amount_paid || 0), 0);

    // Daily new users (last 30 days)
    const dailyUsers = {};
    users.filter(u => u.created_date >= last30).forEach(u => {
      const day = u.created_date?.split('T')[0];
      if (day) dailyUsers[day] = (dailyUsers[day] || 0) + 1;
    });

    // Daily docs processed (last 30 days)
    const dailyDocs = {};
    documents.filter(d => d.created_date >= last30).forEach(d => {
      const day = d.created_date?.split('T')[0];
      if (day) dailyDocs[day] = (dailyDocs[day] || 0) + 1;
    });

    // Document type breakdown
    const docByType = {};
    documents.forEach(d => {
      docByType[d.document_type || 'other'] = (docByType[d.document_type || 'other'] || 0) + 1;
    });

    // Vital type breakdown
    const vitalByType = {};
    vitals.forEach(v => {
      vitalByType[v.vital_type] = (vitalByType[v.vital_type] || 0) + 1;
    });

    // Subscription breakdown by status
    const subByStatus = {};
    subscriptions.forEach(s => {
      subByStatus[s.status] = (subByStatus[s.status] || 0) + 1;
    });

    // Processing success rate
    const completed = documents.filter(d => d.status === 'completed').length;
    const failed = documents.filter(d => d.status === 'failed').length;
    const processingRate = documents.length > 0 ? Math.round((completed / documents.length) * 100) : 0;

    // Adherence stats
    const takenLogs = medLogs.filter(l => l.status === 'taken').length;
    const globalAdherence = medLogs.length > 0 ? Math.round((takenLogs / medLogs.length) * 100) : 0;

    return Response.json({
      success: true,
      overview: {
        total_users: users.length,
        new_users_last_7d: users.filter(u => u.created_date >= last7).length,
        new_users_last_30d: users.filter(u => u.created_date >= last30).length,
        total_documents: documents.length,
        documents_last_30d: documents.filter(d => d.created_date >= last30).length,
        processing_success_rate: processingRate,
        total_vitals: vitals.length,
        total_labs: labs.length,
        total_medications: medications.length,
        active_medications: medications.filter(m => m.is_active).length,
        total_insights: insights.length,
        total_med_logs: medLogs.length,
        global_adherence_pct: globalAdherence
      },
      subscriptions: {
        total: subscriptions.length,
        active: activeSubscriptions.length,
        total_revenue: totalRevenue,
        by_status: subByStatus
      },
      charts: {
        daily_users_30d: Object.entries(dailyUsers).sort(([a],[b]) => a.localeCompare(b)).map(([date,count]) => ({ date, count })),
        daily_docs_30d: Object.entries(dailyDocs).sort(([a],[b]) => a.localeCompare(b)).map(([date,count]) => ({ date, count })),
        doc_by_type: Object.entries(docByType).map(([type,count]) => ({ type, count })),
        vital_by_type: Object.entries(vitalByType).map(([type,count]) => ({ type, count }))
      },
      generated_at: now.toISOString()
    });

  } catch (error) {
    console.error('adminStats error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});