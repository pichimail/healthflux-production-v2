import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { base44 } from '@/api/base44Client';
import {
  LayoutDashboard, Users, Shield, Bell, Package, LogOut, Activity, BarChart2, Flag, Cpu, Key, CreditCard, Layers, ArrowLeft
} from 'lucide-react';

// Bottom nav tabs for mobile admin (5 max)
const BOTTOM_NAV = [
  { label: '🏠 Home',    page: 'AdminDashboard',    icon: LayoutDashboard },
  { label: '👥 Users',   page: 'AdminUsers',         icon: Users },
  { label: '📊 Stats',   page: 'AdminAnalytics',     icon: BarChart2 },
  { label: '🔔 Notifs',  page: 'AdminNotifications', icon: Bell },
  { label: '⚙️ More',    page: '__more__',            icon: Flag },
];

const ALL_NAV = [
  { label: '🏠 Dashboard',      page: 'AdminDashboard',    icon: LayoutDashboard },
  { label: '👥 Users',          page: 'AdminUsers',         icon: Users },
  { label: '💳 Subscriptions',  page: 'AdminSubscriptions', icon: CreditCard },
  { label: '📄 Documents',      page: 'AdminDocuments',     icon: Layers },
  { label: '💓 Vitals',         page: 'AdminVitals',        icon: Activity },
  { label: '🧠 Insights',       page: 'AdminInsights',      icon: BarChart2 },
  { label: '💊 Medications',    page: 'AdminMedications',   icon: Package },
  { label: '👤 Profiles',       page: 'AdminProfiles',      icon: Users },
  { label: '🛡️ Roles',          page: 'AdminRoles',         icon: Shield },
  { label: '🔔 Notifications',  page: 'AdminNotifications', icon: Bell },
  { label: '🚩 Feature Flags',  page: 'AdminFeatureFlags',  icon: Flag },
  { label: '📊 Analytics',      page: 'AdminAnalytics',     icon: BarChart2 },
  { label: '🤖 Assistant',      page: 'AdminAssistant',     icon: Cpu },
  { label: '🧬 AI Ops',         page: 'AdminAIOps',         icon: Cpu },
  { label: '🔗 Integrations',   page: 'AdminIntegrations',  icon: Key },
];

export default function AdminLayout({ children, currentPageName }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      setChecking(false);
      if (u?.role !== 'admin') navigate(createPageUrl('Dashboard'), { replace: true });
    }).catch(() => {
      setChecking(false);
      navigate(createPageUrl('Dashboard'), { replace: true });
    });
  }, []);

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--hf-bg)' }}>
        <div className="w-10 h-10 rounded-full border-2 border-[#d7f576] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') return null;

  const isActive = (page) => currentPageName === page;

  return (
    <div className="min-h-screen" style={{ background: 'var(--hf-bg)' }}>

      {/* ── Desktop Sidebar ── */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 h-full w-60 z-30 p-4 gap-2 overflow-y-auto"
        style={{ background: 'var(--hf-sidebar-panel-strong)', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-2 py-3 mb-2">
          <div className="w-9 h-9 rounded-[14px] flex items-center justify-center flex-shrink-0" style={{ background: '#d7f576' }}>
            <Activity size={18} className="text-[#0a1200]" />
          </div>
          <div>
            <p className="text-sm font-black text-[var(--hf-sidebar-text)] leading-none">HealthFlux</p>
            <p className="text-[9px] uppercase tracking-widest font-bold" style={{ color: 'var(--hf-lemon-strong)', opacity: 0.8 }}>Admin Console</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5">
          {ALL_NAV.map(item => (
            <Link key={item.page} to={createPageUrl(item.page)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-2xl text-xs font-bold transition-all"
              style={{
                background: isActive(item.page) ? '#d7f576' : 'transparent',
                color: isActive(item.page) ? '#0a1200' : 'var(--hf-sidebar-text-muted)',
              }}>
              <item.icon size={14} />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Bottom */}
        <div className="pt-3 border-t space-y-1" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <Link to={createPageUrl('Dashboard')}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-2xl text-xs font-bold transition-all"
            style={{ background: 'rgba(215,245,118,0.12)', color: 'var(--hf-lemon-strong)', border: '1px solid rgba(215,245,118,0.2)' }}>
            <ArrowLeft size={14} /> Back to User Dashboard
          </Link>
          <button onClick={() => base44.auth.logout()}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-2xl text-xs font-bold text-red-400 hover:bg-red-500/10 transition-all">
            <LogOut size={14} /> Sign Out
          </button>
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-2xl mt-1" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#d7f576' }}>
              <span className="text-[10px] font-black text-[#0a1200]">{user.full_name?.[0] || user.email?.[0]}</span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold truncate text-[var(--hf-sidebar-text)]">{user.full_name || user.email}</p>
              <p className="text-[9px] font-bold uppercase tracking-wide" style={{ color: 'var(--hf-lemon-strong)' }}>Admin</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Mobile Top Bar ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3"
        style={{ background: 'var(--hf-surface)', borderBottom: '1px solid var(--hf-border)' }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-[12px] flex items-center justify-center" style={{ background: '#d7f576' }}>
            <Activity size={15} className="text-[#0a1200]" />
          </div>
          <div>
            <p className="text-xs font-black" style={{ color: 'var(--hf-text)' }}>Admin Console</p>
            <p className="text-[9px] font-bold" style={{ color: 'var(--hf-lemon-strong)' }}>{ALL_NAV.find(n => n.page === currentPageName)?.label || 'HealthFlux'}</p>
          </div>
        </div>
        <Link to={createPageUrl('Dashboard')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold active:scale-90 transition-transform"
          style={{ background: 'rgba(215,245,118,0.12)', color: 'var(--hf-lemon-strong)', border: '1px solid rgba(215,245,118,0.25)' }}>
          <ArrowLeft size={12} /> User App
        </Link>
      </div>

      {/* ── Main Content ── */}
      <main className="md:ml-60 pt-[52px] md:pt-0 pb-20 md:pb-0">
        <div className="p-4 md:p-8 max-w-[1400px] mx-auto">
          {children}
        </div>
      </main>

      {/* ── Mobile Bottom Nav ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 flex items-stretch"
        style={{ background: 'var(--hf-surface)', borderTop: '1px solid var(--hf-border)', height: 58 }}>
        {BOTTOM_NAV.map((item) => {
          const active = isActive(item.page);
          const isMore = item.page === '__more__';
          return (
            <button key={item.page}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-transform"
              onClick={() => {
                if (isMore) setMoreOpen(true);
                else navigate(createPageUrl(item.page));
              }}>
              <div className={`flex h-7 w-7 items-center justify-center rounded-xl transition-all ${active ? 'shadow-md' : ''}`}
                style={{ background: active ? '#d7f576' : 'transparent' }}>
                <item.icon size={14} style={{ color: active ? '#0a1200' : 'var(--hf-text-muted)' }} />
              </div>
              <span className="text-[8px] font-bold"
                style={{ color: active ? '#d7f576' : 'var(--hf-text-muted)' }}>
                {item.label.split(' ')[1] || item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* ── Mobile "More" Sheet ── */}
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-50" onClick={() => setMoreOpen(false)}>
          <div className="absolute inset-0 bg-black/70" />
          <div className="absolute bottom-0 left-0 right-0 rounded-t-3xl p-5 pb-10"
            onClick={e => e.stopPropagation()}
            style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)', borderBottom: 'none' }}>
            <div className="flex justify-center mb-4">
              <div className="w-10 h-1.5 rounded-full" style={{ background: 'var(--hf-border-strong)' }} />
            </div>
            <p className="text-xs font-black uppercase tracking-widest mb-4 px-1" style={{ color: 'var(--hf-text-muted)' }}>All Admin Pages</p>
            <div className="grid grid-cols-2 gap-2 max-h-[60dvh] overflow-y-auto">
              {ALL_NAV.map(item => (
                <Link key={item.page} to={createPageUrl(item.page)} onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-2.5 p-3 rounded-2xl text-xs font-bold transition-all"
                  style={{
                    background: isActive(item.page) ? '#d7f576' : 'var(--hf-surface-2)',
                    color: isActive(item.page) ? '#0a1200' : 'var(--hf-text)',
                    border: '1px solid var(--hf-border)',
                  }}>
                  <item.icon size={13} />
                  <span className="truncate">{item.label}</span>
                </Link>
              ))}
            </div>
            <Link to={createPageUrl('Dashboard')} onClick={() => setMoreOpen(false)}
              className="mt-4 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold w-full"
              style={{ background: 'rgba(215,245,118,0.12)', color: 'var(--hf-lemon-strong)', border: '1px solid rgba(215,245,118,0.25)' }}>
              <ArrowLeft size={14} /> Back to User Dashboard
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}