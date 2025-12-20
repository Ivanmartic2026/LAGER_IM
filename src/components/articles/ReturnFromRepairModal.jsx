import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, X } from "lucide-react";

export default function ReturnFromRepairModal({ isOpen, onClose, article, onSubmit, isSubmitting }) {
  const repairQuantity = parseInt(article?.repair_notes?.match(/^(\d+)\s+st/)?.[1] || 0);
  const [returnedQuantity, setReturnedQuantity] = useState(repairQuantity || 1);
  const [discardedQuantity, setDiscardedQuantity] = useState(0);
  const [returnNotes, setReturnNotes] = useState("");

  const handleSubmit = () => {
    onSubmit(returnedQuantity, discardedQuantity, returnNotes);
    setReturnNotes("");
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
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Återkommen från reparation</h2>
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
            <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
              <p className="text-xs text-slate-400 mb-1">Skickades på reparation</p>
              <p className="text-sm text-white">{article?.repair_notes}</p>
              {article?.repair_date && (
                <p className="text-xs text-slate-500 mt-1">
                  Datum: {new Date(article.repair_date).toLocaleDateString('sv-SE')}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-300">
                Antal som återkommit till lager *
              </Label>
              <Input
                type="number"
                min="0"
                max={repairQuantity}
                value={returnedQuantity}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 0;
                  setReturnedQuantity(val);
                  setDiscardedQuantity(Math.max(0, repairQuantity - val));
                }}
                className="bg-slate-800/50 border-slate-700 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-300">
                Antal kasserade/förlorade
              </Label>
              <Input
                type="number"
                min="0"
                max={repairQuantity}
                value={discardedQuantity}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 0;
                  setDiscardedQuantity(val);
                  setReturnedQuantity(Math.max(0, repairQuantity - val));
                }}
                className="bg-slate-800/50 border-slate-700 text-white"
              />
              <p className="text-xs text-slate-500">
                Totalt skickades: {repairQuantity} st
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-300">
                Kommentar
              </Label>
              <Textarea
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
                placeholder="Resultat av reparation, tillstånd, etc..."
                className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 min-h-[100px]"
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
                disabled={isSubmitting}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500"
              >
                {isSubmitting ? (
                  "Sparar..."
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Återför till lager
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