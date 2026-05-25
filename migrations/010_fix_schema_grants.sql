-- HealthFlux Migration: 010_fix_schema_grants.sql
-- Grants USAGE on public schema and table-level access to anon/authenticated roles
-- Run this in Supabase SQL editor if you're seeing "permission denied for schema public" errors

-- Schema access
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- All existing tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- All existing sequences (for uuid/serial columns)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Future tables created in this schema will also inherit these grants
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated;
