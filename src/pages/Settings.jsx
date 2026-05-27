// @ts-nocheck
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { AdaptiveOverlay } from '@/components/ui/adaptive-overlay';
import { Bell, Mail, Activity, Pill, Calendar, Sparkles, AlertTriangle, Trash2, ChevronRight, Loader2, Sun, Moon, Heart, Droplets, Footprints, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ConnectedDevicesSection from '@/components/ConnectedDevicesSection';
import { useActiveProfile } from '@/components/ActiveProfileContext';
import { useTheme } from '@/lib/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useFeatureFlags } from '@/lib/FeatureFlagsContext';

export default function Settings() {
  const { activeProfile } = useActiveProfile();
  const { hasFeature, loading: flagsLoading } = useFeatureFlags();
  const [deleteStep, setDeleteStep] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const queryClient = useQueryClient();
  const { isLight, toggleTheme } = useTheme();
  const { i18n } = useTranslation();

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    staleTime: 1000 * 60 * 5,
  });

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') return;
    setDeleting(true);
    try {
      const profile = await base44.auth.me();
      if (profile) {
        const profiles = await base44.entities.Profile.filter({ created_by: profile.email });
        for (const p of profiles) {
          const [vitals, meds, docs, labs, goals, logs, medLogs] = await Promise.all([
            base44.entities.VitalMeasurement.filter({ profile_id: p.id }),
            base44.entities.Medication.filter({ profile_id: p.id }),
            base44.entities.MedicalDocument.filter({ profile_id: p.id }),
            base44.entities.LabResult.filter({ profile_id: p.id }),
            base44.entities.WellnessGoal.filter({ profile_id: p.id }),
            base44.entities.GoalLog.filter({ profile_id: p.id }),
            base44.entities.MedicationLog.filter({ profile_id: p.id }),
          ]);
          await Promise.all([
            ...vitals.map(r => base44.entities.VitalMeasurement.delete(r.id)),
            ...meds.map(r => base44.entities.Medication.delete(r.id)),
            ...docs.map(r => base44.entities.MedicalDocument.delete(r.id)),
            ...labs.map(r => base44.entities.LabResult.delete(r.id)),
            ...goals.map(r => base44.entities.WellnessGoal.delete(r.id)),
            ...logs.map(r => base44.entities.GoalLog.delete(r.id)),
            ...medLogs.map(r => base44.entities.MedicationLog.delete(r.id)),
          ]);
          await base44.entities.Profile.delete(p.id);
        }
      }
      await base44.auth.logout();
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting(false);
      setDeleteStep(0);
    }
  };

  const resetDelete = () => { setDeleteStep(0); setDeleteConfirm(''); };

  const { data: preferences } = useQuery({
    queryKey: ['user-preferences', user?.email],
    queryFn: async () => {
      const prefs = await base44.entities.UserPreferences.filter({ user_email: user.email });
      return prefs.length > 0 ? prefs[0] : null;
    },
    enabled: !!user,
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: async (data) => {
      if (preferences) {
        return await base44.entities.UserPreferences.update(preferences.id, data);
      } else {
        return await base44.entities.UserPreferences.create({
          user_email: user.email,
          ...data,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['user-preferences']);
    },
  });

  const handleToggle = (setting) => {
    const emailNotificationsEnabled = !flagsLoading && hasFeature('notifications_email');
    const inAppNotificationsEnabled = !flagsLoading && hasFeature('notifications_inapp');
    const isEmailSetting = setting === 'email_enabled';
    if ((isEmailSetting && !emailNotificationsEnabled) || (!isEmailSetting && !inAppNotificationsEnabled)) {
      return;
    }
    const newNotifications = {
      ...preferences?.notifications,
      [setting]: !preferences?.notifications?.[setting],
    };
    updatePreferencesMutation.mutate({ notifications: newNotifications });
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  const defaultNotifications = {
    email_enabled: true,
    subscription_updates: true,
    health_alerts: true,
    medication_reminders: true,
    system_updates: true,
    feature_announcements: true,
  };

  const notifications = preferences?.notifications || defaultNotifications;
  const emailNotificationsEnabled = !flagsLoading && hasFeature('notifications_email');
  const inAppNotificationsEnabled = !flagsLoading && hasFeature('notifications_inapp');

  return (
    <div className="bento-page">
      <div className="bento-header">
        <h1 className="bento-title">Settings</h1>
        <p className="bento-subtitle">Account preferences</p>
      </div>

      {/* Account Info */}
      <Card className="border-0 card-shadow rounded-2xl sm:rounded-3xl mb-3 sm:mb-4">
        <CardHeader className="border-b border-[var(--hf-border)] p-3 sm:p-4">
          <CardTitle className="text-sm sm:text-base font-semibold text-[var(--hf-text)]">Account</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4">
          <div className="space-y-3 sm:space-y-4">
            <div>
              <p className="text-xs text-[var(--hf-text-muted)] mb-1">Email</p>
              <p className="font-semibold text-[var(--hf-text)] text-sm truncate">{user.email}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--hf-text-muted)] mb-1">Full Name</p>
              <p className="font-semibold text-[var(--hf-text)] text-sm truncate">{user.full_name || 'Not set'}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--hf-text-muted)] mb-1">Role</p>
              <p className="font-semibold text-[var(--hf-text)] capitalize text-sm">{user.role || 'user'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card className="border-0 card-shadow rounded-2xl sm:rounded-3xl">
        <CardHeader className="border-b border-[var(--hf-border)] p-3 sm:p-4">
          <CardTitle className="text-sm sm:text-base font-semibold text-[var(--hf-text)] flex items-center gap-2">
            <Bell className="w-4 sm:w-5 h-4 sm:h-5" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4">
          {!emailNotificationsEnabled && !inAppNotificationsEnabled && (
            <div className="p-3 sm:p-4 rounded-2xl text-xs" style={{ background: 'var(--hf-surface-2)', color: 'var(--hf-text-muted)' }}>
              Notifications are currently disabled for your account.
            </div>
          )}
          <div className="space-y-2 sm:space-y-3">
            {emailNotificationsEnabled && (
            <div className="flex items-center justify-between p-3 sm:p-4 bg-[var(--hf-surface-2)] rounded-2xl">
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <Mail className="w-4 sm:w-5 h-4 sm:h-5 text-blue-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <Label className="font-semibold text-[var(--hf-text)] text-sm">Email</Label>
                  <p className="text-xs text-[var(--hf-muted)] hidden sm:block">Receive via email</p>
                </div>
              </div>
              <Switch 
                checked={notifications.email_enabled}
                onCheckedChange={() => handleToggle('email_enabled')}
                className="flex-shrink-0"
              />
            </div>
            )}

            {inAppNotificationsEnabled && (
            <>
            <div className="flex items-center justify-between p-3 sm:p-4 bg-[var(--hf-surface-2)] rounded-2xl">
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <Activity className="w-4 sm:w-5 h-4 sm:h-5 text-green-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <Label className="font-semibold text-[var(--hf-text)] text-sm">Health Alerts</Label>
                  <p className="text-xs text-[var(--hf-muted)] hidden sm:block">Critical notifications</p>
                </div>
              </div>
              <Switch 
                checked={notifications.health_alerts}
                onCheckedChange={() => handleToggle('health_alerts')}
                className="flex-shrink-0"
              />
            </div>

            <div className="flex items-center justify-between p-3 sm:p-4 bg-[var(--hf-surface-2)] rounded-2xl">
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <Pill className="w-4 sm:w-5 h-4 sm:h-5 text-purple-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <Label className="font-semibold text-[var(--hf-text)] text-sm">Med Reminders</Label>
                  <p className="text-xs text-[var(--hf-muted)] hidden sm:block">Take meds on time</p>
                </div>
              </div>
              <Switch 
                checked={notifications.medication_reminders}
                onCheckedChange={() => handleToggle('medication_reminders')}
                className="flex-shrink-0"
              />
            </div>

            <div className="flex items-center justify-between p-3 sm:p-4 bg-[var(--hf-surface-2)] rounded-2xl">
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <Calendar className="w-4 sm:w-5 h-4 sm:h-5 text-orange-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <Label className="font-semibold text-[var(--hf-text)] text-sm">Subscription</Label>
                  <p className="text-xs text-[var(--hf-muted)] hidden sm:block">Billing info</p>
                </div>
              </div>
              <Switch 
                checked={notifications.subscription_updates}
                onCheckedChange={() => handleToggle('subscription_updates')}
                className="flex-shrink-0"
              />
            </div>

            <div className="flex items-center justify-between p-3 sm:p-4 bg-[var(--hf-surface-2)] rounded-2xl">
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <Sparkles className="w-4 sm:w-5 h-4 sm:h-5 text-pink-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <Label className="font-semibold text-[var(--hf-text)] text-sm">Features</Label>
                  <p className="text-xs text-[var(--hf-muted)] hidden sm:block">New updates</p>
                </div>
              </div>
              <Switch 
                checked={notifications.feature_announcements}
                onCheckedChange={() => handleToggle('feature_announcements')}
                className="flex-shrink-0"
              />
            </div>

            <div className="flex items-center justify-between p-3 sm:p-4 bg-[var(--hf-surface-2)] rounded-2xl">
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <Bell className="w-4 sm:w-5 h-4 sm:h-5 text-slate-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <Label className="font-semibold text-[var(--hf-text)] text-sm">System</Label>
                  <p className="text-xs text-[var(--hf-muted)] hidden sm:block">Maintenance news</p>
                </div>
              </div>
              <Switch 
                checked={notifications.system_updates}
                onCheckedChange={() => handleToggle('system_updates')}
                className="flex-shrink-0"
              />
            </div>
            </>
            )}
          </div>
        </CardContent>
      </Card>
      {/* Theme */}
      <Card className="border-0 card-shadow rounded-2xl sm:rounded-3xl mt-3">
        <CardHeader className="border-b border-[var(--hf-border)] p-3 sm:p-4">
          <CardTitle className="text-sm sm:text-base font-semibold text-[var(--hf-text)] flex items-center gap-2">
            {isLight ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />} Appearance
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4">
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Light', icon: <Sun size={16} />, action: () => !isLight && toggleTheme(), active: isLight },
              { label: 'Dark', icon: <Moon size={16} />, action: () => isLight && toggleTheme(), active: !isLight },
            ].map(opt => (
              <button key={opt.label} onClick={opt.action}
                className="flex items-center justify-center gap-2 h-11 rounded-2xl text-sm font-bold transition-all active:scale-95"
                style={{
                  background: opt.active ? 'var(--hf-lemon)' : 'var(--hf-surface-2)',
                  color: opt.active ? '#0a1200' : 'var(--hf-text-muted)',
                  border: opt.active ? 'none' : '1px solid var(--hf-border)',
                }}>
                {opt.icon} {opt.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Health Goals */}
      <Card className="border-0 card-shadow rounded-2xl sm:rounded-3xl mt-3">
        <CardHeader className="border-b border-[var(--hf-border)] p-3 sm:p-4">
          <CardTitle className="text-sm sm:text-base font-semibold text-[var(--hf-text)] flex items-center gap-2">
            <Heart className="w-4 h-4 text-red-400" /> Health Goals
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 space-y-3">
          {[
            { key: 'step_goal', label: 'Daily Steps Goal', icon: <Footprints size={15} className="text-green-400" />, placeholder: '10000', type: 'number' },
            { key: 'water_goal_ml', label: 'Daily Water (ml)', icon: <Droplets size={15} className="text-blue-400" />, placeholder: '2500', type: 'number' },
            { key: 'sleep_goal_hours', label: 'Sleep Goal (hours)', icon: <Moon size={15} className="text-purple-400" />, placeholder: '8', type: 'number' },
            { key: 'hr_alert_max', label: 'HR Alert (bpm max)', icon: <Heart size={15} className="text-red-400" />, placeholder: '100', type: 'number' },
          ].map(field => {
            const val = preferences?.health_goals?.[field.key] || '';
            return (
              <div key={field.key} className="flex items-center justify-between gap-3 p-3 rounded-2xl" style={{ background: 'var(--hf-surface-2)' }}>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {field.icon}
                  <Label className="text-xs font-semibold truncate" style={{ color: 'var(--hf-text)' }}>{field.label}</Label>
                </div>
                <input type={field.type} defaultValue={val} placeholder={field.placeholder}
                  onBlur={e => {
                    const newGoals = { ...(preferences?.health_goals || {}), [field.key]: +e.target.value };
                    updatePreferencesMutation.mutate({ health_goals: newGoals });
                  }}
                  className="w-20 h-8 px-2 rounded-xl text-xs font-bold text-right outline-none"
                  style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }} />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Language / Region */}
      <Card className="border-0 card-shadow rounded-2xl sm:rounded-3xl mt-3">
        <CardHeader className="border-b border-[var(--hf-border)] p-3 sm:p-4">
          <CardTitle className="text-sm sm:text-base font-semibold text-[var(--hf-text)] flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-400" /> Language & Region
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 space-y-3">
          {[
            { key: 'units', label: 'Measurement Units', options: ['metric', 'imperial'], default: 'metric' },
            { key: 'language', label: 'Language', options: ['en', 'hi', 'te', 'tinglish'], labels: ['English', 'हिंदी', 'తెలుగు', 'Tinglish'], default: 'en' },
          ].map(field => {
            const val = preferences?.regional?.[field.key] || field.default;
            return (
              <div key={field.key} className="flex items-center justify-between gap-3 p-3 rounded-2xl" style={{ background: 'var(--hf-surface-2)' }}>
                <Label className="text-xs font-semibold" style={{ color: 'var(--hf-text)' }}>{field.label}</Label>
                <select value={val}
                  onChange={e => {
                    const nextValue = e.target.value;
                    const newRegional = { ...(preferences?.regional || {}), [field.key]: nextValue };
                    updatePreferencesMutation.mutate({ regional: newRegional });
                    if (field.key === 'language') {
                      i18n.changeLanguage(nextValue);
                      localStorage.setItem('hf_lang', nextValue);
                      if (activeProfile?.id) {
                        base44.entities.Profile.update(activeProfile.id, { preferred_language: nextValue }).catch(() => {});
                      }
                    }
                  }}
                  className="h-8 px-2 rounded-xl text-xs font-bold outline-none"
                  style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }}>
                  {field.options.map((o, i) => (
                    <option key={o} value={o}>{field.labels ? field.labels[i] : o.charAt(0).toUpperCase() + o.slice(1)}</option>
                  ))}
                </select>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Connected Devices */}
      <ConnectedDevicesSection profileId={activeProfile?.id} />

      {/* Danger Zone */}
      <Card className="rounded-2xl sm:rounded-3xl mt-4" style={{ background: 'rgba(242,140,140,0.06)', border: '1px solid rgba(242,140,140,0.25)' }}>
        <CardHeader className="p-4">
          <CardTitle className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--hf-coral-strong)' }}>
            <AlertTriangle className="w-4 h-4" /> Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <p className="text-xs mb-4 leading-relaxed" style={{ color: 'var(--hf-text-muted)' }}>
            Account deletion is permanent and irreversible. All health data, profiles, documents, and records will be erased immediately.
          </p>
          <button
            onClick={() => setDeleteStep(1)}
            className="w-full h-12 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
            style={{ background: 'rgba(242,140,140,0.1)', border: '1px solid rgba(242,140,140,0.3)', color: 'var(--hf-coral-strong)' }}>
            <Trash2 className="w-4 h-4" /> Delete My Account
          </button>
        </CardContent>
      </Card>

      {/* ── Multi-step Delete Dialog ── */}
      <AdaptiveOverlay open={deleteStep > 0} onOpenChange={v => { if (!v) resetDelete(); }} title="Delete Account" size="sm" showClose>

          <AnimatePresence mode="wait">

            {/* Step 1: Warning & data list */}
            {deleteStep === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(242,140,140,0.15)' }}>
                    <AlertTriangle size={20} style={{ color: 'var(--hf-coral-strong)' }} />
                  </div>
                  <div>
                    <h3 className="text-base font-black" style={{ color: 'var(--hf-text)' }}>Delete Account?</h3>
                    <p className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>This cannot be undone</p>
                  </div>
                </div>

                <div className="rounded-2xl p-4 space-y-2" style={{ background: 'rgba(242,140,140,0.06)', border: '1px solid rgba(242,140,140,0.2)' }}>
                  <p className="text-[11px] font-black uppercase tracking-widest mb-2.5" style={{ color: 'var(--hf-coral-strong)' }}>What will be permanently deleted:</p>
                  {[
                    '🩺 All health profiles & family members',
                    '❤️ All vitals & measurements',
                    '🔬 All lab results',
                    '💊 All medications & dose logs',
                    '📄 All uploaded medical documents',
                    '🎯 All wellness goals & activity logs',
                    '👥 All care circle connections',
                    '🤖 All AI health reports & insights',
                  ].map(item => (
                    <p key={item} className="text-xs flex items-center gap-2" style={{ color: 'var(--hf-text-muted)' }}>{item}</p>
                  ))}
                </div>

                <p className="text-xs leading-relaxed p-3 rounded-xl" style={{ background: 'rgba(247,201,163,0.1)', border: '1px solid rgba(247,201,163,0.25)', color: 'var(--hf-peach-strong)' }}>
                  ⚠️ If you have an active subscription, cancel it separately — account deletion does not cancel billing.
                </p>

                <div className="flex gap-3">
                  <button onClick={resetDelete}
                    className="flex-1 h-11 rounded-2xl text-sm font-bold"
                    style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)', color: 'var(--hf-text-muted)' }}>
                    Keep Account
                  </button>
                  <button onClick={() => setDeleteStep(2)}
                    className="flex-1 h-11 rounded-2xl text-sm font-bold flex items-center justify-center gap-2"
                    style={{ background: 'rgba(242,140,140,0.15)', border: '1px solid rgba(242,140,140,0.35)', color: 'var(--hf-coral-strong)' }}>
                    Continue <ChevronRight size={15} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Type DELETE to confirm */}
            {deleteStep === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-5 space-y-4">
                <div className="text-center py-2">
                  <p className="text-3xl mb-2">🗑️</p>
                  <h3 className="text-base font-black" style={{ color: 'var(--hf-text)' }}>Final Confirmation</h3>
                  <p className="text-xs mt-1" style={{ color: 'var(--hf-text-muted)' }}>
                    Type <span className="font-black" style={{ color: 'var(--hf-coral-strong)' }}>DELETE</span> in capitals to confirm permanent deletion
                  </p>
                </div>

                <input
                  type="text"
                  value={deleteConfirm}
                  onChange={e => setDeleteConfirm(e.target.value)}
                  placeholder="Type DELETE here"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  className="w-full h-12 px-4 rounded-2xl text-sm text-center font-bold outline-none"
                  style={{
                    background: 'var(--hf-surface-2)',
                    border: `1.5px solid ${deleteConfirm === 'DELETE' ? '#f28c8c' : 'var(--hf-border)'}`,
                    color: deleteConfirm === 'DELETE' ? '#f28c8c' : 'var(--hf-text)',
                  }}
                />

                <div className="flex gap-3">
                  <button onClick={() => setDeleteStep(1)}
                    className="flex-1 h-11 rounded-2xl text-sm font-bold"
                    style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)', color: 'var(--hf-text-muted)' }}>
                    Back
                  </button>
                  <button
                    disabled={deleteConfirm !== 'DELETE' || deleting}
                    onClick={handleDeleteAccount}
                    className="flex-1 h-11 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40"
                    style={{ background: '#f28c8c', color: '#3d0000' }}>
                    {deleting ? <><Loader2 size={14} className="animate-spin" /> Deleting…</> : 'Delete Forever'}
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
      </AdaptiveOverlay>
    </div>
  );
}
