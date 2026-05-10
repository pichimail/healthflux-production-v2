import React from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';

export default function ProfileSwitcher({ profiles, selectedProfile, onProfileChange }) {
  if (!profiles || profiles.length === 0) return null;

  const currentProfile = profiles.find((p) => p.id === selectedProfile) || profiles[0];

  return (
    <Select value={selectedProfile} onValueChange={onProfileChange}>
      <SelectTrigger className="glass-card w-full rounded-[22px] border-white/10 px-3 py-6 shadow-none sm:w-72">
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-[var(--hf-lemon)] text-xs font-bold text-[#07132a]">
              {currentProfile?.full_name?.[0] || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="text-left">
            <p className="text-sm font-medium text-[var(--hf-text)]">{currentProfile?.full_name}</p>
            <p className="text-xs capitalize text-[var(--hf-text-muted)]">{currentProfile?.relationship}</p>
          </div>
        </div>
      </SelectTrigger>
      <SelectContent className="glass-panel-strong relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-[22px] border-white/10 text-[var(--hf-text)]">
        {profiles.map((profile) => (
          <SelectItem key={profile.id} value={profile.id}>
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="bg-[var(--hf-lemon)] text-xs font-bold text-[#07132a]">
                  {profile.full_name?.[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium text-[var(--hf-text)]">{profile.full_name}</p>
                <p className="text-xs capitalize text-[var(--hf-text-muted)]">{profile.relationship}</p>
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
