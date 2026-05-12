-- HealthFlux Migration: 004_seed_and_admin.sql
-- Subscription plans, admin views, helper functions
-- Run AFTER 001, 002, 003

-- ══════════════════════════════════════════════
-- 1. SEED DEFAULT SUBSCRIPTION PLANS
-- ══════════════════════════════════════════════
INSERT INTO subscription_packages 
  (name, slug, plan_key, price_monthly, price_yearly, currency, ai_calls_per_month, storage_gb, max_profiles, max_documents, features, sort_order)
VALUES
  ('Free', 'free', 'free', 0, 0, 'INR', 10, 0.5, 1, 10,
   '["Basic health tracking", "10 AI queries/month", "1 family profile", "10 documents"]'::jsonb, 1),
  ('Basic', 'basic', 'basic', 299, 2999, 'INR', 100, 2, 3, 100,
   '["Everything in Free", "100 AI queries/month", "3 family profiles", "100 documents", "Medication reminders"]'::jsonb, 2),
  ('Pro', 'pro', 'pro', 799, 7999, 'INR', 1000, 10, 10, 1000,
   '["Everything in Basic", "1000 AI queries/month", "10 family profiles", "Unlimited documents", "Medical imaging AI", "Telehealth", "Priority support"]'::jsonb, 3),
  ('Enterprise', 'enterprise', 'enterprise', 2999, 29999, 'INR', 999999, 100, 999, 999999,
   '["Everything in Pro", "Unlimited AI", "Unlimited profiles", "Custom integrations", "Dedicated support", "SLA guarantee"]'::jsonb, 4)
ON CONFLICT (slug) DO UPDATE SET
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  features = EXCLUDED.features,
  ai_calls_per_month = EXCLUDED.ai_calls_per_month,
  storage_gb = EXCLUDED.storage_gb,
  max_profiles = EXCLUDED.max_profiles,
  max_documents = EXCLUDED.max_documents;

-- ══════════════════════════════════════════════
-- 2. ADMIN USERS VIEW
-- ══════════════════════════════════════════════
CREATE OR REPLACE VIEW admin_users_view AS
SELECT 
  p.id,
  p.created_by AS email,
  p.full_name,
  p.role,
  p.plan_type,
  p.subscription_status,
  p.is_banned,
  p.onboarding_completed,
  p.credits_remaining,
  p.credits_total,
  p.last_active_at,
  p.created_date,
  us.plan_slug AS active_plan,
  us.status AS sub_status,
  us.ends_at AS sub_ends_at,
  us.stripe_subscription_id,
  sp.name AS plan_name,
  sp.price_monthly
FROM profiles p
LEFT JOIN user_subscriptions us 
  ON us.created_by = p.created_by AND us.status = 'active'
LEFT JOIN subscription_packages sp 
  ON sp.slug = us.plan_slug
ORDER BY p.created_date DESC;

-- ══════════════════════════════════════════════
-- 3. ADMIN ANALYTICS VIEW
-- ══════════════════════════════════════════════
CREATE OR REPLACE VIEW admin_analytics_view AS
SELECT 
  (SELECT COUNT(*) FROM profiles) AS total_users,
  (SELECT COUNT(*) FROM profiles WHERE role = 'admin') AS admin_count,
  (SELECT COUNT(*) FROM profiles WHERE subscription_status = 'active') AS active_subscribers,
  (SELECT COUNT(*) FROM profiles WHERE plan_type = 'free') AS free_users,
  (SELECT COUNT(*) FROM profiles WHERE plan_type = 'basic') AS basic_users,
  (SELECT COUNT(*) FROM profiles WHERE plan_type = 'pro') AS pro_users,
  (SELECT COUNT(*) FROM profiles WHERE plan_type = 'enterprise') AS enterprise_users,
  (SELECT COUNT(*) FROM profiles WHERE is_banned = TRUE) AS banned_users,
  (SELECT COUNT(*) FROM profiles WHERE onboarding_completed = TRUE) AS onboarded_users,
  (SELECT COUNT(*) FROM profiles WHERE created_date > NOW() - INTERVAL '7 days') AS new_users_7d,
  (SELECT COUNT(*) FROM profiles WHERE created_date > NOW() - INTERVAL '30 days') AS new_users_30d,
  (SELECT COUNT(*) FROM medical_documents) AS total_documents,
  (SELECT COUNT(*) FROM vital_measurements) AS total_vitals,
  (SELECT COUNT(*) FROM medications) AS total_medications,
  (SELECT COUNT(*) FROM ai_health_reports) AS total_ai_reports;

-- ══════════════════════════════════════════════
-- 4. HELPER FUNCTION: Make user admin
-- ══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION make_admin(user_email TEXT)
RETURNS void AS $$
BEGIN
  UPDATE profiles 
  SET role = 'admin', updated_date = NOW()
  WHERE created_by = user_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ══════════════════════════════════════════════
-- 5. HELPER FUNCTION: Assign plan to user
-- ══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION assign_plan(
  user_email TEXT, 
  new_plan TEXT DEFAULT 'free',
  duration_months INTEGER DEFAULT 12
)
RETURNS void AS $$
BEGIN
  -- Update profile
  UPDATE profiles 
  SET 
    plan_type = new_plan,
    subscription_status = 'active',
    subscription_ends_at = NOW() + (duration_months || ' months')::INTERVAL,
    updated_date = NOW()
  WHERE created_by = user_email;

  -- Create subscription record
  INSERT INTO user_subscriptions (created_by, plan_slug, plan_key, status, started_at, ends_at, user_email)
  VALUES (
    user_email, new_plan, new_plan, 'active', NOW(), 
    NOW() + (duration_months || ' months')::INTERVAL, user_email
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ══════════════════════════════════════════════
-- 6. HELPER FUNCTION: Ban/Unban user
-- ══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION toggle_ban(user_email TEXT, ban BOOLEAN, reason TEXT DEFAULT NULL)
RETURNS void AS $$
BEGIN
  UPDATE profiles 
  SET is_banned = ban, banned_reason = reason, updated_date = NOW()
  WHERE created_by = user_email;
  
  -- Log the action
  INSERT INTO audit_logs (created_by, action, entity_type, entity_id, new_data)
  VALUES ('system', CASE WHEN ban THEN 'ban_user' ELSE 'unban_user' END, 
          'profile', user_email, jsonb_build_object('reason', reason));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ══════════════════════════════════════════════
-- 7. AUTO-CREATE PROFILE ON FIRST LOGIN (trigger)
-- ══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, created_by, full_name, avatar_url, role, plan_type, subscription_status, onboarding_completed)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, NEW.raw_user_meta_data->>'email'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'User'),
    NEW.raw_user_meta_data->>'avatar_url',
    'user',
    'free',
    'inactive',
    FALSE
  )
  ON CONFLICT (id) DO NOTHING;

  -- Also create default user_credits
  INSERT INTO user_credits (created_by, user_email, total_credits, used_credits, plan_key)
  VALUES (
    COALESCE(NEW.email, NEW.raw_user_meta_data->>'email'),
    COALESCE(NEW.email, NEW.raw_user_meta_data->>'email'),
    10, 0, 'free'
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger (drop first to avoid duplicates)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ══════════════════════════════════════════════
-- 8. AUTO-UPDATE last_active_at
-- ══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_last_active()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles SET last_active_at = NOW() 
  WHERE created_by = NEW.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ══════════════════════════════════════════════
-- 9. RLS POLICIES FOR NEW TABLES/COLUMNS
-- ══════════════════════════════════════════════

-- Subscription packages: anyone can read (for pricing page)
ALTER TABLE subscription_packages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view subscription packages" ON subscription_packages;
CREATE POLICY "Anyone can view subscription packages"
  ON subscription_packages FOR SELECT
  USING (true);

-- Admin-only write on subscription_packages
DROP POLICY IF EXISTS "Admins can manage subscription packages" ON subscription_packages;
CREATE POLICY "Admins can manage subscription packages"
  ON subscription_packages FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE created_by = auth.jwt() ->> 'email' AND role = 'admin')
  );

-- User subscriptions: users see own, admins see all
DROP POLICY IF EXISTS "Users view own subscriptions" ON user_subscriptions;
CREATE POLICY "Users view own subscriptions"
  ON user_subscriptions FOR SELECT
  USING (
    created_by = auth.jwt() ->> 'email'
    OR EXISTS (SELECT 1 FROM profiles WHERE created_by = auth.jwt() ->> 'email' AND role = 'admin')
  );

DROP POLICY IF EXISTS "Users create own subscriptions" ON user_subscriptions;
CREATE POLICY "Users create own subscriptions"
  ON user_subscriptions FOR INSERT
  WITH CHECK (created_by = auth.jwt() ->> 'email');

-- Admin policy for profiles (admins can read/update all)
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;
CREATE POLICY "Admins can manage all profiles"
  ON profiles FOR ALL
  USING (
    created_by = auth.jwt() ->> 'email'
    OR EXISTS (SELECT 1 FROM profiles WHERE created_by = auth.jwt() ->> 'email' AND role = 'admin')
  );

