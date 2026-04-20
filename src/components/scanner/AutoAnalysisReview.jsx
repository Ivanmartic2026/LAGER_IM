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
  onAccept,
  onReject,
  onEdit,
  onManualReview,
  isLoading
}) {
  const [editingBatch, setEditingBatch] = useState(false);
  const [batchValue, setBatchValue] = useState(extractedData.batch_number || '');
  const [matchingArticles, setMatchingArticles] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [showAlternatives, setShowAlternatives] = useState(false);

  useEffect(() => {
    setBatchValue(extractedData.batch_number || '');
  }, [extractedData.batch_number]);

  const searchForMatches = async (batchNum) => {
    if (!batchNum) return;
    setIsSearching(true);
    setHasSearched(false);
    try {
      const byBatch = await base44.entities.Article.filter({ batch_number: batchNum });
      let allMatches = [...byBatch];
      if (byBatch.length === 0 && batchNum.length >= 6) {
        const allArticles = await base44.entities.Article.list();
        const fuzzy = allArticles.filter(a => {
          if (!a.batch_number || a.batch_number.length < 4) return false;
          const a1 = a.batch_number.toUpperCase().replace(/\s+/g, '');
          const a2 = batchNum.toUpperCase().replace(/\s+/g, '');
          const minLen = Math.min(a1.length, a2.length);
          if (minLen < 6) return false;
          return (a1.includes(a2) || a2.includes(a1));
        });
        allMatches = fuzzy;
      }
      setMatchingArticles(allMatches);
    } catch (e) {
      console.error('Match search failed:', e);
    } finally {
      setIsSearching(false);
      setHasSearched(true);
    }
  };

  const saveBatch = () => {
    onEdit('batch_number', batchValue);
    setEditingBatch(false);
    searchForMatches(batchValue);
  };

  const batchConfidence = confidences?.batch_number || 0;
  const articleName = extractedData.article_name || extractedData.name || null;
  const batchNumber = extractedData.batch_number || null;
  const supplierName = extractedData.supplier_name || null;

  // Filtered secondary fields — exclude other_text and already-shown primary fields
  const secondaryFields = Object.entries(extractedData).filter(([k, v]) => 
    v && 
    k !== 'batch_number' && 
    k !== 'article_name' && 
    k !== 'name' &&
    k !== 'other_text' && 
    k !== 'barcode_values' &&
    k !== 'ocr_regions' &&
    k !== 'image_urls' &&
    k !== 'date'
  );

  // Auto-trigger search on mount
  useEffect(() => {
    if (extractedData.batch_number && !hasSearched && !isSearching) {
      const timer = setTimeout(() => searchForMatches(extractedData.batch_number), 300);
      return () => clearTimeout(timer);
    }
  }, [extractedData.batch_number]);

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

      {/* PRIMARY ROW — stor och tydlig */}
      <div className={cn(
        "p-5 rounded-2xl border-2",
        batchConfidence >= 0.88 ? "bg-emerald-500/10 border-emerald-500/40" :
        batchConfidence >= 0.70 ? "bg-amber-500/10 border-amber-500/30" :
        "bg-slate-800/60 border-slate-600"
      )}>
        {isSearching ? (
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-blue-400 animate-spin flex-shrink-0" />
            <p className="text-slate-300 text-sm">Söker i lagret...</p>
          </div>
        ) : hasSearched && matchingArticles.length > 0 ? (
          /* Known article — show primary match */
          <div className="flex items-start gap-4">
            {matchingArticles[0].image_urls?.[0] && (
              <img
                src={matchingArticles[0].image_urls[0]}
                alt={matchingArticles[0].name}
                className="w-14 h-14 rounded-lg object-cover bg-slate-900 flex-shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-lg font-bold text-white leading-tight truncate">
                Det här är {matchingArticles[0].name}
              </p>
              {batchNumber && (
                <p className="text-sm text-slate-400 mt-0.5 font-mono">
                  Batch: <span className="text-white">{batchNumber}</span>
                </p>
              )}
              <div className="flex items-center gap-2 mt-1">
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs">
                  I lager: {matchingArticles[0].stock_qty || 0} st
                </Badge>
                {matchingArticles[0].shelf_address && (
                  <Badge className="bg-slate-700 text-slate-300 text-xs border-0">
                    📍 {Array.isArray(matchingArticles[0].shelf_address) ? matchingArticles[0].shelf_address[0] : matchingArticles[0].shelf_address}
                  </Badge>
                )}
                {batchConfidence > 0 && (
                  <Badge className={cn("text-xs",
                    batchConfidence >= 0.88 ? "bg-emerald-500/20 text-emerald-400" :
                    "bg-amber-500/20 text-amber-400"
                  )}>
                    {Math.round(batchConfidence * 100)}%
                  </Badge>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* No match found — show extracted data */
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">📦</span>
                <span className="font-semibold text-white">Batchnummer</span>
              </div>
              <div className="flex items-center gap-2">
                {batchConfidence > 0 && (
                  <Badge className={cn("text-xs",
                    batchConfidence >= 0.88 ? "bg-emerald-500/20 text-emerald-400" :
                    batchConfidence >= 0.70 ? "bg-amber-500/20 text-amber-400" :
                    "bg-red-500/20 text-red-400"
                  )}>
                    {Math.round(batchConfidence * 100)}%
                  </Badge>
                )}
                {!editingBatch && (
                  <button onClick={() => setEditingBatch(true)} className="text-blue-400 hover:text-blue-300 p-1">
                    <Edit3 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            {editingBatch ? (
              <div className="space-y-2">
                <Input
                  value={batchValue}
                  onChange={(e) => setBatchValue(e.target.value)}
                  className="bg-white/5 border-white/10 text-white font-mono"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && saveBatch()}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveBatch} className="flex-1 bg-emerald-600 hover:bg-emerald-500 h-8">Spara</Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingBatch(false)} className="bg-white/5 border-white/10 h-8">Avbryt</Button>
                </div>
              </div>
            ) : (
              <span className="text-white font-mono text-lg">
                {batchNumber || <span className="text-slate-500 italic text-sm">Inget batchnummer hittat</span>}
              </span>
            )}
            {articleName && (
              <p className="text-sm text-slate-400 mt-1">{articleName}{supplierName && ` · ${supplierName}`}</p>
            )}
            {hasSearched && matchingArticles.length === 0 && (
              <p className="text-xs text-amber-300 mt-2">⚠ Inte funnen i lagret — ny artikel</p>
            )}
          </div>
        )}
      </div>

      {/* ALTERNATIV — collapsed by default */}
      {(secondaryFields.length > 0 || (hasSearched && matchingArticles.length > 1)) && (
        <button
          onClick={() => setShowAlternatives(v => !v)}
          className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 text-sm transition-all"
        >
          <span>
            Visa alternativ
            {matchingArticles.length > 1 && ` (${matchingArticles.length} matchningar)`}
          </span>
          {showAlternatives ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      )}

      <AnimatePresence>
        {showAlternatives && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden space-y-3"
          >
            {/* Other match candidates */}
            {matchingArticles.slice(1, 3).map(article => (
              <div key={article.id} className="p-3 rounded-xl bg-slate-800/50 border border-slate-700 flex items-center gap-3">
                {article.image_urls?.[0] && (
                  <img src={article.image_urls[0]} alt={article.name} className="w-10 h-10 rounded-lg object-cover bg-slate-900 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{article.name}</p>
                  <p className="text-xs text-slate-400 font-mono">{article.batch_number}</p>
                </div>
                <span className="text-xs text-slate-400">{article.stock_qty || 0} st</span>
              </div>
            ))}

            {/* Secondary extracted fields — no other_text */}
            {secondaryFields.length > 0 && (
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
                <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Extraherade fält</p>
                {secondaryFields.map(([key, value]) => (
                  <div key={key} className="flex justify-between text-sm">
                    <span className="text-slate-400 capitalize">{key.replace(/_/g, ' ')}</span>
                    <span className="text-white font-mono text-xs truncate max-w-[60%] text-right">{String(value)}</span>
                  </div>
                ))}
              </div>
            )}
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