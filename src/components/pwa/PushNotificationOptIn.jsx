import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Bell, BellOff, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

export default function PushNotificationOptIn() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState('default');
  const [isLoading, setIsLoading] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalledOnIOS, setIsInstalledOnIOS] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    checkPushSupport();
    checkIOSInstallation();
    fetchUser();
  }, []);

  const checkPushSupport = async () => {
    const supported =
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window;

    setIsSupported(supported);
    if (supported) {
      setPermission(Notification.permission);
      checkSubscription();
    }
  };

  const checkIOSInstallation = () => {
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isInStandaloneMode =
      window.navigator.standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches;

    setIsIOS(isIOSDevice);
    setIsInstalledOnIOS(isIOSDevice && isInStandaloneMode);
  };

  const fetchUser = async () => {
    try {
      const u = await base44.auth.me();
      setUser(u);
    } catch (e) {
      console.error('Failed to fetch user:', e);
    }
  };

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (e) {
      console.error('Failed to check subscription:', e);
    }
  };

  const handleSubscribe = async () => {
    if (!isSupported) return;

    if (isIOS && !isInstalledOnIOS) {
      alert(
        'Push-notiser på iOS fungerar endast när appen är installerad på hemskärmen.\n\n' +
        'För att aktivera: Öppna denna sida i Safari och välj Dela → Lägg till på hemskärmen.'
      );
      return;
    }

    setIsLoading(true);
    try {
      const permission = await Notification.requestPermission();
      setPermission(permission);

      if (permission !== 'granted') {
        alert('Push-notiser nekades. Du kan aktivera det i webbläsarens inställningar.');
        setIsLoading(false);
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });

      // Spara subscription i databasen
      const endpoint = subscription.endpoint;
      const keys = subscription.getKey('p256dh');
      const auth = subscription.getKey('auth');

      await base44.entities.PushSubscription.create({
        user_email: user.email,
        endpoint,
        key_p256dh: btoa(String.fromCharCode.apply(null, new Uint8Array(keys))),
        key_auth: btoa(String.fromCharCode.apply(null, new Uint8Array(auth))),
        user_agent: navigator.userAgent,
        is_active: true
      });

      setIsSubscribed(true);
      alert('Push-notiser aktiverade!');
    } catch (error) {
      console.error('Subscription failed:', error);
      alert('Fel vid aktivering av push-notiser: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();

        // Markera som inaktiv i databasen
        const subs = await base44.entities.PushSubscription.filter({
          user_email: user.email,
          endpoint: subscription.endpoint
        });

        if (subs && subs.length > 0) {
          await base44.entities.PushSubscription.update(subs[0].id, {
            is_active: false
          });
        }
      }

      setIsSubscribed(false);
      alert('Push-notiser inaktiverade');
    } catch (error) {
      console.error('Unsubscribe failed:', error);
      alert('Fel vid inaktivering: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSupported) {
    return (
      <div className="p-4 bg-slate-700/30 rounded-lg flex gap-3">
        <AlertCircle className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
        <p className="text-slate-300 text-sm">
          Push-notiser stöds inte i denna webbläsare.
        </p>
      </div>
    );
  }

  if (isIOS && !isInstalledOnIOS) {
    return (
      <div className="p-4 bg-blue-900/30 border border-blue-700 rounded-lg flex gap-3">
        <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-300">
          <p className="font-semibold mb-2">Installera appen på hemskärmen</p>
          <p className="text-xs mb-3">
            Öppna denna sida i Safari och välj Dela → Lägg till på hemskärmen för att aktivera push-notiser.
          </p>
          <Button
            onClick={() => alert('Använd Delningsknappen i Safari för att installera appen.')}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 h-auto"
          >
            Instruktioner
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isSubscribed ? (
            <Bell className="w-5 h-5 text-green-400" />
          ) : (
            <BellOff className="w-5 h-5 text-slate-400" />
          )}
          <div>
            <p className="text-white font-semibold text-sm">Push-notiser</p>
            <p className="text-slate-400 text-xs">
              {isSubscribed ? '✓ Aktiverad' : 'Inaktiverad'}
            </p>
          </div>
        </div>
      </div>

      {permission === 'denied' && (
        <p className="text-red-400 text-xs">
          Push-notiser är blockerade. Ändra webbläsarens inställningar för att aktivera.
        </p>
      )}

      <Button
        onClick={isSubscribed ? handleUnsubscribe : handleSubscribe}
        disabled={isLoading}
        className={`w-full text-sm ${
          isSubscribed
            ? 'bg-red-600 hover:bg-red-700 text-white'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
        {isLoading ? 'Uppdaterar...' : isSubscribed ? 'Stäng av notiser' : 'Aktivera notiser'}
      </Button>
    </div>
  );
}

// Konvertera VAPID-nyckel
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