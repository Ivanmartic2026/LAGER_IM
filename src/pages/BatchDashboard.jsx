import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { AlertTriangle, CheckCircle2, TrendingUp, DollarSign, Scan, Users, Activity, RefreshCw } from "lucide-react";
import PWAStatusPanel from "@/components/pwa/PWAStatusPanel";
import { format, subDays } from "date-fns";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

function KPICard({ label, value, sub, icon: IconComponent, color = "blue" }) {
  const Icon = IconComponent;
  const colors = {
    blue: "text-blue-400 bg-blue-500/10",
    green: "text-green-400 bg-green-500/10",
    yellow: "text-yellow-400 bg-yellow-500/10",
    red: "text-red-400 bg-red-500/10",
    purple: "text-purple-400 bg-purple-500/10"
  };
  return (
    <Card className="bg-white/5 border-white/10">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-white/50 text-sm">{label}</p>
            <p className="text-2xl font-bold text-white mt-1">{value}</p>
            {sub && <p className="text-white/40 text-xs mt-0.5">{sub}</p>}
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color]}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function KimiStatusWidget() {
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState(null);

  const { data: recentHealthchecks = [] } = useQuery({
    queryKey: ['kimi_healthchecks'],
    queryFn: () => base44.entities.SyncLog.filter({ sync_type: 'kimi_healthcheck' }, '-created_date', 5),
    refetchInterval: 60000
  });

  const { data: scanLogs7d = [] } = useQuery({
    queryKey: ['kimi_scan_logs_7d'],
    queryFn: () => base44.entities.SyncLog.filter({ sync_type: 'kimi_label_scan' }, '-created_date', 200)
  });

  const lastCheck = recentHealthchecks[0];
  const isHealthy = lastCheck?.status === 'success';

  const scans7d = scanLogs7d.filter(l => {
    if (!l.created_date) return false;
    return (Date.now() - new Date(l.created_date).getTime()) < 7 * 86400000;
  });
  const fails7d = scans7d.filter(l => l.status === 'error').length;
  const avgConf = scans7d.filter(l => l.details?.confidence).length > 0
    ? (scans7d.reduce((sum, l) => sum + (l.details?.confidence || 0), 0) / scans7d.filter(l => l.details?.confidence).length * 100).toFixed(0)
    : null;

  const runHealthcheck = async () => {
    setChecking(true);
    setCheckResult(null);
    try {
      const r = await base44.functions.invoke('kimiHealthcheck', {});
      setCheckResult(r.data);
    } catch (e) {
      setCheckResult({ ok: false, error: e.message });
    } finally {
      setChecking(false);
    }
  };

  return (
    <Card className={`border ${isHealthy ? 'border-green-500/30 bg-green-500/5' : lastCheck ? 'border-red-500/30 bg-red-500/5' : 'border-white/10 bg-white/5'}`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isHealthy ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
              <Activity className={`w-5 h-5 ${isHealthy ? 'text-green-400' : 'text-red-400'}`} />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Kimi AI-status</p>
              {lastCheck ? (
                <p className={`text-xs mt-0.5 ${isHealthy ? 'text-green-400' : 'text-red-400'}`}>
                  {isHealthy ? '✅ Online' : `❌ ${lastCheck.error_message || 'Offline'}`}
                  {lastCheck.created_date && (
                    <span className="text-white/30 ml-2">· {format(new Date(lastCheck.created_date), 'HH:mm dd/MM')}</span>
                  )}
                </p>
              ) : (
                <p className="text-xs text-white/40 mt-0.5">Ingen healthcheck körts än</p>
              )}
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={runHealthcheck}
            disabled={checking}
            className="border-white/20 text-white hover:bg-white/10 text-xs shrink-0"
          >
            <RefreshCw className={`w-3 h-3 mr-1.5 ${checking ? 'animate-spin' : ''}`} />
            {checking ? 'Testar...' : 'Testa nu'}
          </Button>
        </div>

        {checkResult && (
          <div className={`mt-3 p-2.5 rounded-lg text-xs ${checkResult.ok ? 'bg-green-500/10 text-green-300' : 'bg-red-500/10 text-red-300'}`}>
            {checkResult.ok ? `✅ API svarar (${checkResult.duration_ms}ms)` : `❌ ${checkResult.error}`}
          </div>
        )}

        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="bg-white/5 rounded-lg p-2.5 text-center">
            <p className="text-white font-bold text-lg">{scans7d.length}</p>
            <p className="text-white/40 text-xs">Scanningar 7d</p>
          </div>
          <div className="bg-white/5 rounded-lg p-2.5 text-center">
            <p className={`font-bold text-lg ${fails7d > 0 ? 'text-red-400' : 'text-green-400'}`}>{fails7d}</p>
            <p className="text-white/40 text-xs">Fel 7d</p>
          </div>
          <div className="bg-white/5 rounded-lg p-2.5 text-center">
            <p className="text-white font-bold text-lg">{avgConf !== null ? `${avgConf}%` : '—'}</p>
            <p className="text-white/40 text-xs">Avg confidence</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function BatchDashboard() {
  const { data: allBatches = [] } = useQuery({
    queryKey: ['batches_all'],
    queryFn: () => base44.entities.Batch.list('-created_date', 200)
  });

  const { data: recentScans = [] } = useQuery({
    queryKey: ['label_scans_recent'],
    queryFn: () => base44.entities.LabelScan.list('-created_date', 200)
  });

  const { data: pendingBatches = [] } = useQuery({
    queryKey: ['batches_pending'],
    queryFn: () => base44.entities.Batch.filter({ status: 'pending_verification' }, '-created_date', 100)
  });

  const { data: quarantineBatches = [] } = useQuery({
    queryKey: ['batches_quarantine'],
    queryFn: () => base44.entities.Batch.filter({ status: 'quarantine' }, '-created_date', 100)
  });

  const { data: suggestions = [] } = useQuery({
    queryKey: ['suggestions_pending'],
    queryFn: () => base44.entities.BatchSuggestion.filter({ status: 'pending' }, '-created_date', 50)
  });

  // Calculate KPIs
  const totalScans = recentScans.length;
  const completedScans = recentScans.filter(s => s.status === 'completed');
  const avgConfidence = completedScans.length > 0
    ? (completedScans.reduce((sum, s) => sum + (s.field_confidence?.overall || 0), 0) / completedScans.length * 100).toFixed(0)
    : 0;
  const totalCost = recentScans.reduce((sum, s) => sum + (s.ai_cost_usd || 0), 0).toFixed(4);

  // Scans per day (last 14 days)
  const scansPerDay = [];
  for (let i = 13; i >= 0; i--) {
    const day = subDays(new Date(), i);
    const dayStr = format(day, 'MM-dd');
    const count = recentScans.filter(s => {
      if (!s.created_date) return false;
      return format(new Date(s.created_date), 'MM-dd') === dayStr;
    }).length;
    scansPerDay.push({ day: dayStr, scans: count });
  }

  // Confidence per supplier
  const supplierConfidence = {};
  completedScans.forEach(s => {
    const supplier = s.extracted_fields?.supplier_name || 'Okänd';
    if (!supplierConfidence[supplier]) supplierConfidence[supplier] = { total: 0, count: 0 };
    supplierConfidence[supplier].total += (s.field_confidence?.overall || 0);
    supplierConfidence[supplier].count++;
  });
  const supplierChart = Object.entries(supplierConfidence)
    .map(([name, { total, count }]) => ({ name: name.substring(0, 15), confidence: Math.round(total / count * 100) }))
    .sort((a, b) => a.confidence - b.confidence)
    .slice(0, 8);

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Batch Dashboard</h1>
            <p className="text-white/50 mt-1">AI-scanning översikt och kvalitetsstatistik</p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" className="border-white/20 text-white hover:bg-white/10">
              <Link to="/BatchReview">Granska batcher</Link>
            </Button>
            <Button asChild className="bg-blue-600 hover:bg-blue-700">
              <Link to="/BatchReanalyze">Omanalysera</Link>
            </Button>
          </div>
        </div>

        {/* Kimi AI Status */}
        <KimiStatusWidget />

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard label="Totala scanningar" value={totalScans} icon={Scan} color="blue" />
          <KPICard label="AI-träffsäkerhet" value={`${avgConfidence}%`} sub="Genomsnitt confidence" icon={TrendingUp} color="green" />
          <KPICard label="Kimi-kostnad" value={`$${totalCost}`} sub="Totalt all tid" icon={DollarSign} color="purple" />
          <KPICard label="Högrisk just nu" value={quarantineBatches.length} sub="I karantän" icon={AlertTriangle} color="red" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard label="Väntar granskning" value={pendingBatches.length} icon={CheckCircle2} color="yellow" />
          <KPICard label="Förslag aktiva" value={suggestions.length} icon={Users} color="purple" />
          <KPICard label="Totala batcher" value={allBatches.length} icon={CheckCircle2} color="green" />
          <KPICard
            label="Verifierade"
            value={allBatches.filter(b => b.status === 'verified').length}
            sub={`${allBatches.length > 0 ? Math.round(allBatches.filter(b => b.status === 'verified').length / allBatches.length * 100) : 0}% av totalt`}
            icon={CheckCircle2}
            color="green"
          />
        </div>

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white text-sm">Scanningar per dag (14 dagar)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={scansPerDay}>
                  <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }} />
                  <Line type="monotone" dataKey="scans" stroke="#3b82f6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white text-sm">AI-confidence per leverantör</CardTitle>
            </CardHeader>
            <CardContent>
              {supplierChart.length === 0 ? (
                <div className="h-[180px] flex items-center justify-center text-white/30 text-sm">Ingen data ännu</div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={supplierChart} layout="vertical">
                    <XAxis type="number" domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} width={80} />
                    <Tooltip contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }} />
                    <Bar dataKey="confidence" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* PWA & Push Health */}
        <PWAStatusPanel />

        {/* Quarantine alert */}
        {quarantineBatches.length > 0 && (
          <Card className="bg-red-500/10 border-red-500/30">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <div>
                  <p className="text-red-400 font-medium">{quarantineBatches.length} batcher i karantän</p>
                  <p className="text-white/50 text-sm">Dessa blockerar Fortnox-synk tills de verifieras</p>
                </div>
              </div>
              <Button asChild className="bg-red-600 hover:bg-red-700">
                <Link to="/BatchReview">Hantera nu</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}