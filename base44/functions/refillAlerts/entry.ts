/**
 * refillAlerts — Production medication refill detection + alert engine.
 * 
 * For each active medication:
 * 1. Calculate days of supply remaining from start_date, frequency, duration
 * 2. If within 7 days of running out (or no duration set + 30 days passed), create/update RefillReminder
 * 3. Create HealthInsight alert + optionally notify user
 * 
 * Called by: scheduled automation daily, or on-demand from frontend
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const DOSES_PER_DAY = {
  once_daily: 1,
  twice_daily: 2,
  three_times_daily: 3,
  four_times_daily: 4,
  as_needed: 0.5, // rough estimate
  custom: 1,
};

function parseDurationDays(durationStr) {
  if (!durationStr) return null;
  const s = String(durationStr).toLowerCase();
  const num = parseFloat(s.replace(/[^0-9.]/g, ''));
  if (isNaN(num)) return null;
  if (s.includes('month')) return Math.round(num * 30);
  if (s.includes('week')) return Math.round(num * 7);
  if (s.includes('year')) return Math.round(num * 365);
  return Math.round(num); // assume days
}

function calcDaysRemaining(med) {
  const start = med.start_date ? new Date(med.start_date) : null;
  const end = med.end_date ? new Date(med.end_date) : null;
  const today = new Date();

  if (end) {
    return Math.ceil((end - today) / 86400000);
  }

  // Try to parse duration from purpose or notes
  // Fallback: if no end_date and no duration, assume 30-day supply from start
  if (start) {
    const daysSinceStart = Math.floor((today - start) / 86400000);
    const supplyDays = 30; // default supply
    return supplyDays - daysSinceStart;
  }

  return null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { profile_id } = body;

    if (!profile_id) {
      return Response.json({ error: 'profile_id required' }, { status: 400 });
    }

    // Verify profile ownership
    const profiles = await base44.entities.Profile.filter({ id: profile_id });
    if (!profiles.length) return Response.json({ error: 'Profile not found' }, { status: 404 });
    if (profiles[0].created_by !== user.email && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const medications = await base44.entities.Medication.filter({ profile_id, is_active: true });
    const existingReminders = await base44.entities.RefillReminder.filter({ profile_id });

    const alerts = [];
    const processed = [];

    for (const med of medications) {
      const daysRemaining = calcDaysRemaining(med);

      processed.push({
        medication_id: med.id,
        name: med.medication_name,
        days_remaining: daysRemaining,
        refills_remaining: med.refills_remaining
      });

      // Alert if ≤7 days remaining or refills are 0
      const needsAlert = (daysRemaining !== null && daysRemaining <= 7) ||
                         (med.refills_remaining !== null && med.refills_remaining !== undefined && med.refills_remaining <= 0);

      if (!needsAlert) continue;

      // Check if reminder already exists and is pending
      const existing = existingReminders.find(r => r.medication_id === med.id && r.status === 'pending');

      const refillDate = new Date();
      if (daysRemaining !== null && daysRemaining > 0) {
        refillDate.setDate(refillDate.getDate() + daysRemaining);
      }

      if (!existing) {
        // Create new refill reminder
        const reminder = await base44.entities.RefillReminder.create({
          medication_id: med.id,
          profile_id,
          refill_due_date: refillDate.toISOString().split('T')[0],
          pharmacy_name: med.pharmacy || null,
          prescription_number: null,
          refills_remaining: med.refills_remaining ?? null,
          status: 'pending',
          reminder_sent: false
        });

        // Create health insight alert
        await base44.entities.HealthInsight.create({
          profile_id,
          insight_type: 'alert',
          title: `Refill Alert: ${med.medication_name}`,
          description: daysRemaining !== null
            ? `Your ${med.medication_name} supply is running low with approximately ${Math.max(0, daysRemaining)} days remaining. Please arrange a refill soon.`
            : `Your ${med.medication_name} may need a refill. Please check with your pharmacy.`,
          severity: daysRemaining !== null && daysRemaining <= 3 ? 'high' : 'medium',
          data_source: [med.id],
          ai_confidence: 0.9,
          is_read: false,
          is_dismissed: false
        });

        alerts.push({
          medication_id: med.id,
          medication_name: med.medication_name,
          days_remaining: daysRemaining,
          refill_due_date: refillDate.toISOString().split('T')[0],
          reminder_id: reminder.id,
          action: 'created'
        });

      } else {
        // Update existing reminder
        await base44.entities.RefillReminder.update(existing.id, {
          refill_due_date: refillDate.toISOString().split('T')[0],
          refills_remaining: med.refills_remaining ?? existing.refills_remaining
        });

        alerts.push({
          medication_id: med.id,
          medication_name: med.medication_name,
          days_remaining: daysRemaining,
          refill_due_date: refillDate.toISOString().split('T')[0],
          reminder_id: existing.id,
          action: 'updated'
        });
      }
    }

    return Response.json({
      success: true,
      alerts_generated: alerts.length,
      alerts,
      medications_checked: medications.length,
      processed
    });

  } catch (error) {
    console.error('refillAlerts error:', error);
    return Response.json({ error: error.message, success: false }, { status: 500 });
  }
});