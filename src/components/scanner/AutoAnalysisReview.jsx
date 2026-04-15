import React, { useState, useEffect } from 'react';
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import {
  CheckCircle2, AlertCircle, Edit3, X, Sparkles, Search, Package, Loader2
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

  // Search for matching articles whenever batch number changes
  useEffect(() => {
    setBatchValue(extractedData.batch_number || '');
  }, [extractedData.batch_number]);

  const searchForMatches = async (batchNum) => {
    if (!batchNum) return;
    setIsSearching(true);
    setHasSearched(false);
    try {
      // Search by batch number
      const byBatch = await base44.entities.Article.filter({ batch_number: batchNum });
      
      // Also do fuzzy match via full list if exact match fails
      // Only do fuzzy if batchNum is at least 6 characters to avoid false positives
      let allMatches = [...byBatch];
      if (byBatch.length === 0 && batchNum.length >= 6) {
        const allArticles = await base44.entities.Article.list();
        const fuzzy = allArticles.filter(a => {
          if (!a.batch_number || a.batch_number.length < 4) return false;
          const a1 = a.batch_number.toUpperCase().replace(/\s+/g, '');
          const a2 = batchNum.toUpperCase().replace(/\s+/g, '');
          // Require meaningful overlap: at least 6 chars must match and the match must be >50% of the shorter string
          const minLen = Math.min(a1.length, a2.length);
          if (minLen < 6) return false;
          const overlap = a1.includes(a2) || a2.includes(a1);
          return overlap && minLen >= 6;
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Bild */}
      {imageUrl && (
        <div className="rounded-xl overflow-hidden bg-slate-900 border border-slate-700">
          <img
            src={imageUrl}
            alt="Skannad bild"
            className="w-full h-48 object-contain"
          />
        </div>
      )}

      {/* AI Status */}
      <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-blue-300 font-medium mb-1">AI-analys genomförd</p>
          <p className="text-sm text-blue-200">
            Batchnummer extraherat — granska och bekräfta nedan
          </p>
        </div>
      </div>

      {/* Batchnummer - redigerbart */}
      <div className={cn(
        "p-4 rounded-xl border",
        batchConfidence >= 0.9 ? "bg-emerald-500/10 border-emerald-500/30" :
        batchConfidence >= 0.7 ? "bg-amber-500/10 border-amber-500/30" :
        "bg-red-500/10 border-red-500/40"
      )}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">📦</span>
            <span className="font-semibold text-white">Batchnummer</span>
          </div>
          <div className="flex items-center gap-2">
            {batchConfidence > 0 && (
              <Badge className={cn(
                "text-xs",
                batchConfidence >= 0.9 ? "bg-emerald-500/20 text-emerald-400" :
                batchConfidence >= 0.7 ? "bg-amber-500/20 text-amber-400" :
                "bg-red-500/20 text-red-400"
              )}>
                {Math.round(batchConfidence * 100)}% säkerhet
              </Badge>
            )}
            {!editingBatch && (
              <button
                onClick={() => setEditingBatch(true)}
                className="text-blue-400 hover:text-blue-300 p-1"
              >
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
              <Button size="sm" onClick={saveBatch} className="flex-1 bg-emerald-600 hover:bg-emerald-500 h-8">
                Spara & sök matchningar
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditingBatch(false)} className="bg-white/5 border-white/10 h-8">
                Avbryt
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-white font-mono text-lg">
              {extractedData.batch_number || <span className="text-slate-500 italic text-sm">Inget batchnummer hittat</span>}
            </span>
            {extractedData.batch_number && !hasSearched && (
              <Button
                size="sm"
                onClick={() => searchForMatches(extractedData.batch_number)}
                className="bg-blue-600/20 border border-blue-500/30 hover:bg-blue-600/30 text-blue-300 h-8 text-xs"
              >
                <Search className="w-3 h-3 mr-1" />
                Sök matchningar
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Matchningssökning */}
      {isSearching && (
        <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700 flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-blue-400 animate-spin flex-shrink-0" />
          <p className="text-slate-300 text-sm">Söker efter matchande artiklar i lagret...</p>
        </div>
      )}

      {/* Matchningsresultat */}
      {hasSearched && !isSearching && (
        <div className="space-y-3">
          <h3 className="font-semibold text-white flex items-center gap-2">
            {matchingArticles.length > 0 ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-400" />
            )}
            {matchingArticles.length > 0
              ? `${matchingArticles.length} matchande artikel${matchingArticles.length > 1 ? 'ar' : ''} hittad${matchingArticles.length > 1 ? 'e' : ''}`
              : 'Inga matchande artiklar hittade'}
          </h3>

          {matchingArticles.length > 0 ? (
            <div className="space-y-2">
              {matchingArticles.slice(0, 3).map(article => (
                <div key={article.id} className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                  <div className="flex items-start gap-3">
                    {article.image_urls?.[0] && (
                      <img
                        src={article.image_urls[0]}
                        alt={article.name}
                        className="w-14 h-14 rounded-lg object-cover bg-slate-900 flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white truncate">{article.name}</p>
                      <div className="mt-1 space-y-0.5 text-xs text-slate-400">
                        <p>Batch: <span className="text-white font-mono">{article.batch_number}</span></p>
                        {article.manufacturer && <p>Tillverkare: <span className="text-white">{article.manufacturer}</span></p>}
                        {article.category && <p>Kategori: <span className="text-white">{article.category}</span></p>}
                        <p>Lagersaldo: <span className="text-white font-semibold">{article.stock_qty || 0} st</span></p>
                        {article.shelf_address?.length > 0 && (
                          <p>Hyllplats: <span className="text-white">{Array.isArray(article.shelf_address) ? article.shelf_address.join(', ') : article.shelf_address}</span></p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <p className="text-amber-300 text-sm">
                Ingen artikel med detta batchnummer finns i lagret. Du kan fortsätta för att skapa en ny eller fylla i fler uppgifter manuellt.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Auto-sök när komponenten mountas */}
      {extractedData.batch_number && !hasSearched && !isSearching && (
        <div className="hidden">
          {/* Auto-trigger search */}
          {(() => { 
            setTimeout(() => searchForMatches(extractedData.batch_number), 300); 
            return null; 
          })()}
        </div>
      )}

      {/* Åtgärder */}
      <div className="space-y-3 pt-2">
        <div className="flex gap-3">
          <Button
            onClick={onReject}
            disabled={isLoading}
            variant="outline"
            className="flex-1 bg-white/5 border-white/10 hover:bg-white/10 text-white h-11"
          >
            <X className="w-4 h-4 mr-2" />
            Ta nytt foto
          </Button>
          <Button
            onClick={onAccept}
            disabled={isLoading}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white h-11"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sparar...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Godkänn & spara
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