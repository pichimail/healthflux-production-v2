-- ================================================
-- HealthFlux Migration 007 — FINAL RLS + Advanced Sharing + Buckets
-- Run AFTER 006. Clean version with no placeholders.
-- ================================================

-- 1. Add secure user_id column + backfill
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

UPDATE profiles p
SET user_id = u.id
FROM auth.users u
WHERE p.user_id IS NULL AND p.created_by = u.email;

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);

-- 2. Secure helper functions
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
      AND role = 'admin' 
      AND relationship = 'self'
  );
$$;

CREATE OR REPLACE FUNCTION current_user_email()
RETURNS TEXT
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT email FROM auth.users WHERE id = auth.uid();
$$;

-- 3. Storage Buckets
INSERT INTO storage.buckets (id, name, public) VALUES
('healthflux-documents', 'healthflux-documents', false),
('healthflux-avatars',   'healthflux-avatars',   true),
('healthflux-ads',       'healthflux-ads',       true)
ON CONFLICT (id) DO NOTHING;

-- 4. Document ACL (Advanced Sharing)
CREATE TABLE IF NOT EXISTS document_acl (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES medical_documents(id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_to_email TEXT,
  granted_to_user_id UUID REFERENCES auth.users(id),
  permission TEXT DEFAULT 'view' CHECK (permission IN ('view','comment','edit')),
  share_token TEXT UNIQUE,
  expires_at TIMESTAMPTZ,
  is_revoked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doc_acl_doc ON document_acl(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_acl_email ON document_acl(granted_to_email);

ALTER TABLE document_acl ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "doc_acl_owner" ON document_acl;
CREATE POLICY "doc_acl_owner" ON document_acl FOR ALL 
  USING (owner_user_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "doc_acl_grantee" ON document_acl;
CREATE POLICY "doc_acl_grantee" ON document_acl FOR SELECT 
  USING (granted_to_user_id = auth.uid() OR granted_to_email = current_user_email());

-- 5. ABHA Accounts
CREATE TABLE IF NOT EXISTS abha_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  abha_number TEXT UNIQUE,
  abha_address TEXT,
  health_id_number TEXT,
  surepass_token TEXT,
  surepass_refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  linked_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  last_sync_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_abha_user ON abha_accounts(user_id);

ALTER TABLE abha_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "abha_own" ON abha_accounts;
CREATE POLICY "abha_own" ON abha_accounts FOR ALL 
  USING (user_id = auth.uid() OR is_admin());

-- 6. Final Strict RLS for all tables
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'profiles','vital_measurements','medications','medication_logs',
    'medical_documents','lab_results','health_insights','wellness_goals',
    'goal_logs','meal_logs','nutrition_goals','share_links','care_circles',
    'care_circle_messages','connected_devices','gamification_profiles',
    'drug_interactions','side_effects','medication_effectiveness',
    'refill_reminders','coach_messages','ai_health_reports',
    'ai_medical_imaging_results','skin_analyses','personalized_diet_plans',
    'notifications','user_preferences'
  ]) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', tbl||'_select_v2', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', tbl||'_insert_v2', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', tbl||'_update_v2', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', tbl||'_delete_v2', tbl);

    EXECUTE format(
      'CREATE POLICY %I ON %I FOR SELECT USING (created_by = current_user_email() OR is_admin())',
      tbl||'_select_v2', tbl);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR INSERT WITH CHECK (created_by = current_user_email() OR is_admin())',
      tbl||'_insert_v2', tbl);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR UPDATE USING (created_by = current_user_email() OR is_admin())',
      tbl||'_update_v2', tbl);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR DELETE USING (created_by = current_user_email() OR is_admin())',
      tbl||'_delete_v2', tbl);
  END LOOP;
END $$;

-- 7. Medical Documents sharing via ACL
DROP POLICY IF EXISTS "medical_documents_select_v2" ON medical_documents;
CREATE POLICY "medical_documents_select_v2" ON medical_documents FOR SELECT USING (
  created_by = current_user_email()
  OR is_admin()
  OR EXISTS (
    SELECT 1 FROM document_acl 
    WHERE document_id = medical_documents.id
      AND (granted_to_user_id = auth.uid() OR granted_to_email = current_user_email())
      AND is_revoked = FALSE
      AND (expires_at IS NULL OR expires_at > NOW())
  )
);

-- DONE
