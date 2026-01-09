import React, { useState } from 'react';
import { ArrowLeft, Smartphone, Bell, Wifi, Send } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import PushNotificationSetup from "@/components/pwa/PushNotificationSetup";

export default function PWASetupPage() {
  const [sendingTest, setSendingTest] = useState(false);

  const sendTestNotification = async () => {
    setSendingTest(true);
    try {
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