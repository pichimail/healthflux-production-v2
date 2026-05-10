-- HealthFlux Migration: 002_rls_policies.sql
-- Row Level Security for ALL tables
-- Pattern: user sees own data (via created_by = email from JWT), admins see all

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vital_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE wellness_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_circles ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_circle_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE connected_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE gamification_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE drug_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE side_effects ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_effectiveness ENABLE ROW LEVEL SECURITY;
ALTER TABLE refill_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_health_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_medical_imaging_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE skin_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE personalized_diet_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE telehealth_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_meters ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flag_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ads ENABLE ROW LEVEL SECURITY;
-- Public/admin-only tables
ALTER TABLE telehealth_doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════
-- HELPER FUNCTION: Get current user email from JWT
-- ══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION auth_email() RETURNS TEXT AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json->>'email',
    (current_setting('request.jwt.claims', true)::json->'user_metadata'->>'email')
  );
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE created_by = auth_email() AND role = 'admin'
  );
$$ LANGUAGE SQL STABLE;

-- ══════════════════════════════════════════════
-- STANDARD USER-OWNED DATA POLICIES
-- Pattern: user CRUD own records, admin full access
-- ══════════════════════════════════════════════

-- Macro: creates standard 4 policies for user-owned tables
DO $$ 
DECLARE
  tbl TEXT;
  tbls TEXT[] := ARRAY[
    'profiles','vital_measurements','medications','medication_logs',
    'medical_documents','lab_results','health_insights','wellness_goals',
    'goal_logs','meal_logs','nutrition_goals','share_links',
    'drug_interactions','side_effects','medication_effectiveness',
    'refill_reminders','coach_messages','ai_health_reports',
    'ai_medical_imaging_results','skin_analyses','personalized_diet_plans',
    'telehealth_appointments','audit_logs'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    -- SELECT: own data or admin
    EXECUTE format('CREATE POLICY %I ON %I FOR SELECT USING (created_by = auth_email() OR is_admin())', 
      tbl || '_select', tbl);
    -- INSERT: must set created_by to own email
    EXECUTE format('CREATE POLICY %I ON %I FOR INSERT WITH CHECK (created_by = auth_email() OR is_admin())', 
      tbl || '_insert', tbl);
    -- UPDATE: own data or admin
    EXECUTE format('CREATE POLICY %I ON %I FOR UPDATE USING (created_by = auth_email() OR is_admin())', 
      tbl || '_update', tbl);
    -- DELETE: own data or admin
    EXECUTE format('CREATE POLICY %I ON %I FOR DELETE USING (created_by = auth_email() OR is_admin())', 
      tbl || '_delete', tbl);
  END LOOP;
END $$;

-- ══════════════════════════════════════════════
-- EMAIL-MATCHED TABLES (user_email field)
-- ══════════════════════════════════════════════
DO $$ 
DECLARE
  tbl TEXT;
  tbls TEXT[] := ARRAY[
    'connected_devices','gamification_profiles','notifications',
    'user_preferences','user_subscriptions','subscriptions',
    'user_credits','user_entitlements','usage_meters'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    EXECUTE format('CREATE POLICY %I ON %I FOR SELECT USING (user_email = auth_email() OR is_admin())', 
      tbl || '_select', tbl);
    EXECUTE format('CREATE POLICY %I ON %I FOR INSERT WITH CHECK (user_email = auth_email() OR is_admin())', 
      tbl || '_insert', tbl);
    EXECUTE format('CREATE POLICY %I ON %I FOR UPDATE USING (user_email = auth_email() OR is_admin())', 
      tbl || '_update', tbl);
    EXECUTE format('CREATE POLICY %I ON %I FOR DELETE USING (user_email = auth_email() OR is_admin())', 
      tbl || '_delete', tbl);
  END LOOP;
END $$;

-- ══════════════════════════════════════════════
-- CARE CIRCLE: Dual-access (owner OR caregiver)
-- ══════════════════════════════════════════════
CREATE POLICY care_circles_select ON care_circles FOR SELECT
  USING (owner_email = auth_email() OR caregiver_email = auth_email() OR is_admin());
CREATE POLICY care_circles_insert ON care_circles FOR INSERT
  WITH CHECK (owner_email = auth_email() OR is_admin());
CREATE POLICY care_circles_update ON care_circles FOR UPDATE
  USING (owner_email = auth_email() OR caregiver_email = auth_email() OR is_admin());
CREATE POLICY care_circles_delete ON care_circles FOR DELETE
  USING (owner_email = auth_email() OR is_admin());

CREATE POLICY ccm_select ON care_circle_messages FOR SELECT
  USING (owner_email = auth_email() OR caregiver_email = auth_email() OR is_admin());
CREATE POLICY ccm_insert ON care_circle_messages FOR INSERT
  WITH CHECK (sender_email = auth_email() OR is_admin());
CREATE POLICY ccm_update ON care_circle_messages FOR UPDATE
  USING (owner_email = auth_email() OR caregiver_email = auth_email() OR is_admin());
CREATE POLICY ccm_delete ON care_circle_messages FOR DELETE
  USING (owner_email = auth_email() OR is_admin());

-- ══════════════════════════════════════════════
-- ADMIN-ONLY TABLES
-- ══════════════════════════════════════════════
CREATE POLICY ff_select ON feature_flag_assignments FOR SELECT USING (TRUE); -- all can read flags
CREATE POLICY ff_modify ON feature_flag_assignments FOR ALL USING (is_admin());

CREATE POLICY ads_select ON ads FOR SELECT USING (is_active = TRUE OR is_admin());
CREATE POLICY ads_modify ON ads FOR ALL USING (is_admin());

CREATE POLICY roles_select ON roles FOR SELECT USING (TRUE);
CREATE POLICY roles_modify ON roles FOR ALL USING (is_admin());

-- ══════════════════════════════════════════════
-- PUBLIC READ TABLES
-- ══════════════════════════════════════════════
CREATE POLICY sp_select ON subscription_packages FOR SELECT USING (is_active = TRUE OR is_admin());
CREATE POLICY sp_modify ON subscription_packages FOR ALL USING (is_admin());

CREATE POLICY td_select ON telehealth_doctors FOR SELECT USING (is_active = TRUE OR is_admin());
CREATE POLICY td_modify ON telehealth_doctors FOR ALL USING (is_admin());
