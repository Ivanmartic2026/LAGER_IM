import { useState, useEffect } from 'react';
import { Bell, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

const PROMPTED_KEY = 'ios_push_prompted';
const VAPID_PUBLIC_KEY = 'BHzJy9-MhN0-6L-VJVnZkWQhLMv5zpLBRwCMN7eYhEWk3hD5T8lBLBnPzYHvKxVLesFfJ3_dLu-bX6CHqxHVvEo';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

function isStandalone() {
  return window.navigator.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches;
}

export default function IOSPushPrompt() {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // 'granted' | 'denied' | 'registered' | 'register_failed'

  useEffect(() => {
    // Only show in standalone PWA mode
    if (!isStandalone()) return;
    // Only show if Notification API exists
    if (!('Notification' in window)) return;
    // Already granted — nothing to do
    if (Notification.permission === 'granted') return;
    // If denied — show blocked message once per session so user knows how to fix it
    if (Notification.permission === 'denied') {
      setStatus('denied');
      const shownKey = PROMPTED_KEY + '_blocked_shown';
      if (!sessionStorage.getItem(shownKey)) {
        base44.auth.isAuthenticated().then(authed => {
          if (!authed) return;
          sessionStorage.setItem(shownKey, '1');
          setTimeout(() => setVisible(true), 3000);
        }).catch(() => {});
      }
      return;
    }
    // Wait for auth then show after short delay
    base44.auth.isAuthenticated().then(authed => {
      if (!authed) return;
      setTimeout(() => setVisible(true), 3000);
    }).catch(() => {});
  }, []);

  const handleActivate = async () => {
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatus('denied');
        setLoading(false);
        return;
      }

      // Register SW + push subscription
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setStatus('denied');
        setLoading(false);
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });
      }

      // Save to backend and verify
      const result = await base44.functions.invoke('setupPushNotifications', {
        subscription: sub.toJSON(),
        action: 'subscribe'
      });

      if (result?.data?.success) {
        setStatus('registered');
        setTimeout(() => setVisible(false), 2500);
      } else {
        setStatus('register_failed');
      }
    } catch (err) {
      console.warn('[IOSPushPrompt] Push setup error:', err.message);
      setStatus('register_failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    // Only suppress temporarily (until next app open), never permanently
    // This ensures the prompt returns on every launch until granted
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[9998] flex items-end justify-center bg-black/70 backdrop-blur-sm p-4"
         style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
      <div className="w-full max-w-sm bg-zinc-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
        <div className="flex items-start justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-signal/20 border border-signal/30 flex items-center justify-center">
              <Bell className="w-6 h-6 text-signal" />
            </div>
            <div>
              <p className="font-brand text-white text-sm">Push-notiser</p>
              <p className="text-white/40 text-xs">Lager AI</p>
            </div>
          </div>
          <button onClick={handleDismiss} className="text-white/30 hover:text-white p-1 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 pb-4">
          {status === 'registered' ? (
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm font-medium">Notiser aktiverade och registrerade!</p>
            </div>
          ) : status === 'register_failed' ? (
            <div className="flex items-start gap-2 text-amber-400">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium mb-1">Registrering misslyckades</p>
                <p className="text-white/50 text-xs">Notiser gavs men kunde inte registreras på servern. Försök igen.</p>
              </div>
            </div>
          ) : status === 'denied' ? (
            <>
              <h2 className="font-brand text-white text-base mb-1">Notiser är blockerade</h2>
              <p className="text-white/60 text-sm leading-relaxed">
                För att aktivera: gå till <span className="text-white font-medium">Inställningar → Lager AI → Notiser</span> och slå på dem.
              </p>
            </>
          ) : (
            <>
              <h2 className="font-brand text-white text-base mb-1">Aktivera push-notiser</h2>
              <p className="text-white/50 text-sm leading-relaxed">
                Få direkta notiser när du omnämns i ett meddelande eller när en arbetsorder uppdateras.
              </p>
            </>
          )}
        </div>

        {status === 'denied' && (
          <div className="px-5 pb-6">
            <Button variant="ghost" className="w-full text-white/50 text-sm" onClick={handleDismiss}>
              Stäng
            </Button>
          </div>
        )}

        {(!status || status === 'register_failed') && (
          <div className="px-5 pb-6 flex gap-3">
            <Button variant="ghost" className="flex-1 text-white/50 text-sm" onClick={handleDismiss}>
              Inte nu
            </Button>
            <Button
              className="flex-1 bg-signal hover:bg-signal-hover text-white text-sm"
              onClick={handleActivate}
              disabled={loading}
            >
              {loading ? 'Aktiverar...' : status === 'register_failed' ? 'Försök igen' : 'Aktivera'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}