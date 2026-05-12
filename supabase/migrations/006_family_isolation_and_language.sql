-- HealthFlux Migration: 006_family_isolation_and_language.sql
-- Strict family RLS isolation + language preference + insurance data

-- ══════════════════════════════════════════════
-- 1. ADD LANGUAGE + INSURANCE COLUMNS TO PROFILES
-- ══════════════════════════════════════════════
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'en'
  CHECK (preferred_language IN ('en', 'te', 'hi', 'tinglish'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS insurance_provider TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS insurance_policy_number TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS insurance_plan_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS insurance_valid_from DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS insurance_valid_to DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS insurance_sum_insured NUMERIC;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS insurance_document_url TEXT;

-- ══════════════════════════════════════════════
-- 2. STRICT FAMILY ISOLATION RLS
-- ══════════════════════════════════════════════
-- RULE: Only the account creator (created_by) can see their OWN profiles
-- User A should NEVER see User B's family members or data
-- Admins CAN see all users via admin role check

-- Drop all existing profile policies first
DROP POLICY IF EXISTS "Users view own profiles" ON profiles;
DROP POLICY IF EXISTS "Users create own profiles" ON profiles;
DROP POLICY IF EXISTS "Users update own profiles" ON profiles;
DROP POLICY IF EXISTS "Users delete own profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_own" ON profiles;

-- Strict SELECT: Only see your own family profiles (or admin sees all)
CREATE POLICY "profiles_select_strict"
  ON profiles FOR SELECT
  USING (
    created_by = auth.jwt() ->> 'email'
    OR EXISTS (
      SELECT 1 FROM profiles p2
      WHERE p2.created_by = auth.jwt() ->> 'email'
      AND p2.role = 'admin'
    )
  );

-- Strict INSERT: Can only create profiles under your own email
CREATE POLICY "profiles_insert_strict"
  ON profiles FOR INSERT
  WITH CHECK (created_by = auth.jwt() ->> 'email');

-- Strict UPDATE: Can only update your own profiles (or admin)
CREATE POLICY "profiles_update_strict"
  ON profiles FOR UPDATE
  USING (
    created_by = auth.jwt() ->> 'email'
    OR EXISTS (
      SELECT 1 FROM profiles p2
      WHERE p2.created_by = auth.jwt() ->> 'email'
      AND p2.role = 'admin'
    )
  );

-- Strict DELETE: Can only delete your own profiles (or admin)
CREATE POLICY "profiles_delete_strict"
  ON profiles FOR DELETE
  USING (
    created_by = auth.jwt() ->> 'email'
    OR EXISTS (
      SELECT 1 FROM profiles p2
      WHERE p2.created_by = auth.jwt() ->> 'email'
      AND p2.role = 'admin'
    )
  );

-- ══════════════════════════════════════════════
-- 3. STRICT RLS FOR ALL DATA TABLES
-- ══════════════════════════════════════════════
-- Pattern: user can ONLY see records where created_by matches their email
-- This ensures User A NEVER sees User B's vitals, meds, docs, etc.

-- Helper: apply strict user-only policy to a table
DO $$ 
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'vital_measurements', 'medications', 'medication_logs',
      'medical_documents', 'lab_results', 'health_insights',
      'wellness_goals', 'goal_logs', 'meal_logs', 'nutrition_goals',
      'share_links', 'care_circles', 'care_circle_messages',
      'connected_devices', 'gamification_profiles',
      'drug_interactions', 'side_effects', 'medication_effectiveness',
      'refill_reminders', 'coach_messages', 'ai_health_reports',
      'ai_medical_imaging_results', 'skin_analyses',
      'personalized_diet_plans', 'notifications', 'user_preferences'
    ])
  LOOP
    -- Drop old policies
    EXECUTE format('DROP POLICY IF EXISTS "%s_select_own" ON %I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%s_insert_own" ON %I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Users view own %s" ON %I', tbl, tbl);
    
    -- Create strict SELECT policy
    EXECUTE format(
      'CREATE POLICY "%s_select_strict" ON %I FOR SELECT USING (
        created_by = auth.jwt() ->> ''email''
        OR EXISTS (SELECT 1 FROM profiles WHERE created_by = auth.jwt() ->> ''email'' AND role = ''admin'')
      )', tbl, tbl
    );
    
    -- Create strict INSERT policy
    EXECUTE format(
      'CREATE POLICY "%s_insert_strict" ON %I FOR INSERT WITH CHECK (
        created_by = auth.jwt() ->> ''email''
      )', tbl, tbl
    );
    
    -- Create strict UPDATE policy
    EXECUTE format(
      'CREATE POLICY "%s_update_strict" ON %I FOR UPDATE USING (
        created_by = auth.jwt() ->> ''email''
        OR EXISTS (SELECT 1 FROM profiles WHERE created_by = auth.jwt() ->> ''email'' AND role = ''admin'')
      )', tbl, tbl
    );
  END LOOP;
END $$;

-- ══════════════════════════════════════════════
-- 4. FEATURE FLAG ENFORCEMENT (admin → user connection)
-- ══════════════════════════════════════════════

-- View: What features does a specific user have access to?
CREATE OR REPLACE VIEW user_effective_features AS
SELECT 
  p.created_by AS email,
  p.plan_type,
  p.subscription_status,
  p.role,
  ffa.flag_key,
  ffa.state AS flag_state,
  ffa.scope_type,
  ffa.scope_id
FROM profiles p
LEFT JOIN feature_flag_assignments ffa 
  ON (ffa.scope_type = 'global')
  OR (ffa.scope_type = 'plan' AND ffa.scope_id = p.plan_type)
  OR (ffa.scope_type = 'user' AND ffa.scope_id = p.created_by)
ORDER BY p.created_by, ffa.flag_key;

-- ══════════════════════════════════════════════
-- 5. ADMIN PLAN ENFORCEMENT VIEW
-- ══════════════════════════════════════════════

-- View: Shows which users have which plan and what features are active
CREATE OR REPLACE VIEW admin_plan_enforcement AS
SELECT 
  p.id,
  p.created_by AS email,
  p.full_name,
  p.role,
  p.plan_type,
  p.subscription_status,
  p.subscription_ends_at,
  p.credits_remaining,
  p.is_banned,
  p.onboarding_completed,
  p.preferred_language,
  sp.name AS plan_name,
  sp.price_monthly,
  sp.ai_calls_per_month,
  sp.max_profiles,
  sp.max_documents,
  sp.storage_gb,
  (SELECT COUNT(*) FROM profiles p2 WHERE p2.created_by = p.created_by) AS family_count,
  (SELECT COUNT(*) FROM medical_documents md WHERE md.created_by = p.created_by) AS doc_count,
  (SELECT COUNT(*) FROM ai_health_reports ahr WHERE ahr.created_by = p.created_by) AS ai_report_count
FROM profiles p
LEFT JOIN subscription_packages sp ON sp.slug = p.plan_type
WHERE p.relationship = 'self'
ORDER BY p.created_date DESC;

-- ══════════════════════════════════════════════
-- 6. USAGE METERING (enforce plan limits)
-- ══════════════════════════════════════════════

-- Function: Check if user can perform an AI action (within plan limits)
CREATE OR REPLACE FUNCTION check_ai_quota(user_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  remaining INT;
  plan TEXT;
  max_calls INT;
BEGIN
  SELECT credits_remaining, plan_type INTO remaining, plan
  FROM profiles WHERE created_by = user_email AND relationship = 'self' LIMIT 1;
  
  IF plan = 'enterprise' THEN RETURN TRUE; END IF;
  IF remaining IS NULL OR remaining <= 0 THEN RETURN FALSE; END IF;
  
  -- Decrement credits
  UPDATE profiles SET credits_remaining = credits_remaining - 1 WHERE created_by = user_email AND relationship = 'self';
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if user can add more profiles (within plan limits)  
CREATE OR REPLACE FUNCTION check_profile_quota(user_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  current_count INT;
  max_allowed INT;
BEGIN
  SELECT COUNT(*) INTO current_count FROM profiles WHERE created_by = user_email;
  SELECT sp.max_profiles INTO max_allowed
  FROM profiles p JOIN subscription_packages sp ON sp.slug = p.plan_type
  WHERE p.created_by = user_email AND p.relationship = 'self' LIMIT 1;
  
  IF max_allowed IS NULL THEN max_allowed := 1; END IF;
  RETURN current_count < max_allowed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check document upload quota
CREATE OR REPLACE FUNCTION check_document_quota(user_email TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  current_count INT;
  max_allowed INT;
BEGIN
  SELECT COUNT(*) INTO current_count FROM medical_documents WHERE created_by = user_email;
  SELECT sp.max_documents INTO max_allowed
  FROM profiles p JOIN subscription_packages sp ON sp.slug = p.plan_type
  WHERE p.created_by = user_email AND p.relationship = 'self' LIMIT 1;
  
  IF max_allowed IS NULL THEN max_allowed := 10; END IF;
  RETURN current_count < max_allowed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

