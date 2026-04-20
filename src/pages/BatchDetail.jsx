import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, AlertTriangle, Activity, Package, Users, Image, GitBranch, Tag } from "lucide-react";
import { format } from "date-fns";

const statusColors = {
  pending_verification: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  verified: "bg-green-500/20 text-green-400 border-green-500/30",
  rejected: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  quarantine: "bg-red-500/20 text-red-400 border-red-500/30"
};

function ConfidenceBar({ value, label }) {
  const pct = Math.round((value || 0) * 100);
  const color = pct >= 85 ? 'bg-green-500' : pct >= 60 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-3">
      <span className="text-white/50 text-xs w-32 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-white/70 text-xs w-8 text-right">{pct}%</span>
    </div>
  );
}

export default function BatchDetail() {
  const params = new URLSearchParams(window.location.search);
  const batchId = params.get('id');

  const { data: batches = [] } = useQuery({
    queryKey: ['batch', batchId],
    queryFn: () => base44.entities.Batch.filter({ id: batchId }),
    enabled: !!batchId
  });
  const batch = batches[0];

  const { data: labelScans = [] } = useQuery({
    queryKey: ['label_scans', batchId],
    queryFn: () => base44.entities.LabelScan.filter({ batch_id: batchId }, '-created_date', 20),
    enabled: !!batchId
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['batch_activity', batchId],
    queryFn: () => base44.entities.BatchActivity.filter({ batch_id: batchId }, '-created_date', 50),
    enabled: !!batchId
  });

  const { data: batchEvents = [] } = useQuery({
    queryKey: ['batch_events', batchId],
    queryFn: () => base44.entities.BatchEvent.filter({ batch_id: batchId }, '-timestamp', 50),
    enabled: !!batchId
  });

  const { data: supplierBatches = [] } = useQuery({
    queryKey: ['supplier_batches', batch?.supplier_id],
    queryFn: () => base44.entities.Batch.filter({ supplier_id: batch.supplier_id }, '-created_date', 20),
    enabled: !!batch?.supplier_id
  });

  if (!batchId) return <div className="min-h-screen bg-black flex items-center justify-center text-white/50">Inget batch-ID angivet</div>;
  if (!batch) return <div className="min-h-screen bg-black flex items-center justify-center text-white/50">Laddar...</div>;

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold font-mono">{batch.batch_number}</h1>
            {batch.article_name && <p className="text-white/60 mt-1">{batch.article_name}</p>}
          </div>
          <div className="flex gap-2 items-center">
            <div className={`px-2 py-1 rounded text-xs border ${batch.risk_score >= 70 ? 'bg-red-500/20 text-red-400 border-red-500/30' : batch.risk_score >= 30 ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' : 'bg-green-500/20 text-green-400 border-green-500/30'}`}>
              Risk: {batch.risk_score || 0}/100
            </div>
            <Badge className={`border ${statusColors[batch.status] || ''}`}>{batch.status}</Badge>
          </div>
        </div>

        {/* Info grid */}
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { label: 'Leverantör', value: batch.supplier_name },
            { label: 'SKU', value: batch.article_sku },
            { label: 'Kvantitet', value: batch.quantity },
            { label: 'Produktionsdatum', value: batch.production_date },
            { label: 'Tillverkningsdatum', value: batch.manufacturing_date },
            { label: 'Utgångsdatum', value: batch.expiry_date }
          ].filter(f => f.value).map(f => (
            <div key={f.label} className="bg-white/5 rounded-xl p-3">
              <p className="text-white/40 text-xs">{f.label}</p>
              <p className="text-white font-medium mt-0.5">{f.value}</p>
            </div>
          ))}
        </div>

        {batch.risk_flags && batch.risk_flags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {batch.risk_flags.map(f => (
              <span key={f} className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-400 border border-red-500/20">{f.replace(/_/g, ' ')}</span>
            ))}
          </div>
        )}

        {/* Aliases */}
        {batch.aliases && batch.aliases.length > 0 && (
          <div className="flex flex-wrap gap-1.5 items-center">
            <Tag className="w-3.5 h-3.5 text-white/30" />
            {batch.aliases.map(a => (
              <span key={a} className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/50">{a}</span>
            ))}
          </div>
        )}

        <Tabs defaultValue="scans">
          <TabsList className="bg-white/5 border border-white/10 flex-wrap h-auto gap-1">
            <TabsTrigger value="scans" className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400">
              <Image className="w-4 h-4 mr-1.5" /> Etiketthistorik ({labelScans.length})
            </TabsTrigger>
            <TabsTrigger value="events" className="data-[state=active]:bg-signal/20 data-[state=active]:text-signal">
              <GitBranch className="w-4 h-4 mr-1.5" /> Händelser ({batchEvents.length})
            </TabsTrigger>
            <TabsTrigger value="activity" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400">
              <Activity className="w-4 h-4 mr-1.5" /> Aktivitet ({activities.length})
            </TabsTrigger>
            <TabsTrigger value="supplier" className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">
              <Users className="w-4 h-4 mr-1.5" /> Leverantör
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scans" className="mt-4 space-y-4">
            {labelScans.length === 0 ? (
              <div className="text-center py-8 text-white/30">Inga scanningar hittades</div>
            ) : labelScans.map(scan => (
              <Card key={scan.id} className="bg-white/5 border-white/10">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start gap-4">
                    {scan.image_url && (
                      <img src={scan.image_url} alt="Label" className="w-24 h-24 object-cover rounded-lg border border-white/10 shrink-0" />
                    )}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge className={scan.status === 'completed' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'}>
                          {scan.status}
                        </Badge>
                        <span className="text-white/40 text-xs">{scan.ai_model_used}</span>
                        {scan.ai_cost_usd && <span className="text-white/40 text-xs">${scan.ai_cost_usd.toFixed(5)}</span>}
                        {scan.created_date && <span className="text-white/40 text-xs ml-auto">{format(new Date(scan.created_date), 'yyyy-MM-dd HH:mm')}</span>}
                      </div>
                      {scan.field_confidence && (
                        <div className="space-y-1">
                          {Object.entries(scan.field_confidence)
                            .filter(([k]) => k !== 'overall' && scan.extracted_fields?.[k])
                            .slice(0, 5)
                            .map(([key, val]) => (
                              <ConfidenceBar key={key} label={key} value={val} />
                            ))}
                          <ConfidenceBar label="overall" value={scan.field_confidence.overall} />
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="events" className="mt-4">
            {batchEvents.length === 0 ? (
              <div className="text-center py-8 text-white/30">Inga BatchEvents ännu</div>
            ) : (
              <div className="relative pl-6">
                <div className="absolute left-2 top-0 bottom-0 w-px bg-white/10" />
                {batchEvents.map((ev, i) => {
                  const iconMap = {
                    created: '🟢', received: '📦', verified: '✅', rejected: '❌',
                    quarantined: '🔴', alias_added: '🏷️', status_changed: '🔄',
                    merged: '🔀', repaired: '🔧', deployed: '🚀', returned: '↩️',
                    inspected: '🔍'
                  };
                  return (
                    <div key={ev.id} className="relative mb-4">
                      <div className="absolute -left-4 w-4 h-4 rounded-full bg-zinc-800 border border-white/20 flex items-center justify-center text-[9px]">
                        {iconMap[ev.event_type] || '·'}
                      </div>
                      <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-white/80 text-xs font-brand uppercase tracking-wider">{ev.event_type?.replace(/_/g, ' ')}</span>
                          <span className="text-white/30 text-[10px]">
                            {ev.timestamp && format(new Date(ev.timestamp), 'yyyy-MM-dd HH:mm')}
                          </span>
                        </div>
                        {(ev.from_status || ev.to_status) && (
                          <p className="text-white/50 text-[10px] mb-1">
                            {ev.from_status} → {ev.to_status}
                          </p>
                        )}
                        {ev.payload && Object.keys(ev.payload).length > 0 && (
                          <pre className="text-white/40 text-[10px] font-mono whitespace-pre-wrap bg-black/20 rounded p-2 mt-1 max-h-24 overflow-auto">
                            {JSON.stringify(ev.payload, null, 2)}
                          </pre>
                        )}
                        <p className="text-white/30 text-[10px] mt-1">{ev.actor}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="activity" className="mt-4 space-y-2">
            {activities.length === 0 ? (
              <div className="text-center py-8 text-white/30">Ingen aktivitetslogg</div>
            ) : activities.map(a => (
              <div key={a.id} className="flex gap-3 py-3 border-b border-white/5">
                <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-white/80 text-sm">{a.message}</p>
                  <p className="text-white/30 text-xs mt-0.5">{a.actor_name || a.actor_email} · {a.created_date && format(new Date(a.created_date), 'yyyy-MM-dd HH:mm')}</p>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="supplier" className="mt-4 space-y-4">
            {batch.supplier_name && (
              <Card className="bg-white/5 border-white/10">
                <CardHeader><CardTitle className="text-white text-sm">Andra batcher från {batch.supplier_name}</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {supplierBatches.filter(b => b.id !== batch.id).slice(0, 10).map(b => (
                      <a key={b.id} href={`/BatchDetail?id=${b.id}`} className="flex items-center justify-between py-2 border-b border-white/5 hover:bg-white/5 px-2 rounded">
                        <span className="font-mono text-white/80">{b.batch_number}</span>
                        <Badge className={`text-xs border ${statusColors[b.status] || ''}`}>{b.status}</Badge>
                      </a>
                    ))}
                    {supplierBatches.filter(b => b.id !== batch.id).length === 0 && (
                      <p className="text-white/30 text-sm">Inga andra batcher från denna leverantör</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}