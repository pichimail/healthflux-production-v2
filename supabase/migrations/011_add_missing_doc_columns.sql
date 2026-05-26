-- ================================================
-- HealthFlux Migration 011 — Add missing medical_documents columns
-- Fixes 400 Bad Request errors when uploading documents.
-- The app inserts file_name, file_type, facility_name, doctor_name,
-- and action_items but those columns were missing from the table.
-- Safe to run multiple times (IF NOT EXISTS).
--
-- HOW TO RUN:
--   Open Supabase Dashboard → SQL Editor → New Query → Paste this → Run
--   URL: https://supabase.com/dashboard/project/djmbleoaddmleofhskxu/sql/new
-- ================================================

-- Core upload fields (cause the 400 on INSERT)
ALTER TABLE medical_documents ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE medical_documents ADD COLUMN IF NOT EXISTS file_type TEXT;

-- AI extraction fields (needed by processUploadedDocument)
ALTER TABLE medical_documents ADD COLUMN IF NOT EXISTS facility_name TEXT;
ALTER TABLE medical_documents ADD COLUMN IF NOT EXISTS doctor_name TEXT;
ALTER TABLE medical_documents ADD COLUMN IF NOT EXISTS action_items JSONB DEFAULT '[]';

-- Grant schema access to service_role (needed for server-side admin operations)
GRANT USAGE ON SCHEMA public TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Set admin role for pichimail24@gmail.com
UPDATE profiles
SET role = 'admin'
WHERE created_by = 'pichimail24@gmail.com'
  AND relationship = 'self';

-- Ensure indexes for new columns
CREATE INDEX IF NOT EXISTS idx_docs_facility ON medical_documents(facility_name);
CREATE INDEX IF NOT EXISTS idx_docs_filename ON medical_documents(file_name);
