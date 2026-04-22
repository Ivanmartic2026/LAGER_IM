import React, { useState } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Camera, MapPin, Box, Eye, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const ENTITY_LABELS = {
  Batch: 'Batch',
  Article: 'Artikel',
  PurchaseOrderItem: 'Inköpsorder-rad',
  OrderItem: 'Order-rad',
  InternalWithdrawal: 'Uttag',
  RepairLog: 'Reparation'
};

function MatchCard({ match, selected, onSelect }) {
  const isSelected = selected?.entity_id === match.entity_id && selected?.entity_type === match.entity_type;
  const isVisual = match.is_visual_suggestion;

  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => onSelect(match)}
      className={cn(
        "w-full text-left rounded-xl border-2 transition-all overflow-hidden",
        isSelected
          ? "border-signal bg-signal/10"
          : isVisual
            ? "border-purple-500/30 bg-purple-500/5 hover:border-purple-400/50"
            : "border-slate-700 bg-slate-800/50 hover:border-slate-500"
      )}
    >
      <div className="flex items-stretch">
        {/* Thumbnail image if available */}
        {match.article_image_url && (
          <div className="w-20 flex-shrink-0 bg-slate-900">
            <img
              src={match.article_image_url}
              alt={match.article_name || match.entity_name}
              className="w-full h-full object-cover"
              onError={e => { e.target.parentElement.style.display = 'none'; }}
            />
          </div>
        )}

        <div className="flex-1 p-3 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge className={cn(
              "border-0 text-[10px] px-1.5 py-0",
              isVisual ? "bg-purple-700/50 text-purple-200" : "bg-slate-700 text-slate-300"
            )}>
              {ENTITY_LABELS[match.entity_type] || match.entity_type}
            </Badge>
            {isVisual ? (
              <span className="flex items-center gap-0.5 text-[10px] text-purple-400">
                <Eye className="w-3 h-3" />
                Visuell match ({Math.round((match.confidence || 0) * 100)}%)
              </span>
            ) : (
              match.matched_field && (
                <span className="text-[10px] text-slate-500 font-mono">{match.matched_field}</span>
              )
            )}
            {match.partial && !isVisual && (
              <span className="text-[10px] text-amber-400">partial</span>
            )}
          </div>

          <p className="font-semibold text-white text-sm leading-tight truncate">
            {match.article_name || match.entity_name || match.entity_id}
          </p>
          {match.article_sku && (
            <p className="text-xs text-slate-400 font-mono mt-0.5">SKU: {match.article_sku}</p>
          )}
          {isVisual && match.visual_reason && (
            <p className="text-[10px] text-purple-300 mt-1 italic">{match.visual_reason}</p>
          )}

          <div className="flex items-center gap-3 mt-1.5">
            {match.stock_qty !== null && match.stock_qty !== undefined && (
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <Box className="w-3 h-3" />
                {match.stock_qty} st
              </span>
            )}
            {match.shelf_address && (
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <MapPin className="w-3 h-3" />
                {Array.isArray(match.shelf_address) ? match.shelf_address[0] : match.shelf_address}
              </span>
            )}
            {match.supplier_name && (
              <span className="text-xs text-slate-500 truncate">{match.supplier_name}</span>
            )}
          </div>
          {!isVisual && (
            <p className="text-[10px] text-slate-500 mt-1 font-mono truncate">
              Matchat på: {match.matched_value}
            </p>
          )}
        </div>

        {/* Selection indicator */}
        <div className={cn(
          "w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 m-3 mt-4",
          isSelected ? "border-signal bg-signal" : "border-slate-600"
        )}>
          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
        </div>
      </div>
    </motion.button>
  );
}

export default function MobileScanResult({
  imageUrl,
  allNumbers,
  allMatches = [],
  visualSuggestions = [],
  labelScanId,
  kimiError,
  onConfirmMatch,
  onCreateNew,
  onRetake
}) {
  const [selected, setSelected] = useState(null);
  const [confirming, setConfirming] = useState(false);

  const hasTextMatches = allMatches && allMatches.length > 0;
  const hasVisualSuggestions = visualSuggestions && visualSuggestions.length > 0;
  const hasAnyMatches = hasTextMatches || hasVisualSuggestions;

  const handleConfirm = async () => {
    if (!selected) return;
    setConfirming(true);
    await onConfirmMatch(selected);
    setConfirming(false);
  };

  return (
    <div className="space-y-4">
      {/* Scanned image */}
      {imageUrl && (
        <div className="rounded-xl overflow-hidden bg-slate-900 border border-slate-700">
          <img src={imageUrl} alt="Skannad bild" className="w-full h-36 object-contain" />
        </div>
      )}

      {kimiError && (
        <div className="p-3 bg-amber-900/30 rounded-xl border border-amber-500/30 flex items-center gap-2">
          <span className="text-amber-400 text-sm">⚠️</span>
          <p className="text-xs text-amber-300">AI-analys misslyckades — visar barcode-resultat om tillgängligt</p>
        </div>
      )}

      {allNumbers && allNumbers.length > 0 && (
        <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700">
          <p className="text-xs text-slate-500 font-brand mb-2">LÄSTA NUMMER</p>
          <div className="flex flex-wrap gap-1.5">
            {allNumbers.slice(0, 12).map((n, i) => (
              <span key={i} className="text-xs font-mono bg-slate-700 text-slate-200 px-2 py-0.5 rounded">
                {n}
              </span>
            ))}
            {allNumbers.length > 12 && (
              <span className="text-xs text-slate-500">+{allNumbers.length - 12} till</span>
            )}
          </div>
        </div>
      )}

      {hasAnyMatches ? (
        <div className="space-y-2">
          {/* Text matches */}
          {hasTextMatches && (
            <>
              <p className="text-xs font-brand text-slate-400 tracking-widest px-1">
                {allMatches.length} MATCH{allMatches.length > 1 ? 'ES' : ''} HITTAD{allMatches.length > 1 ? 'ES' : ''}
              </p>
              {allMatches.map((match) => (
                <MatchCard
                  key={`${match.entity_type}-${match.entity_id}`}
                  match={match}
                  selected={selected}
                  onSelect={setSelected}
                />
              ))}
            </>
          )}

          {/* Visual suggestions (fallback when no text match) */}
          {!hasTextMatches && hasVisualSuggestions && (
            <>
              <div className="flex items-center gap-2 px-1">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <p className="text-xs font-brand text-purple-300 tracking-widest">
                  VISUELLA FÖRSLAG (ingen textmatch hittades)
                </p>
              </div>
              <p className="text-xs text-slate-500 px-1">AI identifierade liknande etiketter baserat på utseende. Bekräfta om rätt.</p>
              {visualSuggestions.map((match) => (
                <MatchCard
                  key={`visual-${match.entity_id}`}
                  match={match}
                  selected={selected}
                  onSelect={setSelected}
                />
              ))}
            </>
          )}

          {/* Confirm */}
          <div className="pt-2 space-y-2">
            <Button
              onClick={handleConfirm}
              disabled={!selected || confirming}
              className="w-full bg-signal hover:bg-signal-hover text-white h-12 text-base font-semibold"
            >
              {confirming
                ? "Bekräftar..."
                : selected
                  ? "Visa artikel i Lager"
                  : "Välj ett alternativ ovan"}
            </Button>
            <Button
              onClick={() => onCreateNew('article', { allNumbers })}
              variant="ghost"
              className="w-full text-slate-400 hover:text-white h-10"
            >
              Ingen stämmer — skapa ny
            </Button>
            <Button onClick={onRetake} variant="ghost" className="w-full text-slate-400 hover:text-white h-10">
              <Camera className="w-4 h-4 mr-2" />
              Skanna igen
            </Button>
          </div>
        </div>
      ) : (
        /* No matches at all */
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="p-5 rounded-2xl border-2 border-amber-500/30 bg-amber-500/10 text-center">
            <p className="text-2xl mb-2">🔍</p>
            <p className="text-lg font-semibold text-white mb-1">Ingen match hittad</p>
            <p className="text-sm text-slate-400">
              {kimiError
                ? "AI-analys misslyckades och inga barcodes matchar. Prova ta om bilden."
                : "Numren på etiketten finns inte i systemet ännu."}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => onCreateNew('article', { allNumbers })}
              className="h-auto py-4 flex-col gap-2 bg-signal hover:bg-signal-hover text-white"
            >
              <Box className="w-6 h-6" />
              <span className="text-sm font-semibold">Skapa ny artikel</span>
            </Button>
            <Button
              onClick={() => onCreateNew('batch', { allNumbers })}
              variant="outline"
              className="h-auto py-4 flex-col gap-2 border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300"
            >
              <Box className="w-6 h-6" />
              <span className="text-sm font-semibold">Skapa ny batch</span>
            </Button>
          </div>

          <Button onClick={onRetake} variant="ghost" className="w-full text-slate-400 hover:text-white h-10">
            <Camera className="w-4 h-4 mr-2" />
            Ta nytt foto
          </Button>
        </motion.div>
      )}
    </div>
  );
}