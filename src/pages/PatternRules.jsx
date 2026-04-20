import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { toast } from "sonner";
import { CheckCircle2, X, RefreshCw, Plus, ChevronRight, AlertTriangle, Cpu, Edit } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

function RuleCard({ rule, onApprove, onReject, onEdit, showActions = true }) {
  const [showBatches, setShowBatches] = useState(false);

  const { data: sampleBatches } = useQuery({
    queryKey: ['sample_batches', rule.id, showBatches],
    queryFn: () => Promise.all((rule.sample_batch_ids || []).slice(0, 5).map(id =>
      base44.entities.Batch.filter({ id }, '-created_date', 1).then(r => r[0]).catch(() => null)
    )),
    enabled: showBatches,
    initialData: []
  });

  const purityPct = Math.round((rule.confidence || 0) * 100);

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-[10px] font-brand border-zinc-600 text-zinc-400">
                {rule.pattern_type?.toUpperCase()}
              </Badge>
              <span className="font-mono text-white text-sm font-semibold">"{rule.pattern_value}"</span>
              {rule.source === 'ai_inferred' && (
                <Cpu className="w-3 h-3 text-signal/60" title="AI-inferred" />
              )}
            </div>
            {rule.preferred_supplier_name && (
              <p className="text-xs text-zinc-400">
                Leverantör: <span className="text-white">{rule.preferred_supplier_name}</span>
              </p>
            )}
            {rule.preferred_category && (
              <p className="text-xs text-zinc-400">
                Kategori: <span className="text-white">{rule.preferred_category}</span>
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className={cn(
              "text-sm font-bold",
              purityPct >= 90 ? "text-green-400" : purityPct >= 80 ? "text-amber-400" : "text-red-400"
            )}>{purityPct}%</span>
            <span className="text-[10px] text-zinc-500">säkerhet</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center gap-4 text-xs text-zinc-500 mb-3">
          <span>{rule.sample_count || 0} exempel</span>
          {(rule.conflict_count || 0) > 0 && (
            <span className="text-amber-400/80 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {rule.conflict_count} konflikter
            </span>
          )}
          <button
            onClick={() => setShowBatches(v => !v)}
            className="text-signal hover:text-signal/80 flex items-center gap-1"
          >
            Visa exempel <ChevronRight className={cn("w-3 h-3 transition-transform", showBatches && "rotate-90")} />
          </button>
        </div>

        {showBatches && (
          <div className="mb-3 space-y-1">
            {(sampleBatches || []).filter(Boolean).map(b => (
              <div key={b.id} className="text-xs font-mono text-zinc-300 bg-zinc-800 rounded px-2 py-1">
                {b.batch_number} {b.supplier_name ? <span className="text-zinc-500">— {b.supplier_name}</span> : null}
              </div>
            ))}
          </div>
        )}

        {showActions && (
          <div className="flex gap-2">
            {rule.status === 'suggested' && (
              <Button size="sm" className="flex-1 h-8 text-xs" onClick={() => onApprove(rule)}>
                <CheckCircle2 className="w-3 h-3 mr-1" /> Godkänn
              </Button>
            )}
            <Button size="sm" variant="ghost" className="h-8 text-xs text-zinc-400" onClick={() => onEdit(rule)}>
              <Edit className="w-3 h-3 mr-1" /> Redigera
            </Button>
            {rule.status !== 'rejected' && (
              <Button size="sm" variant="ghost" className="h-8 text-xs text-red-400 hover:text-red-300" onClick={() => onReject(rule)}>
                <X className="w-3 h-3 mr-1" /> Avvisa
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EditRuleModal({ rule, onClose, onSave }) {
  const [form, setForm] = useState({
    pattern_type: rule?.pattern_type || 'prefix',
    pattern_value: rule?.pattern_value || '',
    preferred_supplier_name: rule?.preferred_supplier_name || '',
    preferred_category: rule?.preferred_category || '',
    preferred_series: rule?.preferred_series || '',
    notes: rule?.notes || ''
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="font-brand">{rule?.id ? 'Redigera regel' : 'Skapa ny regel'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-zinc-400 text-xs">Mönstertyp</Label>
            <Select value={form.pattern_type} onValueChange={v => setForm(p => ({ ...p, pattern_type: v }))}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                <SelectItem value="prefix">Prefix (börjar med)</SelectItem>
                <SelectItem value="suffix">Suffix (slutar med)</SelectItem>
                <SelectItem value="regex">Regex</SelectItem>
                <SelectItem value="length">Längd (antal tecken)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-zinc-400 text-xs">Mönstervärde</Label>
            <Input
              value={form.pattern_value}
              onChange={e => setForm(p => ({ ...p, pattern_value: e.target.value }))}
              placeholder="t.ex. APP"
              className="bg-zinc-800 border-zinc-700 text-white mt-1"
            />
          </div>
          <div>
            <Label className="text-zinc-400 text-xs">Leverantör (namn)</Label>
            <Input
              value={form.preferred_supplier_name}
              onChange={e => setForm(p => ({ ...p, preferred_supplier_name: e.target.value }))}
              placeholder="t.ex. Novastar"
              className="bg-zinc-800 border-zinc-700 text-white mt-1"
            />
          </div>
          <div>
            <Label className="text-zinc-400 text-xs">Kategori</Label>
            <Input
              value={form.preferred_category}
              onChange={e => setForm(p => ({ ...p, preferred_category: e.target.value }))}
              placeholder="t.ex. LED Module"
              className="bg-zinc-800 border-zinc-700 text-white mt-1"
            />
          </div>
          <div>
            <Label className="text-zinc-400 text-xs">Serie</Label>
            <Input
              value={form.preferred_series}
              onChange={e => setForm(p => ({ ...p, preferred_series: e.target.value }))}
              placeholder="t.ex. Indoor"
              className="bg-zinc-800 border-zinc-700 text-white mt-1"
            />
          </div>
          <div>
            <Label className="text-zinc-400 text-xs">Anteckningar</Label>
            <Input
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              className="bg-zinc-800 border-zinc-700 text-white mt-1"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="ghost" onClick={onClose} className="flex-1 text-zinc-400">Avbryt</Button>
            <Button onClick={() => onSave(form)} className="flex-1">Spara</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function PatternRulesPage() {
  const qc = useQueryClient();
  const [editRule, setEditRule] = useState(null);
  const [isRunningInference, setIsRunningInference] = useState(false);

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['batch_pattern_rules'],
    queryFn: () => base44.entities.BatchPatternRule.list('-confidence', 200)
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['pattern_inference_logs'],
    queryFn: () => base44.entities.PatternInferenceLog.list('-started_at', 5)
  });

  const activeRules = rules.filter(r => r.status === 'active');
  const suggestedRules = rules.filter(r => r.status === 'suggested');
  const rejectedRules = rules.filter(r => r.status === 'rejected');

  const updateRule = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BatchPatternRule.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['batch_pattern_rules'] })
  });

  const createRule = useMutation({
    mutationFn: (data) => base44.entities.BatchPatternRule.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['batch_pattern_rules'] })
  });

  const handleApprove = async (rule) => {
    const me = await base44.auth.me();
    await updateRule.mutateAsync({ id: rule.id, data: { status: 'active', approved_by: me.email, approved_at: new Date().toISOString() } });
    toast.success('Regel godkänd och aktiverad');
  };

  const handleReject = async (rule) => {
    await updateRule.mutateAsync({ id: rule.id, data: { status: 'rejected' } });
    toast.info('Regel avvisad');
  };

  const handleSaveEdit = async (form) => {
    if (editRule?.id) {
      await updateRule.mutateAsync({ id: editRule.id, data: form });
      toast.success('Regel uppdaterad');
    } else {
      await createRule.mutateAsync({ ...form, status: 'active', source: 'manual' });
      toast.success('Ny regel skapad');
    }
    setEditRule(null);
  };

  const handleRunInference = async () => {
    setIsRunningInference(true);
    try {
      const r = await base44.functions.invoke('inferBatchPatterns', { triggered_by: 'manual' });
      const d = r.data;
      toast.success(`Klar! ${d.rules_created} nya regler, ${d.rules_updated} uppdaterade (${d.samples_analyzed} batcher analyserade)`);
      qc.invalidateQueries({ queryKey: ['batch_pattern_rules'] });
      qc.invalidateQueries({ queryKey: ['pattern_inference_logs'] });
    } catch (e) {
      toast.error(e.message);
    } finally {
      setIsRunningInference(false);
    }
  };

  const lastLog = logs[0];

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-brand text-white">Mönsterregler</h1>
          <p className="text-zinc-500 text-sm mt-1">
            AI-inferred och manuella regler för att identifiera leverantör från batchformat
          </p>
          {lastLog && (
            <p className="text-xs text-zinc-600 mt-1">
              Senast körd: {new Date(lastLog.started_at).toLocaleString('sv-SE')} — {lastLog.samples_analyzed} batcher, {lastLog.rules_created} nya regler
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setEditRule({})}
            className="border-zinc-700 text-zinc-300"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Skapa regel
          </Button>
          <Button
            size="sm"
            onClick={handleRunInference}
            disabled={isRunningInference}
            className="bg-signal hover:bg-signal-hover"
          >
            <RefreshCw className={cn("w-3.5 h-3.5 mr-1", isRunningInference && "animate-spin")} />
            {isRunningInference ? 'Analyserar...' : 'Kör inferens'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="suggestions">
        <TabsList className="bg-zinc-900 border border-zinc-800 mb-4">
          <TabsTrigger value="active" className="data-[state=active]:bg-signal data-[state=active]:text-white text-zinc-400">
            Aktiva ({activeRules.length})
          </TabsTrigger>
          <TabsTrigger value="suggestions" className="data-[state=active]:bg-signal data-[state=active]:text-white text-zinc-400">
            AI-förslag ({suggestedRules.length})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="data-[state=active]:bg-signal data-[state=active]:text-white text-zinc-400">
            Avvisade ({rejectedRules.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          {isLoading ? (
            <div className="text-zinc-500 text-sm text-center py-8">Laddar...</div>
          ) : activeRules.length === 0 ? (
            <div className="text-zinc-500 text-sm text-center py-8">
              Inga aktiva regler ännu. Godkänn AI-förslag eller skapa manuellt.
            </div>
          ) : (
            <div className="space-y-3">
              {activeRules.map(r => (
                <RuleCard key={r.id} rule={r} onApprove={handleApprove} onReject={handleReject} onEdit={setEditRule} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="suggestions">
          {isLoading ? (
            <div className="text-zinc-500 text-sm text-center py-8">Laddar...</div>
          ) : suggestedRules.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-zinc-500 text-sm mb-4">Inga AI-förslag ännu.</p>
              <Button size="sm" onClick={handleRunInference} disabled={isRunningInference}>
                <RefreshCw className={cn("w-3.5 h-3.5 mr-1", isRunningInference && "animate-spin")} />
                Kör mönsterinferens
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {suggestedRules.map(r => (
                <RuleCard key={r.id} rule={r} onApprove={handleApprove} onReject={handleReject} onEdit={setEditRule} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="rejected">
          {rejectedRules.length === 0 ? (
            <div className="text-zinc-500 text-sm text-center py-8">Inga avvisade regler.</div>
          ) : (
            <div className="space-y-3">
              {rejectedRules.map(r => (
                <RuleCard key={r.id} rule={r} onApprove={handleApprove} onReject={handleReject} onEdit={setEditRule} showActions />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {editRule !== null && (
        <EditRuleModal
          rule={editRule}
          onClose={() => setEditRule(null)}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  );
}