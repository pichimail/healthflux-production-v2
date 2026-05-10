import { useRef, useCallback } from 'react';
import Haptics from './haptics';

/**
 * useSwipeTabs — attach to a page container to enable left/right swipe for tab navigation
 * Returns { onTouchStart, onTouchMove, onTouchEnd } — spread onto the container div
 */
export function useSwipeTabs(tabs, activeTab, setActiveTab, threshold = 60) {
  const startX = useRef(null);
  const startY = useRef(null);
  const axisLocked = useRef(false);

  const onTouchStart = useCallback((e) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    axisLocked.current = false;
  }, []);

  const onTouchMove = useCallback((e) => {
    if (!startX.current) return;
    const dx = Math.abs(e.touches[0].clientX - startX.current);
    const dy = Math.abs(e.touches[0].clientY - startY.current);
    if (!axisLocked.current && dy > dx + 5) axisLocked.current = true;
  }, []);

  const onTouchEnd = useCallback((e) => {
    if (axisLocked.current || startX.current === null) { startX.current = null; return; }
    const dx = e.changedTouches[0].clientX - startX.current;
    startX.current = null;
    if (Math.abs(dx) < threshold) return;
    const idx = tabs.indexOf(activeTab);
    if (dx < 0 && idx < tabs.length - 1) { Haptics.swipe(); setActiveTab(tabs[idx + 1]); }
    else if (dx > 0 && idx > 0)           { Haptics.swipe(); setActiveTab(tabs[idx - 1]); }
  }, [tabs, activeTab, setActiveTab, threshold]);

  return { onTouchStart, onTouchMove, onTouchEnd };
}

export default useSwipeTabs;