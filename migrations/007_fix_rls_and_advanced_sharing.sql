-- ═══════════════════════════════════════════════════════════════════════════
-- HealthFlux Migration 007 — Critical Fixes + Advanced Sharing
-- 
-- FIXES:
-- 1. Recursive RLS error (stack depth exceeded) on profiles table
-- 2. Wrong identity model — switches to auth.uid() based RLS (more secure)
-- 3. Adds default free-tier credits (4 profiles, 10 docs, 10 AI calls)
-- 4. Adds advanced sharing: document_acl, expiry, password-protect, care circle
-- 5. Adds ads management tables
-- 
-- RUN AFTER: 001 → 002 → 003 → 004 → 005 → 006
-- This is idempotent — safe to run multiple times
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────
-- PART A: FIX RECURSIVE RLS ON PROFILES (root cause of 500 errors)
-- ─────────────────────────────────────────────────────────────────────────
-- The bug: profiles_select_strict policy queries profiles to check admin role.
-- When SELECTing profiles, this triggers the policy on the inner query too,
-- causing infinite recursion → "stack depth limit exceeded" (code 54001).
-- 
-- Fix: Use a SECURITY DEFINER function that bypasses RLS for the admin check.

-- Add user_id (uuid) column to profiles for auth.uid() based RLS
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Backfill user_id from auth.users via email match
UPDATE profiles p
SET user_id = u.id
FROM auth.users u
WHERE p.user_id IS NULL AND p.created_by = u.email;

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_created_by ON profiles(created_by);

-- SECURITY DEFINER function: check if a user is admin (bypasses RLS)
CREATE OR REPLACE FUNCTION is_admin(check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = check_user_id 
      AND role = 'admin' 
      AND relationship = 'self'
    LIMIT 1
  );
$$;

-- SECURITY DEFINER function: get current user's email
CREATE OR REPLACE FUNCTION current_user_email()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT email FROM auth.users WHERE id = auth.uid() LIMIT 1;
$$;

-- DROP ALL old recursive policies on profiles
DROP POLICY IF EXISTS "profiles_select_strict" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_strict" ON profiles;
DROP POLICY IF EXISTS "profiles_update_strict" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_strict" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_own" ON profiles;
DROP POLICY IF EXISTS "Users view own profiles" ON profiles;
DROP POLICY IF EXISTS "Users create own profiles" ON profiles;
DROP POLICY IF EXISTS "Users update own profiles" ON profiles;
DROP POLICY IF EXISTS "Users delete own profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;

-- New NON-RECURSIVE policies using is_admin() function
CREATE POLICY "profiles_select_v2"
  ON profiles FOR SELECT
  USING (
    user_id = auth.uid()
    OR created_by = current_user_email()
    OR is_admin()
  );

CREATE POLICY "profiles_insert_v2"
  ON profiles FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR created_by = current_user_email()
    OR is_admin()
  );

CREATE POLICY "profiles_update_v2"
  ON profiles FOR UPDATE
  USING (
    user_id = auth.uid()
    OR created_by = current_user_email()
    OR is_admin()
  );

CREATE POLICY "profiles_delete_v2"
  ON profiles FOR DELETE
  USING (
    user_id = auth.uid()
    OR created_by = current_user_email()
    OR is_admin()
  );

-- ─────────────────────────────────────────────────────────────────────────
-- PART B: FIX RECURSIVE RLS ON ALL OTHER TABLES (same pattern)
-- ─────────────────────────────────────────────────────────────────────────
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
    -- Drop old recursive policies
    EXECUTE format('DROP POLICY IF EXISTS "%I_select_strict" ON %I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%I_insert_strict" ON %I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%I_update_strict" ON %I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%I_select_v2" ON %I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%I_insert_v2" ON %I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%I_update_v2" ON %I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%I_delete_v2" ON %I', tbl, tbl);

    -- New non-recursive policies
    EXECUTE format(
      'CREATE POLICY "%I_select_v2" ON %I FOR SELECT USING (
        created_by = current_user_email() OR is_admin()
      )', tbl, tbl);
    EXECUTE format(
      'CREATE POLICY "%I_insert_v2" ON %I FOR INSERT WITH CHECK (
        created_by = current_user_email() OR is_admin()
      )', tbl, tbl);
    EXECUTE format(
      'CREATE POLICY "%I_update_v2" ON %I FOR UPDATE USING (
        created_by = current_user_email() OR is_admin()
      )', tbl, tbl);
    EXECUTE format(
      'CREATE POLICY "%I_delete_v2" ON %I FOR DELETE USING (
        created_by = current_user_email() OR is_admin()
      )', tbl, tbl);
  END LOOP;
END $$;

-- ─────────────────────────────────────────────────────────────────────────
-- PART C: AUTO-CREATE PROFILE + DEFAULT CREDITS ON SIGNUP
-- ─────────────────────────────────────────────────────────────────────────
-- Free tier defaults: 4 profiles, 10 documents, 10 AI calls
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create self-profile with FREE plan + default credits
  INSERT INTO profiles (
    id, user_id, created_by, full_name, avatar_url, role,
    plan_type, subscription_status,
    credits_remaining, credits_total,
    onboarding_completed, relationship,
    preferred_language
  )
  VALUES (
    NEW.id, NEW.id,
    COALESCE(NEW.email, NEW.raw_user_meta_data->>'email'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'User'),
    NEW.raw_user_meta_data->>'avatar_url',
    'user', 'free', 'active',
    10, 10,           -- 10 AI calls (free tier default)
    FALSE, 'self', 'en'
  )
  ON CONFLICT (id) DO UPDATE
    SET user_id = EXCLUDED.user_id,
        created_by = COALESCE(profiles.created_by, EXCLUDED.created_by);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────
-- PART D: UPDATE SUBSCRIPTION PACKAGES (free tier defaults)
-- ─────────────────────────────────────────────────────────────────────────
UPDATE subscription_packages
SET ai_calls_per_month = 10,
    max_profiles = 4,
    max_documents = 10,
    storage_gb = 0.5
WHERE slug = 'free';

-- ─────────────────────────────────────────────────────────────────────────
-- PART E: DOCUMENT ACL (Advanced Sharing)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS document_acl (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES medical_documents(id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_to_email TEXT,             -- recipient email (for share-by-email)
  granted_to_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_to_role TEXT CHECK (granted_to_role IN ('family','care_circle','doctor','admin')),
  permission TEXT NOT NULL DEFAULT 'view' CHECK (permission IN ('view','comment','edit')),
  share_token TEXT UNIQUE,           -- for tokenized public/link shares
  password_hash TEXT,                -- optional bcrypt hash
  max_views INTEGER,                 -- view limit (NULL = unlimited)
  current_views INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,            -- expiry
  is_revoked BOOLEAN DEFAULT FALSE,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_doc_acl_doc ON document_acl(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_acl_email ON document_acl(granted_to_email);
CREATE INDEX IF NOT EXISTS idx_doc_acl_user ON document_acl(granted_to_user_id);
CREATE INDEX IF NOT EXISTS idx_doc_acl_token ON document_acl(share_token);

ALTER TABLE document_acl ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "doc_acl_owner" ON document_acl;
CREATE POLICY "doc_acl_owner" ON document_acl FOR ALL
  USING (owner_user_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "doc_acl_grantee_select" ON document_acl;
CREATE POLICY "doc_acl_grantee_select" ON document_acl FOR SELECT
  USING (granted_to_user_id = auth.uid() OR granted_to_email = current_user_email());

-- ─────────────────────────────────────────────────────────────────────────
-- PART F: MEDICAL_DOCUMENTS — extended sharing policy
-- ─────────────────────────────────────────────────────────────────────────
-- A user can VIEW a medical document if:
--   1. They created it (owner), OR
--   2. They are an admin, OR
--   3. A non-revoked, non-expired document_acl entry grants them access
DROP POLICY IF EXISTS "medical_documents_select_v2" ON medical_documents;
CREATE POLICY "medical_documents_select_v2" ON medical_documents FOR SELECT
  USING (
    created_by = current_user_email()
    OR is_admin()
    OR EXISTS (
      SELECT 1 FROM document_acl a
      WHERE a.document_id = medical_documents.id
        AND (a.granted_to_user_id = auth.uid() OR a.granted_to_email = current_user_email())
        AND a.is_revoked = FALSE
        AND (a.expires_at IS NULL OR a.expires_at > NOW())
        AND (a.max_views IS NULL OR a.current_views < a.max_views)
    )
  );

-- ─────────────────────────────────────────────────────────────────────────
-- PART G: SUPABASE STORAGE BUCKET + POLICIES
-- ─────────────────────────────────────────────────────────────────────────
-- Create private buckets (run only if doesn't exist)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('healthflux-documents', 'healthflux-documents', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('healthflux-avatars', 'healthflux-avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('healthflux-ads', 'healthflux-ads', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for documents bucket
-- Files are stored at: {user_id}/{document_id}/filename
DROP POLICY IF EXISTS "docs_upload_own" ON storage.objects;
CREATE POLICY "docs_upload_own" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'healthflux-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "docs_select_own_or_shared" ON storage.objects;
CREATE POLICY "docs_select_own_or_shared" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'healthflux-documents'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR is_admin()
      OR EXISTS (
        SELECT 1 FROM document_acl a
        JOIN medical_documents md ON md.id = a.document_id
        WHERE md.file_url LIKE '%' || name || '%'
          AND (a.granted_to_user_id = auth.uid() OR a.granted_to_email = current_user_email())
          AND a.is_revoked = FALSE
          AND (a.expires_at IS NULL OR a.expires_at > NOW())
      )
    )
  );

DROP POLICY IF EXISTS "docs_delete_own" ON storage.objects;
CREATE POLICY "docs_delete_own" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'healthflux-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Avatars bucket — anyone can view, only owner can upload
DROP POLICY IF EXISTS "avatars_upload_own" ON storage.objects;
CREATE POLICY "avatars_upload_own" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'healthflux-avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
CREATE POLICY "avatars_public_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'healthflux-avatars');

-- Ads bucket — admin upload, public read
DROP POLICY IF EXISTS "ads_admin_upload" ON storage.objects;
CREATE POLICY "ads_admin_upload" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'healthflux-ads' AND is_admin());

DROP POLICY IF EXISTS "ads_public_read" ON storage.objects;
CREATE POLICY "ads_public_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'healthflux-ads');

-- ─────────────────────────────────────────────────────────────────────────
-- PART H: ADS MANAGEMENT (admin-managed, user-visible)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ad_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  start_date TIMESTAMPTZ DEFAULT NOW(),
  end_date TIMESTAMPTZ,
  created_by TEXT,
  created_date TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ads 
  ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES ad_campaigns(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ad_type TEXT DEFAULT 'banner' CHECK (ad_type IN ('banner','card','interstitial','sidebar')),
  ADD COLUMN IF NOT EXISTS placement TEXT DEFAULT 'dashboard' CHECK (placement IN ('dashboard','health_hub','wellness','documents','sidebar','footer')),
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS click_url TEXT,
  ADD COLUMN IF NOT EXISTS impression_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS click_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS target_plans TEXT[] DEFAULT ARRAY['free'],
  ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0;

ALTER TABLE ads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ads_admin_all" ON ads;
CREATE POLICY "ads_admin_all" ON ads FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "ads_public_read" ON ads;
CREATE POLICY "ads_public_read" ON ads FOR SELECT USING (is_active = TRUE);

-- ─────────────────────────────────────────────────────────────────────────
-- PART I: ABHA (Ayushman Bharat Health Account) Integration
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS abha_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  abha_number TEXT UNIQUE,                -- xx-xxxx-xxxx-xxxx format
  abha_address TEXT,                       -- username@abdm
  health_id_number TEXT,
  surepass_token TEXT,                     -- encrypted Surepass session token
  surepass_refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  linked_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  last_sync_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_abha_user ON abha_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_abha_number ON abha_accounts(abha_number);

ALTER TABLE abha_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "abha_own" ON abha_accounts;
CREATE POLICY "abha_own" ON abha_accounts FOR ALL
  USING (user_id = auth.uid() OR is_admin());

-- ─────────────────────────────────────────────────────────────────────────
-- PART J: HELPER FUNCTIONS FOR APP LOGIC
-- ─────────────────────────────────────────────────────────────────────────

-- Check if a user can upload another document (within their plan limits)
CREATE OR REPLACE FUNCTION can_upload_document(check_user_email TEXT DEFAULT current_user_email())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_count INT;
  max_allowed INT;
BEGIN
  SELECT COUNT(*) INTO current_count 
  FROM medical_documents WHERE created_by = check_user_email;

  SELECT sp.max_documents INTO max_allowed
  FROM profiles p
  JOIN subscription_packages sp ON sp.slug = p.plan_type
  WHERE p.created_by = check_user_email AND p.relationship = 'self'
  LIMIT 1;

  IF max_allowed IS NULL THEN max_allowed := 10; END IF;
  RETURN current_count < max_allowed;
END;
$$;

-- Check if a user can add another family profile
CREATE OR REPLACE FUNCTION can_add_profile(check_user_email TEXT DEFAULT current_user_email())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_count INT;
  max_allowed INT;
BEGIN
  SELECT COUNT(*) INTO current_count FROM profiles WHERE created_by = check_user_email;
  SELECT sp.max_profiles INTO max_allowed
  FROM profiles p JOIN subscription_packages sp ON sp.slug = p.plan_type
  WHERE p.created_by = check_user_email AND p.relationship = 'self' LIMIT 1;
  IF max_allowed IS NULL THEN max_allowed := 4; END IF;
  RETURN current_count < max_allowed;
END;
$$;

-- Update existing free users to get the new default credits (10 AI calls)
UPDATE profiles
SET credits_remaining = GREATEST(credits_remaining, 10),
    credits_total = GREATEST(credits_total, 10)
WHERE plan_type = 'free' AND relationship = 'self';

-- ═══════════════════════════════════════════════════════════════════════════
-- DONE
-- ═══════════════════════════════════════════════════════════════════════════
