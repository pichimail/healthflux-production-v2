import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { BottomSheet, BottomSheetHeader, BottomSheetTitle, BottomSheetContent } from '@/components/ui/bottom-sheet';
import {
  TestTube, TrendingUp, Brain, User, AlertCircle, Shield, FileText, Settings, LogOut
} from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function MobileMenuBottomSheet({ open, onOpenChange, user }) {
  const handleLogout = () => {
    base44.auth.logout();
  };

  const moreItems = [
    { name: 'Lab Results', page: 'LabResults', icon: TestTube },
    { name: 'Trends', page: 'Trends', icon: TrendingUp },
    { name: 'Wellness Insights', page: 'WellnessInsights', icon: TrendingUp },
    { name: 'Health Insights', page: 'Insights', icon: Brain },
    { name: 'Export Reports', page: 'ExportReports', icon: FileText },
    { name: 'My Profiles', page: 'Profiles', icon: User },
    { name: 'Emergency Profile', page: 'EmergencyProfile', icon: AlertCircle },
    { name: 'ABHA Settings', page: 'ABHASettings', icon: Shield }
  ];

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      <BottomSheetHeader onClose={() => onOpenChange(false)}>
        <BottomSheetTitle>Menu</BottomSheetTitle>
      </BottomSheetHeader>
      <BottomSheetContent>
        <div className="space-y-2 pb-6">
          {moreItems.map((item) => (
            <Link
              key={item.page}
              to={createPageUrl(item.page)}
              onClick={() => onOpenChange(false)}
              className="flex items-center gap-3 p-4 rounded-2xl bg-[var(--hf-surface-2)] hover:bg-[#E9F46A] active-press transition-all"
            >
              <div className="w-10 h-10 bg-[var(--hf-surface)] rounded-xl flex items-center justify-center">
                <item.icon className="w-5 h-5 text-[var(--hf-text)]" />
              </div>
              <span className="text-sm font-medium text-[var(--hf-text)]">{item.name}</span>
            </Link>
          ))}

          <div className="border-t border-[var(--hf-border)] my-4" />

          <Link
            to={createPageUrl('Settings')}
            onClick={() => onOpenChange(false)}
            className="flex items-center gap-3 p-4 rounded-2xl bg-[var(--hf-surface-2)] hover:bg-[var(--hf-surface)]0 active-press transition-all"
          >
            <div className="w-10 h-10 bg-[var(--hf-surface)] rounded-xl flex items-center justify-center">
              <Settings className="w-5 h-5 text-[var(--hf-text)]" />
            </div>
            <span className="text-sm font-medium text-[var(--hf-text)]">Settings</span>
          </Link>

          {user?.role === 'admin' && (
            <Link
              to={createPageUrl('AdminDashboard')}
              onClick={() => onOpenChange(false)}
              className="flex items-center gap-3 p-4 rounded-2xl bg-[var(--hf-surface-2)] hover:bg-[var(--hf-surface)]0 active-press transition-all"
            >
              <div className="w-10 h-10 bg-[var(--hf-surface)] rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-[var(--hf-text)]" />
              </div>
              <span className="text-sm font-medium text-[var(--hf-text)]">Admin Dashboard</span>
            </Link>
          )}

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 p-4 rounded-2xl bg-red-50 hover:bg-red-100 active-press transition-all"
          >
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <LogOut className="w-5 h-5 text-red-600" />
            </div>
            <span className="text-sm font-medium text-red-600">Sign Out</span>
          </button>
        </div>
      </BottomSheetContent>
    </BottomSheet>
  );
}