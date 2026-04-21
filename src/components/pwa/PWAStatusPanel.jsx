import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, XCircle, AlertTriangle, Send, Bell, Smartphone, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

function StatusRow({ label, ok, detail }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
      <div className="flex items-center gap-2.5">
        {ok === true
          ? <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
          : ok === false
          ? <XCircle className="w-4 h-4 text-red-400 shrink-0" />
          : <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />}
        <span className="text-white/80 text-sm">{label}</span>
      </div>
      {detail && <span className="text-white/40 text-xs">{detail}</span>}
    </div>
  );
}

export default function PWAStatusPanel() {
  const [swActive, setSwActive] = useState(null);
  const [hasPush, setHasPush] = useState(null);
  const [manifestDisplay, setManifestDisplay] = useState(null);
  const [sending, setSending] = useState(false);

  const { data: pushLogs = [] } = useQuery({
    queryKey: ['push_sync_logs'],
    queryFn: () => base44.entities.SyncLog.filter({ sync_type: 'push_notification' }, '-created_date', 5).catch(() => []),
    staleTime: 30000
  });

  const { data: pushSubs = [] } = useQuery({
    queryKey: ['push_subscriptions_all'],
    queryFn: () => base44.entities.PushSubscription.list('-created_date', 200).catch(() => []),
    staleTime: 60000
  });

  useEffect(() => {
    // SW check
    setSwActive('serviceWorker' in navigator && !!navigator.serviceWorker.controller);

    // Push subscription check
    if ('PushManager' in window && 'serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(reg => {
        reg.pushManager.getSubscription().then(sub => setHasPush(!!sub));
      }).catch(() => setHasPush(false));
    } else {
      setHasPush(false);
    }

    // Manifest display-mode
    fetch('/manifest.json')
      .then(r => r.json())
      .then(m => setManifestDisplay(m.display))
      .catch(() => setManifestDisplay(null));
  }, []);

  const sendTestPush = async () => {
    setSending(true);
    try {
      const user = await base44.auth.me();
      const res = await base44.functions.invoke('sendPushNotification', {
        userEmail: user.email,
        title: '✅ Testnotis',
        body: 'PWA-push fungerar korrekt.',
        data: { type: 'test' }
      });
      if (res.data?.success || res.data?.sent > 0) {
        toast.success('Testnotis skickad!');
      } else {
        toast.warning('Ingen aktiv prenumeration hittades');
      }
    } catch (e) {
      toast.error('Fel: ' + e.message);
    } finally {
      setSending(false);
    }
  };

  const uniqueUsers = new Set(pushSubs.map(s => s.user_email)).size;

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-white text-sm flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-signal" />
          PWA &amp; Notis-hälsa
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status checks */}
        <div>
          <StatusRow label="Service Worker registrerad" ok={swActive} detail={swActive ? 'Aktiv' : 'Ej aktiv'} />
          <StatusRow label="Push-prenumeration aktiv" ok={hasPush} detail={hasPush ? 'Ja' : 'Nej'} />
          <StatusRow
            label="manifest.json display"
            ok={manifestDisplay === 'standalone'}
            detail={manifestDisplay || '—'}
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/5 rounded-xl p-3 text-center">
            <p className="text-white font-bold text-xl">{pushSubs.length}</p>
            <p className="text-white/40 text-xs mt-0.5">Aktiva prenumerationer</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 text-center">
            <p className="text-white font-bold text-xl">{uniqueUsers}</p>
            <p className="text-white/40 text-xs mt-0.5">Användare med push</p>
          </div>
        </div>

        {/* Recent push logs */}
        {pushLogs.length > 0 && (
          <div>
            <p className="text-white/40 text-xs mb-2 font-brand">Senaste push-försök</p>
            <div className="space-y-1.5">
              {pushLogs.map(log => (
                <div key={log.id} className="flex items-center justify-between text-xs">
                  <span className={log.status === 'success' ? 'text-green-400' : 'text-red-400'}>
                    {log.status === 'success' ? '✓' : '✗'} {log.details?.title || log.sync_type}
                  </span>
                  <span className="text-white/30">
                    {log.created_date ? new Date(log.created_date).toLocaleTimeString('sv', { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Test button */}
        <Button
          size="sm"
          onClick={sendTestPush}
          disabled={sending}
          className="w-full bg-signal hover:bg-signal-hover text-white text-xs"
        >
          {sending ? (
            <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />Skickar...</>
          ) : (
            <><Send className="w-3 h-3 mr-2" />Skicka testnotis till mig</>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}