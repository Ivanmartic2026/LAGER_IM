import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { Wrench, X } from "lucide-react";

export default function RepairModal({ isOpen, onClose, article, onSubmit, isSubmitting }) {
  const [repairNotes, setRepairNotes] = useState("");
  const [quantity, setQuantity] = useState(article?.stock_qty || 1);

  const handleSubmit = () => {
    if (!repairNotes.trim()) return;
    onSubmit(repairNotes, quantity);
    setRepairNotes("");
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-slate-900 rounded-2xl p-6 max-w-md w-full border border-slate-700"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                <Wrench className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Skicka på reparation</h2>
                <p className="text-sm text-slate-400">{article?.name}</p>
              </div>
            </div>
            <Button
              onClick={onClose}
              variant="ghost"
              size="icon"
              className="text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-300">
                Antal som skickas på reparation *
              </Label>
              <Input
                type="number"
                min="1"
                max={article?.stock_qty || 1}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="bg-slate-800/50 border-slate-700 text-white"
              />
              <p className="text-xs text-slate-500">
                Tillgängligt i lager: {article?.stock_qty || 0} st
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-300">
                Anledning till reparation *
              </Label>
              <Textarea
                value={repairNotes}
                onChange={(e) => setRepairNotes(e.target.value)}
                placeholder="Beskriv problemet eller anledningen till reparation..."
                className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 min-h-[120px]"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={onClose}
                variant="outline"
                className="flex-1 bg-slate-800 border-slate-600 hover:bg-slate-700 text-white"
              >
                Avbryt
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!repairNotes.trim() || isSubmitting}
                className="flex-1 bg-orange-600 hover:bg-orange-500"
              >
                {isSubmitting ? (
                  "Sparar..."
                ) : (
                  <>
                    <Wrench className="w-4 h-4 mr-2" />
                    Skicka på reparation
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}