-- HealthFlux Consolidated Migration: 000_run_all_safe.sql
-- Purpose: one-shot setup for fresh or partially-existing DBs.
-- Run in Supabase SQL Editor as a single script.
-- Notes:
-- 1) This file inlines migrations 001 -> 008 in dependency order.
-- 2) Scripts are written to be re-runnable where possible (IF EXISTS / IF NOT EXISTS / DROP POLICY IF EXISTS).
-- 3) If you already ran parts manually, this should reconcile safely.


-- =====================================================================
-- BEGIN: 001_create_tables.sql
-- =====================================================================
-- HealthFlux Migration: 001_create_tables.sql
-- Works with BOTH Supabase (native) and Neon (via Drizzle/raw SQL)
-- Run: psql $DATABASE_URL < 001_create_tables.sql

-- ══════════════════════════════════════════════
-- EXTENSIONS
-- ══════════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ══════════════════════════════════════════════
-- 1. PROFILES (core — everything links here)
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by TEXT NOT NULL,  -- user email from auth
  full_name TEXT NOT NULL,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male','female','other','prefer_not_to_say')),
  blood_group TEXT CHECK (blood_group IN ('A+','A-','B+','B-','AB+','AB-','O+','O-','unknown')),
  height NUMERIC,
  weight NUMERIC,
  relationship TEXT DEFAULT 'self' CHECK (relationship IN ('self','spouse','child','parent','sibling','other')),
  allergies TEXT[],
  chronic_conditions TEXT[],
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user','admin')),
  plan_type TEXT DEFAULT 'free' CHECK (plan_type IN ('free','basic','pro','enterprise')),
  subscription_status TEXT DEFAULT 'inactive' CHECK (subscription_status IN ('active','inactive','trial','cancelled','expired')),
  trial_ends_at TIMESTAMPTZ,
  subscription_ends_at TIMESTAMPTZ,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  credits_remaining INTEGER DEFAULT 0,
  credits_total INTEGER DEFAULT 0,
  is_banned BOOLEAN DEFAULT FALSE,
  banned_reason TEXT,
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  onboarding_completed BOOLEAN DEFAULT FALSE,
  referred_by TEXT,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════
-- 2. VITAL MEASUREMENTS
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS vital_measurements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by TEXT NOT NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  vital_type TEXT NOT NULL CHECK (vital_type IN ('blood_pressure','heart_rate','weight','oxygen_saturation','blood_glucose','temperature','respiratory_rate')),
  value NUMERIC,
  systolic NUMERIC,
  diastolic NUMERIC,
  unit TEXT,
  measured_at TIMESTAMPTZ DEFAULT NOW(),
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual','wearable','device','import')),
  notes TEXT,
  created_date TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════
-- 3. MEDICATIONS
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS medications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by TEXT NOT NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  medication_name TEXT NOT NULL,
  dosage TEXT,
  frequency TEXT CHECK (frequency IN ('once_daily','twice_daily','three_times_daily','four_times_daily','as_needed','weekly','monthly')),
  times TEXT[],
  start_date DATE,
  end_date DATE,
  prescribing_doctor TEXT,
  pharmacy TEXT,
  purpose TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  refills_remaining INTEGER DEFAULT 0,
  notes TEXT,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════
-- 4. MEDICATION LOGS
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS medication_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by TEXT NOT NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  medication_id UUID REFERENCES medications(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('taken','skipped','missed','delayed')),
  scheduled_time TIMESTAMPTZ,
  actual_time TIMESTAMPTZ,
  notes TEXT,
  created_date TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════
-- 5. MEDICAL DOCUMENTS
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS medical_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by TEXT NOT NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT,
  document_type TEXT CHECK (document_type IN ('lab_report','prescription','discharge_summary','imaging','insurance','vaccination','other')),
  file_url TEXT,
  document_date DATE,
  notes TEXT,
  ai_summary TEXT,
  ai_summary_detailed TEXT,
  key_findings JSONB DEFAULT '[]',
  ai_tags TEXT[],
  user_tags TEXT[],
  extracted_medications JSONB DEFAULT '[]',
  extracted_vitals JSONB DEFAULT '[]',
  extracted_lab_results JSONB DEFAULT '[]',
  health_score NUMERIC,
  risk_factors JSONB DEFAULT '[]',
  status TEXT DEFAULT 'processed' CHECK (status IN ('uploading','processing','processed','failed')),
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════
-- 6. LAB RESULTS
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS lab_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by TEXT NOT NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  document_id UUID REFERENCES medical_documents(id) ON DELETE SET NULL,
  test_name TEXT NOT NULL,
  test_category TEXT,
  value TEXT,
  unit TEXT,
  reference_range TEXT,
  flag TEXT CHECK (flag IN ('normal','high','low','critical_high','critical_low')),
  test_date DATE,
  lab_name TEXT,
  notes TEXT,
  created_date TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════
-- 7. HEALTH INSIGHTS
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS health_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by TEXT NOT NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  insight_type TEXT CHECK (insight_type IN ('trend','alert','recommendation','risk','correlation')),
  title TEXT,
  description TEXT,
  severity TEXT CHECK (severity IN ('info','warning','urgent','critical')),
  source TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  is_dismissed BOOLEAN DEFAULT FALSE,
  related_vital_type TEXT,
  related_document_id UUID,
  created_date TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════
-- 8. WELLNESS GOALS
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS wellness_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by TEXT NOT NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT CHECK (category IN ('steps','water','sleep','weight','exercise','medication','custom','calories')),
  target_value NUMERIC,
  current_value NUMERIC DEFAULT 0,
  unit TEXT,
  frequency TEXT DEFAULT 'daily',
  is_active BOOLEAN DEFAULT TRUE,
  start_date DATE,
  end_date DATE,
  streak_count INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════
-- 9. GOAL LOGS
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS goal_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by TEXT NOT NULL,
  goal_id UUID REFERENCES wellness_goals(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  value NUMERIC,
  logged_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_date TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════
-- 10. MEAL LOGS
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS meal_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by TEXT NOT NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  food_name TEXT,
  meal_type TEXT CHECK (meal_type IN ('breakfast','lunch','dinner','snack')),
  logged_date DATE DEFAULT CURRENT_DATE,
  logged_at TIMESTAMPTZ DEFAULT NOW(),
  quantity NUMERIC DEFAULT 1,
  quantity_unit TEXT DEFAULT 'serving',
  calories NUMERIC DEFAULT 0,
  protein_g NUMERIC DEFAULT 0,
  carbs_g NUMERIC DEFAULT 0,
  fat_g NUMERIC DEFAULT 0,
  fiber_g NUMERIC DEFAULT 0,
  image_url TEXT,
  source TEXT DEFAULT 'manual',
  ai_analysis JSONB,
  notes TEXT,
  created_date TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════
-- 11. NUTRITION GOALS
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS nutrition_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by TEXT NOT NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  daily_calories NUMERIC DEFAULT 2000,
  protein_g NUMERIC DEFAULT 50,
  carbs_g NUMERIC DEFAULT 250,
  fat_g NUMERIC DEFAULT 65,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════
-- 12. SHARE LINKS
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS share_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by TEXT NOT NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  permissions JSONB DEFAULT '{"vitals":true,"medications":true,"labs":true,"documents":false}',
  access_count INTEGER DEFAULT 0,
  created_date TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════
-- 13. CARE CIRCLES
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS care_circles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by TEXT NOT NULL,
  owner_email TEXT NOT NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  caregiver_email TEXT NOT NULL,
  caregiver_name TEXT,
  relationship TEXT,
  permissions JSONB DEFAULT '{"view_vitals":true,"view_medications":true,"view_documents":false,"view_labs":true,"view_insights":true,"add_notes":false}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','active','revoked')),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  message TEXT,
  created_date TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════
-- 14. CARE CIRCLE MESSAGES
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS care_circle_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  care_circle_id UUID REFERENCES care_circles(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  owner_email TEXT NOT NULL,
  caregiver_email TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  sender_name TEXT,
  message TEXT NOT NULL,
  attachment_url TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_date TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════
-- 15. CONNECTED DEVICES
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS connected_devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by TEXT NOT NULL,
  user_email TEXT NOT NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  device_type TEXT CHECK (device_type IN ('google_fit','apple_health','fitbit','garmin','samsung_health','manual')),
  device_name TEXT,
  is_connected BOOLEAN DEFAULT FALSE,
  last_sync TIMESTAMPTZ,
  sync_steps BOOLEAN DEFAULT TRUE,
  sync_sleep BOOLEAN DEFAULT TRUE,
  sync_heart_rate BOOLEAN DEFAULT TRUE,
  sync_calories BOOLEAN DEFAULT TRUE,
  access_token TEXT,
  daily_steps INTEGER,
  sleep_hours NUMERIC,
  avg_heart_rate INTEGER,
  calories_burned INTEGER,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════
-- 16. GAMIFICATION PROFILES
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS gamification_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by TEXT NOT NULL,
  user_email TEXT NOT NULL UNIQUE,
  total_points INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  level INTEGER DEFAULT 1,
  badges JSONB DEFAULT '[]',
  points_history JSONB DEFAULT '[]',
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════
-- 17. DRUG INTERACTIONS
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS drug_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by TEXT NOT NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  medication_a TEXT NOT NULL,
  medication_b TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('minor','moderate','major','contraindicated')),
  description TEXT,
  recommendation TEXT,
  source TEXT,
  created_date TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════
-- 18. SIDE EFFECTS
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS side_effects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by TEXT NOT NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  medication_id UUID REFERENCES medications(id) ON DELETE CASCADE,
  symptom TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('mild','moderate','severe')),
  onset_date DATE,
  duration_minutes INTEGER,
  notes TEXT,
  created_date TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════
-- 19. MEDICATION EFFECTIVENESS
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS medication_effectiveness (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by TEXT NOT NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  medication_id UUID REFERENCES medications(id) ON DELETE CASCADE,
  effectiveness_score INTEGER CHECK (effectiveness_score BETWEEN 1 AND 10),
  side_effects_reported TEXT[],
  overall_feeling TEXT,
  notes TEXT,
  logged_date DATE DEFAULT CURRENT_DATE,
  created_date TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════
-- 20. REFILL REMINDERS
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS refill_reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by TEXT NOT NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  medication_id UUID REFERENCES medications(id) ON DELETE CASCADE,
  refill_due_date DATE,
  pharmacy_name TEXT,
  pharmacy_phone TEXT,
  prescription_number TEXT,
  refills_remaining INTEGER DEFAULT 0,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming','due','overdue','completed')),
  reminder_sent BOOLEAN DEFAULT FALSE,
  created_date TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════
-- 21. COACH MESSAGES
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS coach_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by TEXT NOT NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('user','assistant')),
  content TEXT NOT NULL,
  context_type TEXT,
  created_date TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════
-- 22. AI HEALTH REPORTS
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS ai_health_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by TEXT NOT NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  report_period TEXT CHECK (report_period IN ('weekly','monthly')),
  period_label TEXT,
  vitals_summary TEXT,
  medication_adherence_summary TEXT,
  trend_analysis TEXT,
  risk_predictions JSONB DEFAULT '[]',
  lifestyle_suggestions TEXT[],
  recommended_checks TEXT[],
  overall_score INTEGER,
  status TEXT DEFAULT 'generated' CHECK (status IN ('generating','generated','failed')),
  created_date TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════
-- 23. AI MEDICAL IMAGING RESULTS
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS ai_medical_imaging_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by TEXT NOT NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  image_url TEXT,
  image_type TEXT CHECK (image_type IN ('xray','ct_scan','mri','ultrasound','other')),
  body_part TEXT,
  plain_summary TEXT,
  clinical_findings JSONB DEFAULT '[]',
  anomalies JSONB DEFAULT '[]',
  risk_level TEXT CHECK (risk_level IN ('low','moderate','high')),
  ai_confidence NUMERIC,
  scan_date DATE,
  notes TEXT,
  status TEXT DEFAULT 'analyzed',
  created_date TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════
-- 24. SKIN ANALYSES
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS skin_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by TEXT NOT NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  image_url TEXT,
  analysis_date DATE DEFAULT CURRENT_DATE,
  conditions_detected JSONB DEFAULT '[]',
  severity TEXT CHECK (severity IN ('mild','moderate','severe')),
  severity_score INTEGER,
  body_location TEXT,
  triage_advice TEXT,
  skincare_routine TEXT[],
  ingredients_to_avoid TEXT[],
  see_doctor_urgency TEXT CHECK (see_doctor_urgency IN ('none','routine','soon','urgent')),
  ai_confidence NUMERIC,
  tracking_notes TEXT,
  status TEXT DEFAULT 'analyzed',
  created_date TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════
-- 25. PERSONALIZED DIET PLANS
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS personalized_diet_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by TEXT NOT NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  week_start DATE,
  health_context JSONB,
  daily_plans JSONB DEFAULT '[]',
  nutritional_goals JSONB,
  foods_to_avoid TEXT[],
  foods_to_include TEXT[],
  lifestyle_tips TEXT[],
  health_conditions_addressed TEXT[],
  ai_rationale TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','archived','generating')),
  created_date TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════
-- 26. NOTIFICATIONS
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by TEXT,
  user_email TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  notification_type TEXT CHECK (notification_type IN ('medication','lab','insight','system','care_circle')),
  is_read BOOLEAN DEFAULT FALSE,
  action_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_date TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════
-- 27. USER PREFERENCES
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by TEXT NOT NULL UNIQUE,
  user_email TEXT NOT NULL UNIQUE,
  notifications JSONB DEFAULT '{"email_enabled":true,"subscription_updates":true,"health_alerts":true,"medication_reminders":true,"system_updates":false,"feature_announcements":false}',
  theme TEXT DEFAULT 'dark',
  language TEXT DEFAULT 'en',
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════
-- 28. TELEHEALTH DOCTORS
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS telehealth_doctors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  specialty TEXT,
  photo_url TEXT,
  rating NUMERIC DEFAULT 0,
  experience_years INTEGER,
  consultation_fee NUMERIC,
  availability JSONB DEFAULT '[]',
  languages TEXT[],
  bio TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_date TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════
-- 29. TELEHEALTH APPOINTMENTS
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS telehealth_appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by TEXT NOT NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES telehealth_doctors(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','confirmed','in_progress','completed','cancelled','no_show')),
  meeting_url TEXT,
  reason TEXT,
  notes TEXT,
  prescription_url TEXT,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════
-- 30-35. ADMIN/SUBSCRIPTION TABLES
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS subscription_packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  plan_key TEXT UNIQUE,
  price_monthly NUMERIC DEFAULT 0,
  price_yearly NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'INR',
  ai_calls_per_month INTEGER DEFAULT 10,
  storage_gb NUMERIC DEFAULT 0.5,
  max_profiles INTEGER DEFAULT 1,
  max_documents INTEGER DEFAULT 10,
  features JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  stripe_price_id_monthly TEXT,
  stripe_price_id_yearly TEXT,
  created_date TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by TEXT NOT NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  user_email TEXT,
  plan_slug TEXT NOT NULL DEFAULT 'free',
  plan_key TEXT DEFAULT 'free',
  status TEXT DEFAULT 'active' CHECK (status IN ('active','inactive','trial','trialing','past_due','cancelled','expired')),
  billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly','yearly','lifetime')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_payment_intent_id TEXT,
  amount_paid NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'INR',
  auto_renew BOOLEAN DEFAULT TRUE,
  renew_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_date TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by TEXT NOT NULL,
  user_email TEXT NOT NULL,
  package_id UUID REFERENCES subscription_packages(id),
  status TEXT DEFAULT 'active',
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE,
  auto_renew BOOLEAN DEFAULT TRUE,
  payment_method TEXT,
  amount_paid NUMERIC,
  last_payment_date DATE,
  created_date TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_credits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by TEXT NOT NULL,
  user_email TEXT NOT NULL,
  total_credits INTEGER DEFAULT 0,
  used_credits INTEGER DEFAULT 0,
  plan_key TEXT DEFAULT 'free',
  reset_date TIMESTAMPTZ,
  created_date TIMESTAMPTZ DEFAULT NOW(),
  updated_date TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_entitlements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by TEXT NOT NULL,
  user_email TEXT NOT NULL,
  feature_key TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT TRUE,
  source TEXT DEFAULT 'plan',
  created_date TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS usage_meters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by TEXT NOT NULL,
  user_email TEXT NOT NULL,
  feature_key TEXT NOT NULL,
  period_key TEXT NOT NULL,
  used_count INTEGER DEFAULT 0,
  limit_count INTEGER DEFAULT -1,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_date TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════
-- 36-38. FEATURE FLAGS & ROLES
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS feature_flag_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by TEXT NOT NULL,
  flag_key TEXT NOT NULL,
  scope_type TEXT CHECK (scope_type IN ('global','plan','user')),
  scope_id TEXT,
  state BOOLEAN DEFAULT FALSE,
  created_date TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  permissions JSONB DEFAULT '{}',
  created_date TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  created_date TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════
-- 39-40. ADS & EMERGENCY
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS ads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by TEXT NOT NULL,
  title TEXT,
  ad_type TEXT CHECK (ad_type IN ('banner','video','interstitial')),
  placement TEXT,
  media_url TEXT,
  redirect_url TEXT,
  skip_after_seconds INTEGER DEFAULT 5,
  is_active BOOLEAN DEFAULT FALSE,
  schedule_start TIMESTAMPTZ,
  schedule_end TIMESTAMPTZ,
  frequency_cap_daily INTEGER DEFAULT 3,
  targeting_roles TEXT[],
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  skips INTEGER DEFAULT 0,
  notes TEXT,
  created_date TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================
-- END: 001_create_tables.sql
-- =====================================================================

-- =====================================================================
-- BEGIN: 002_rls_policies.sql
-- =====================================================================
-- HealthFlux Migration: 002_rls_policies.sql
-- Row Level Security for ALL tables
-- Pattern: user sees own data (via created_by = email from JWT), admins see all

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vital_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE wellness_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_circles ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_circle_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE connected_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE gamification_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE drug_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE side_effects ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_effectiveness ENABLE ROW LEVEL SECURITY;
ALTER TABLE refill_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_health_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_medical_imaging_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE skin_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE personalized_diet_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE telehealth_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_meters ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flag_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ads ENABLE ROW LEVEL SECURITY;
-- Public/admin-only tables
ALTER TABLE telehealth_doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════
-- HELPER FUNCTION: Get current user email from JWT
-- ══════════════════════════════════════════════
CREATE OR REPLACE FUNCTION auth_email() RETURNS TEXT AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json->>'email',
    (current_setting('request.jwt.claims', true)::json->'user_metadata'->>'email')
  );
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE created_by = auth_email() AND role = 'admin'
  );
$$ LANGUAGE SQL STABLE;

-- ══════════════════════════════════════════════
-- STANDARD USER-OWNED DATA POLICIES
-- Pattern: user CRUD own records, admin full access
-- ══════════════════════════════════════════════

-- Macro: creates standard 4 policies for user-owned tables
DO $$ 
DECLARE
  tbl TEXT;
  tbls TEXT[] := ARRAY[
    'profiles','vital_measurements','medications','medication_logs',
    'medical_documents','lab_results','health_insights','wellness_goals',
    'goal_logs','meal_logs','nutrition_goals','share_links',
    'drug_interactions','side_effects','medication_effectiveness',
    'refill_reminders','coach_messages','ai_health_reports',
    'ai_medical_imaging_results','skin_analyses','personalized_diet_plans',
    'telehealth_appointments','audit_logs'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', tbl || '_select', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', tbl || '_insert', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', tbl || '_update', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', tbl || '_delete', tbl);
    -- SELECT: own data or admin
    EXECUTE format('CREATE POLICY %I ON %I FOR SELECT USING (created_by = auth_email() OR is_admin())', 
      tbl || '_select', tbl);
    -- INSERT: must set created_by to own email
    EXECUTE format('CREATE POLICY %I ON %I FOR INSERT WITH CHECK (created_by = auth_email() OR is_admin())', 
      tbl || '_insert', tbl);
    -- UPDATE: own data or admin
    EXECUTE format('CREATE POLICY %I ON %I FOR UPDATE USING (created_by = auth_email() OR is_admin())', 
      tbl || '_update', tbl);
    -- DELETE: own data or admin
    EXECUTE format('CREATE POLICY %I ON %I FOR DELETE USING (created_by = auth_email() OR is_admin())', 
      tbl || '_delete', tbl);
  END LOOP;
END $$;

-- ══════════════════════════════════════════════
-- EMAIL-MATCHED TABLES (user_email field)
-- ══════════════════════════════════════════════
DO $$ 
DECLARE
  tbl TEXT;
  tbls TEXT[] := ARRAY[
    'connected_devices','gamification_profiles','notifications',
    'user_preferences','user_subscriptions','subscriptions',
    'user_credits','user_entitlements','usage_meters'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', tbl || '_select', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', tbl || '_insert', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', tbl || '_update', tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', tbl || '_delete', tbl);
    EXECUTE format('CREATE POLICY %I ON %I FOR SELECT USING (user_email = auth_email() OR is_admin())', 
      tbl || '_select', tbl);
    EXECUTE format('CREATE POLICY %I ON %I FOR INSERT WITH CHECK (user_email = auth_email() OR is_admin())', 
      tbl || '_insert', tbl);
    EXECUTE format('CREATE POLICY %I ON %I FOR UPDATE USING (user_email = auth_email() OR is_admin())', 
      tbl || '_update', tbl);
    EXECUTE format('CREATE POLICY %I ON %I FOR DELETE USING (user_email = auth_email() OR is_admin())', 
      tbl || '_delete', tbl);
  END LOOP;
END $$;

-- ══════════════════════════════════════════════
-- CARE CIRCLE: Dual-access (owner OR caregiver)
-- ══════════════════════════════════════════════
DROP POLICY IF EXISTS care_circles_select ON care_circles;
DROP POLICY IF EXISTS care_circles_insert ON care_circles;
DROP POLICY IF EXISTS care_circles_update ON care_circles;
DROP POLICY IF EXISTS care_circles_delete ON care_circles;
CREATE POLICY care_circles_select ON care_circles FOR SELECT
  USING (owner_email = auth_email() OR caregiver_email = auth_email() OR is_admin());
CREATE POLICY care_circles_insert ON care_circles FOR INSERT
  WITH CHECK (owner_email = auth_email() OR is_admin());
CREATE POLICY care_circles_update ON care_circles FOR UPDATE
  USING (owner_email = auth_email() OR caregiver_email = auth_email() OR is_admin());
CREATE POLICY care_circles_delete ON care_circles FOR DELETE
  USING (owner_email = auth_email() OR is_admin());

DROP POLICY IF EXISTS ccm_select ON care_circle_messages;
DROP POLICY IF EXISTS ccm_insert ON care_circle_messages;
DROP POLICY IF EXISTS ccm_update ON care_circle_messages;
DROP POLICY IF EXISTS ccm_delete ON care_circle_messages;
CREATE POLICY ccm_select ON care_circle_messages FOR SELECT
  USING (owner_email = auth_email() OR caregiver_email = auth_email() OR is_admin());
CREATE POLICY ccm_insert ON care_circle_messages FOR INSERT
  WITH CHECK (sender_email = auth_email() OR is_admin());
CREATE POLICY ccm_update ON care_circle_messages FOR UPDATE
  USING (owner_email = auth_email() OR caregiver_email = auth_email() OR is_admin());
CREATE POLICY ccm_delete ON care_circle_messages FOR DELETE
  USING (owner_email = auth_email() OR is_admin());

-- ══════════════════════════════════════════════
-- ADMIN-ONLY TABLES
-- ══════════════════════════════════════════════
DROP POLICY IF EXISTS ff_select ON feature_flag_assignments;
DROP POLICY IF EXISTS ff_modify ON feature_flag_assignments;
CREATE POLICY ff_select ON feature_flag_assignments FOR SELECT USING (TRUE); -- all can read flags
CREATE POLICY ff_modify ON feature_flag_assignments FOR ALL USING (is_admin());

DROP POLICY IF EXISTS ads_select ON ads;
DROP POLICY IF EXISTS ads_modify ON ads;
CREATE POLICY ads_select ON ads FOR SELECT USING (is_active = TRUE OR is_admin());
CREATE POLICY ads_modify ON ads FOR ALL USING (is_admin());

DROP POLICY IF EXISTS roles_select ON roles;
DROP POLICY IF EXISTS roles_modify ON roles;
CREATE POLICY roles_select ON roles FOR SELECT USING (TRUE);
CREATE POLICY roles_modify ON roles FOR ALL USING (is_admin());

-- ══════════════════════════════════════════════
-- PUBLIC READ TABLES
-- ══════════════════════════════════════════════
DROP POLICY IF EXISTS sp_select ON subscription_packages;
DROP POLICY IF EXISTS sp_modify ON subscription_packages;
CREATE POLICY sp_select ON subscription_packages FOR SELECT USING (is_active = TRUE OR is_admin());
CREATE POLICY sp_modify ON subscription_packages FOR ALL USING (is_admin());

DROP POLICY IF EXISTS td_select ON telehealth_doctors;
DROP POLICY IF EXISTS td_modify ON telehealth_doctors;
CREATE POLICY td_select ON telehealth_doctors FOR SELECT USING (is_active = TRUE OR is_admin());
CREATE POLICY td_modify ON telehealth_doctors FOR ALL USING (is_admin());

-- =====================================================================
-- END: 002_rls_policies.sql
-- =====================================================================

-- =====================================================================
-- BEGIN: 003_indexes.sql
-- =====================================================================
-- HealthFlux Migration: 003_indexes.sql

-- Profiles
CREATE INDEX IF NOT EXISTS idx_profiles_created_by ON profiles(created_by);
CREATE INDEX IF NOT EXISTS idx_profiles_relationship ON profiles(relationship);

-- Vitals
CREATE INDEX IF NOT EXISTS idx_vitals_profile ON vital_measurements(profile_id);
CREATE INDEX IF NOT EXISTS idx_vitals_type ON vital_measurements(vital_type);
CREATE INDEX IF NOT EXISTS idx_vitals_measured ON vital_measurements(measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_vitals_profile_type ON vital_measurements(profile_id, vital_type, measured_at DESC);

-- Medications
CREATE INDEX IF NOT EXISTS idx_meds_profile ON medications(profile_id);
CREATE INDEX IF NOT EXISTS idx_meds_active ON medications(profile_id, is_active);

-- Medication Logs
CREATE INDEX IF NOT EXISTS idx_medlogs_profile ON medication_logs(profile_id);
CREATE INDEX IF NOT EXISTS idx_medlogs_med ON medication_logs(medication_id);
CREATE INDEX IF NOT EXISTS idx_medlogs_scheduled ON medication_logs(scheduled_time DESC);

-- Documents
CREATE INDEX IF NOT EXISTS idx_docs_profile ON medical_documents(profile_id);
CREATE INDEX IF NOT EXISTS idx_docs_type ON medical_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_docs_created ON medical_documents(created_date DESC);

-- Lab Results
CREATE INDEX IF NOT EXISTS idx_labs_profile ON lab_results(profile_id);
CREATE INDEX IF NOT EXISTS idx_labs_test ON lab_results(test_name);
CREATE INDEX IF NOT EXISTS idx_labs_date ON lab_results(test_date DESC);
CREATE INDEX IF NOT EXISTS idx_labs_flag ON lab_results(flag);

-- Health Insights
CREATE INDEX IF NOT EXISTS idx_insights_profile ON health_insights(profile_id);
CREATE INDEX IF NOT EXISTS idx_insights_type ON health_insights(insight_type);

-- Wellness Goals
CREATE INDEX IF NOT EXISTS idx_goals_profile ON wellness_goals(profile_id);
CREATE INDEX IF NOT EXISTS idx_goals_active ON wellness_goals(profile_id, is_active);

-- Meal Logs
CREATE INDEX IF NOT EXISTS idx_meals_profile ON meal_logs(profile_id);
CREATE INDEX IF NOT EXISTS idx_meals_date ON meal_logs(logged_date DESC);

-- Share Links
CREATE INDEX IF NOT EXISTS idx_shares_token ON share_links(token);
CREATE INDEX IF NOT EXISTS idx_shares_profile ON share_links(profile_id);

-- Care Circles
CREATE INDEX IF NOT EXISTS idx_cc_owner ON care_circles(owner_email);
CREATE INDEX IF NOT EXISTS idx_cc_caregiver ON care_circles(caregiver_email);
CREATE INDEX IF NOT EXISTS idx_ccm_circle ON care_circle_messages(care_circle_id);

-- Connected Devices
CREATE INDEX IF NOT EXISTS idx_devices_email ON connected_devices(user_email);
CREATE INDEX IF NOT EXISTS idx_devices_profile ON connected_devices(profile_id);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notif_email ON notifications(user_email);
CREATE INDEX IF NOT EXISTS idx_notif_read ON notifications(user_email, is_read);

-- Feature Flags
CREATE INDEX IF NOT EXISTS idx_ff_key ON feature_flag_assignments(flag_key);
CREATE INDEX IF NOT EXISTS idx_ff_scope ON feature_flag_assignments(scope_type, scope_id);

-- Subscriptions
CREATE INDEX IF NOT EXISTS idx_usub_email ON user_subscriptions(user_email);
CREATE INDEX IF NOT EXISTS idx_usub_status ON user_subscriptions(status);

-- Gamification
CREATE INDEX IF NOT EXISTS idx_gam_email ON gamification_profiles(user_email);

-- Audit
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_date DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);

-- =====================================================================
-- END: 003_indexes.sql
-- =====================================================================

-- =====================================================================
-- BEGIN: 004_seed_and_admin.sql
-- =====================================================================
-- HealthFlux Migration: 004_seed_and_admin.sql
-- Subscription plans, admin views, helper functions
-- Run AFTER 001, 002, 003
-- Safe to rerun: uses IF EXISTS/IF NOT EXISTS or UPSERT patterns.

-- Ensure subscription_packages has required columns even on older DBs.
ALTER TABLE IF EXISTS subscription_packages ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE IF EXISTS subscription_packages ADD COLUMN IF NOT EXISTS plan_key TEXT;
ALTER TABLE IF EXISTS subscription_packages ADD COLUMN IF NOT EXISTS price_monthly NUMERIC DEFAULT 0;
ALTER TABLE IF EXISTS subscription_packages ADD COLUMN IF NOT EXISTS price_yearly NUMERIC DEFAULT 0;
ALTER TABLE IF EXISTS subscription_packages ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR';
ALTER TABLE IF EXISTS subscription_packages ADD COLUMN IF NOT EXISTS ai_calls_per_month INTEGER DEFAULT 10;
ALTER TABLE IF EXISTS subscription_packages ADD COLUMN IF NOT EXISTS storage_gb NUMERIC DEFAULT 0.5;
ALTER TABLE IF EXISTS subscription_packages ADD COLUMN IF NOT EXISTS max_profiles INTEGER DEFAULT 1;
ALTER TABLE IF EXISTS subscription_packages ADD COLUMN IF NOT EXISTS max_documents INTEGER DEFAULT 10;
ALTER TABLE IF EXISTS subscription_packages ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '[]';
ALTER TABLE IF EXISTS subscription_packages ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

UPDATE subscription_packages
SET slug = COALESCE(slug, plan_key, LOWER(REPLACE(name, ' ', '_')))
WHERE slug IS NULL;

DO $$ BEGIN
  ALTER TABLE subscription_packages ALTER COLUMN slug SET NOT NULL;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'subscription_packages_slug_key'
      AND conrelid = 'subscription_packages'::regclass
  ) THEN
    ALTER TABLE subscription_packages ADD CONSTRAINT subscription_packages_slug_key UNIQUE (slug);
  END IF;
END $$;

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

-- =====================================================================
-- END: 004_seed_and_admin.sql
-- =====================================================================

-- =====================================================================
-- BEGIN: 005_fix_existing_db.sql
-- =====================================================================
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
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'subscription_packages_slug_key'
      AND conrelid = 'subscription_packages'::regclass
  ) THEN
    ALTER TABLE subscription_packages ADD CONSTRAINT subscription_packages_slug_key UNIQUE (slug);
  END IF;
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

-- =====================================================================
-- END: 005_fix_existing_db.sql
-- =====================================================================

-- =====================================================================
-- BEGIN: 006_family_isolation_and_language.sql
-- =====================================================================
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

-- Strict SELECT: Only see your own family profiles.
CREATE POLICY "profiles_select_strict"
  ON profiles FOR SELECT
  USING (created_by = auth.jwt() ->> 'email');

-- Strict INSERT: Can only create profiles under your own email
CREATE POLICY "profiles_insert_strict"
  ON profiles FOR INSERT
  WITH CHECK (created_by = auth.jwt() ->> 'email');

-- Strict UPDATE: Can only update your own profiles.
CREATE POLICY "profiles_update_strict"
  ON profiles FOR UPDATE
  USING (created_by = auth.jwt() ->> 'email');

-- Strict DELETE: Can only delete your own profiles.
CREATE POLICY "profiles_delete_strict"
  ON profiles FOR DELETE
  USING (created_by = auth.jwt() ->> 'email');

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
      'share_links', 'care_circles',
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
    EXECUTE format('DROP POLICY IF EXISTS "%s_select_strict" ON %I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%s_insert_strict" ON %I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%s_update_strict" ON %I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Users view own %s" ON %I', tbl, tbl);
    
    -- Create strict SELECT policy
    EXECUTE format(
      'CREATE POLICY "%s_select_strict" ON %I FOR SELECT USING (
        created_by = auth.jwt() ->> ''email''
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

-- =====================================================================
-- END: 006_family_isolation_and_language.sql
-- =====================================================================

-- =====================================================================
-- BEGIN: 007_fix_recursive_rls_policies.sql
-- =====================================================================
-- HealthFlux Migration: 007_fix_recursive_rls_policies.sql
-- Fixes recursive RLS policy checks that caused 500s on profiles queries.
-- Safe to rerun. Policies are dropped with IF EXISTS before recreation.

-- Profiles: strict ownership only (no self-referencing EXISTS)
DROP POLICY IF EXISTS "profiles_select_strict" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_strict" ON profiles;
DROP POLICY IF EXISTS "profiles_update_strict" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_strict" ON profiles;

CREATE POLICY "profiles_select_strict"
  ON profiles FOR SELECT
  USING (created_by = auth.jwt() ->> 'email');

CREATE POLICY "profiles_insert_strict"
  ON profiles FOR INSERT
  WITH CHECK (created_by = auth.jwt() ->> 'email');

CREATE POLICY "profiles_update_strict"
  ON profiles FOR UPDATE
  USING (created_by = auth.jwt() ->> 'email')
  WITH CHECK (created_by = auth.jwt() ->> 'email');

CREATE POLICY "profiles_delete_strict"
  ON profiles FOR DELETE
  USING (created_by = auth.jwt() ->> 'email');

-- All entity tables: strict ownership only
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'vital_measurements', 'medications', 'medication_logs',
      'medical_documents', 'lab_results', 'health_insights',
      'wellness_goals', 'goal_logs', 'meal_logs', 'nutrition_goals',
      'share_links', 'care_circles',
      'connected_devices', 'gamification_profiles',
      'drug_interactions', 'side_effects', 'medication_effectiveness',
      'refill_reminders', 'coach_messages', 'ai_health_reports',
      'ai_medical_imaging_results', 'skin_analyses',
      'personalized_diet_plans', 'notifications', 'user_preferences'
    ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%s_select_strict" ON %I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%s_insert_strict" ON %I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "%s_update_strict" ON %I', tbl, tbl);

    EXECUTE format(
      'CREATE POLICY "%s_select_strict" ON %I FOR SELECT USING (
        created_by = auth.jwt() ->> ''email''
      )', tbl, tbl
    );

    EXECUTE format(
      'CREATE POLICY "%s_insert_strict" ON %I FOR INSERT WITH CHECK (
        created_by = auth.jwt() ->> ''email''
      )', tbl, tbl
    );

    EXECUTE format(
      'CREATE POLICY "%s_update_strict" ON %I FOR UPDATE
       USING (created_by = auth.jwt() ->> ''email'')
       WITH CHECK (created_by = auth.jwt() ->> ''email'')', tbl, tbl
    );
  END LOOP;
END $$;

-- =====================================================================
-- END: 007_fix_recursive_rls_policies.sql
-- =====================================================================

-- =====================================================================
-- BEGIN: 008_storage_buckets_and_policies.sql
-- =====================================================================
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

-- =====================================================================
-- END: 008_storage_buckets_and_policies.sql
-- =====================================================================
