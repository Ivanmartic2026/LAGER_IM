import { useState, useEffect } from 'react';
import { Bell, CheckCircle2, AlertCircle, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

function isStandalone() {
  return window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
}

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export default function PushStatusCard() {
  const [loading, setLoading] = useState(false);

  const { data: pushStatus = 'checking', refetch } = useQuery({
    queryKey: ['pushStatus'],
    queryFn: async () => {
      try {
        const authed = await base44.auth.isAuthenticated().catch(() => false);
        if (!authed) return 'unavailable';

        // iOS requires standalone mode for push
        if (isIOS() && !isStandalone()) return 'unavailable';

        // Check browser support
        if (!('Notification' in window) || !('serviceWorker' in navigator)) {
          return 'unavailable';
        }

        // Check permission
        if (Notification.permission === 'denied') return 'blocked';

        // Check if user has active subscription
        const user = await base44.auth.me();
        const subscriptions = await base44.entities.PushSubscription.filter({
          user_email: user.email,
          is_active: true
        }).catch(() => []);

        if (subscriptions.length > 0) {
          return 'active';
        } else if (Notification.permission === 'granted') {
          return 'inactive';
        } else {
          return 'inactive';
        }
      } catch (err) {
        console.warn('[PushStatusCard] Status check failed:', err.message);
        return 'unavailable';
      }
    }
  });

  const handleToggle = async () => {
    setLoading(true);
    try {
      if (pushStatus === 'active') {
        // Disable push
        const user = await base44.auth.me();
        const subscriptions = await base44.entities.PushSubscription.filter({
          user_email: user.email,
          is_active: true
        });
        for (const sub of subscriptions) {
          await base44.entities.PushSubscription.update(sub.id, {
            is_active: false
          });
        }
        refetch();
      } else {
        // Enable push (trigger IOSPushPrompt if iOS standalone)
        if (isIOS() && isStandalone()) {
          // Show notification request
          await Notification.requestPermission();
          setTimeout(refetch, 500);
        }
      }
    } catch (err) {
      console.error('[PushStatusCard] Toggle failed:', err.message);
    } finally {
      setLoading(false);
    }
  };

  if (pushStatus === 'unavailable') {
    return (
      <div className="p-4 rounded-xl bg-white/5 border border-white/10">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-white/30" />
          <div>
            <p className="text-sm font-medium text-white">Push-notiser inte tillgängligt</p>
            <p className="text-xs text-white/40">
              {isIOS() && !isStandalone() 
                ? 'Installera appen på hemskärmen för att aktivera notiser'
                : 'Din enhet stöder inte push-notiser'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-signal/20 flex items-center justify-center">
          <Bell className="w-5 h-5 text-signal" />
        </div>
        <div>
          <p className="text-sm font-medium text-white">Push-notiser</p>
          <p className="text-xs text-white/40">
            {pushStatus === 'checking' ? 'Kollar status...' :
             pushStatus === 'active' ? 'Aktivt' :
             pushStatus === 'blocked' ? 'Blockerat i inställningar' :
             'Inaktivt'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {pushStatus === 'checking' && <Loader className="w-4 h-4 animate-spin text-white/50" />}
        {pushStatus === 'active' && <CheckCircle2 className="w-4 h-4 text-green-400" />}
        {pushStatus === 'blocked' && <AlertCircle className="w-4 h-4 text-red-400" />}

        {pushStatus !== 'checking' && pushStatus !== 'blocked' && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggle}
            disabled={loading}
            className="ml-2"
          >
            {loading ? 'Uppdaterar...' : pushStatus === 'active' ? 'Av' : 'På'}
          </Button>
        )}
      </div>
    </div>
  );
}