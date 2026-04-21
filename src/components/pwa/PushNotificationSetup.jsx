import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, BellOff, CheckCircle, AlertCircle, Smartphone } from "lucide-react";
import { toast } from "sonner";

export default function PushNotificationSetup() {
  const [permission, setPermission] = useState('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkPushSupport();
    checkSubscription();
  }, []);

  const checkPushSupport = () => {
    // Check basic browser support
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
    }
  };

  const checkSubscription = async () => {
    if (!('serviceWorker' in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error('Check subscription error:', error);
    }
  };

  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const subscribeToPush = async () => {
    setLoading(true);

    try {
      // Request notification permission
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== 'granted') {
        toast.error('Push-notiser nekades');
        setLoading(false);
        return;
      }

      // Get SW registration and create push subscription
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        // Create new subscription with VAPID public key
        const VAPID_PUBLIC_KEY = 'BHzJy9-MhN0-6L-VJVnZkWQhLMv5zpLBRwCMN7eYhEWk3hD5T8lBLBnPzYHvKxVLesFfJ3_dLu-bX6CHqxHVvEo';
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });
      }

      // Save subscription to backend
      await base44.functions.invoke('setupPushNotifications', {
        subscription: subscription.toJSON(),
        action: 'subscribe'
      });

      setIsSubscribed(true);
      toast.success('Push-notiser aktiverade');
      
    } catch (error) {
      console.error('Subscribe error:', error);
      toast.error('Kunde inte aktivera push-notiser');
    } finally {
      setLoading(false);
    }
  };

  const unsubscribeFromPush = async () => {
    setLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
        setIsSubscribed(false);
        toast.success('Push-notiser avaktiverade');
      }
    } catch (error) {
      console.error('Unsubscribe error:', error);
      toast.error('Kunde inte avaktivera push-notiser');
    } finally {
      setLoading(false);
    }
  };

  if (!isSupported) {
    return (
      <Card className="bg-slate-900 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <AlertCircle className="w-5 h-5 text-amber-400" />
            Push-notiser kräver plattformsstöd
          </CardTitle>
          <CardDescription className="text-slate-400">
            PWA push-notifikationer kräver Service Worker-stöd och VAPID-konfiguration som måste aktiveras av plattformen.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Bell className="w-5 h-5" />
          Push-notiser
        </CardTitle>
        <CardDescription className="text-slate-400">
          Få notifikationer om viktiga händelser i systemet
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-slate-700">
          <div className="flex items-center gap-3">
            {isSubscribed ? (
              <CheckCircle className="w-5 h-5 text-green-400" />
            ) : (
              <BellOff className="w-5 h-5 text-slate-400" />
            )}
            <div>
              <div className="font-medium text-white">
                {isSubscribed ? 'Aktiverat' : 'Inaktiverat'}
              </div>
              <div className="text-sm text-slate-400">
                {isSubscribed 
                  ? 'Du får push-notiser från systemet'
                  : 'Aktivera för att få notiser'
                }
              </div>
            </div>
          </div>

          <Button
            onClick={isSubscribed ? unsubscribeFromPush : subscribeToPush}
            disabled={loading}
            variant={isSubscribed ? 'outline' : 'default'}
            className={isSubscribed 
              ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-white'
              : 'bg-blue-600 hover:bg-blue-500'
            }
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                Laddar...
              </>
            ) : isSubscribed ? (
              'Avaktivera'
            ) : (
              'Aktivera'
            )}
          </Button>
        </div>

        <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
          <div className="flex items-start gap-3">
            <Smartphone className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-300">
              <div className="font-medium mb-1">Lägg till på hemskärmen</div>
              <div className="text-blue-300/80">
                För bästa upplevelse, lägg till denna app på din hemskärm. 
                På iOS: tryck på dela-knappen och välj "Lägg till på hemskärmen". 
                På Android: tryck på menyn och välj "Installera app".
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}