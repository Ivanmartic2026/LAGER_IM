import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';

// The VAPID public key — must match what's configured in VAPID_PUBLIC_KEY secret
// This is the public key (safe to be in frontend code)
const VAPID_PUBLIC_KEY = 'BHzJy9-MhN0-6L-VJVnZkWQhLMv5zpLBRwCMN7eYhEWk3hD5T8lBLBnPzYHvKxVLesFfJ3_dLu-bX6CHqxHVvEo';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PushManager() {
  const navigate = useNavigate();

  useEffect(() => {
    // Register service worker
    registerServiceWorker();
    // Setup in-app notifications regardless of push
    setupInAppNotifications();
    // Update app badge
    setupAppBadge();

    // Listen for navigation messages from service worker (notification click deep-link)
    const handleMessage = (event) => {
      if (event.data?.type === 'NAVIGATE' && event.data.url) {
        navigate(event.data.url);
      }
    };
    navigator.serviceWorker?.addEventListener('message', handleMessage);
    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
    };
  }, []);

  const registerServiceWorker = async () => {
    if (!('serviceWorker' in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      console.log('[PushManager] SW registered:', registration.scope);

      // Auto-setup push after SW is ready
      const isAuthenticated = await base44.auth.isAuthenticated().catch(() => false);
      if (!isAuthenticated) return;

      await setupPushSubscription(registration);
    } catch (err) {
      console.warn('[PushManager] SW registration failed:', err.message);
    }
  };

  const setupPushSubscription = async (registration) => {
    if (!('PushManager' in window)) {
      console.log('[PushManager] PushManager not supported in this browser');
      return;
    }
    if (!('Notification' in window)) {
      console.log('[PushManager] Notification API not supported');
      return;
    }

    // Check if iOS and not standalone — skip (iOS push only works in installed PWA)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
    if (isIOS && !isStandalone) {
      console.log('[PushManager] iOS non-standalone — skipping push setup');
      return;
    }

    console.log('[PushManager] Notification.permission =', Notification.permission);

    try {
      // Check current permission — don't re-request if already denied
      if (Notification.permission === 'denied') {
        console.warn('[PushManager] Notifications BLOCKED by user in browser settings');
        return;
      }

      let permission = Notification.permission;
      if (permission === 'default') {
        // On iOS, don't auto-request — IOSPushPrompt handles this via user gesture
        if (isIOS) {
          console.log('[PushManager] iOS — skipping auto permission request, IOSPushPrompt will handle it');
          return;
        }
        permission = await Notification.requestPermission();
        console.log('[PushManager] Permission response:', permission);
      }
      if (permission !== 'granted') {
        console.warn('[PushManager] Permission not granted:', permission);
        return;
      }

      // Get or create subscription
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });
        console.log('[PushManager] New push subscription created');
      } else {
        console.log('[PushManager] Existing push subscription found');
      }

      // Save subscription to backend
      const result = await base44.functions.invoke('setupPushNotifications', {
        subscription: subscription.toJSON(),
        action: 'subscribe'
      });
      console.log('[PushManager] Push subscription saved:', result?.data);
    } catch (err) {
      console.warn('[PushManager] Push setup failed:', err.message);
    }
  };

  const setupInAppNotifications = async () => {
    try {
      const isAuthenticated = await base44.auth.isAuthenticated().catch(() => false);
      if (!isAuthenticated) return;

      const user = await base44.auth.me().catch(() => null);
      if (!user) return;

      // Real-time in-app notification listener
      const unsubscribe = base44.entities.Notification.subscribe((event) => {
        if (event.type === 'create' && event.data?.user_email === user.email && !event.data?.is_read) {
          showInAppNotification(event.data);
        }
      });

      return unsubscribe;
    } catch (_e) {}
  };

  const showInAppNotification = (notification) => {
    // Visual feedback when app is in background tab
    if (document.hidden) {
      document.title = `🔔 ${notification.title}`;
      setTimeout(() => { document.title = 'IMvision'; }, 5000);
    }

    // Native notification if we have permission and no service worker push (e.g. in-browser)
    if (Notification.permission === 'granted' && !('PushManager' in window)) {
      try {
        const n = new Notification(notification.title, {
          body: notification.body || notification.message || '',
          icon: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69455d52c9eab36b7d26cc74/d7db28e4b_LogoLIGGANDE_IMvision_VITtkopia.png',
          tag: notification.id || 'notification'
        });
        if (notification.link_page) {
          n.onclick = () => {
            window.focus();
            navigate(`/${notification.link_page}${notification.link_to ? `?id=${notification.link_to}` : ''}`);
          };
        }
      } catch (_e) {}
    }

    // Play subtle sound
    playNotificationSound();
  };

  const playNotificationSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } catch (_e) {}
  };

  const setupAppBadge = async () => {
    if (!('setAppBadge' in navigator)) return;
    try {
      const isAuthenticated = await base44.auth.isAuthenticated().catch(() => false);
      if (!isAuthenticated) return;

      const updateBadge = async () => {
        try {
          const user = await base44.auth.me().catch(() => null);
          if (!user) return;
          const notifications = await base44.entities.Notification.filter(
            { user_email: user.email, is_read: false }, '-created_date', 100
          );
          const count = notifications.length;
          if (count > 0) {
            await navigator.setAppBadge(Math.min(count, 99));
          } else {
            await navigator.clearAppBadge?.();
          }
        } catch (_e) {}
      };

      updateBadge();
      const interval = setInterval(updateBadge, 30000);
      const unsub = base44.entities.Notification.subscribe(() => updateBadge());

      return () => {
        clearInterval(interval);
        unsub();
      };
    } catch (_e) {}
  };

  return null;
}