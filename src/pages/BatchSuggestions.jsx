import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, XCircle, Clock, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';

const TYPE_LABELS = {
  supplier_link: 'Leverantörskoppling',
  article_link: 'Artikelkoppling',
  batch_number_correction: 'Batchnummerkorrigering',
  date_fill: 'Datumfyllning',
  pattern_normalization: 'Mönstermormalisering',
  reanalyze_image: 'Omanalysera bild',
  merge_duplicate: 'Slå ihop duplikat'
};

const TYPE_COLORS = {
  supplier_link: 'bg-blue-500/20 text-blue-300',
  article_link: 'bg-purple-500/20 text-purple-300',
  batch_number_correction: 'bg-yellow-500/20 text-yellow-300',
  date_fill: 'bg-green-500/20 text-green-300',
  pattern_normalization: 'bg-orange-500/20 text-orange-300',
  reanalyze_image: 'bg-cyan-500/20 text-cyan-300',
  merge_duplicate: 'bg-red-500/20 text-red-300'
};

export default function BatchSuggestions() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: suggestions = [], isLoading } = useQuery({
    queryKey: ['batch-suggestions'],
    queryFn: () => base44.entities.BatchSuggestion.filter({ status: 'pending' })
  });

  const { data: batches = [] } = useQuery({
    queryKey: ['batches-for-suggestions'],
    queryFn: () => base44.entities.Batch.list('-created_date', 200),
    enabled: suggestions.length > 0
  });

  const batchMap = Object.fromEntries(batches.map(b => [b.id, b]));

  const accept = useMutation({
    mutationFn: (id) => base44.functions.invoke('applyBatchSuggestion', { suggestion_id: id }),
    onSuccess: () => { qc.invalidateQueries(['batch-suggestions']); toast({ title: 'Förslag accepterat' }); },
    onError: (e) => toast({ title: 'Fel', description: e.message, variant: 'destructive' })
  });

  const reject = useMutation({
    mutationFn: (id) => base44.functions.invoke('rejectBatchSuggestion', { suggestion_id: id }),
    onSuccess: () => { qc.invalidateQueries(['batch-suggestions']); toast({ title: 'Förslag avvisat' }); },
    onError: (e) => toast({ title: 'Fel', description: e.message, variant: 'destructive' })
  });

  // Group by suggestion_type
  const grouped = suggestions.reduce((acc, s) => {
    const k = s.suggestion_type;
    if (!acc[k]) acc[k] = [];
    acc[k].push(s);
    return acc;
  }, {});

  if (isLoading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">💡 Batch-förslag</h1>
            <p className="text-white/50 text-sm mt-1">AI-genererade förslag för dataförbättring</p>
          </div>
          <Badge className="bg-blue-500/20 text-blue-300 border-0 text-sm px-3 py-1">{suggestions.length} väntande</Badge>
        </div>

        {suggestions.length === 0 && (
          <div className="text-center py-20 text-white/40">
            <CheckCircle2 className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg">Inga väntande förslag</p>
          </div>
        )}

        <div className="space-y-6">
          {Object.entries(grouped).map(([type, items]) => (
            <Card key={type} className="bg-white/5 border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <Badge className={`border-0 text-xs ${TYPE_COLORS[type] || 'bg-white/10 text-white/70'}`}>
                    {TYPE_LABELS[type] || type}
                  </Badge>
                  <span className="text-white/50 font-normal text-sm">({items.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {items.map(s => {
                    const batch = batchMap[s.batch_id];
                    const conf = Math.round((s.confidence || 0) * 100);
                    return (
                      <div key={s.id} className="p-3 rounded-xl bg-white/5 border border-white/10">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            {batch && (
                              <p className="text-xs text-white/40 mb-1">Batch: {batch.batch_number}</p>
                            )}
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm text-white/60 line-through truncate">{s.current_value || '(tomt)'}</span>
                              <ChevronRight className="w-3 h-3 text-white/30 flex-shrink-0" />
                              <span className="text-sm text-white font-medium truncate">{s.suggested_value}</span>
                            </div>
                            {s.reasoning && (
                              <p className="text-xs text-white/40 mt-1 truncate">{s.reasoning}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge className={`border-0 text-xs ${conf >= 80 ? 'bg-green-500/20 text-green-300' : conf >= 60 ? 'bg-yellow-500/20 text-yellow-300' : 'bg-red-500/20 text-red-300'}`}>
                              {conf}%
                            </Badge>
                            <Button
                              size="sm"
                              className="h-8 bg-green-600 hover:bg-green-700 px-2"
                              onClick={() => accept.mutate(s.id)}
                              disabled={accept.isPending}
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 border-white/20 text-white hover:bg-white/10 px-2"
                              onClick={() => reject.mutate(s.id)}
                              disabled={reject.isPending}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}