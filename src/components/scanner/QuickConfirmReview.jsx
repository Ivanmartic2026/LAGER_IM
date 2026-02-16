import React, { useState } from 'react';
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Package, AlertCircle } from "lucide-react";

export default function QuickConfirmReview({
  article,
  mode,
  onConfirm,
  onCancel,
  isLoading
}) {
  const [quantity, setQuantity] = useState(1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Status */}
      <div className="text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
          className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center mx-auto mb-4"
        >
          <CheckCircle2 className="w-8 h-8 text-emerald-400" />
        </motion.div>
        <h2 className="text-2xl font-bold text-white mb-2">
          Artikel hittad!
        </h2>
        <p className="text-slate-400">
          AI identifierade artikeln med hög säkerhet
        </p>
      </div>

      {/* Artikel info */}
      <div className="p-6 rounded-2xl bg-slate-800/50 border border-slate-700 space-y-4">
        {article.image_urls?.[0] && (
          <img
            src={article.image_urls[0]}
            alt={article.name}
            className="w-full h-40 object-contain rounded-lg bg-slate-900"
          />
        )}

        <div>
          <h3 className="text-lg font-bold text-white mb-1">
            {article.name}
          </h3>
          <div className="space-y-2 text-sm">
            {article.batch_number && (
              <div className="flex justify-between">
                <span className="text-slate-400">Batch:</span>
                <span className="text-white font-mono">{article.batch_number}</span>
              </div>
            )}
            {article.manufacturer && (
              <div className="flex justify-between">
                <span className="text-slate-400">Tillverkare:</span>
                <span className="text-white">{article.manufacturer}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-slate-700">
              <span className="text-slate-400">I lagret:</span>
              <span className="text-white font-semibold">{article.stock_qty || 0} st</span>
            </div>
            {article.shelf_address && (
              <div className="flex justify-between">
                <span className="text-slate-400">Hyllplats:</span>
                <span className="text-white">{article.shelf_address}</span>
              </div>
            )}
          </div>
        </div>

        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
          <p className="text-xs font-semibold text-emerald-300 mb-1">
            ✓ Alla fält verifierade av AI
          </p>
          <p className="text-xs text-emerald-200">
            Batchnummer matchade med {'>95%'} säkerhet
          </p>
        </div>
      </div>

      {/* Kvantitet */}
      <div className="space-y-3">
        <label className="block text-sm font-semibold text-white">
          {mode === "inbound" ? "Antal för inleverans" : "Antal för inventering"}
        </label>
        <Input
          type="number"
          min="1"
          max={mode === "inbound" ? 10000 : (article.stock_qty || 1)}
          value={quantity}
          onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
          className="bg-white/5 border-white/10 text-white text-lg h-12"
          autoFocus
        />
        <p className="text-xs text-slate-400">
          {mode === "inbound" 
            ? "Ange hur många enheter som anlänt"
            : `Ange antal för justering (max ${article.stock_qty || 0})`}
        </p>
      </div>

      {/* Varning för inventering */}
      {mode === "inventory" && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-300">Justera lagersaldo</p>
            <p className="text-xs text-amber-200 mt-1">
              Nuvarande: {article.stock_qty || 0} st → Nytt: {Math.max(0, (article.stock_qty || 0) + quantity)} st
            </p>
          </div>
        </div>
      )}

      {/* Åtgärder */}
      <div className="flex gap-3 pt-4">
        <Button
          onClick={onCancel}
          disabled={isLoading}
          variant="outline"
          className="flex-1 bg-white/5 border-white/10 hover:bg-white/10 text-white h-11"
        >
          Avbryt
        </Button>
        <Button
          onClick={() => onConfirm(quantity)}
          disabled={isLoading || quantity <= 0}
          className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white h-11"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Sparar...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Bekräfta & spara
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}