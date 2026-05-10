/**
 * dailyAdherenceCheck — Scheduled automation function.
 * Runs daily to:
 * 1. Create pending MedicationLog entries for today's doses
 * 2. Flag overdue doses from yesterday as 'skipped'
 * 3. Check refill alerts
 * 
 * Admin function — runs as service role, no user auth needed.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin only' }, { status: 403 });
    }

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const yesterday = new Date(today - 86400000).toISOString().split('T')[0];

    // Get all active medications
    const medications = await base44.asServiceRole.entities.Medication.list('-created_date', 2000);
    const activeMeds = medications.filter(m => m.is_active && m.start_date <= todayStr && (!m.end_date || m.end_date >= todayStr));

    let createdLogs = 0;
    let markedSkipped = 0;

    for (const med of activeMeds) {
      const times = med.times?.length > 0 ? med.times : ['08:00'];

      // Create today's pending logs if not already created
      for (const time of times) {
        const scheduledTime = `${todayStr}T${time}:00.000Z`;
        // Check if log already exists for this med + scheduled_time
        const existing = await base44.asServiceRole.entities.MedicationLog.filter({
          medication_id: med.id,
          scheduled_time: scheduledTime
        });
        if (existing.length === 0) {
          await base44.asServiceRole.entities.MedicationLog.create({
            medication_id: med.id,
            profile_id: med.profile_id,
            scheduled_time: scheduledTime,
            status: 'pending'
          });
          createdLogs++;
        }
      }

      // Mark yesterday's pending logs as skipped
      for (const time of times) {
        const yesterdayScheduled = `${yesterday}T${time}:00.000Z`;
        const pending = await base44.asServiceRole.entities.MedicationLog.filter({
          medication_id: med.id,
          scheduled_time: yesterdayScheduled,
          status: 'pending'
        });
        for (const log of pending) {
          await base44.asServiceRole.entities.MedicationLog.update(log.id, {
            status: 'skipped',
            reason: 'Auto-marked as missed (no action taken)'
          });
          markedSkipped++;
        }
      }
    }

    return Response.json({
      success: true,
      date: todayStr,
      active_medications: activeMeds.length,
      logs_created: createdLogs,
      marked_skipped: markedSkipped
    });

  } catch (error) {
    console.error('dailyAdherenceCheck error:', error);
    return Response.json({ error: error.message, success: false }, { status: 500 });
  }
});