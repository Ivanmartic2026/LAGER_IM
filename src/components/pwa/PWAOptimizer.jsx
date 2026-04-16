import { useEffect } from 'react';

/**
 * PWA optimizer: registers Service Worker, handles install prompt, viewport fixes.
 */
export default function PWAOptimizer() {
  useEffect(() => {
    // Register Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then((registration) => {
        console.log('[PWA] Service Worker registered, scope:', registration.scope);

        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker?.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[PWA] New version available');
              // Dispatch event so UI can show "update available" prompt if desired
              window.dispatchEvent(new CustomEvent('pwa-update-available'));
            }
          });
        });
      }).catch((err) => {
        console.warn('[PWA] Service Worker registration failed:', err);
      });

      // Listen for messages from SW (e.g. background sync)
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'BACKGROUND_SYNC') {
          window.dispatchEvent(new CustomEvent('pwa-sync'));
        }
      });
    }

    // Handle install prompt (Android/Chrome)
    const handleInstallPrompt = (e) => {
      e.preventDefault();
      window.installPrompt = e;
      window.dispatchEvent(new CustomEvent('pwa-installable'));
    };
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);

    // Log install event
    window.addEventListener('appinstalled', () => {
      console.log('[PWA] App installed');
      window.installPrompt = null;
    });

    // Prevent multi-touch zoom
    document.addEventListener('touchmove', (e) => {
      if (e.touches.length > 1) e.preventDefault();
    }, { passive: false });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
    };
  }, []);

  return null;
}