import { useEffect } from 'react';

/**
 * PWA optimization component for iOS and Android
 * Handles:
 * - Service Worker registration
 * - Manifest registration
 * - Mobile viewport optimization
 * - Status bar styling
 * - Add to home screen prompt
 */
export default function PWAOptimizer() {
  useEffect(() => {
    // Service worker registration disabled - not needed for this app
    // If you need offline support, create /public/sw.js first

    // Disable zoom on input focus (iOS performance)
    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      input.addEventListener('focus', () => {
        document.body.style.zoom = '1';
      });
    });

    // Prevent default touch-hold menu on long press (improves UX)
    document.addEventListener('touchmove', (e) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    }, { passive: false });

    // Handle app installation prompt
    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      // You can store this and trigger it from a button if needed
      window.installPrompt = deferredPrompt;
    });

    // Log installation
    window.addEventListener('appinstalled', () => {
      console.log('PWA was installed');
    });

    return () => {
      inputs.forEach(input => {
        input.removeEventListener('focus', () => {});
      });
    };
  }, []);

  return null;
}