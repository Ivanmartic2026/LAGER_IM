import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import {
  CheckCircle2, AlertCircle, Edit3, X, Sparkles, Package, Loader2, ChevronDown, ChevronUp
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function AutoAnalysisReview({ 
  imageUrl,
  extractedData, 
  confidences,
  matchResults,
  onAccept,
  onReject,
  onEdit,
  onManualReview,
  isLoading
}) {
  const [editingBatch, setEditingBatch] = useState(false);
  const [batchValue, setBatchValue] = useState(extractedData.batch_number || '');
  const [localArticle, setLocalArticle] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showAlternatives, setShowAlternatives] = useState(false);

  useEffect(() => {
    setBatchValue(extractedData.batch_number || '');
  }, [extractedData.batch_number]);

  // Fetch article details if matchResults has article_match_id
  useEffect(() => {
    if (matchResults?.article_match_id) {
      base44.entities.Article.filter({ id: matchResults.article_match_id })
        .then(results => { if (results?.[0]) setLocalArticle(results[0]); })
        .catch(() => {});
    }
  }, [matchResults?.article_match_id]);

  // Fallback: local DB search if no backend matchResults
  useEffect(() => {
    if (matchResults?.article_match_id) return; // backend already matched
    const batchNum = extractedData.batch_number;
    if (!batchNum) return;
    setIsSearching(true);
    base44.entities.Article.filter({ batch_number: batchNum })
      .then(async (byBatch) => {
        if (byBatch.length > 0) { setLocalArticle(byBatch[0]); return; }
        if (batchNum.length >= 6) {
          const all = await base44.entities.Article.list();
          const norm = (s) => (s || '').toUpperCase().replace(/O/g, '0').replace(/[\s\-_]/g, '');
          const nb = norm(batchNum);
          const fuzzy = all.find(a => {
            if (!a.batch_number) return false;
            const na = norm(a.batch_number);
            return na === nb || na.includes(nb) || nb.includes(na);
          });
          if (fuzzy) setLocalArticle(fuzzy);
        }
      })
      .catch(() => {})
      .finally(() => setIsSearching(false));
  }, [extractedData.batch_number, matchResults?.article_match_id]);

  const saveBatch = () => {
    onEdit('batch_number', batchValue);
    setEditingBatch(false);
  };

  const batchConfidence = confidences?.batch_number || 0;
  const articleName = extractedData.article_name || extractedData.name || null;
  const batchNumber = extractedData.batch_number || null;
  const supplierName = extractedData.supplier_name || null;

  // Determine effective match (backend wins over local)
  const hasBackendMatch = !!(matchResults?.article_match_id || matchResults?.batch_match_id);
  const effectiveArticle = localArticle;
  const isFuzzy = matchResults?.article_match_method === 'fuzzy' || matchResults?.batch_match_method === 'fuzzy';
  const matchedName = matchResults?.article_match_name || matchResults?.batch_match_name || effectiveArticle?.name;
  const matchConfidence = matchResults?.article_match_confidence || matchResults?.batch_match_confidence;

  // Filtered secondary fields
  const secondaryFields = Object.entries(extractedData).filter(([k, v]) => 
    v && 
    !['batch_number','article_name','name','other_text','barcode_values','ocr_regions','image_urls','date'].includes(k)
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      {/* Bild */}
      {imageUrl && (
        <div className="rounded-xl overflow-hidden bg-slate-900 border border-slate-700">
          <img src={imageUrl} alt="Skannad bild" className="w-full h-40 object-contain" />
        </div>
      )}

      {/* MATCH RESULT PANEL */}
      {isSearching ? (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-800/60 border border-slate-700">
          <Loader2 className="w-5 h-5 text-blue-400 animate-spin flex-shrink-0" />
          <p className="text-slate-300 text-sm">Söker i lagret...</p>
        </div>
      ) : (effectiveArticle || hasBackendMatch) && matchedName ? (
        <div className={cn(
          "p-4 rounded-xl border-2",
          isFuzzy
            ? "bg-amber-500/10 border-amber-500/40"
            : "bg-emerald-500/10 border-emerald-500/40"
        )}>
          <div className="flex items-start gap-3">
            {effectiveArticle?.image_urls?.[0] && (
              <img src={effectiveArticle.image_urls[0]} alt={matchedName}
                className="w-12 h-12 rounded-lg object-cover bg-slate-900 flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {isFuzzy
                  ? <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  : <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                }
                <span className={cn("text-xs font-semibold uppercase tracking-wider",
                  isFuzzy ? "text-amber-400" : "text-emerald-400"
                )}>
                  {isFuzzy ? "Möjlig matchning (OCR-variant)" : "Artikel hittad"}
                </span>
                {matchConfidence && (
                  <Badge className={cn("text-xs ml-auto",
                    isFuzzy ? "bg-amber-500/20 text-amber-300" : "bg-emerald-500/20 text-emerald-300"
                  )}>
                    {Math.round(matchConfidence * 100)}%
                  </Badge>
                )}
              </div>
              <p className="text-white font-semibold text-base leading-tight truncate">{matchedName}</p>
              {batchNumber && (
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Batch: <span className="text-white">{batchNumber}</span>
                </p>
              )}
              {effectiveArticle && (
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs">
                    I lager: {effectiveArticle.stock_qty || 0} st
                  </Badge>
                  {effectiveArticle.shelf_address?.length > 0 && (
                    <Badge className="bg-slate-700 text-slate-300 text-xs border-0">
                      📍 {Array.isArray(effectiveArticle.shelf_address) ? effectiveArticle.shelf_address[0] : effectiveArticle.shelf_address}
                    </Badge>
                  )}
                </div>
              )}
              {matchResults?.batch_match_id && (
                <p className="text-xs text-blue-300 mt-1">
                  ✓ Batch-post: <span className="font-mono">{matchResults.batch_match_name || matchResults.batch_match_id}</span>
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Batch number display when no match */
        <div className={cn(
          "p-4 rounded-xl border-2",
          batchConfidence >= 0.88 ? "bg-slate-800/60 border-slate-600" : "bg-slate-800/60 border-slate-600"
        )}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="text-base">📦</span>
              <span className="font-semibold text-white text-sm">Batchnummer</span>
              {batchConfidence > 0 && (
                <Badge className={cn("text-xs",
                  batchConfidence >= 0.88 ? "bg-emerald-500/20 text-emerald-400" :
                  batchConfidence >= 0.70 ? "bg-amber-500/20 text-amber-400" :
                  "bg-red-500/20 text-red-400"
                )}>
                  {Math.round(batchConfidence * 100)}%
                </Badge>
              )}
            </div>
            {!editingBatch && (
              <button onClick={() => setEditingBatch(true)} className="text-blue-400 hover:text-blue-300 p-1">
                <Edit3 className="w-4 h-4" />
              </button>
            )}
          </div>
          {editingBatch ? (
            <div className="space-y-2">
              <Input value={batchValue} onChange={(e) => setBatchValue(e.target.value)}
                className="bg-white/5 border-white/10 text-white font-mono" autoFocus
                onKeyDown={(e) => e.key === 'Enter' && saveBatch()} />
              <div className="flex gap-2">
                <Button size="sm" onClick={saveBatch} className="flex-1 bg-emerald-600 hover:bg-emerald-500 h-8">Spara</Button>
                <Button size="sm" variant="outline" onClick={() => setEditingBatch(false)} className="bg-white/5 border-white/10 h-8">Avbryt</Button>
              </div>
            </div>
          ) : (
            <span className="text-white font-mono text-base">
              {batchNumber || <span className="text-slate-500 italic text-sm">Inget batchnummer hittat</span>}
            </span>
          )}
          {articleName && <p className="text-sm text-slate-400 mt-1">{articleName}{supplierName && ` · ${supplierName}`}</p>}
          <p className="text-xs text-amber-300 mt-2">⚠ Inte funnen i lagret — kommer skapas som ny artikel</p>
        </div>
      )}

      {/* ALTERNATIV — collapsed by default */}
      {secondaryFields.length > 0 && (
        <button
          onClick={() => setShowAlternatives(v => !v)}
          className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 text-sm transition-all"
        >
          <span>Extraherade fält ({secondaryFields.length})</span>
          {showAlternatives ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      )}

      <AnimatePresence>
        {showAlternatives && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
              {secondaryFields.map(([key, value]) => (
                <div key={key} className="flex justify-between text-sm">
                  <span className="text-slate-400 capitalize">{key.replace(/_/g, ' ')}</span>
                  <span className="text-white font-mono text-xs truncate max-w-[60%] text-right">{String(value)}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Åtgärder */}
      <div className="space-y-3 pt-2">
        <div className="flex gap-3">
          <Button
            onClick={onReject}
            disabled={isLoading}
            variant="outline"
            className="flex-1 bg-white/5 border-white/10 hover:bg-white/10 text-white h-12"
          >
            <X className="w-4 h-4 mr-2" />
            Ta nytt foto
          </Button>
          <Button
            onClick={onAccept}
            disabled={isLoading}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white h-12 text-base font-semibold"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sparar...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5 mr-2" />
                Bekräfta
              </>
            )}
          </Button>
        </div>

        {onManualReview && (
          <Button
            onClick={onManualReview}
            disabled={isLoading}
            variant="outline"
            className="w-full bg-blue-600/20 border-blue-500/40 hover:bg-blue-600/30 text-blue-300 h-11"
          >
            <Edit3 className="w-4 h-4 mr-2" />
            Fyll i fler uppgifter manuellt
          </Button>
        )}
      </div>
    </motion.div>
  );
}