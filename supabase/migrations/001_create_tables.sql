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
  file_name TEXT,
  file_type TEXT,
  document_date DATE,
  facility_name TEXT,
  doctor_name TEXT,
  notes TEXT,
  ai_summary TEXT,
  ai_summary_detailed TEXT,
  key_findings JSONB DEFAULT '[]',
  action_items JSONB DEFAULT '[]',
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
