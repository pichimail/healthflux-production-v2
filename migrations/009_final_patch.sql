-- ================================================
-- HealthFlux Migration 009 — FINAL CLEANUP PATCH
-- Run LAST. Makes everything consistent.
-- ================================================

-- Add missing indexes
CREATE INDEX IF NOT EXISTS idx_document_acl_doc ON document_acl(document_id);
CREATE INDEX IF NOT EXISTS idx_abha_user ON abha_accounts(user_id);

-- Backfill free tier credits (just in case)
UPDATE profiles 
SET credits_remaining = GREATEST(COALESCE(credits_remaining, 0), 10),
    credits_total = GREATEST(COALESCE(credits_total, 0), 10)
WHERE plan_type = 'free' AND relationship = 'self';

-- Final storage policies (secure)
DROP POLICY IF EXISTS "docs_select_own_or_shared" ON storage.objects;
CREATE POLICY "docs_select_own_or_shared" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'healthflux-documents'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text 
      OR is_admin()
    )
  );

-- DONE — Database is now clean and consistent
