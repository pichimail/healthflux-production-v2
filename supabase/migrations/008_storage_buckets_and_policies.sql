-- HealthFlux Migration: 008_storage_buckets_and_policies.sql
-- Creates required storage buckets and safe object policies.
-- Safe to rerun.

-- 1) Create buckets if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'uploads') THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('uploads', 'uploads', true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'documents') THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('documents', 'documents', true);
  END IF;
END $$;

-- 2) Ensure RLS enabled on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3) Policies: public read + authenticated write for app buckets
DROP POLICY IF EXISTS "hf_storage_public_read" ON storage.objects;
CREATE POLICY "hf_storage_public_read"
  ON storage.objects
  FOR SELECT
  USING (bucket_id IN ('uploads', 'documents'));

DROP POLICY IF EXISTS "hf_storage_auth_insert" ON storage.objects;
CREATE POLICY "hf_storage_auth_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id IN ('uploads', 'documents'));

DROP POLICY IF EXISTS "hf_storage_auth_update" ON storage.objects;
CREATE POLICY "hf_storage_auth_update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id IN ('uploads', 'documents'))
  WITH CHECK (bucket_id IN ('uploads', 'documents'));

DROP POLICY IF EXISTS "hf_storage_auth_delete" ON storage.objects;
CREATE POLICY "hf_storage_auth_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id IN ('uploads', 'documents'));
