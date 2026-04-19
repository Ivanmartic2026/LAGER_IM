import React from 'react';
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Sparkles, Package, CheckCircle2, X, Activity, Printer } from "lucide-react";

export function RepairMatchStep({ imageUrls, extractedData, repairArticle, setRepairArticle, repairQuantity, setRepairQuantity, repairNotes, setRepairNotes, isSaving, onSubmit, onReset }) {
  return (
    <motion.div key="repair_match" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-white mb-2">Registrera reparation</h2>
        <p className="text-slate-400">Bekräfta artikel och antal för reparation</p>
      </div>
      {imageUrls.length > 0 && (
        <div className="mb-4">
          <p className="text-sm text-slate-400 mb-2">Skannad bild</p>
          <img src={imageUrls[0]} alt="Skannad modul" className="w-full h-48 object-contain rounded-xl bg-slate-900 border border-slate-700" />
        </div>
      )}
      <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-2 text-sm">
            <p className="text-blue-300 font-semibold">AI hittade följande information:</p>
            {extractedData.batch_number && <p className="text-white">Batch: <span className="font-mono">{extractedData.batch_number}</span></p>}
            {extractedData.name && <p className="text-white">Namn: {extractedData.name}</p>}
            {extractedData.manufacturer && <p className="text-white">Tillverkare: {extractedData.manufacturer}</p>}
          </div>
        </div>
      </div>
      {!repairArticle ? (
        <div className="space-y-3">
          <Label className="text-sm font-semibold text-white">Artikel hittades inte automatiskt</Label>
          <Button variant="outline" onClick={async () => {
            try {
              let articles = [];
              if (extractedData.batch_number) articles = await base44.entities.Article.filter({ batch_number: extractedData.batch_number });
              if (articles.length === 0 && extractedData.name) {
                const all = await base44.entities.Article.list();
                articles = all.filter(a => a.name?.toLowerCase().includes(extractedData.name.toLowerCase()));
              }
              if (articles.length > 0) { setRepairArticle(articles[0]); toast.success(`Artikel hittad: ${articles[0].name}`); }
              else toast.error("Ingen matchande artikel hittades i lagret");
            } catch { toast.error("Kunde inte söka i lagret"); }
          }} className="w-full bg-white/5 border-white/10 hover:bg-white/10 text-white">
            <Package className="w-4 h-4 mr-2" />
            Sök manuellt i lager
          </Button>
        </div>
      ) : null}
      {repairArticle && (
        <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
          <div className="flex items-start gap-3 mb-4">
            {repairArticle.image_urls?.[0] && <img src={repairArticle.image_urls[0]} alt={repairArticle.name} className="w-16 h-16 rounded-lg object-cover bg-slate-900" />}
            <div className="flex-1">
              <p className="font-medium text-white mb-1">{repairArticle.name}</p>
              <div className="space-y-1 text-xs text-slate-400">
                <div>Batch: <span className="text-white font-mono">{repairArticle.batch_number}</span></div>
                <div>I lager: <span className="text-white font-semibold">{repairArticle.stock_qty || 0} st</span></div>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <Label className="text-sm text-slate-300 mb-2 block">Antal för reparation</Label>
              <Input type="number" min="1" max={repairArticle.stock_qty || 1} value={repairQuantity} onChange={(e) => setRepairQuantity(parseInt(e.target.value) || 1)} className="bg-white/5 border-white/10 text-white" />
            </div>
            <div>
              <Label className="text-sm text-slate-300 mb-2 block">Anledning (frivilligt)</Label>
              <Textarea value={repairNotes} onChange={(e) => setRepairNotes(e.target.value)} placeholder="T.ex. Defekt LED, Skadad panel..." className="bg-white/5 border-white/10 text-white placeholder:text-white/40 min-h-[80px]" />
            </div>
          </div>
        </div>
      )}
      <div className="flex gap-3 pt-6">
        <Button variant="outline" onClick={onReset} disabled={isSaving} className="flex-1 bg-white/5 border-white/10 hover:bg-white/10 text-white">
          <X className="w-4 h-4 mr-2" />Avbryt
        </Button>
        <Button onClick={onSubmit} disabled={isSaving || !repairArticle || repairQuantity <= 0} className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white">
          {isSaving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />Registrerar...</> : <><CheckCircle2 className="w-4 h-4 mr-2" />Registrera reparation</>}
        </Button>
      </div>
    </motion.div>
  );
}

export function RepairLabelStep({ repairArticle, repairQuantity, repairNotes, isGeneratingLabel, onPrint, onReset }) {
  return (
    <motion.div key="repair_label" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-2xl bg-red-500/20 flex items-center justify-center mx-auto mb-4">
          <Activity className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Reparation registrerad</h2>
        <p className="text-slate-400">Skriv ut bekräftelseetikett att sätta på modulen</p>
      </div>
      {repairArticle && (
        <div className="p-6 rounded-2xl bg-slate-800/50 border border-slate-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center"><Activity className="w-6 h-6 text-red-400" /></div>
            <div>
              <p className="font-semibold text-white">{repairArticle.name}</p>
              <p className="text-sm text-slate-400">Batch: {repairArticle.batch_number}</p>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-400">Antal:</span><span className="text-white font-semibold">{repairQuantity} st</span></div>
            {repairNotes && <div className="pt-2 border-t border-slate-700"><span className="text-slate-400 block mb-1">Anledning:</span><span className="text-white">{repairNotes}</span></div>}
          </div>
        </div>
      )}
      <div className="flex flex-col gap-3">
        <Button onClick={onPrint} disabled={isGeneratingLabel} className="w-full bg-red-600 hover:bg-red-500 text-white h-12">
          {isGeneratingLabel ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />Genererar...</> : <><Printer className="w-4 h-4 mr-2" />Skriv ut bekräftelse</>}
        </Button>
        <Button variant="outline" onClick={onReset} className="w-full bg-white/5 border-white/10 hover:bg-white/10 text-white">Hoppa över & stäng</Button>
      </div>
    </motion.div>
  );
}