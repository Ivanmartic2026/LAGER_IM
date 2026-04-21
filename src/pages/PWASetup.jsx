import React, { useState, useEffect } from 'react';
import { ArrowLeft, Smartphone, Bell, Wifi, Send, CheckCircle2, XCircle, RefreshCw, Bug } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import PushNotificationSetup from "@/components/pwa/PushNotificationSetup";
import CacheManager from "@/components/pwa/CacheManager";

export default function PWASetupPage() {
  const [sendingTest, setSendingTest] = useState(false);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loadingSubs, setLoadingSubs] = useState(true);

  const loadSubscriptions = async () => {
    setLoadingSubs(true);
    try {
      const subs = await base44.entities.PushSubscription.list('-created_date', 100);
      setSubscriptions(subs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSubs(false);
    }
  };

  useEffect(() => { loadSubscriptions(); }, []);

  const [diag, setDiag] = useState(null);
  const [diagLoading, setDiagLoading] = useState(false);

  const runDiagnostics = async () => {
    setDiagLoading(true);
    const result = {
      standalone: window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches,
      notificationSupport: 'Notification' in window,
      serviceWorkerSupport: 'serviceWorker' in navigator,
      pushManagerSupport: 'PushManager' in window,
      permission: 'Notification' in window ? Notification.permission : 'not supported',
      swRegistered: false,
      swScope: null,
      subscription: null,
      subscriptionEndpoint: null,
      dbSubscriptions: 0,
      myDbSubscriptions: 0,
      error: null,
    };

    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        result.swRegistered = !!reg;
        result.swScope = reg?.scope || null;

        if (reg) {
          const sub = await reg.pushManager.getSubscription();
          result.subscription = !!sub;
          result.subscriptionEndpoint = sub ? sub.endpoint.substring(0, 60) + '…' : null;
        }
      }

      const user = await base44.auth.me();
      const allSubs = await base44.entities.PushSubscription.list('-created_date', 200);
      result.dbSubscriptions = allSubs.length;
      result.myDbSubscriptions = allSubs.filter(s => s.user_email === user.email && s.is_active).length;
    } catch (e) {
      result.error = e.message;
    }

    setDiag(result);
    setDiagLoading(false);
  };

  const sendTestNotification = async () => {
    setSendingTest(true);
    try {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) {
        toast.error('Du måste vara inloggad för att skicka testnotiser');
        setSendingTest(false);
        return;
      }

      const user = await base44.auth.me();
      const response = await base44.functions.invoke('sendPushNotification', {
        userEmail: user.email,
        title: '🎉 Test lyckades!',
        body: 'Push-notiser fungerar perfekt på din enhet.',
        data: { type: 'test', timestamp: new Date().toISOString() }
      });

      if (response.data?.success) {
        toast.success(`Testnotis skickad! (${response.data.sent} mottagen)`);
      } else {
        toast.error('Ingen aktiv prenumeration hittades');
      }
    } catch (error) {
      console.error('Test notification error:', error);
      toast.error('Kunde inte skicka testnotis: ' + error.message);
    } finally {
      setSendingTest(false);
    }
  };
  return (
    <div className="min-h-screen bg-black p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link to={createPageUrl("Admin")}>
            <Button variant="ghost" className="text-white/70 hover:text-white mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Tillbaka till Admin
            </Button>
          </Link>

          <h1 className="text-3xl font-bold text-white mb-2">PWA-inställningar</h1>
          <p className="text-white/50">
            Konfigurera Progressive Web App-funktioner för mobil och desktop
          </p>
        </div>

        <div className="space-y-6">
          {/* Registered Devices */}
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-white">
                  <Smartphone className="w-5 h-5" />
                  Registrerade enheter
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={loadSubscriptions} className="text-white/50 hover:text-white">
                  <RefreshCw className={`w-4 h-4 ${loadingSubs ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              <CardDescription className="text-slate-400">
                Telefoner/enheter med aktiv push-prenumeration
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingSubs ? (
                <p className="text-white/40 text-sm">Laddar...</p>
              ) : subscriptions.length === 0 ? (
                <p className="text-white/40 text-sm">Inga registrerade enheter ännu.</p>
              ) : (
                <div className="space-y-2">
                  {subscriptions.map(sub => {
                    const ua = sub.user_agent || '';
                    const isIOS = /iPhone|iPad|iPod/i.test(ua);
                    const isAndroid = /Android/i.test(ua);
                    const deviceLabel = isIOS ? '🍎 iOS' : isAndroid ? '🤖 Android' : '💻 Desktop';
                    return (
                      <div key={sub.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                        <div className="flex items-center gap-3">
                          {sub.is_active
                            ? <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                            : <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                          }
                          <div>
                            <p className="text-white text-sm font-medium">{sub.user_email}</p>
                            <p className="text-white/40 text-xs">{deviceLabel} · {ua.substring(0, 60)}{ua.length > 60 ? '…' : ''}</p>
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${sub.is_active ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                          {sub.is_active ? 'Aktiv' : 'Inaktiv'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Diagnostics */}
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-white">
                  <Bug className="w-5 h-5 text-amber-400" />
                  Push-diagnostik
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={runDiagnostics} disabled={diagLoading} className="text-amber-400 hover:text-amber-300">
                  {diagLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Kör diagnostik'}
                </Button>
              </div>
              <CardDescription className="text-slate-400">
                Visar exakt status för push-notiser på denna enhet
              </CardDescription>
            </CardHeader>
            {diag && (
              <CardContent>
                <div className="space-y-2 font-mono text-xs">
                  {[
                    ['Standalone PWA', diag.standalone],
                    ['Notification API', diag.notificationSupport],
                    ['Service Worker API', diag.serviceWorkerSupport],
                    ['PushManager API', diag.pushManagerSupport],
                    ['SW registrerad', diag.swRegistered],
                  ].map(([label, val]) => (
                    <div key={label} className="flex items-center justify-between p-2 rounded bg-white/5">
                      <span className="text-white/60">{label}</span>
                      {val
                        ? <span className="text-green-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Ja</span>
                        : <span className="text-red-400 flex items-center gap-1"><XCircle className="w-3 h-3" /> Nej</span>
                      }
                    </div>
                  ))}
                  <div className="flex items-center justify-between p-2 rounded bg-white/5">
                    <span className="text-white/60">Notification.permission</span>
                    <span className={`${diag.permission === 'granted' ? 'text-green-400' : diag.permission === 'denied' ? 'text-red-400' : 'text-amber-400'}`}>
                      {diag.permission}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-white/5">
                    <span className="text-white/60">Push-prenumeration i browser</span>
                    {diag.subscription
                      ? <span className="text-green-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Ja</span>
                      : <span className="text-red-400 flex items-center gap-1"><XCircle className="w-3 h-3" /> Nej</span>
                    }
                  </div>
                  {diag.subscriptionEndpoint && (
                    <div className="p-2 rounded bg-white/5">
                      <span className="text-white/40">Endpoint: </span>
                      <span className="text-white/70">{diag.subscriptionEndpoint}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between p-2 rounded bg-white/5">
                    <span className="text-white/60">Mina aktiva prenumerationer i DB</span>
                    <span className={`${diag.myDbSubscriptions > 0 ? 'text-green-400' : 'text-red-400'}`}>{diag.myDbSubscriptions}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-white/5">
                    <span className="text-white/60">Totalt prenumerationer i DB</span>
                    <span className="text-white/70">{diag.dbSubscriptions}</span>
                  </div>
                  {diag.swScope && (
                    <div className="p-2 rounded bg-white/5">
                      <span className="text-white/40">SW scope: </span>
                      <span className="text-white/70">{diag.swScope}</span>
                    </div>
                  )}
                  {diag.error && (
                    <div className="p-2 rounded bg-red-900/30 border border-red-700">
                      <span className="text-red-400">Fel: {diag.error}</span>
                    </div>
                  )}
                  {diag.permission === 'denied' && (
                    <div className="p-3 rounded bg-amber-900/30 border border-amber-700 text-amber-300">
                      ⚠️ Notiser är blockerade av iOS. Gå till <strong>Inställningar → [Appnamn] → Notiser</strong> och aktivera dem manuellt.
                    </div>
                  )}
                  {!diag.standalone && (
                    <div className="p-3 rounded bg-blue-900/30 border border-blue-700 text-blue-300">
                      ℹ️ Appen körs INTE i standalone-läge. Push-notiser på iOS kräver att appen är installerad på hemskärmen.
                    </div>
                  )}
                </div>
              </CardContent>
            )}
          </Card>

          {/* Cache Manager */}
          <CacheManager />

          {/* Push Notifications */}
          <PushNotificationSetup />

          {/* Test Push Notification */}
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Send className="w-5 h-5" />
                Testa Push-notis
              </CardTitle>
              <CardDescription className="text-slate-400">
                Skicka en testnotis till dig själv för att verifiera att allt fungerar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={sendTestNotification}
                disabled={sendingTest}
                className="bg-blue-600 hover:bg-blue-500"
              >
                {sendingTest ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Skickar...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Skicka testnotis
                  </>
                )}
              </Button>
              <p className="text-sm text-slate-400 mt-3">
                Du måste först aktivera push-notiser ovan innan du kan testa
              </p>
            </CardContent>
          </Card>

          {/* Installation Guide */}
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Smartphone className="w-5 h-5" />
                Installationsguide
              </CardTitle>
              <CardDescription className="text-slate-400">
                Hur du installerar appen på olika enheter
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                  <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs">1</span>
                    iOS (Safari)
                  </h3>
                  <ol className="text-sm text-slate-300 space-y-1 ml-8">
                    <li>1. Öppna appen i Safari</li>
                    <li>2. Tryck på dela-ikonen (längst ner i mitten)</li>
                    <li>3. Scrolla ner och välj "Lägg till på hemskärmen"</li>
                    <li>4. Tryck på "Lägg till" längst upp till höger</li>
                  </ol>
                </div>

                <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                  <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center text-xs">2</span>
                    Android (Chrome)
                  </h3>
                  <ol className="text-sm text-slate-300 space-y-1 ml-8">
                    <li>1. Öppna appen i Chrome</li>
                    <li>2. Tryck på menyn (tre prickar längst upp till höger)</li>
                    <li>3. Välj "Installera app" eller "Lägg till på startskärmen"</li>
                    <li>4. Bekräfta installationen</li>
                  </ol>
                </div>

                <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                  <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-xs">3</span>
                    Desktop (Chrome/Edge)
                  </h3>
                  <ol className="text-sm text-slate-300 space-y-1 ml-8">
                    <li>1. Öppna appen i Chrome eller Edge</li>
                    <li>2. Leta efter installationsikonen i adressfältet</li>
                    <li>3. Klicka på "Installera"</li>
                    <li>4. Appen öppnas i ett eget fönster</li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Features */}
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Wifi className="w-5 h-5" />
                PWA-funktioner
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                  <Bell className="w-8 h-8 text-blue-400 mb-2" />
                  <h3 className="font-semibold text-white mb-1">Push-notiser</h3>
                  <p className="text-sm text-slate-400">
                    Få notiser om viktiga händelser även när appen är stängd
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                  <Wifi className="w-8 h-8 text-green-400 mb-2" />
                  <h3 className="font-semibold text-white mb-1">Offline-åtkomst</h3>
                  <p className="text-sm text-slate-400">
                    Fortsätt använda appen även utan internetanslutning
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                  <Smartphone className="w-8 h-8 text-purple-400 mb-2" />
                  <h3 className="font-semibold text-white mb-1">Native-känsla</h3>
                  <p className="text-sm text-slate-400">
                    Appen fungerar som en native app på din enhet
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                  <div className="w-8 h-8 text-amber-400 mb-2 flex items-center justify-center text-2xl">⚡</div>
                  <h3 className="font-semibold text-white mb-1">Snabb laddning</h3>
                  <p className="text-sm text-slate-400">
                    Cachning gör att appen laddar snabbare
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}