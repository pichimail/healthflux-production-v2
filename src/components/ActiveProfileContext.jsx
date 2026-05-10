import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

const ActiveProfileContext = createContext(null);

export function ActiveProfileProvider({ children }) {
  const [activeProfileId, setActiveProfileIdState] = useState(() => {
    return localStorage.getItem('activeProfileId') || null;
  });
  const [activeProfile, setActiveProfile] = useState(null);
  const [allProfiles, setAllProfiles] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const initDone = useRef(false);

  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;
    initProfiles();
    // ABSOLUTE safety net: no matter what, loading MUST resolve within 12s
    const safetyNet = setTimeout(() => setLoading(false), 12000);
    return () => clearTimeout(safetyNet);
  }, []);

  const withTimeout = (promise, ms) =>
    Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
    ]);

  const initProfiles = async () => {
    try {
      const userData = await withTimeout(base44.auth.me(), 10000);
      setUser(userData);

      let raw = await withTimeout(base44.entities.Profile.list('-created_date'), 10000);
      let profiles = Array.isArray(raw) ? raw : [];

      // New user with no profiles — auto-create a default "self" profile
      if (profiles.length === 0) {
        try {
          const newProfile = await withTimeout(
            base44.entities.Profile.create({
              full_name: userData.full_name || 'My Profile',
              relationship: 'self',
            }),
            8000
          );
          profiles = Array.isArray(newProfile) ? newProfile : [newProfile];
        } catch (createErr) {
          console.error('Failed to create default profile:', createErr);
        }
      }

      setAllProfiles(profiles);

      const stored = localStorage.getItem('activeProfileId');
      const selfProfile = profiles.find(p => p.relationship === 'self');
      const storedProfile = stored ? profiles.find(p => p.id === stored) : null;

      if (storedProfile) {
        setActiveProfileIdState(storedProfile.id);
        setActiveProfile(storedProfile);
      } else if (selfProfile) {
        setActiveProfileIdState(selfProfile.id);
        setActiveProfile(selfProfile);
        localStorage.setItem('activeProfileId', selfProfile.id);
      } else if (profiles.length > 0) {
        setActiveProfileIdState(profiles[0].id);
        setActiveProfile(profiles[0]);
        localStorage.setItem('activeProfileId', profiles[0].id);
      }
    } catch (e) {
      console.error('ActiveProfileContext init error:', e);
      setAllProfiles([]);
    } finally {
      setLoading(false);
    }
  };

  const setActiveProfileId = (id) => {
    setActiveProfileIdState(id);
    localStorage.setItem('activeProfileId', id);
    const found = allProfiles.find(p => p.id === id);
    if (found) setActiveProfile(found);
  };

  const refreshProfiles = async () => {
    if (!user) return;
    try {
      const raw = await withTimeout(base44.entities.Profile.list('-created_date'), 10000);
      const profiles = Array.isArray(raw) ? raw : [];
      setAllProfiles(profiles);
      const current = profiles.find(p => p.id === activeProfileId);
      if (current) setActiveProfile(current);
    } catch (e) {
      console.warn('refreshProfiles failed:', e.message);
    }
  };

  return (
    <ActiveProfileContext.Provider value={{
      activeProfileId,
      setActiveProfileId,
      activeProfile,
      allProfiles,
      user,
      loading,
      refreshProfiles,
    }}>
      {children}
    </ActiveProfileContext.Provider>
  );
}

export function useActiveProfile() {
  const ctx = useContext(ActiveProfileContext);
  if (!ctx) throw new Error('useActiveProfile must be used within ActiveProfileProvider');
  return ctx;
}