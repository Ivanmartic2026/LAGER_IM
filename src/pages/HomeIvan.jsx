import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { BarChart2, AlertTriangle, CheckCircle2, Zap, RefreshCw, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useState, useEffect } from 'react';

const STAGE_LABELS = {
  'SÄLJ': 'Sälj',
  'KONSTRUKTION': 'Konstruktion',
  'PRODUKTION': 'Produktion',
  'LAGER': 'Lager',
  'MONTERING': 'Montering'
};

export default function HomeIvan() {
  const [me, setMe] = useState(null);
  useEffect(() => { base44.auth.me().then(setMe).catch(() => {}); }, []);

  const { data: orders = [] } = useQuery({ queryKey: ['ivan-orders'], queryFn: () => base44.entities.Order.list('-created_date', 200) });
  const { data: tasks = [] } = useQuery({ queryKey: ['ivan-tasks'], queryFn: () => base44.entities.Task.list('-updated_date', 100) });
  const { data: syncLogs = [] } = useQuery({ queryKey: ['ivan-sync'], queryFn: () => base44.entities.SyncLog.list('-created_date', 50) });
  const { data: scans = [] } = useQuery({ queryKey: ['ivan-scans'], queryFn: () => base44.entities.LabelScan.list('-created_date', 100) });
  const { data: quarantine = [] } = useQuery({ queryKey: ['ivan-quarantine'], queryFn: () => base44.entities.Batch.filter({ status: 'quarantine' }) });
  const { data: notifications = [] } = useQuery({ queryKey: ['ivan-notifs'], queryFn: () => base44.entities.Notification.list('-created_date', 50) });

  // Pipeline by stage
  const pipelineData = Object.entries(STAGE_LABELS).map(([key, label]) => ({
    stage: label,
    count: orders.filter(o => o.status === key).length
  }));

  // This week deliveries
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + 1);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  const weekDeliveries = orders.filter(o => {
    if (!o.delivery_date) return false;
    const d = new Date(o.delivery_date);
    return d >= startOfWeek && d <= endOfWeek;
  });

  // Stuck tasks (in_progress > 3 days)
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 3600 * 1000);
  const stuckTasks = tasks.filter(t => t.status === 'in_progress' && new Date(t.updated_date || t.created_date) < threeDaysAgo);

  // Kimi stats today
  const todayStr = new Date().toISOString().split('T')[0];
  const todayScans = scans.filter(s => s.created_date?.startsWith(todayStr));
  const avgConfidence = todayScans.length > 0
    ? (todayScans.reduce((sum, s) => sum + (s.field_confidence?.overall || 0), 0) / todayScans.length).toFixed(2)
    : '—';
  const monthCost = scans.reduce((sum, s) => sum + (s.ai_cost_usd || 0), 0).toFixed(2);

  // Sync health today
  const todaySyncs = syncLogs.filter(s => s.created_date?.startsWith(todayStr));
  const failedSyncs = todaySyncs.filter(s => s.status === 'error');

  // Critical notifications
  const criticalNotifs = notifications.filter(n => n.priority === 'critical' && n.created_date > new Date(Date.now() - 24 * 3600 * 1000).toISOString());

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">🎯 Executive Dashboard</h1>
          <div className="flex gap-2">
            <Link to="/BatchReview">
              <Button size="sm" className="bg-red-600 hover:bg-red-700">✅ Godkänn karantän</Button>
            </Link>
            <Link to="/BatchReanalyze">
              <Button size="sm" variant="outline" className="border-white/20 text-white hover:bg-white/10">
                <RefreshCw className="w-4 h-4 mr-1" />Bulk-omanalys
              </Button>
            </Link>
          </div>
        </div>

        {/* Critical alerts */}
        {(quarantine.length > 0 || criticalNotifs.length > 0 || stuckTasks.length > 0) && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-2xl p-4 flex flex-wrap gap-4">
            {quarantine.length > 0 && <span className="text-red-300 font-semibold">🚨 {quarantine.length} batcher i karantän</span>}
            {stuckTasks.length > 0 && <span className="text-orange-300 font-semibold">⚠️ {stuckTasks.length} blockerade uppgifter</span>}
            {criticalNotifs.length > 0 && <span className="text-yellow-300 font-semibold">🔔 {criticalNotifs.length} kritiska notiser</span>}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {/* Pipeline chart */}
          <Card className="bg-white/5 border-white/10 md:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-base flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-blue-400" /> Pipeline per fas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={pipelineData} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="stage" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }} />
                  <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Kimi AI stats */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-400" /> Kimi AI idag
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-white/60 text-sm">Scanningar</span>
                <span className="text-white font-semibold">{todayScans.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60 text-sm">Avg confidence</span>
                <span className="text-white font-semibold">{avgConfidence}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60 text-sm">Kostnad månaden</span>
                <span className="text-white font-semibold">${monthCost}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60 text-sm">Totalt skannat</span>
                <span className="text-white font-semibold">{scans.length}</span>
              </div>
            </CardContent>
          </Card>

          {/* Week deliveries */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-400" /> Veckans leveranser ({weekDeliveries.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {weekDeliveries.length === 0 ? <p className="text-white/40 text-sm">Inga leveranser denna vecka</p> : (
                <div className="space-y-2">
                  {weekDeliveries.slice(0, 5).map(o => (
                    <div key={o.id} className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                      <span className="text-sm text-white truncate">{o.customer_name}</span>
                      <span className="text-xs text-white/40 flex-shrink-0 ml-2">{o.delivery_date}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Fortnox sync health */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-base flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-blue-400" /> Fortnox sync idag
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-white/60 text-sm">Synkar totalt</span>
                <span className="text-white font-semibold">{todaySyncs.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60 text-sm">Misslyckade</span>
                <span className={`font-semibold ${failedSyncs.length > 0 ? 'text-red-400' : 'text-green-400'}`}>{failedSyncs.length}</span>
              </div>
              <Link to="/FortnoxSync">
                <Button size="sm" variant="outline" className="w-full mt-2 border-white/20 text-white hover:bg-white/10 text-xs">Öppna Fortnox-vy</Button>
              </Link>
            </CardContent>
          </Card>

          {/* Stuck tasks */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-400" /> Flaskhalsar ({stuckTasks.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stuckTasks.length === 0 ? <p className="text-white/40 text-sm">Inga blockerade uppgifter</p> : (
                <div className="space-y-2">
                  {stuckTasks.slice(0, 5).map(t => (
                    <div key={t.id} className="flex items-center justify-between p-2 rounded-lg bg-orange-900/20">
                      <span className="text-sm text-white truncate">{t.name}</span>
                      <span className="text-xs text-orange-300 flex-shrink-0 ml-2">{t.assigned_to?.split('@')[0]}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quarantine inbox */}
          <Card className={`border-white/10 md:col-span-2 ${quarantine.length > 0 ? 'bg-red-900/20 border-red-500/30' : 'bg-white/5'}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-base flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-red-400" /> Karantän-inbox ({quarantine.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {quarantine.length === 0 ? <p className="text-white/40 text-sm">Ingen karantän ✅</p> : (
                <div className="space-y-2">
                  {quarantine.slice(0, 6).map(b => (
                    <Link key={b.id} to={`/BatchDetail?id=${b.id}`} className="flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                      <span className="text-sm text-white">{b.batch_number}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-white/40">{b.article_name || b.supplier_name || '—'}</span>
                        <Badge className="bg-red-500/30 text-red-300 border-0 text-xs">risk {b.risk_score || 0}</Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}