import React, { useEffect, useState, useCallback } from 'react';
import Haptics from './components/utils/haptics';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from './utils';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useBottomSheet } from '@/lib/BottomSheetContext';
import { ActiveProfileProvider, useActiveProfile } from './components/ActiveProfileContext';
import I18nProvider from './components/i18n/I18nProvider';
import { FeatureFlagsProvider } from './lib/FeatureFlagsContext';
import { ThemeProvider, useTheme } from './lib/ThemeContext';
import FeatureUnlockedBanner from './components/FeatureUnlockedBanner';
import { FABActionProvider, useFABDispatch } from './lib/FABContext';
import QuickAddFAB from './components/dashboard/QuickAddFAB';
import FluxAssistant from './components/FluxAssistant';
import {
  LayoutDashboard, Activity, Bot,
  Settings, Shield, LogOut, Check, Plus,
  Stethoscope, Leaf, User, ChevronLeft, Sun, Moon, ChevronDown,
  Zap
} from 'lucide-react';
import { Drawer } from 'vaul';

import { getRouteById } from '@/lib/routes';
import { WidgetCustomizer, loadWidgets, saveWidgets } from '@/components/dashboard/WidgetCustomizer';

// Onboarding gate — redirect users who haven't completed onboarding
function useOnboardingGate() {
  const [checked, setChecked] = React.useState(false);
  const [needsOnboarding, setNeedsOnboarding] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      try {
        const profiles = await base44.entities.Profile.list('-created_date', 1);
        const arr = Array.isArray(profiles) ? profiles : [];
        if (arr.length === 0 || !arr[0]?.onboarding_completed) {
          setNeedsOnboarding(true);
        }
      } catch {
        setNeedsOnboarding(true);
      }
      setChecked(true);
    })();
  }, []);

  return { checked, needsOnboarding };
}

const NO_LAYOUT_PAGES = ['Onboarding', 'AdminLogin', 'Landing', 'MarketingHome', 'Platform', 'Solutions', 'TrustCenter', 'Pricing', 'DevDocs', 'Terms', 'Privacy', 'Cookies'];
const ADMIN_PAGES = [
  'AdminDashboard', 'AdminUsers', 'AdminRoles', 'AdminPackages',
  'AdminNotifications', 'AdminFeatureFlags', 'AdminAnalytics',
  'AdminAIOps', 'AdminAds', 'AdminIntegrations',
  'AdminDocuments', 'AdminVitals', 'AdminInsights', 'AdminMedications',
  'AdminProfiles', 'AdminAssistant', 'AdminSubscriptions', 'AdminTelehealth',
];
const ONBOARDING_EXEMPT = [...NO_LAYOUT_PAGES, ...ADMIN_PAGES, 'PublicShare'];

// ── Global quick-nav chips (shown on all user pages) ──
const GLOBAL_CHIPS = [
  { label: 'Vitals',     page: 'Vitals',        emoji: '💓', chipClass: 'hf-chip-lavender' },
  { label: 'Meds',       page: 'Medications',   emoji: '💊', chipClass: 'hf-chip-peach' },
  { label: 'Records',    page: 'Documents',     emoji: '📋', chipClass: 'hf-chip-sky' },
  { label: 'Insights',   page: 'Insights',      emoji: '✨', chipClass: 'hf-chip-lemon' },
  { label: 'Trends',     page: 'Trends',        emoji: '📈', chipClass: 'hf-chip-mint' },
  { label: 'Labs',       page: 'LabResults',    emoji: '🧪', chipClass: 'hf-chip-coral' },
  { label: 'Goals',      page: 'WellnessGoals', emoji: '🎯', chipClass: 'hf-chip-rose' },
  { label: 'Care',       page: 'CareHub',       emoji: '🩺', chipClass: 'hf-chip-peach' },
  { label: 'Nutrition',  page: 'Nutrition',     emoji: '🥗', chipClass: 'hf-chip-mint' },
];

function GlobalChipsBar({ onFluxOpen }) {
  return (
    <div
      className="flex gap-1.5 overflow-x-auto scrollbar-hide px-3"
      style={{
        scrollbarWidth: 'none',
        paddingTop: '6px',
        paddingBottom: '6px',
        flexShrink: 0,
        alignItems: 'center',
      }}
    >
      {GLOBAL_CHIPS.map(({ label, page, emoji, chipClass }) => (
        <Link key={page} to={createPageUrl(page)}
          className={`flex-shrink-0 hf-chip ${chipClass} text-xs`}
          style={{ minHeight: 32, padding: '0.3rem 0.75rem', fontSize: '0.7rem' }}>
          <span className="hf-chip-emoji" style={{ width: '1.1rem', height: '1.1rem', fontSize: '0.75rem' }}>{emoji}</span>
          {label}
        </Link>
      ))}
    </div>
  );
}
const NO_FAB_PAGES = ['PublicShare', 'Demo', 'Home', 'Nutrition'];

// Emoji-prefixed nav matching Admin Dashboard style
const navItems = [
  { name: '🏠 Home',     page: 'Dashboard',   icon: LayoutDashboard, color: '#d7f576', tc: '#0a1200' },
  { name: '❤️ Health',   page: 'HealthHub',   icon: Activity,        color: '#9bb4ff', tc: '#0a1240' },
  { name: '⚡ Flux AI',  page: 'AIHub',       icon: Zap,             color: '#c9bbff', tc: '#1a0a40' },
  { name: '🌿 Wellness', page: 'WellnessHub', icon: Leaf,            color: '#a8e6cf', tc: '#003d20' },
  { name: '🩺 Care',     page: 'CareHub',     icon: Stethoscope,     color: '#f7c9a3', tc: '#3d1a00' },
];

const extraItems = [
  { name: '👤 Account', page: 'AccountHub', icon: User, color: '#9bb4ff', tc: '#0a1240' },
];

// ── Shared ProfileRow ──
function ProfileRow({ profile, activeProfileId, onSelect }) {
  const isActive = activeProfileId === profile.id;
  const isSelf = profile.relationship === 'self';
  return (
    <button
      onClick={() => onSelect(profile.id)}
      className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all active:scale-[0.98]"
      style={{
        background: isActive ? (isSelf ? 'rgba(215,245,118,0.15)' : 'rgba(201,187,255,0.15)') : 'transparent',
        border: isActive ? `1.5px solid ${isSelf ? '#d7f576' : '#c9bbff'}` : '1px solid transparent',
      }}>
      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
        style={{ background: isSelf ? '#d7f576' : '#c9bbff', color: isSelf ? '#0a1200' : '#1a0a40' }}>
        {profile.full_name?.[0]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: 'var(--hf-text)' }}>{profile.full_name}</p>
        <p className="text-xs capitalize" style={{ color: 'var(--hf-text-muted)' }}>
          {isSelf ? 'Main account' : profile.relationship}
        </p>
      </div>
      {isActive && <Check size={14} className="flex-shrink-0" style={{ color: isSelf ? '#d7f576' : '#c9bbff' }} />}
    </button>
  );
}

// ── Mobile: Profile bottom sheet ──
function ProfileBottomSheet({ open, onOpenChange, widgets, setWidgets }) {
  const { activeProfileId, setActiveProfileId, allProfiles, user } = useActiveProfile();
  const selfProfile = allProfiles.find(p => p.relationship === 'self');
  const familyProfiles = allProfiles.filter(p => p.relationship !== 'self');
  const { isLight, toggleTheme } = useTheme();

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/60 z-[100]" />
        <Drawer.Content
          className="fixed bottom-0 left-0 right-0 z-[110] rounded-t-3xl flex flex-col"
          style={{ backgroundColor: 'var(--hf-surface)', maxHeight: '85dvh', border: '1px solid var(--hf-border)', borderBottom: 'none' }}>
          <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
            <div className="w-10 h-1.5 rounded-full" style={{ background: 'var(--hf-border-strong)' }} />
          </div>
          <div className="px-5 py-3 flex-shrink-0 border-b flex items-center justify-between" style={{ borderColor: 'var(--hf-border)' }}>
            <div>
              <p className="text-base font-bold" style={{ color: 'var(--hf-text)' }}>Switch Profile</p>
              <p className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>{user?.email}</p>
            </div>
            <div onClick={() => onOpenChange(false)}>
              <WidgetCustomizer widgets={widgets} onChange={setWidgets} />
            </div>
          </div>
          <div className="overflow-y-auto flex-1 px-4 py-3 space-y-3 pb-10">
            {selfProfile && (
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest mb-2 px-1" style={{ color: 'var(--hf-text-muted)' }}>You</p>
                <ProfileRow profile={selfProfile} activeProfileId={activeProfileId}
                  onSelect={(id) => { setActiveProfileId(id); onOpenChange(false); }} />
              </div>
            )}
            {familyProfiles.length > 0 && (
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest mb-2 px-1" style={{ color: 'var(--hf-text-muted)' }}>Family & Caregivers</p>
                <div className="space-y-1">
                  {familyProfiles.map(p => (
                    <ProfileRow key={p.id} profile={p} activeProfileId={activeProfileId}
                      onSelect={(id) => { setActiveProfileId(id); onOpenChange(false); }} />
                  ))}
                </div>
              </div>
            )}
            <div className="pt-1">
              <Link to={createPageUrl('Profiles')} onClick={() => onOpenChange(false)}
                className="flex items-center gap-3 p-3 rounded-2xl"
                style={{ background: 'rgba(215,245,118,0.08)', border: '1px dashed rgba(215,245,118,0.3)' }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(215,245,118,0.15)' }}>
                  <Plus size={14} style={{ color: '#d7f576' }} />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#d7f576' }}>Add Family Member</p>
                  <p className="text-xs" style={{ color: 'var(--hf-text-muted)' }}>Manage all profiles</p>
                </div>
              </Link>
            </div>
            <div className="pt-2 border-t space-y-1" style={{ borderColor: 'var(--hf-border)' }}>
              <button onClick={() => { toggleTheme(); Haptics.light(); }}
                className="w-full flex items-center gap-3 p-3 rounded-xl text-left"
                style={{ color: 'var(--hf-text-muted)' }}>
                {isLight ? <Moon size={16} /> : <Sun size={16} style={{ color: '#d7f576' }} />}
                <span className="text-sm font-semibold">{isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}</span>
              </button>
              <Link to={createPageUrl('AccountHub')} onClick={() => onOpenChange(false)}
                className="flex items-center gap-3 p-3 rounded-xl"
                style={{ color: 'var(--hf-text-muted)' }}>
                <User size={16} />
                <span className="text-sm font-semibold">Account</span>
              </Link>
              <Link to={createPageUrl('Settings')} onClick={() => onOpenChange(false)}
                className="flex items-center gap-3 p-3 rounded-xl"
                style={{ color: 'var(--hf-text-muted)' }}>
                <Settings size={16} />
                <span className="text-sm font-semibold">Settings</span>
              </Link>
              {user?.role === 'admin' && (
                <Link to={createPageUrl('AdminDashboard')} onClick={() => onOpenChange(false)}
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ color: 'var(--hf-text-muted)' }}>
                  <Shield size={16} />
                  <span className="text-sm font-semibold">Admin Dashboard</span>
                </Link>
              )}
              <button onClick={() => { base44.auth.logout(); onOpenChange(false); }}
                className="w-full flex items-center gap-3 p-3 rounded-xl text-left text-red-400">
                <LogOut size={16} />
                <span className="text-sm font-semibold">Sign Out</span>
              </button>
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

// ── Desktop: Profile dropdown ──
function ProfileDropdown({ user, displayName, isMainUser, sidebarMode = false, widgets, setWidgets }) {
  const { activeProfileId, setActiveProfileId, allProfiles } = useActiveProfile();
  const { isLight, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const selfProfile = allProfiles.find(p => p.relationship === 'self');
  const familyProfiles = allProfiles.filter(p => p.relationship !== 'self');

  return (
    <div className={`relative ${sidebarMode ? 'w-full' : ''}`}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-2xl transition-all hover:opacity-80 ${sidebarMode ? 'w-full' : ''}`}
        style={{ background: sidebarMode ? 'rgba(255,255,255,0.06)' : 'var(--hf-surface-2)', border: sidebarMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid var(--hf-border)' }}>
        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-black"
          style={{ background: isMainUser ? '#d7f576' : '#c9bbff', color: isMainUser ? '#0a1200' : '#1a0a40' }}>
          {displayName[0]}
        </div>
        <span className="text-xs font-bold max-w-[120px] truncate" style={{ color: 'var(--hf-text)' }}>{displayName}</span>
        <ChevronDown size={12} style={{ color: 'var(--hf-text-muted)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[48]" onClick={() => setOpen(false)} />
          <div className={`absolute z-[49] rounded-2xl shadow-2xl w-64 overflow-hidden ${sidebarMode ? 'bottom-full mb-2 left-0' : 'right-0 top-full mt-2'}`}
            style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
            <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--hf-border)' }}>
              <p className="text-xs font-bold" style={{ color: 'var(--hf-text)' }}>{user?.full_name}</p>
              <p className="text-[10px]" style={{ color: 'var(--hf-text-muted)' }}>{user?.email}</p>
            </div>
            <div className="p-2 max-h-64 overflow-y-auto">
              {selfProfile && (
                <>
                  <p className="text-[9px] font-black uppercase tracking-widest px-2 py-1" style={{ color: 'var(--hf-text-muted)' }}>You</p>
                  <ProfileRow profile={selfProfile} activeProfileId={activeProfileId}
                    onSelect={(id) => { setActiveProfileId(id); setOpen(false); }} />
                </>
              )}
              {familyProfiles.length > 0 && (
                <>
                  <p className="text-[9px] font-black uppercase tracking-widest px-2 pt-2 pb-1" style={{ color: 'var(--hf-text-muted)' }}>Family</p>
                  {familyProfiles.map(p => (
                    <ProfileRow key={p.id} profile={p} activeProfileId={activeProfileId}
                      onSelect={(id) => { setActiveProfileId(id); setOpen(false); }} />
                  ))}
                </>
              )}
              <Link to={createPageUrl('Profiles')} onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-2.5 py-2 rounded-xl mt-1 transition-all hover:opacity-80"
                style={{ background: 'rgba(215,245,118,0.08)', border: '1px dashed rgba(215,245,118,0.25)' }}>
                <Plus size={13} style={{ color: '#d7f576' }} />
                <span className="text-xs font-semibold" style={{ color: '#d7f576' }}>Add Family Member</span>
              </Link>
            </div>
            <div className="border-t p-2 space-y-0.5" style={{ borderColor: 'var(--hf-border)' }}>
              {widgets && setWidgets && (
                <div className="px-1" onClick={() => setOpen(false)}>
                  <WidgetCustomizer widgets={widgets} onChange={(w) => { setWidgets(w); saveWidgets(w); }} />
                </div>
              )}
              <button onClick={() => { toggleTheme(); setOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-80"
                style={{ color: 'var(--hf-text-muted)' }}>
                {isLight ? <Moon size={14} /> : <Sun size={14} style={{ color: '#d7f576' }} />}
                {isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
              </button>
              <Link to={createPageUrl('AccountHub')} onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold"
                style={{ color: 'var(--hf-text-muted)' }}>
                <Settings size={14} /> Settings
              </Link>
              {user?.role === 'admin' && (
                <Link to={createPageUrl('AdminDashboard')} onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold"
                  style={{ color: 'var(--hf-text-muted)' }}>
                  <Shield size={14} /> Admin Dashboard
                </Link>
              )}
              <button onClick={() => base44.auth.logout()}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-400">
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const ROOT_PAGES = ['Dashboard', 'HealthHub', 'AIHub', 'WellnessHub', 'CareHub', 'AccountHub'];
const pageVariants = {
  initial: { x: '100%', opacity: 0 },
  animate: { x: 0, opacity: 1, transition: { duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit: { x: '-40%', opacity: 0, transition: { duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] } },
};

const SIDEBAR_WIDTH = '15rem';

function UserLayout({ children, currentPageName }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const { isLight, toggleTheme } = useTheme();
  const isRootPage = ROOT_PAGES.includes(currentPageName);

  const [widgets, setWidgets] = React.useState(() => loadWidgets());
  const [visitedRoots, setVisitedRoots] = useState(() => new Set([currentPageName]));
  useEffect(() => {
    if (ROOT_PAGES.includes(currentPageName)) {
      setVisitedRoots(prev => { const s = new Set(prev); s.add(currentPageName); return s; });
    }
  }, [currentPageName]);

  // Global haptics on typing
  useEffect(() => {
    const handler = (e) => {
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') Haptics.typing();
    };
    document.addEventListener('keydown', handler, { passive: true });
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const [profileSheetOpen, setProfileSheetOpen] = useState(false);
  const [fluxOpen, setFluxOpen] = useState(false);
  const { anySheetOpen } = useBottomSheet();
  const { activeProfile } = useActiveProfile();
  const { dispatch: fabDispatch } = useFABDispatch();
  const mobileChromeHidden = anySheetOpen || profileSheetOpen || fluxOpen;

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const handleGlobalFABAction = useCallback((key, extra) => {
    const handled = fabDispatch(key, extra);
    if (handled) return;
    switch (key) {
      case 'vital':     navigate(createPageUrl('Vitals'));       break;
      case 'med':       navigate(createPageUrl('Medications'));  break;
      case 'lab':       navigate(createPageUrl('LabResults'));   break;
      case 'upload':
      case 'file':
      case 'gallery':
      case 'scan':
      case 'multisnap': navigate(createPageUrl('Documents'));    break;
      case 'chat':      setFluxOpen(true);                       break;
      default: break;
    }
  }, [fabDispatch, navigate]);

  const isActive = (page) => currentPageName === page;
  const displayName = activeProfile?.full_name || user?.full_name || 'U';
  const isMainUser = !activeProfile || activeProfile.relationship === 'self';
  const allNavItems = [...navItems, ...extraItems];

  return (
    <div className="bg-[var(--hf-bg)] text-[var(--hf-text)]" style={{ minHeight: '100dvh' }}>

      {/* ── Mobile top bar: profile + back + flux button + chips all inline ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40"
        style={{ background: 'var(--hf-bg)', borderBottom: '1px solid var(--hf-border)' }}>
        {/* Row 1: profile + flux */}
        <div className="flex items-center justify-between px-3"
          style={{ paddingTop: 'calc(10px + env(safe-area-inset-top, 0px))', paddingBottom: '8px' }}>
          <div className="flex items-center gap-2">
            {!isRootPage && (
              <button onClick={() => navigate(-1)} aria-label="Go back"
                className="flex items-center justify-center w-8 h-8 rounded-full active:scale-90 transition-transform"
                style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
                <ChevronLeft size={16} style={{ color: 'var(--hf-text)' }} />
              </button>
            )}
            <button onClick={() => setProfileSheetOpen(true)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-2xl active:scale-90 transition-transform"
              style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
              <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-black"
                style={{ background: isMainUser ? '#d7f576' : '#c9bbff', color: isMainUser ? '#0a1200' : '#1a0a40' }}>
                {displayName[0]}
              </div>
              <span className="text-xs font-bold max-w-[90px] truncate" style={{ color: 'var(--hf-text)' }}>{displayName}</span>
              <ChevronDown size={11} style={{ color: 'var(--hf-text-muted)', flexShrink: 0 }} />
            </button>
          </div>
          <button onClick={() => { Haptics.medium(); setFluxOpen(true); }} aria-label="Open Flux Assistant"
            className="flex items-center gap-1.5 pl-2.5 pr-3 py-1.5 rounded-2xl active:scale-90 transition-transform"
            style={{ background: '#d7f576', border: '1px solid rgba(215,245,118,0.5)', boxShadow: '0 4px 12px rgba(215,245,118,0.3)' }}>
            <Bot size={14} style={{ color: '#0a1200' }} />
            <span className="text-[11px] font-black" style={{ color: '#0a1200' }}>Flux</span>
          </button>
        </div>
        {/* Row 2: chips */}
        <GlobalChipsBar onFluxOpen={() => setFluxOpen(true)} />
      </div>

      {/* Mobile profile bottom sheet */}
      <ProfileBottomSheet open={profileSheetOpen} onOpenChange={setProfileSheetOpen}
        widgets={widgets} setWidgets={(w) => { setWidgets(w); saveWidgets(w); }} />

      {/* ── Flux Assistant full-screen overlay ── */}
      <AnimatePresence>
        {fluxOpen && <FluxAssistant open={fluxOpen} onClose={() => setFluxOpen(false)} />}
      </AnimatePresence>

      {/* ── Desktop Sidebar — Admin Dashboard style ── */}
      <aside
        className="hidden md:flex flex-col fixed left-0 top-0 z-[39] h-full overflow-y-auto"
        style={{ width: SIDEBAR_WIDTH, background: 'var(--hf-sidebar-panel-strong, #0b0b12)', borderRight: '1px solid rgba(255,255,255,0.06)' }}>

        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-4 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <Link to={createPageUrl('Dashboard')} className="flex items-center gap-2.5 min-w-0 group">
            <div className="w-9 h-9 rounded-[14px] flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105"
              style={{ background: '#d7f576' }}>
              <Activity size={18} className="text-[#0a1200]" />
            </div>
            <div className="min-w-0">
              <span className="block text-sm font-black leading-none" style={{ color: 'var(--hf-sidebar-text)' }}>HealthFlux</span>
              <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--hf-lemon-strong)', opacity: 0.8 }}>Personal Health</span>
            </div>
          </Link>
        </div>

        {/* Flux Assistant CTA */}
        <div className="px-3 pt-4 pb-2 flex-shrink-0">
          <button onClick={() => setFluxOpen(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-2xl transition-all duration-200"
            style={{ background: 'rgba(215,245,118,0.12)', border: '1px solid rgba(215,245,118,0.2)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(215,245,118,0.2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(215,245,118,0.12)'}>
            <div className="w-7 h-7 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: '#d7f576' }}>
              <Bot size={14} style={{ color: '#0a1200' }} />
            </div>
            <div className="min-w-0 flex-1">
              <span className="block text-xs font-black whitespace-nowrap" style={{ color: '#d7f576' }}>🤖 Flux Assistant</span>
              <span className="block text-[9px] truncate" style={{ color: 'rgba(215,245,118,0.55)' }}>Ask anything about health</span>
            </div>
          </button>
        </div>

        {/* Nav section label */}
        <div className="px-4 pt-3 pb-1.5 flex-shrink-0">
          <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'var(--hf-sidebar-text-muted)' }}>Navigation</span>
        </div>

        {/* Main Nav — emoji labels exactly like Admin Dashboard */}
        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto" aria-label="Main navigation">
          {allNavItems.map((item) => {
            const active = isActive(item.page);
            return (
              <Link key={item.page} to={createPageUrl(item.page)}
                aria-current={active ? 'page' : undefined}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-2xl text-xs font-bold transition-all"
                style={{
                  background: active ? item.color : 'transparent',
                  color: active ? item.tc : 'var(--hf-sidebar-text-muted)',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
                <item.icon size={14} className="flex-shrink-0" />
                <span>{item.name}</span>
                {active && <div className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: item.tc }} />}
              </Link>
            );
          })}
        </nav>

        {/* Bottom section — profile + utilities */}
        <div className="px-3 pb-4 pt-3 flex-shrink-0 space-y-1" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {/* Profile row */}
          <ProfileDropdown user={user} displayName={displayName} isMainUser={isMainUser} sidebarMode
            widgets={widgets} setWidgets={setWidgets} />

          {/* Utility items */}
          <button onClick={toggleTheme}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-2xl text-xs font-bold transition-all hover:bg-white/5"
            style={{ color: 'var(--hf-sidebar-text-muted)' }}>
            {isLight ? <Moon size={14} /> : <Sun size={14} style={{ color: '#d7f576' }} />}
            <span>{isLight ? '🌙 Dark Mode' : '☀️ Light Mode'}</span>
          </button>

          {user?.role === 'admin' && (
            <Link to={createPageUrl('AdminDashboard')}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-2xl text-xs font-bold transition-all hover:bg-white/5"
              style={{ color: 'var(--hf-sidebar-text-muted)' }}>
              <Shield size={14} /> <span>🛡️ Admin Console</span>
            </Link>
          )}

          <button onClick={() => base44.auth.logout()}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-2xl text-xs font-bold text-red-400 transition-all hover:bg-red-500/10">
            <LogOut size={14} /> <span>Sign Out</span>
          </button>

          {/* User identity card at bottom — mirrors Admin Layout */}
          {user && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-2xl mt-1" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: isMainUser ? '#d7f576' : '#c9bbff' }}>
                <span className="text-[10px] font-black" style={{ color: isMainUser ? '#0a1200' : '#1a0a40' }}>{displayName[0]}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold truncate" style={{ color: 'var(--hf-sidebar-text)' }}>{displayName}</p>
                <p className="text-[9px] font-bold uppercase tracking-wide" style={{ color: 'var(--hf-lemon-strong)' }}>
                  {user?.role === 'admin' ? 'Admin' : 'Member'}
                </p>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ── Desktop top header bar — chips + profile inline ── */}
      <header className="hidden md:flex fixed top-0 right-0 z-[38] items-center"
        style={{ left: SIDEBAR_WIDTH, background: 'var(--hf-bg)', borderBottom: '1px solid var(--hf-border)', height: '52px' }}>
        {/* Back button */}
        {!isRootPage && (
          <button onClick={() => navigate(-1)} aria-label="Go back"
            className="flex items-center justify-center w-8 h-8 rounded-full transition-all duration-150 hover:opacity-80 ml-4 flex-shrink-0"
            style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)' }}>
            <ChevronLeft size={15} style={{ color: 'var(--hf-text)' }} />
          </button>
        )}
        {/* Chips fill remaining space */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <GlobalChipsBar onFluxOpen={() => setFluxOpen(true)} />
        </div>
        {/* Profile dropdown */}
        <div className="flex-shrink-0 pr-4">
          <ProfileDropdown user={user} displayName={displayName} isMainUser={isMainUser}
            widgets={widgets} setWidgets={setWidgets} />
        </div>
      </header>

      {/* ── Main content ── */}
      {/* Mobile: top bar (~52px) + safe-area + chips bar (~45px) = ~97px total */}
      {/* Desktop: header (52px) only — chips are inline in header */}
      <main
        className="relative z-[1] md:ml-[15rem]"
        style={{
          minHeight: '100dvh',
          overflowY: 'auto',
          overflowX: 'clip',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <div className="bg-[var(--hf-bg)]" style={{ minHeight: '100%' }}>
          {/* Desktop: 52px header (chips inline) */}
          <div className="hidden md:block" style={{ paddingTop: '52px' }}>{children}</div>
          <div className="md:hidden" style={{ paddingTop: 'calc(97px + env(safe-area-inset-top, 0px))' }}>
            {[...navItems, ...extraItems].map(({ page }) => {
              const PageComp = getRouteById(page)?.component;
              if (!PageComp || !visitedRoots.has(page)) return null;
              const isActiveRoot = isRootPage && currentPageName === page;
              return (
                <div key={page} style={{ display: isActiveRoot ? 'block' : 'none' }}>
                  <PageComp />
                </div>
              );
            })}
            {!isRootPage && (
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={location.pathname}
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit">
                  {children}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </div>
      </main>

      {/* ── Mobile Bottom Nav ── */}
      <nav
        role="navigation"
        aria-label="Main navigation"
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden transition-transform duration-300"
        style={{
          background: 'var(--hf-surface)',
          borderTop: '1px solid var(--hf-border)',
          height: 'calc(56px + env(safe-area-inset-bottom, 0px))',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          transform: mobileChromeHidden ? 'translateY(100%)' : 'translateY(0)',
          pointerEvents: mobileChromeHidden ? 'none' : 'auto'
        }}>
        <div className="flex items-center justify-around h-full px-1">
          {navItems.map((item) => (
            <Link key={item.page} to={createPageUrl(item.page)}
              onClick={() => Haptics.light()}
              aria-label={item.name}
              className="flex flex-1 flex-col items-center justify-center active-press">
              <div className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all ${isActive(item.page) ? 'shadow-md' : ''}`}
                style={{ background: isActive(item.page) ? item.color : 'transparent' }}>
                <item.icon
                  style={{ color: isActive(item.page) ? item.tc : 'var(--hf-text-muted)' }}
                  size={16} />
              </div>
              <span className="text-[8px] font-bold mt-0.5"
                style={{ color: isActive(item.page) ? item.color : 'var(--hf-text-muted)' }}>
                {item.name.replace(/^[^\s]+\s/, '')}
              </span>
            </Link>
          ))}
        </div>
      </nav>

      {/* ── Global FAB ── */}
      {!NO_FAB_PAGES.includes(currentPageName) && (
        <QuickAddFAB
          onAction={handleGlobalFABAction}
          hidden={mobileChromeHidden}
          profileId={activeProfile?.id || null}
        />
      )}
    </div>
  );
}

export default function Layout({ children, currentPageName }) {
  if (NO_LAYOUT_PAGES.includes(currentPageName)) return <>{children}</>;
  if (ADMIN_PAGES.includes(currentPageName)) return <>{children}</>;

  return (
    <I18nProvider>
      <ThemeProvider>
        <FeatureFlagsProvider>
          <FeatureUnlockedBanner />
          <ActiveProfileProvider>
            <FABActionProvider>
              <OnboardingGate currentPageName={currentPageName}>
                <UserLayout currentPageName={currentPageName}>
                  {children}
                </UserLayout>
              </OnboardingGate>
            </FABActionProvider>
          </ActiveProfileProvider>
        </FeatureFlagsProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}

// Prevents non-onboarded users from seeing the app
function OnboardingGate({ children, currentPageName }) {
  const navigate = useNavigate();
  const { checked, needsOnboarding } = useOnboardingGate();

  React.useEffect(() => {
    if (checked && needsOnboarding && !ONBOARDING_EXEMPT.includes(currentPageName)) {
      navigate(createPageUrl('Onboarding'), { replace: true });
    }
  }, [checked, needsOnboarding, currentPageName]);

  if (!checked) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'var(--hf-bg)' }}>
        <div className="w-8 h-8 border-2 border-[#d7f576] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (needsOnboarding && !ONBOARDING_EXEMPT.includes(currentPageName)) return null;

  return <>{children}</>;
}
