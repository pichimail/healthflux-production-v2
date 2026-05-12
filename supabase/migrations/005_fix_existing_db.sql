-- HealthFlux Migration: 005_fix_existing_db.sql
-- ONLY run this if you already ran 001-003 before the fixes
-- It applies the delta changes (adds missing columns/constraints)
-- Safe to run multiple times (all IF NOT EXISTS / IF EXISTS)

-- ── Fix profiles: add subscription columns ──────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT 'free';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS credits_remaining INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS credits_total INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banned_reason TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referred_by TEXT;

-- ── Fix subscription_packages: add slug + metadata ──────────────
ALTER TABLE subscription_packages ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE subscription_packages ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR';
ALTER TABLE subscription_packages ADD COLUMN IF NOT EXISTS ai_calls_per_month INTEGER DEFAULT 10;
ALTER TABLE subscription_packages ADD COLUMN IF NOT EXISTS storage_gb NUMERIC DEFAULT 0.5;
ALTER TABLE subscription_packages ADD COLUMN IF NOT EXISTS max_profiles INTEGER DEFAULT 1;
ALTER TABLE subscription_packages ADD COLUMN IF NOT EXISTS max_documents INTEGER DEFAULT 10;
ALTER TABLE subscription_packages ADD COLUMN IF NOT EXISTS stripe_price_id_monthly TEXT;
ALTER TABLE subscription_packages ADD COLUMN IF NOT EXISTS stripe_price_id_yearly TEXT;

-- Populate slug from plan_key if null
UPDATE subscription_packages SET slug = plan_key WHERE slug IS NULL AND plan_key IS NOT NULL;
UPDATE subscription_packages SET slug = LOWER(REPLACE(name, ' ', '_')) WHERE slug IS NULL;

-- Add unique constraint on slug (skip if exists)
DO $$ BEGIN
  ALTER TABLE subscription_packages ADD CONSTRAINT subscription_packages_slug_key UNIQUE (slug);
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- ── Fix user_subscriptions: add missing columns ──────────────────
ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS plan_slug TEXT DEFAULT 'free';
ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS billing_cycle TEXT DEFAULT 'monthly';
ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ;
ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;
ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS amount_paid NUMERIC DEFAULT 0;
ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR';

-- Backfill plan_slug from plan_key
UPDATE user_subscriptions SET plan_slug = plan_key WHERE plan_slug = 'free' AND plan_key IS NOT NULL AND plan_key != 'free';

-- ── Done ──────────────────────────────────────────────────────────
-- After running this, proceed with 004_seed_and_admin.sql
