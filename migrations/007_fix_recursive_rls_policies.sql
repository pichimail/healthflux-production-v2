-- HealthFlux Migration: 007_fix_recursive_rls_policies.sql
-- Fixes recursive RLS policy checks that caused 500s on profiles queries.
-- Safe to rerun. Policies are dropped with IF EXISTS before recreation.

-- Profiles: strict ownership only (no self-referencing EXISTS)
DROP POLICY IF EXISTS "profiles_select_strict" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_strict" ON profiles;
DROP POLICY IF EXISTS "profiles_update_strict" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_strict" ON profiles;

CREATE POLICY "profiles_select_strict"
  ON profiles FOR SELECT
  USING (created_by = auth.jwt() ->> 'email');

CREATE POLICY "profiles_insert_strict"
  ON profiles FOR INSERT
  WITH CHECK (created_by = auth.jwt() ->> 'email');

CREATE POLICY "profiles_update_strict"
  ON profiles FOR UPDATE
  USING (created_by = auth.jwt() ->> 'email')
  WITH CHECK (created_by = auth.jwt() ->> 'email');

CREATE POLICY "profiles_delete_strict"
  ON profiles FOR DELETE
  USING (created_by = auth.jwt() ->> 'email');

-- All entity tables: strict ownership only
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'vital_measurements', 'medications', 'medication_logs',
      'medical_documents', 'lab_results', 'health_insights',
      'wellness_goals', 'goal_logs', 'meal_logs', 'nutrition_goals',
      'share_links', 'care_circles',
      'connected_devices', 'gamification_profiles',
      'drug_interactions', 'side_effects', 'medication_effectiveness',
      'refill_reminders', 'coach_messages', 'ai_health_reports',
      'ai_medical_imaging_results', 'skin_analyses',
      'personalized_diet_plans', 'notifications', 'user_preferences'
    ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s_select_strict" ON %I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%s_insert_strict" ON %I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%s_update_strict" ON %I', tbl, tbl);

    EXECUTE format(
      'CREATE POLICY "%s_select_strict" ON %I FOR SELECT USING (
        created_by = auth.jwt() ->> ''email''
      )', tbl, tbl
    );

    EXECUTE format(
      'CREATE POLICY "%s_insert_strict" ON %I FOR INSERT WITH CHECK (
        created_by = auth.jwt() ->> ''email''
      )', tbl, tbl
    );

    EXECUTE format(
      'CREATE POLICY "%s_update_strict" ON %I FOR UPDATE
       USING (created_by = auth.jwt() ->> ''email'')
       WITH CHECK (created_by = auth.jwt() ->> ''email'')', tbl, tbl
    );
  END LOOP;
END $$;
