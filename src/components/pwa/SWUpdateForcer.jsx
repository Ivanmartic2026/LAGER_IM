import { useEffect } from 'react';

/**
 * Forces Service Worker update on every app load.
 * Critical for iOS PWA where SW cache can get stale.
 */
export default function SWUpdateForcer() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const forceUpdate = async () => {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        console.log(`[SWUpdateForcer] Found ${registrations.length} SW registrations`);
        
        for (const reg of registrations) {
          // Force update check
          await reg.update();
          console.log('[SWUpdateForcer] SW update check triggered');

          // If new SW is waiting, activate it
          if (reg.waiting) {
            console.log('[SWUpdateForcer] New SW waiting, activating...');
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
            
            // Listen for controller change
            let controllerChanged = false;
            const onControllerChange = () => {
              if (!controllerChanged) {
                controllerChanged = true;
                console.log('[SWUpdateForcer] SW controller changed, reloading...');
                window.location.reload();
              }
            };
            navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
          }
        }
      } catch (err) {
        console.warn('[SWUpdateForcer] Update check failed:', err.message);
      }
    };

    // Force update on mount
    forceUpdate();

    // And check every 30 seconds (user might have app open for a while)
    const interval = setInterval(forceUpdate, 30000);

    return () => clearInterval(interval);
  }, []);

  return null;
}