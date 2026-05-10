import React from 'react';
import ConnectedDevicesSection from '@/components/ConnectedDevicesSection';
import QuickVitalEntry from './QuickVitalEntry';
import { useActiveProfile } from '@/components/ActiveProfileContext';

export default function DeviceSyncTab() {
  const { activeProfileId, user } = useActiveProfile();

  if (!user || !activeProfileId) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 rounded-full border-2 border-[#d7f576] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Quick vital entry — fast manual logging */}
      <QuickVitalEntry profileId={activeProfileId} />

      {/* Connected devices section */}
      <ConnectedDevicesSection userEmail={user.email} profileId={activeProfileId} />
    </div>
  );
}
