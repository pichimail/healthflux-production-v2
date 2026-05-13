# HealthFlux Database Migrations

## Fresh Install (new Supabase project)
Run in Supabase SQL Editor in order:
1. `001_create_tables.sql` → 39 tables with all columns
2. `002_rls_policies.sql`  → Row Level Security
3. `003_indexes.sql`       → Performance indexes
4. `004_seed_and_admin.sql`→ Plan seeds, admin views, triggers

## Existing DB Fix (already ran old 001-003)
Run in order:
1. `005_fix_existing_db.sql` → Adds missing columns/constraints
2. `004_seed_and_admin.sql`  → Seeds plans, creates admin views + triggers

## Set Admin User
```sql
SELECT make_admin('your-email@gmail.com');
SELECT assign_plan('your-email@gmail.com', 'pro', 12);
```

## Useful Queries
```sql
-- See all users with plan info
SELECT * FROM admin_users_view;

-- App analytics
SELECT * FROM admin_analytics_view;

-- Ban a user
SELECT toggle_ban('spammer@example.com', TRUE, 'Spam');

-- Unban
SELECT toggle_ban('spammer@example.com', FALSE);
```

## Migration 006 — Family Isolation + Language (NEW)
Run after 004:
```
006_family_isolation_and_language.sql
```

What it does:
- Adds preferred_language, insurance_* columns to profiles
- STRICT RLS: User A can NEVER see User B's data (family isolation)
- Admin can see all users' data
- Feature flag enforcement views (admin_plan_enforcement)
- Plan quota checks: check_ai_quota(), check_profile_quota(), check_document_quota()
