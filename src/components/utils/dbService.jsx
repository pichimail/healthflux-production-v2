/**
 * HealthFlux Database Service — Production (Supabase via dbClient)
 * Drop-in replacement — all entity operations route to Supabase
 */
import { base44 } from '@/api/base44Client'; // Uses dbClient shim → Supabase

export async function dbFilter(table, filters = {}, orderBy, limit) {
  return base44.entities[table].filter(filters, orderBy, limit);
}

export async function dbList(table, orderBy, limit) {
  return base44.entities[table].list(orderBy, limit);
}

export async function dbCreate(table, data) {
  return base44.entities[table].create(data);
}

export async function dbUpdate(table, id, data) {
  return base44.entities[table].update(id, data);
}

export async function dbDelete(table, id) {
  return base44.entities[table].delete(id);
}

export async function dbGet(table, id) {
  const { db } = await import('@/lib/db');
  const result = await db.from(getSnakeTable(table)).select('*').eq('id', id).single();
  if (result.error) throw result.error;
  return result.data;
}

// Map entity names to snake_case table names
function getSnakeTable(entityName) {
  const map = {
    Profile: 'profiles',
    VitalMeasurement: 'vital_measurements',
    Medication: 'medications',
    MedicationLog: 'medication_logs',
    MedicalDocument: 'medical_documents',
    LabResult: 'lab_results',
    HealthInsight: 'health_insights',
    WellnessGoal: 'wellness_goals',
    GoalLog: 'goal_logs',
    MealLog: 'meal_logs',
    NutritionGoal: 'nutrition_goals',
    ShareLink: 'share_links',
    CareCircle: 'care_circles',
    CareCircleMessage: 'care_circle_messages',
    ConnectedDevice: 'connected_devices',
    GamificationProfile: 'gamification_profiles',
    DrugInteraction: 'drug_interactions',
    SideEffect: 'side_effects',
    MedicationEffectiveness: 'medication_effectiveness',
    RefillReminder: 'refill_reminders',
    CoachMessage: 'coach_messages',
    AIHealthReport: 'ai_health_reports',
    AIMedicalImagingResult: 'ai_medical_imaging_results',
    SkinAnalysis: 'skin_analyses',
    PersonalizedDietPlan: 'personalized_diet_plans',
    Notification: 'notifications',
    UserPreferences: 'user_preferences',
    TelehealthDoctor: 'telehealth_doctors',
    TelehealthAppointment: 'telehealth_appointments',
    SubscriptionPackage: 'subscription_packages',
    UserSubscription: 'user_subscriptions',
    Ad: 'ads',
    AuditLog: 'audit_logs',
    Role: 'roles',
    FeatureFlagAssignment: 'feature_flag_assignments',
    UsageMeter: 'usage_meters',
    UserCredits: 'user_credits',
    UserEntitlement: 'user_entitlements',
  };
  return map[entityName] || entityName.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '') + 's';
}
