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
