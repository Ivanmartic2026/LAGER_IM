import React, { useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * PullToRefresh Component
 * 
 * Wraps children with pull-to-refresh functionality for mobile devices.
 * Shows a native-style refresh indicator when pulling down from the top.
 */
export default function PullToRefresh({ children, onRefresh, disabled = false }) {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const pullStartRef = useRef(0);
  const touchStartYRef = useRef(0);
  const refreshingRef = useRef(false);

  useEffect(() => {
    if (disabled) return;

    let touchStartY = 0;
    
    const handleTouchStart = (e) => {
      touchStartY = e.touches[0].clientY;
      touchStartYRef.current = touchStartY;
      pullStartRef.current = window.scrollY;
    };

    const handleTouchMove = (e) => {
      // Only trigger if at top of page
      if (pullStartRef.current !== 0) return;

      const touchY = e.touches[0].clientY;
      const distance = touchY - touchStartY;

      if (distance > 0) {
        setIsPulling(true);
        // Add resistance to pull (exponential decay)
        const resistedDistance = Math.min(distance * 0.5, 100);
        setPullDistance(resistedDistance);
      } else {
        setIsPulling(false);
        setPullDistance(0);
      }
    };

    const handleTouchEnd = async () => {
      if (isPulling && pullDistance > 60 && !refreshingRef.current) {
        refreshingRef.current = true;
        try {
          await onRefresh();
        } catch (error) {
          console.error('Refresh error:', error);
        } finally {
          refreshingRef.current = false;
        }
      }
      setIsPulling(false);
      setPullDistance(0);
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isPulling, pullDistance, onRefresh, disabled]);

  return (
    <>
      {/* Pull indicator */}
      <AnimatePresence>
        {isPulling && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ 
              transform: `translateY(${Math.max(0, pullDistance - 20)}px)`,
            }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-40 flex items-center justify-center"
          >
            <div className="w-8 h-8 rounded-full bg-slate-800/90 backdrop-blur-sm border border-slate-700 flex items-center justify-center">
              <RefreshCw 
                className={`w-4 h-4 text-slate-300 transition-transform ${
                  pullDistance > 60 ? 'rotate-180' : ''
                }`}
                style={{
                  transform: `rotate(${pullDistance * 3}deg)`
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Children */}
      {children}
    </>
  );
}