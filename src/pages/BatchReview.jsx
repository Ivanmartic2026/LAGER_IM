import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, XCircle, AlertTriangle, Lightbulb, Clock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const riskColors = {
  pending_verification: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  quarantine: "bg-red-500/20 text-red-400 border-red-500/30",
  verified: "bg-green-500/20 text-green-400 border-green-500/30",
  rejected: "bg-gray-500/20 text-gray-400 border-gray-500/30"
};

function BatchCard({ batch, onVerify, onReject, onQuarantine }) {
  return (
    <Card className="bg-white/5 border-white/10 hover:border-white/20 transition-all">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="font-mono font-bold text-white text-lg">{batch.batch_number}</div>
            {batch.article_name && <div className="text-white/60 text-sm">{batch.article_name}</div>}
          </div>
          <Badge className={`text-xs border ${riskColors[batch.status] || riskColors.pending_verification}`}>
            {batch.status}
          </Badge>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {batch.supplier_name && (
            <div><span className="text-white/40">Leverantör:</span> <span className="text-white/80">{batch.supplier_name}</span></div>
          )}
          {batch.risk_score !== undefined && (
            <div><span className="text-white/40">Riskpoäng:</span> <span className={batch.risk_score >= 70 ? 'text-red-400' : batch.risk_score >= 30 ? 'text-yellow-400' : 'text-green-400'}>{batch.risk_score}/100</span></div>
          )}
          {batch.quantity && (
            <div><span className="text-white/40">Kvantitet:</span> <span className="text-white/80">{batch.quantity}</span></div>
          )}
        </div>
        {batch.risk_flags && batch.risk_flags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {batch.risk_flags.map(f => (
              <span key={f} className="text-xs px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">{f.replace(/_/g, ' ')}</span>
            ))}
          </div>
        )}
        <div className="flex gap-2 pt-1">
          <Button size="sm" onClick={() => onVerify(batch.id)} className="bg-green-600/20 hover:bg-green-600/40 text-green-400 border border-green-500/30 flex-1">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Verifiera
          </Button>
          <Button size="sm" onClick={() => onReject(batch.id)} className="bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/30 flex-1">
            <XCircle className="w-3.5 h-3.5 mr-1" /> Avvisa
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SuggestionCard({ suggestion, onAccept, onReject }) {
  return (
    <Card className="bg-white/5 border-white/10">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <Badge className="text-xs bg-purple-500/20 text-purple-400 border-purple-500/30">
            {suggestion.suggestion_type?.replace(/_/g, ' ')}
          </Badge>
          <span className="text-white/40 text-xs">{Math.round((suggestion.confidence || 0) * 100)}% confidence</span>
        </div>
        <div className="space-y-1">
          <div className="text-sm text-white/40">Nuvarande: <span className="text-white/70 font-mono">{suggestion.current_value}</span></div>
          <div className="text-sm text-white/40">Förslag: <span className="text-white font-mono font-bold">{suggestion.suggested_value}</span></div>
        </div>
        {suggestion.reasoning && (
          <p className="text-white/50 text-xs bg-white/5 rounded p-2">{suggestion.reasoning}</p>
        )}
        <div className="flex gap-2">
          <Button size="sm" onClick={() => onAccept(suggestion.id)} className="bg-green-600/20 hover:bg-green-600/40 text-green-400 border border-green-500/30 flex-1">
            Acceptera
          </Button>
          <Button size="sm" onClick={() => onReject(suggestion.id)} className="bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/30 flex-1">
            Avvisa
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function BatchReview() {
  const qc = useQueryClient();

  const { data: pendingBatches = [] } = useQuery({
    queryKey: ['batches', 'pending_verification'],
    queryFn: () => base44.entities.Batch.filter({ status: 'pending_verification' }, '-created_date', 50)
  });

  const { data: quarantineBatches = [] } = useQuery({
    queryKey: ['batches', 'quarantine'],
    queryFn: () => base44.entities.Batch.filter({ status: 'quarantine' }, '-created_date', 50)
  });

  const { data: suggestions = [] } = useQuery({
    queryKey: ['batch_suggestions', 'pending'],
    queryFn: () => base44.entities.BatchSuggestion.filter({ status: 'pending' }, '-created_date', 50)
  });

  const updateBatch = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Batch.update(id, { status, verified_at: new Date().toISOString() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['batches'] });
      toast.success('Batch uppdaterad');
    }
  });

  const updateSuggestion = useMutation({
    mutationFn: ({ id, status }) => base44.entities.BatchSuggestion.update(id, { status, decided_at: new Date().toISOString() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['batch_suggestions'] });
      toast.success('Förslag hanterat');
    }
  });

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Batch Review</h1>
          <p className="text-white/50 mt-1">Granska och verifiera batcher från AI-scanning</p>
        </div>

        <Tabs defaultValue="pending">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="pending" className="data-[state=active]:bg-yellow-500/20 data-[state=active]:text-yellow-400">
              <Clock className="w-4 h-4 mr-1.5" />
              Väntar ({pendingBatches.length})
            </TabsTrigger>
            <TabsTrigger value="quarantine" className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400">
              <AlertTriangle className="w-4 h-4 mr-1.5" />
              Karantän ({quarantineBatches.length})
            </TabsTrigger>
            <TabsTrigger value="suggestions" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400">
              <Lightbulb className="w-4 h-4 mr-1.5" />
              Förslag ({suggestions.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4">
            {pendingBatches.length === 0 ? (
              <div className="text-center py-12 text-white/30">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-3" />
                <p>Inga batcher väntar på granskning</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {pendingBatches.map(b => (
                  <BatchCard
                    key={b.id}
                    batch={b}
                    onVerify={(id) => updateBatch.mutate({ id, status: 'verified' })}
                    onReject={(id) => updateBatch.mutate({ id, status: 'rejected' })}
                    onQuarantine={(id) => updateBatch.mutate({ id, status: 'quarantine' })}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="quarantine" className="mt-4">
            {quarantineBatches.length === 0 ? (
              <div className="text-center py-12 text-white/30">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-3" />
                <p>Inga batcher i karantän</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {quarantineBatches.map(b => (
                  <BatchCard
                    key={b.id}
                    batch={b}
                    onVerify={(id) => updateBatch.mutate({ id, status: 'verified' })}
                    onReject={(id) => updateBatch.mutate({ id, status: 'rejected' })}
                    onQuarantine={(id) => updateBatch.mutate({ id, status: 'quarantine' })}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="suggestions" className="mt-4">
            {suggestions.length === 0 ? (
              <div className="text-center py-12 text-white/30">
                <Lightbulb className="w-10 h-10 mx-auto mb-3" />
                <p>Inga aktiva förslag</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {suggestions.map(s => (
                  <SuggestionCard
                    key={s.id}
                    suggestion={s}
                    onAccept={(id) => updateSuggestion.mutate({ id, status: 'accepted' })}
                    onReject={(id) => updateSuggestion.mutate({ id, status: 'rejected' })}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}