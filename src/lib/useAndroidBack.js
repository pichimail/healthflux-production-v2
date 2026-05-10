/**
 * useAndroidBack — handles Android hardware back button via History API popstate.
 * Works in browser PWA and Capacitor WebView environments.
 */
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const ROOT_PATHS = ['/', '/Dashboard', '/HealthHub', '/AIHub', '/WellnessHub', '/CareHub', '/AccountHub'];

export function useAndroidBack() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Push a state so there's always something to pop
    window.history.pushState({ androidBack: true }, '');

    const handlePopState = (e) => {
      const isRoot = ROOT_PATHS.some(p => location.pathname === p || location.pathname === p.toLowerCase());
      if (isRoot) {
        // At root — re-push state to prevent app exit in browser (can't prevent in true native)
        window.history.pushState({ androidBack: true }, '');
      } else {
        navigate(-1);
      }
    };

    window.addEventListener('popstate', handlePopState);

    // Capacitor / Cordova back button event (if available)
    const capBack = () => {
      const isRoot = ROOT_PATHS.some(p => location.pathname === p || location.pathname === p.toLowerCase());
      if (!isRoot) navigate(-1);
    };
    document.addEventListener('backbutton', capBack, false);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('backbutton', capBack, false);
    };
  }, [location.pathname]);
}