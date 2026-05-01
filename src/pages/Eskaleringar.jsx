import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { AlertTriangle, Clock, CheckCircle2, ArrowUpCircle, RefreshCw, Filter } from 'lucide-react';

const WATCHED_STATUSES = ['in_transit', 'on_repair', 'pending_verification', 'unknown_delivery', 'on_its_way_home'];

const STATUS_LABELS = {
  in_transit: 'Under transport',
  on_repair: 'På reparation',
  pending_verification: 'Väntar verifiering',
  unknown_delivery: 'Okänd leverans',
  on_its_way_home: 'På väg hem',
};

const ESCALATION_COLORS = {
  none: 'bg-zinc-700 text-zinc-300',
  warned: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  escalated: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
  critical: 'bg-red-500/20 text-red-300 border-red-500/40',
};

function daysSince(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

function getDeadline(article) {
  if (article.status === 'in_transit') return article.transit_expected_date;
  if (article.status === 'on_repair') {
    if (!article.repair_date) return null;
    const d = new Date(article.repair_date);
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  }
  if (article.status === 'pending_verification') {
    if (!article.created_date) return null;
    const d = new Date(article.created_date);
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  }
  if (article.status === 'unknown_delivery') {
    if (!article.delivery_date) return null;
    const d = new Date(article.delivery_date);
    d.setDate(d.getDate() + 5);
    return d.toISOString().split('T')[0];
  }
  return null;
}

function SummaryCard({ status, count, icon: Icon, color }) {
  return (
    <div className={`rounded-xl border p-4 flex items-center gap-3 ${color}`}>
      <Icon className="w-5 h-5 opacity-70 flex-shrink-0" />
      <div>
        <div className="text-2xl font-bold">{count}</div>
        <div className="text-xs opacity-70">{STATUS_LABELS[status]}</div>
      </div>
    </div>
  );
}

export default function Eskaleringar() {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterEscalation, setFilterEscalation] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [snoozeDialog, setSnoozeDialog] = useState(null); // { article }
  const [snoozeDays, setSnoozeDays] = useState('7');
  const [snoozeReason, setSnoozeReason] = useState('');
  const [running, setRunning] = useState(false);

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ['escalation-articles'],
    queryFn: () => base44.entities.Article.list(),
    refetchInterval: 60000,
  });

  const watchedArticles = useMemo(() =>
    articles.filter(a => WATCHED_STATUSES.includes(a.status) && !a.escalation_resolved),
    [articles]
  );

  const counts = useMemo(() => {
    const c = {};
    for (const s of WATCHED_STATUSES) c[s] = watchedArticles.filter(a => a.status === s).length;
    return c;
  }, [watchedArticles]);

  const filtered = useMemo(() => {
    return watchedArticles.filter(a => {
      if (filterStatus !== 'all' && a.status !== filterStatus) return false;
      if (filterCategory !== 'all' && a.category !== filterCategory) return false;
      if (filterEscalation !== 'all' && (a.escalation_level || 'none') !== filterEscalation) return false;
      if (searchText && !a.name?.toLowerCase().includes(searchText.toLowerCase()) &&
          !a.sku?.toLowerCase().includes(searchText.toLowerCase()) &&
          !a.supplier_name?.toLowerCase().includes(searchText.toLowerCase())) return false;
      return true;
    }).sort((a, b) => {
      const order = { critical: 0, escalated: 1, warned: 2, none: 3 };
      return (order[a.escalation_level || 'none'] || 3) - (order[b.escalation_level || 'none'] || 3);
    });
  }, [watchedArticles, filterStatus, filterCategory, filterEscalation, searchText]);

  const categories = useMemo(() => [...new Set(articles.map(a => a.category).filter(Boolean))], [articles]);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Article.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['escalation-articles'] }),
  });

  const handleResolve = async (article) => {
    await updateMutation.mutateAsync({ id: article.id, data: { escalation_resolved: true } });
    toast.success('Markerad som hanterad');
  };

  const handleEscalateNow = async (article) => {
    const levels = ['none', 'warned', 'escalated', 'critical'];
    const current = article.escalation_level || 'none';
    const next = levels[Math.min(levels.indexOf(current) + 1, 3)];
    await updateMutation.mutateAsync({
      id: article.id,
      data: { escalation_level: next, last_escalation_at: new Date().toISOString() }
    });
    toast.success(`Eskaleringsnivå höjd till ${next}`);
  };

  const handleSnoozeConfirm = async () => {
    if (!snoozeDialog) return;
    if (!snoozeReason.trim()) { toast.error('Ange en anledning'); return; }
    const d = new Date();
    d.setDate(d.getDate() + parseInt(snoozeDays, 10));
    await updateMutation.mutateAsync({
      id: snoozeDialog.id,
      data: {
        escalation_snoozed_until: d.toISOString().split('T')[0],
        escalation_snooze_reason: snoozeReason,
      }
    });
    toast.success(`Pausad ${snoozeDays} dagar`);
    setSnoozeDialog(null);
    setSnoozeReason('');
  };

  const handleRunNow = async () => {
    setRunning(true);
    try {
      const res = await base44.functions.invoke('articleStatusWatch', { initial_run: false });
      toast.success(`Körning klar — ${res.data?.watched || 0} artiklar kontrollerade`);
      queryClient.invalidateQueries({ queryKey: ['escalation-articles'] });
    } catch (e) {
      toast.error('Körning misslyckades');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-brand text-white">Eskaleringar</h1>
            <p className="text-sm text-white/50 mt-1">Artiklar i vilostatus som kräver åtgärd</p>
          </div>
          <Button onClick={handleRunNow} disabled={running}
            className="bg-signal hover:bg-signal-hover text-white gap-2">
            <RefreshCw className={`w-4 h-4 ${running ? 'animate-spin' : ''}`} />
            {running ? 'Kör...' : 'Kör nu'}
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {WATCHED_STATUSES.map(s => (
            <SummaryCard key={s} status={s} count={counts[s] || 0}
              icon={s === 'on_repair' ? AlertTriangle : s === 'pending_verification' ? Clock : ArrowUpCircle}
              color="bg-zinc-900 border-zinc-700 text-white"
            />
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center bg-zinc-900 border border-zinc-800 rounded-xl p-3">
          <Filter className="w-4 h-4 text-white/40" />
          <Input
            placeholder="Sök artikel, SKU, leverantör..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            className="bg-zinc-800 border-zinc-700 text-white w-48 h-8 text-sm"
          />
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white h-8 w-40 text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
              <SelectItem value="all">Alla statusar</SelectItem>
              {WATCHED_STATUSES.map(s => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white h-8 w-36 text-sm">
              <SelectValue placeholder="Kategori" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
              <SelectItem value="all">Alla kategorier</SelectItem>
              {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterEscalation} onValueChange={setFilterEscalation}>
            <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white h-8 w-36 text-sm">
              <SelectValue placeholder="Eskalering" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
              <SelectItem value="all">Alla nivåer</SelectItem>
              <SelectItem value="none">Ingen</SelectItem>
              <SelectItem value="warned">Varnad</SelectItem>
              <SelectItem value="escalated">Eskalerad</SelectItem>
              <SelectItem value="critical">Kritisk</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-white/40 text-sm ml-auto">{filtered.length} artiklar</span>
        </div>

        {/* Article list */}
        {isLoading ? (
          <div className="text-white/40 text-center py-12">Laddar...</div>
        ) : filtered.length === 0 ? (
          <div className="text-white/40 text-center py-12 flex flex-col items-center gap-2">
            <CheckCircle2 className="w-8 h-8 text-green-500/50" />
            <span>Inga artiklar kräver åtgärd</span>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(article => {
              const deadline = getDeadline(article);
              const daysOld = daysSince(article.last_escalation_at || article.created_date);
              const daysUntilDeadline = deadline
                ? Math.floor((new Date(deadline) - Date.now()) / 86400000)
                : null;
              const escalLevel = article.escalation_level || 'none';

              return (
                <div key={article.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 flex-wrap">
                      <span className="font-semibold text-white truncate">{article.name}</span>
                      {article.sku && <span className="text-xs text-white/40">{article.sku}</span>}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-1.5">
                      <span className="text-xs bg-zinc-800 text-white/60 rounded px-2 py-0.5">
                        {STATUS_LABELS[article.status] || article.status}
                      </span>
                      {article.category && (
                        <span className="text-xs bg-zinc-800 text-white/60 rounded px-2 py-0.5">
                          {article.category}
                        </span>
                      )}
                      {article.supplier_name && (
                        <span className="text-xs text-white/40">{article.supplier_name}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    {deadline && (
                      <div className="text-center">
                        <div className={`text-xs ${daysUntilDeadline < 0 ? 'text-red-400' : 'text-amber-400'}`}>
                          {daysUntilDeadline < 0
                            ? `${Math.abs(daysUntilDeadline)}d sen`
                            : `${daysUntilDeadline}d kvar`}
                        </div>
                        <div className="text-xs text-white/30">deadline {deadline}</div>
                      </div>
                    )}
                    {article.assigned_to && (
                      <div className="text-xs text-white/50 max-w-[120px] truncate" title={article.assigned_to}>
                        {article.assigned_to}
                      </div>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded border ${ESCALATION_COLORS[escalLevel]}`}>
                      {escalLevel}
                    </span>
                    {article.escalation_snoozed_until && (
                      <span className="text-xs text-white/30">
                        Pausad t.o.m. {article.escalation_snoozed_until}
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2 flex-shrink-0">
                    <Button size="sm" variant="ghost"
                      className="text-white/50 hover:text-white hover:bg-zinc-800 text-xs h-7"
                      onClick={() => setSnoozeDialog(article)}>
                      Snooze
                    </Button>
                    <Button size="sm" variant="ghost"
                      className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 text-xs h-7"
                      onClick={() => handleEscalateNow(article)}>
                      Eskalera
                    </Button>
                    <Button size="sm" variant="ghost"
                      className="text-green-400 hover:text-green-300 hover:bg-green-500/10 text-xs h-7"
                      onClick={() => handleResolve(article)}>
                      Hanterad
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Snooze Dialog */}
      <Dialog open={!!snoozeDialog} onOpenChange={() => { setSnoozeDialog(null); setSnoozeReason(''); }}>
        <DialogContent className="bg-zinc-900 border-zinc-700 text-white">
          <DialogHeader>
            <DialogTitle>Snooze eskalering</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-white/60">{snoozeDialog?.name}</p>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Antal dagar</label>
              <Select value={snoozeDays} onValueChange={setSnoozeDays}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                  <SelectItem value="3">3 dagar</SelectItem>
                  <SelectItem value="7">7 dagar</SelectItem>
                  <SelectItem value="14">14 dagar</SelectItem>
                  <SelectItem value="30">30 dagar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Anledning (obligatorisk)</label>
              <Input
                value={snoozeReason}
                onChange={e => setSnoozeReason(e.target.value)}
                placeholder="Varför pausas eskaleringen?"
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setSnoozeDialog(null); setSnoozeReason(''); }}
              className="text-white/50">Avbryt</Button>
            <Button onClick={handleSnoozeConfirm} className="bg-signal hover:bg-signal-hover text-white">
              Spara snooze
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}