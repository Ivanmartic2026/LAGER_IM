import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RefreshCw, Search, AlertTriangle, CheckCircle2, Clock, DollarSign, ImageIcon, Plug, Wifi, WifiOff } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function BatchReanalyze() {
  const [sourceFilter, setSourceFilter] = useState([]);
  const [discovering, setDiscovering] = useState(false);
  const [imageRefs, setImageRefs] = useState(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState(null);
  const [testingKimi, setTestingKimi] = useState(false);
  const [kimiTestResult, setKimiTestResult] = useState(null);

  const testKimiConnection = async () => {
    setTestingKimi(true);
    setKimiTestResult(null);
    const resp = await base44.functions.invoke('testKimiConnection', {});
    setKimiTestResult(resp.data);
    setTestingKimi(false);
  };

  const discover = async () => {
    setDiscovering(true);
    setImageRefs(null);
    setResults(null);
    const resp = await base44.functions.invoke('discoverHistoricalImages', {
      source_filter: sourceFilter.length > 0 ? sourceFilter : undefined
    });
    setImageRefs(resp.data);
    setDiscovering(false);
  };

  const startReanalysis = async () => {
    if (!imageRefs?.image_refs?.length) return;
    setRunning(true);
    setProgress(0);
    setResults(null);

    const refs = imageRefs.image_refs;
    const batchSize = 10;
    const totalBatches = Math.ceil(refs.length / batchSize);
    const allResults = { success: 0, failed: 0, new_batches: 0, merged_batches: 0, flagged: 0, errors: [] };

    for (let i = 0; i < refs.length; i += batchSize) {
      const chunk = refs.slice(i, i + batchSize);
      const resp = await base44.functions.invoke('bulkReanalyzeHistoricalImages', {
        image_refs: chunk,
        batch_size: batchSize
      });
      if (resp.data?.results) {
        const r = resp.data.results;
        allResults.success += r.success || 0;
        allResults.failed += r.failed || 0;
        allResults.new_batches += r.new_batches || 0;
        allResults.merged_batches += r.merged_batches || 0;
        allResults.flagged += r.flagged || 0;
        if (r.errors) allResults.errors.push(...r.errors);
      }
      setProgress(Math.round(((i + batchSize) / refs.length) * 100));
    }

    setResults(allResults);
    setRunning(false);
    setProgress(100);
  };

  const estimatedCost = imageRefs?.pending_analysis ? (imageRefs.pending_analysis * 0.001).toFixed(3) : null;
  const estimatedTime = imageRefs?.pending_analysis ? Math.ceil(imageRefs.pending_analysis / 10 * 5) : null;

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Bulk-omanalys av historiska bilder</h1>
            <p className="text-white/50 mt-1">Analysera alla befintliga bilder i systemet med Kimi AI för att förbättra batchdata</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Button
              onClick={testKimiConnection}
              disabled={testingKimi}
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10 whitespace-nowrap"
            >
              {testingKimi
                ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Testar...</>
                : <><Plug className="w-4 h-4 mr-2" /> Testa Kimi-anslutning</>}
            </Button>
            {kimiTestResult && (
              <div className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg ${kimiTestResult.ok ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
                {kimiTestResult.ok ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                {kimiTestResult.ok
                  ? `OK — ${kimiTestResult.response_time_ms}ms`
                  : kimiTestResult.error_message}
              </div>
            )}
          </div>
        </div>

        {/* Filter */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white text-base">Filtrera bildkällor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {['article', 'receiving_record', 'extracted_value_log'].map(src => (
                <button
                  key={src}
                  onClick={() => setSourceFilter(prev =>
                    prev.includes(src) ? prev.filter(s => s !== src) : [...prev, src]
                  )}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                    sourceFilter.includes(src)
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'border-white/20 text-white/60 hover:border-white/40'
                  }`}
                >
                  {src === 'article' ? 'Artikelbilder' : src === 'receiving_record' ? 'Mottagningsbilder' : 'Extraherade loggar'}
                </button>
              ))}
              {sourceFilter.length > 0 && (
                <button onClick={() => setSourceFilter([])} className="px-3 py-1.5 text-sm text-white/40 hover:text-white/60">
                  Rensa filter
                </button>
              )}
            </div>
            <Button onClick={discover} disabled={discovering} className="bg-blue-600 hover:bg-blue-700">
              {discovering ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Söker...</> : <><Search className="w-4 h-4 mr-2" /> Hitta bilder</>}
            </Button>
          </CardContent>
        </Card>

        {/* Discovery results */}
        {imageRefs && (
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white text-base">Förhandsvisning</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/5 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-white">{imageRefs.total_found}</div>
                  <div className="text-xs text-white/50 mt-1">Totalt hittade</div>
                </div>
                <div className="bg-green-500/10 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-green-400">{imageRefs.already_analyzed}</div>
                  <div className="text-xs text-white/50 mt-1">Redan analyserade</div>
                </div>
                <div className="bg-yellow-500/10 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-400">{imageRefs.pending_analysis}</div>
                  <div className="text-xs text-white/50 mt-1">Väntar på analys</div>
                </div>
                <div className="bg-blue-500/10 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-blue-400">${estimatedCost}</div>
                  <div className="text-xs text-white/50 mt-1">Uppskattad kostnad</div>
                </div>
              </div>
              {estimatedTime && (
                <div className="flex items-center gap-2 text-white/50 text-sm">
                  <Clock className="w-4 h-4" />
                  <span>Uppskattad tid: ~{estimatedTime} sekunder</span>
                </div>
              )}
              {imageRefs.pending_analysis > 0 && !running && !results && (
                <Button onClick={startReanalysis} className="bg-blue-600 hover:bg-blue-700 w-full">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Starta omanalys ({imageRefs.pending_analysis} bilder)
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Progress */}
        {running && (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" />
                <span className="text-white font-medium">Kimi analyserar bilder...</span>
              </div>
              <Progress value={progress} className="h-3" />
              <div className="text-white/50 text-sm">{progress}% klart</div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {results && (
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white text-base flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                Analys klar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-green-500/10 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-green-400">{results.success}</div>
                  <div className="text-xs text-white/50 mt-1">Lyckade</div>
                </div>
                <div className="bg-blue-500/10 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-blue-400">{results.new_batches}</div>
                  <div className="text-xs text-white/50 mt-1">Nya batcher</div>
                </div>
                <div className="bg-purple-500/10 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-purple-400">{results.merged_batches}</div>
                  <div className="text-xs text-white/50 mt-1">Förbättrade</div>
                </div>
                <div className="bg-yellow-500/10 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-400">{results.flagged}</div>
                  <div className="text-xs text-white/50 mt-1">Flaggade</div>
                </div>
                {results.failed > 0 && (
                  <div className="bg-red-500/10 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-red-400">{results.failed}</div>
                    <div className="text-xs text-white/50 mt-1">Misslyckade</div>
                  </div>
                )}
              </div>
              {results.errors.length > 0 && (
                <div className="mt-4 bg-red-500/10 rounded-xl p-4">
                  <p className="text-red-400 text-sm font-medium mb-2">Fel ({results.errors.length}):</p>
                  {results.errors.slice(0, 5).map((e, i) => (
                    <p key={i} className="text-white/50 text-xs">{e.error}</p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}