/**
 * PullToRefresh — wraps children and triggers onRefresh when user
 * pulls down more than THRESHOLD px on mobile. Shows a spinner indicator.
 * Triggers medium haptic feedback on refresh.
 */
import React, { useRef, useState, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import Haptics from './utils/haptics';

const THRESHOLD = 70;
const MAX_PULL = 110;

export default function PullToRefresh({ onRefresh, children, disabled = false }) {
  const startY = useRef(null);
  const [pullDist, setPullDist] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const containerRef = useRef(null);

  const handleTouchStart = useCallback((e) => {
    if (disabled || refreshing) return;
    const el = containerRef.current;
    if (el && el.scrollTop > 0) return; // only trigger at top
    startY.current = e.touches[0].clientY;
  }, [disabled, refreshing]);

  const handleTouchMove = useCallback((e) => {
    if (startY.current === null || disabled || refreshing) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy <= 0) { setPullDist(0); return; }
    const el = containerRef.current;
    if (el && el.scrollTop > 0) return;
    // dampen
    const dist = Math.min(dy * 0.5, MAX_PULL);
    setPullDist(dist);
  }, [disabled, refreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (pullDist >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPullDist(0);
      Haptics.medium();
      try { await onRefresh(); } catch (_) {}
      setRefreshing(false);
    } else {
      setPullDist(0);
    }
    startY.current = null;
  }, [pullDist, refreshing, onRefresh]);

  const progress = Math.min(pullDist / THRESHOLD, 1);
  const showIndicator = pullDist > 8 || refreshing;

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative min-h-full"
      style={{ overscrollBehavior: 'contain' }}
    >
      {/* Pull indicator */}
      {showIndicator && (
        <div
          className="flex items-center justify-center w-full pointer-events-none"
          style={{
            height: refreshing ? 44 : pullDist,
            transition: pullDist === 0 ? 'height 0.2s ease' : 'none',
            overflow: 'hidden',
          }}
        >
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center shadow-md"
            style={{
              background: '#d7f576',
              opacity: refreshing ? 1 : progress,
              transform: `scale(${refreshing ? 1 : 0.6 + progress * 0.4})`,
              transition: 'transform 0.1s',
            }}
          >
            <Loader2
              size={18}
              className={refreshing ? 'animate-spin' : ''}
              style={{
                color: '#0a1200',
                transform: refreshing ? undefined : `rotate(${progress * 720}deg)`,
              }}
            />
          </div>
        </div>
      )}
      <div style={{ transform: `translateY(${pullDist}px)`, transition: pullDist === 0 ? 'transform 0.25s ease' : 'none' }}>
        {children}
      </div>
    </div>
  );
}