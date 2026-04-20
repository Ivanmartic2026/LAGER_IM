/**
 * /MatchReview — Granskning av MatchReviewQueue
 * Visar pending-poster med bild + extraherad data + kandidater sida vid sida.
 * Godkänn → kör scanAndProcess med user_decision, skriver BatchEvent.
 * Avvisa → markerar som rejected.
 */
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { CheckCircle2, XCircle, Clock, Package, Layers, RefreshCw, Search } from 'lucide-react';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';

const reasonLabel = {
  low_confidence: 'Låg confidence',
  ambiguous_match: 'Ambiguös match',
  supplier_mismatch: 'Leverantörsmismatch',
  no_po_match: 'Ingen PO-match',
  no_article_match: 'Ingen artikelmatch'
};

const actionLabel = {
  link_existing_batch: 'Länka till befintlig batch',
  create_new_batch: 'Skapa ny batch',
  merge_into: 'Slå ihop',
  reject: 'Avvisa'
};

export default function MatchReview() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [articleSearch, setArticleSearch] = useState('');
  const [articleResults, setArticleResults] = useState([]);

  const { data: queue = [], isLoading } = useQuery({
    queryKey: ['match_review_queue'],
    queryFn: () => base44.entities.MatchReviewQueue.filter({ status: 'pending' }, '-created_date', 50)
  });

  const { data: allBatches = [] } = useQuery({
    queryKey: ['batches_for_review'],
    queryFn: () => base44.entities.Batch.list('-updated_date', 200)
  });

  const selected = queue.find(q => q.id === selectedId);

  const candidateBatches = (selected?.candidate_batch_ids || [])
    .map(id => allBatches.find(b => b.id === id))
    .filter(Boolean);

  const handleSearchArticle = async (q) => {
    setArticleSearch(q);
    if (q.length < 2) { setArticleResults([]); return; }
    const all = await base44.entities.Article.list('-updated_date', 100);
    setArticleResults(all.filter(a =>
      (a.name || '').toLowerCase().includes(q.toLowerCase()) ||
      (a.sku || '').toLowerCase().includes(q.toLowerCase())
    ).slice(0, 8));
  };

  const handleApprove = async (decision, extra = {}) => {
    if (!selected) return;
    setProcessing(true);
    try {
      const resp = await base44.functions.invoke('scanAndProcess', {
        image_urls: [selected.image_url],
        context: selected.context || 'manual_scan',
        context_reference_id: selected.context_reference_id,
        user_decision: decision,
        user_selected_article_id: extra.article_id,
        article_data: extra.article_data,
        review_queue_id: selected.id
      });

      const user = await base44.auth.me();
      await base44.entities.MatchReviewQueue.update(selected.id, {
        status: 'approved',
        approved_batch_id: resp.data?.batch_id,
        approved_article_id: resp.data?.article_id,
        reviewed_by: user?.email,
        reviewed_at: new Date().toISOString()
      });

      toast.success('Godkänt och domän-action utförd');
      qc.invalidateQueries({ queryKey: ['match_review_queue'] });
      setSelectedId(null);
    } catch (e) {
      toast.error(`Fel: ${e.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selected) return;
    setProcessing(true);
    try {
      const user = await base44.auth.me();
      await base44.entities.MatchReviewQueue.update(selected.id, {
        status: 'rejected',
        reviewed_by: user?.email,
        reviewed_at: new Date().toISOString()
      });
      toast.info('Avvisat');
      qc.invalidateQueries({ queryKey: ['match_review_queue'] });
      setSelectedId(null);
    } catch (e) {
      toast.error(`Fel: ${e.message}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-brand text-2xl uppercase tracking-wide">Match Review</h1>
            <p className="text-white/50 text-sm mt-1">Granska scanning-ärenden med confidence &lt; 90%</p>
          </div>
          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 font-brand">
            {queue.length} väntande
          </Badge>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Lista */}
          <div className="space-y-3">
            {isLoading && <p className="text-white/30 text-center py-8">Laddar…</p>}
            {!isLoading && queue.length === 0 && (
              <div className="text-center py-12 text-white/30">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-green-500/50" />
                <p>Inga väntande ärenden</p>
              </div>
            )}
            {queue.map(item => (
              <button
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  selectedId === item.id
                    ? 'border-signal bg-signal/10'
                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                }`}
              >
                <div className="flex items-start gap-3">
                  {item.image_url && (
                    <img src={item.image_url} alt="" className="w-16 h-16 rounded-lg object-cover bg-zinc-800 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]">
                        {reasonLabel[item.reason] || item.reason}
                      </Badge>
                    </div>
                    <p className="text-white/80 text-sm truncate font-mono">
                      {item.extracted_summary?.batch_number || item.extracted_summary?.article_name || '(okänd)'}
                    </p>
                    <p className="text-white/40 text-xs mt-1">
                      {item.created_date && format(new Date(item.created_date), 'yyyy-MM-dd HH:mm')}
                      {' · '}{item.candidate_batch_ids?.length || 0} kandidater
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Detail */}
          <div>
            {!selected && (
              <div className="flex items-center justify-center h-48 text-white/20 border border-white/5 rounded-xl">
                Välj ett ärende
              </div>
            )}
            {selected && (
              <Card className="bg-white/5 border-white/10">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white text-sm font-brand uppercase tracking-wide">
                    Granska ärende
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Bild + data sida vid sida */}
                  <div className="grid grid-cols-2 gap-3">
                    {selected.image_url && (
                      <div>
                        <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1">Scannad bild</p>
                        <img src={selected.image_url} alt="" className="w-full rounded-lg object-contain bg-zinc-800 border border-white/10 max-h-40" />
                      </div>
                    )}
                    <div className="space-y-2">
                      <p className="text-white/40 text-[10px] uppercase tracking-wider">Extraherat</p>
                      {Object.entries(selected.extracted_summary || {})
                        .filter(([, v]) => v && typeof v === 'string')
                        .map(([k, v]) => (
                          <div key={k}>
                            <p className="text-white/30 text-[10px]">{k}</p>
                            <p className="text-white text-xs font-mono truncate">{v}</p>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Kandidat-batcher */}
                  {candidateBatches.length > 0 && (
                    <div>
                      <p className="text-white/40 text-[10px] uppercase tracking-wider mb-2">Kandidat-batcher</p>
                      <div className="space-y-2">
                        {candidateBatches.map(b => (
                          <div key={b.id} className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/10">
                            <div>
                              <p className="text-white text-xs font-mono">{b.batch_number}</p>
                              <p className="text-white/40 text-[10px]">{b.article_name}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-white/50 text-[10px]">
                                conf: {Math.round((selected.confidence_scores?.[b.id] || 0) * 100)}%
                              </span>
                              <Button
                                size="sm"
                                className="h-7 text-xs bg-signal/20 text-signal hover:bg-signal/30 border-0"
                                onClick={() => handleApprove('new_batch_for_article', { article_id: b.article_id })}
                                disabled={processing}
                              >
                                Länka
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sök artikel för new_batch_for_article */}
                  <div>
                    <p className="text-white/40 text-[10px] uppercase tracking-wider mb-2">Länka till annan artikel</p>
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 w-3 h-3 text-white/30" />
                      <Input
                        value={articleSearch}
                        onChange={e => handleSearchArticle(e.target.value)}
                        placeholder="Sök artikel…"
                        className="bg-zinc-800 border-zinc-700 text-white text-xs pl-8 h-9"
                      />
                    </div>
                    {articleResults.map(a => (
                      <button
                        key={a.id}
                        onClick={() => handleApprove('new_batch_for_article', { article_id: a.id })}
                        className="w-full flex items-center gap-2 p-2 mt-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-left"
                        disabled={processing}
                      >
                        <Package className="w-4 h-4 text-white/40 shrink-0" />
                        <div>
                          <p className="text-white text-xs">{a.name}</p>
                          {a.sku && <p className="text-white/40 text-[10px]">{a.sku}</p>}
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
                    <Button
                      onClick={() => handleApprove('new_article_and_batch')}
                      disabled={processing}
                      className="w-full bg-signal hover:bg-signal-hover text-white font-brand uppercase text-xs tracking-wider"
                    >
                      <Layers className="w-3.5 h-3.5 mr-2" /> Skapa ny artikel + batch
                    </Button>
                    <Button
                      onClick={handleReject}
                      disabled={processing}
                      variant="outline"
                      className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 font-brand uppercase text-xs tracking-wider"
                    >
                      <XCircle className="w-3.5 h-3.5 mr-2" /> Avvisa
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}