import React, { useState } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { X, Plus, Minus, Package } from "lucide-react";
import { cn } from "@/lib/utils";

export default function StockAdjustmentModal({ 
  isOpen, 
  onClose, 
  article, 
  type = "add",
  onSubmit,
  isSubmitting 
}) {
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [optimisticStock, setOptimisticStock] = useState(article?.stock_qty || 0);

  const handleSubmit = () => {
    const qty = parseInt(quantity);
    if (!qty || qty <= 0) return;
    
    // Optimistic update
    const newQty = type === "add" ? optimisticStock + qty : optimisticStock - qty;
    setOptimisticStock(newQty);
    
    onSubmit({
      quantity: type === "add" ? qty : -qty,
      reason,
      onSuccess: () => setQuantity("")
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl"
        >
          <div className="flex items-center justify-between p-5 border-b border-slate-700">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center",
                type === "add" ? "bg-emerald-500/20" : "bg-amber-500/20"
              )}>
                {type === "add" ? (
                  <Plus className="w-5 h-5 text-emerald-400" />
                ) : (
                  <Minus className="w-5 h-5 text-amber-400" />
                )}
              </div>
              <div>
                <h2 className="font-semibold text-white">
                  {type === "add" ? "Lägg till lager" : "Ta ut från lager"}
                </h2>
                <p className="text-sm text-slate-400">{article?.name}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="p-5 space-y-5">
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/50">
              <span className="text-slate-400">Nuvarande saldo</span>
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-slate-400" />
                <span className="text-xl font-bold text-white">{optimisticStock}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Antal</Label>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Ange antal"
                className="bg-slate-800 border-slate-600 text-white text-lg py-6"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Anledning (valfritt)</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={type === "add" ? "T.ex. Inleverans, retur..." : "T.ex. Såld, kasserad..."}
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>

            {quantity && (
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Nytt saldo</span>
                  <span className="text-xl font-bold text-white">
                    {type === "add" ? optimisticStock : optimisticStock - parseInt(quantity)}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 p-5 border-t border-slate-700">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 bg-slate-800 border-slate-600 hover:bg-slate-700 text-white"
            >
              Avbryt
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!quantity || parseInt(quantity) <= 0 || isSubmitting}
              className={cn(
                "flex-1",
                type === "add" 
                  ? "bg-emerald-600 hover:bg-emerald-500" 
                  : "bg-amber-600 hover:bg-amber-500"
              )}
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  {type === "add" ? "Lägg till" : "Ta ut"}
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}