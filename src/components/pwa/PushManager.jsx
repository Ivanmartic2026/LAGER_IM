import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Push notification manager for iOS and Android
 * Handles subscription and app badge updates
 */
export default function PushManager() {
  useEffect(() => {
    setupPushNotifications();
    setupAppBadge();
  }, []);

  const setupPushNotifications = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notifications not supported');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.log('Notification permission denied');
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        // Create new subscription
        const newSubscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(
            'BHzJy9-MhN0-6L-VJVnZkWQhLMv5zpLBRwCMN7eYhEWk3hD5T8lBLBnPzYHvKxVLesFfJ3_dLu-bX6CHqxHVvEo'
          )
        });

        // Save subscription to database
        await base44.functions.invoke('setupPushNotifications', {
          subscription: newSubscription,
          action: 'subscribe'
        });
      }
    } catch (error) {
      console.error('Push notification setup failed:', error);
    }
  };

  const setupAppBadge = () => {
    if (!('setAppBadge' in navigator)) {
      console.warn('App badge API not supported');
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