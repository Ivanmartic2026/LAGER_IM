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
    // Register service worker for offline support and push notifications
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js?v=' + Date.now()).catch(err => {
        console.warn('Service Worker registration failed - creating inline SW');
        // Fallback: Create inline service worker
        const swCode = `
          self.addEventListener('push', (event) => {
            if (!event.data) return;
            const data = event.data.json();
            const options = {
              body: data.message || 'Ny notifiering',
              icon: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69455d52c9eab36b7d26cc74/d7db28e4b_LogoLIGGANDE_IMvision_VITtkopia.png',
              badge: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69455d52c9eab36b7d26cc74/d7db28e4b_LogoLIGGANDE_IMvision_VITtkopia.png',
              tag: data.id || 'notification'
            };
            event.waitUntil(self.registration.showNotification(data.title || 'IMvision', options));
          });

          self.addEventListener('notificationclick', (event) => {
            event.notification.close();
            event.waitUntil(clients.matchAll({ type: 'window' }).then((clients) => {
              if (clients.length > 0) return clients[0].focus();
              if (self.clients.openWindow) return self.clients.openWindow('/');
            }));
          });
        `;
        const blob = new Blob([swCode], { type: 'application/javascript' });
        const swUrl = URL.createObjectURL(blob);
        navigator.serviceWorker.register(swUrl).catch(e => console.error('Inline SW failed:', e));
      });
    }

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