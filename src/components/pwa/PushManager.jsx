import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Push notification manager for iOS and Android
 * iOS has limited push support - falls back to in-app notifications
 */

// Detect if running on iOS
const isIOS = () => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
};

// Detect if running in standalone mode (installed as PWA)
const isStandalone = () => {
  return window.navigator.standalone === true || 
         window.matchMedia('(display-mode: standalone)').matches;
};

export default function PushManager() {
  useEffect(() => {
    setupPushNotifications();
    setupAppBadge();
  }, []);

  const setupPushNotifications = async () => {
    const iosDevice = isIOS();
    const standalone = isStandalone();

    console.log('[PushManager] iOS:', iosDevice, 'Standalone:', standalone);

    // iOS limitations: push only works in standalone mode (installed PWA)
    if (iosDevice && !standalone) {
      console.log('[PushManager] iOS not in standalone mode - using in-app notifications only');
      setupIOSInAppNotifications();
      return;
    }

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('[PushManager] Push notifications not supported - falling back to in-app');
      setupIOSInAppNotifications();
      return;
    }

    try {
      console.log('[PushManager] Requesting notification permission...');
      const permission = await Notification.requestPermission();
      console.log('[PushManager] Permission result:', permission);

      if (permission !== 'granted') {
        console.log('[PushManager] Permission denied - using in-app notifications');
        setupIOSInAppNotifications();
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        console.log('[PushManager] Creating new push subscription...');
        const newSubscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(
            'BHzJy9-MhN0-6L-VJVnZkWQhLMv5zpLBRwCMN7eYhEWk3hD5T8lBLBnPzYHvKxVLesFfJ3_dLu-bX6CHqxHVvEo'
          )
        });

        console.log('[PushManager] Subscription created');
        await base44.functions.invoke('setupPushNotifications', {
          subscription: newSubscription,
          action: 'subscribe'
        });
      } else {
        console.log('[PushManager] Existing subscription found');
      }
    } catch (error) {
      console.error('[PushManager] Push setup failed:', error);
      console.log('[PushManager] Falling back to in-app notifications');
      setupIOSInAppNotifications();
    }
  };

  const setupIOSInAppNotifications = async () => {
    // Listen for new notifications and show them in-app
    try {
      const isAuthenticated = await base44.auth.isAuthenticated();
      if (!isAuthenticated) return;

      const user = await base44.auth.me().catch(() => null);
      if (!user) return;

      console.log('[PushManager] Setting up in-app notification listener');

      // Real-time subscription to notifications
      const unsubscribe = base44.entities.Notification.subscribe((event) => {
        if (event.type === 'create' && event.data.user_email === user.email && !event.data.is_read) {
          showInAppNotification(event.data);
        }
      });

      return () => unsubscribe();
    } catch (error) {
      console.error('[PushManager] In-app notification setup failed:', error);
    }
  };

  const showInAppNotification = (notification) => {
    // Create in-app notification with audio and visual feedback
    console.log('[PushManager] Showing in-app notification:', notification.title);

    // Play notification sound
    playNotificationSound();

    // Visual notification (browser standard if available)
    if (document.hidden) {
      document.title = `🔔 ${notification.title}`;
    }

    // Show native notification if permission granted
    if (Notification.permission === 'granted') {
      try {
        new Notification(notification.title, {
          body: notification.message,
          icon: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69455d52c9eab36b7d26cc74/d7db28e4b_LogoLIGGANDE_IMvision_VITtkopia.png',
          badge: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69455d52c9eab36b7d26cc74/d7db28e4b_LogoLIGGANDE_IMvision_VITtkopia.png',
          tag: notification.id || 'notification'
        });
      } catch (e) {
        console.log('[PushManager] Native notification failed:', e);
      }
    }
  };

  const playNotificationSound = () => {
    try {
      // Use Web Audio API for notification sound
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
      console.log('[PushManager] Notification sound failed:', e);
    }
  };

  const setupAppBadge = async () => {
    if (!('setAppBadge' in navigator)) {
      console.warn('App badge API not supported');
      return;
    }

    try {
      const isAuthenticated = await base44.auth.isAuthenticated();
      if (!isAuthenticated) return;
    } catch {
      return;
    }

    // Update app badge when notifications change
    const updateBadge = async () => {
      try {
        const user = await base44.auth.me().catch(() => null);
        if (!user) return;

        const notifications = await base44.entities.Notification.filter(
          { user_email: user.email, is_read: false },
          '-created_date',
          100
        );

        const unreadCount = notifications.length;
        if (unreadCount > 0) {
          await navigator.setAppBadge(unreadCount > 99 ? 99 : unreadCount);
        } else {
          await navigator.clearAppBadge?.();
        }
      } catch (error) {
        console.error('Badge update failed:', error);
      }
    };

    updateBadge();

    // Update badge every 30 seconds
    const interval = setInterval(updateBadge, 30000);

    // Listen for notification changes via websocket/subscription
    const unsubscribe = base44.entities.Notification.subscribe((event) => {
      updateBadge();
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  };

  return null;
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}