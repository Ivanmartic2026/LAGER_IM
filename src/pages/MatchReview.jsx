import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { toast } from "sonner";
import { CheckCircle2, X, Eye, AlertTriangle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_COLORS = {
  pending: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  approved: 'bg-green-500/10 text-green-400 border-green-500/30',
  rejected: 'bg-red-500/10 text-red-400 border-red-500/30'
};

const REASON_LABELS = {
  low_confidence: 'Låg konfidens',
  ambiguous_match: 'Tvetydig matchning',
  supplier_mismatch: 'Leverantörsmismatch',
  no_po_match: 'Ingen PO-matchning',
  no_article_match: 'Ingen artikelmatchning'
};

export default function MatchReviewPage() {
  const qc = useQueryClient();
  const [selectedEntry, setSelectedEntry] = useState(null);

  const { data: queue = [], isLoading } = useQuery({
    queryKey: ['match_review_queue'],
    queryFn: () => base44.entities.MatchReviewQueue.filter({ status: 'pending' }, '-created_date', 50)
  });

  const { data: resolvedQueue = [] } = useQuery({
    queryKey: ['match_review_queue_resolved'],
    queryFn: () => base44.entities.MatchReviewQueue.list('-updated_date', 20)
  });

  const updateEntry = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MatchReviewQueue.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['match_review_queue'] });
      qc.invalidateQueries({ queryKey: ['match_review_queue_resolved'] });
    }
  });

  const handleApprove = async (entry, batchId) => {
    const me = await base44.auth.me();
    await updateEntry.mutateAsync({
      id: entry.id,
      data: {
        status: 'approved',
        approved_batch_id: batchId,
        reviewed_by: me.email,
        reviewed_at: new Date().toISOString()
      }
    });
    // Update LabelScan
    if (entry.label_scan_id) {
      await base44.entities.LabelScan.update(entry.label_scan_id, {
        batch_id: batchId,
        status: 'completed'
      }).catch(() => {});
    }
    toast.success('Matchning godkänd');
    setSelectedEntry(null);
  };

  const handleReject = async (entry) => {
    const me = await base44.auth.me();
    await updateEntry.mutateAsync({
      id: entry.id,
      data: {
        status: 'rejected',
        reviewed_by: me.email,
        reviewed_at: new Date().toISOString()
      }
    });
    toast.info('Matchning avvisad');
    setSelectedEntry(null);
  };

  const pendingQueue = queue.filter(e => e.status === 'pending');

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-brand text-white">Match Review Queue</h1>
        <p className="text-zinc-500 text-sm mt-1">
          Tvetydiga scanningar som kräver manuell matchning
        </p>
      </div>

      {pendingQueue.length > 0 && (
        <div className="mb-2 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-sm text-amber-400">{pendingQueue.length} väntande</span>
        </div>
      )}

      {isLoading ? (
        <div className="text-zinc-500 text-center py-12">Laddar...</div>
      ) : pendingQueue.length === 0 ? (
        <div className="text-center py-12">
          <CheckCircle2 className="w-12 h-12 text-green-400/30 mx-auto mb-3" />
          <p className="text-zinc-500">Inga väntande granskningar</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pendingQueue.map(entry => (
            <Card key={entry.id} className="bg-zinc-900 border-zinc-800 cursor-pointer hover:border-zinc-600 transition-colors" onClick={() => setSelectedEntry(entry)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={cn("text-[10px] border", STATUS_COLORS[entry.status])}>
                        {entry.status === 'pending' ? 'Väntande' : entry.status}
                      </Badge>
                      {entry.reason && (
                        <span className="text-xs text-zinc-500">{REASON_LABELS[entry.reason] || entry.reason}</span>
                      )}
                      <span className="text-xs text-zinc-600 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(entry.created_date).toLocaleString('sv-SE')}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-400 space-y-0.5">
                      {entry.extracted_summary?.batch_number && (
                        <p>Batch: <span className="text-white font-mono">{entry.extracted_summary.batch_number}</span></p>
                      )}
                      {entry.extracted_summary?.article_name && (
                        <p>Artikel: <span className="text-zinc-200">{entry.extracted_summary.article_name}</span></p>
                      )}
                      <p>Kandidater: {(entry.candidate_batch_ids || []).length} batch, {(entry.candidate_article_ids || []).length} artikel</p>
                    </div>
                  </div>
                  {entry.image_url && (
                    <img src={entry.image_url} alt="scan" className="w-16 h-16 object-cover rounded-lg bg-zinc-800 shrink-0" />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedEntry && (
        <ReviewDetailModal
          entry={selectedEntry}
          onApprove={handleApprove}
          onReject={handleReject}
          onClose={() => setSelectedEntry(null)}
        />
      )}
    </div>
  );
}

function ReviewDetailModal({ entry, onApprove, onReject, onClose }) {
  const [selectedBatchId, setSelectedBatchId] = useState(null);

  const { data: candidateBatches = [] } = useQuery({
    queryKey: ['candidate_batches', entry.id],
    queryFn: () => Promise.all((entry.candidate_batch_ids || []).map(id =>
      base44.entities.Batch.filter({ id }, '-created_date', 1).then(r => r[0]).catch(() => null)
    )).then(r => r.filter(Boolean)),
    enabled: (entry.candidate_batch_ids || []).length > 0
  });

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-t-3xl md:rounded-2xl p-6 max-w-lg w-full max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-brand text-white">Granska matchning</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {entry.image_url && (
          <img src={entry.image_url} alt="scan" className="w-full h-48 object-contain rounded-xl bg-zinc-800 mb-4" />
        )}

        {/* Extracted info */}
        <div className="bg-zinc-800/50 rounded-xl p-3 mb-4 space-y-1 text-sm">
          {Object.entries(entry.extracted_summary || {}).map(([k, v]) =>
            v && typeof v === 'string' ? (
              <div key={k} className="flex justify-between">
                <span className="text-zinc-500 capitalize">{k.replace(/_/g, ' ')}</span>
                <span className="text-white font-mono text-xs">{v}</span>
              </div>
            ) : null
          )}
        </div>

        {/* Candidate batches */}
        {candidateBatches.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-zinc-500 mb-2 font-brand">VÄLJ RÄTT BATCH</p>
            <div className="space-y-2">
              {candidateBatches.map(batch => (
                <button
                  key={batch.id}
                  onClick={() => setSelectedBatchId(batch.id)}
                  className={cn(
                    "w-full text-left p-3 rounded-xl border transition-colors",
                    selectedBatchId === batch.id
                      ? "border-signal bg-signal/10"
                      : "border-zinc-700 bg-zinc-800/30 hover:border-zinc-500"
                  )}
                >
                  <p className="text-white text-sm font-mono">{batch.batch_number}</p>
                  <p className="text-zinc-500 text-xs">{batch.article_name} {batch.supplier_name ? `— ${batch.supplier_name}` : ''}</p>
                  {entry.confidence_scores?.[batch.id] && (
                    <p className="text-xs text-signal mt-1">{Math.round(entry.confidence_scores[batch.id] * 100)}% konfidens</p>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => onReject(entry)} className="text-red-400 hover:text-red-300 flex-1">
            <X className="w-4 h-4 mr-1" /> Avvisa
          </Button>
          <Button
            onClick={() => selectedBatchId && onApprove(entry, selectedBatchId)}
            disabled={!selectedBatchId}
            className="flex-1"
          >
            <CheckCircle2 className="w-4 h-4 mr-1" /> Godkänn matchning
          </Button>
        </div>
      </div>
    </div>
  );
}