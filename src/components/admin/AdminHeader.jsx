/**
 * AdminHeader — responsive sticky header for all admin pages.
 * Shows: page title, live badge, quick-nav links, logout, back-to-app.
 */
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { base44 } from '@/api/base44Client';
import {
  Activity, Users, Bell, Flag, BarChart2,
  CreditCard, Shield, Cpu, Layers, Package, Key,
  LogOut, ArrowLeft, ChevronDown
} from 'lucide-react';
import { format } from 'date-fns';

const QUICK_LINKS = [
  { label: 'Users',        page: 'AdminUsers',         icon: Users },
  { label: 'Documents',    page: 'AdminDocuments',      icon: Layers },
  { label: 'Subscriptions',page: 'AdminSubscriptions',  icon: CreditCard },
  { label: 'Notifications',page: 'AdminNotifications',  icon: Bell },
  { label: 'Feature Flags',page: 'AdminFeatureFlags',   icon: Flag },
  { label: 'Analytics',    page: 'AdminAnalytics',      icon: BarChart2 },
  { label: 'Roles',        page: 'AdminRoles',          icon: Shield },
  { label: 'AI Ops',       page: 'AdminAIOps',          icon: Cpu },
  { label: 'Medications',  page: 'AdminMedications',    icon: Package },
  { label: 'Integrations', page: 'AdminIntegrations',   icon: Key },
];

export default function AdminHeader({ currentPageName, user, title, subtitle }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const pageLabel = QUICK_LINKS.find(l => l.page === currentPageName)?.label || 'Dashboard';

  return (
    <>
      {/* ── Desktop header bar ── */}
      <header className="hidden md:flex items-center gap-3 px-6 py-3 sticky top-0 z-20 border-b"
        style={{ background: 'var(--hf-bg)', borderColor: 'var(--hf-border)' }}>
        {/* Logo + title */}
        <Link to={createPageUrl('AdminDashboard')}
          className="flex items-center gap-2 mr-2 flex-shrink-0">
          <div className="w-7 h-7 rounded-[10px] flex items-center justify-center"
            style={{ background: '#d7f576' }}>
            <Activity size={14} className="text-[#0a1200]" />
          </div>
          <span className="text-sm font-black" style={{ color: 'var(--hf-text)' }}>Admin</span>
        </Link>

        {/* Separator */}
        <span className="w-px h-5 mx-1" style={{ background: 'var(--hf-border)' }} />

        {/* Page title */}
        <div className="mr-auto min-w-0">
          <p className="text-sm font-bold truncate" style={{ color: 'var(--hf-text)' }}>
            {title || pageLabel}
          </p>
          {subtitle && (
            <p className="text-[10px]" style={{ color: 'var(--hf-text-muted)' }}>{subtitle}</p>
          )}
        </div>

        {/* Live badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full flex-shrink-0"
          style={{ background: 'rgba(168,230,207,0.15)', border: '1px solid rgba(168,230,207,0.3)' }}>
          <div className="w-1.5 h-1.5 rounded-full bg-[#a8e6cf] animate-pulse" />
          <span className="text-[9px] font-bold" style={{ color: 'var(--hf-mint-strong)' }}>LIVE</span>
        </div>

        {/* Date */}
        <span className="text-[10px] font-semibold flex-shrink-0" style={{ color: 'var(--hf-text-muted)' }}>
          {format(new Date(), 'MMM d, yyyy')}
        </span>

        {/* Quick-nav dropdown */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setMenuOpen(o => !o)}
            aria-expanded={menuOpen}
            aria-label="Quick navigation"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:opacity-80"
            style={{ background: 'var(--hf-surface-2)', border: '1px solid var(--hf-border)', color: 'var(--hf-text)' }}>
            Navigate <ChevronDown size={11} style={{ transform: menuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-[29]" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-1.5 z-30 rounded-2xl shadow-2xl overflow-hidden w-52"
                style={{ background: 'var(--hf-surface)', border: '1px solid var(--hf-border)' }}>
                {QUICK_LINKS.map(link => (
                  <Link key={link.page} to={createPageUrl(link.page)}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold transition-all hover:opacity-80"
                    style={{
                      background: currentPageName === link.page ? 'rgba(215,245,118,0.12)' : 'transparent',
                      color: currentPageName === link.page ? '#d7f576' : 'var(--hf-text)',
                    }}>
                    <link.icon size={13} />
                    {link.label}
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Back to user app */}
        <Link to={createPageUrl('Dashboard')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold flex-shrink-0 transition-all hover:opacity-80"
          style={{ background: 'rgba(215,245,118,0.1)', color: 'var(--hf-lemon-strong)', border: '1px solid rgba(215,245,118,0.25)' }}>
          <ArrowLeft size={12} /> User App
        </Link>

        {/* Sign out */}
        <button
          onClick={() => base44.auth.logout()}
          aria-label="Sign out"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-red-400 flex-shrink-0 transition-all hover:bg-red-500/10"
          style={{ border: '1px solid rgba(242,140,140,0.25)' }}>
          <LogOut size={12} /> Sign Out
        </button>
      </header>

      {/* ── Mobile header ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 flex items-center gap-2 px-4 py-3"
        style={{ background: 'var(--hf-surface)', borderBottom: '1px solid var(--hf-border)', paddingTop: 'calc(12px + env(safe-area-inset-top,0px))' }}>
        <div className="w-7 h-7 rounded-[10px] flex items-center justify-center flex-shrink-0"
          style={{ background: '#d7f576' }}>
          <Activity size={13} className="text-[#0a1200]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-black truncate" style={{ color: 'var(--hf-text)' }}>{title || pageLabel}</p>
          <p className="text-[9px]" style={{ color: 'var(--hf-lemon-strong)' }}>Admin Console</p>
        </div>
        {/* Live dot */}
        <div className="w-2 h-2 rounded-full bg-[#a8e6cf] animate-pulse flex-shrink-0" />
        <Link to={createPageUrl('Dashboard')}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-bold flex-shrink-0"
          style={{ background: 'rgba(215,245,118,0.12)', color: 'var(--hf-lemon-strong)', border: '1px solid rgba(215,245,118,0.25)' }}>
          <ArrowLeft size={11} /> App
        </Link>
      </div>
    </>
  );
}