import React, { useState } from 'react';
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Copy, ArrowRight, Sparkles, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function DetailedImageAnalysis({
  imageUrl,
  analysisGroups,
  onExtract,
  onProceed,
  isLoading
}) {
  const [selectedValues, setSelectedValues] = useState({});

  // Auto-kategorisering baserat på innehål
  const getCategoryForText = (text) => {
    const textLower = text.toLowerCase();
    
    // Datum (YYYY-MM-DD eller DD-MM-YYYY)
    if (/^\d{4}-\d{2}-\d{2}$|^\d{2}-\d{2}-\d{4}$|^\d{1,2}\/\d{1,2}\/\d{4}$/.test(text)) {
      return 'manufacturing_date';
    }
    
    // Batch nummer (vanligtvis B följt av siffror eller bokstäver)
    if (/^B\d+|^BATCH[-\s]?/i.test(text)) {
      return 'batch_number';
    }
    
    // SKU/Artikelnummer (långa kod-sekvenser med bindestreck)
    if (/^[A-Z]{2,}-\d+[-\w]*/.test(text) && text.length > 10) {
      return 'sku';
    }
    
    // Pixel pitch
    if (/P\d+(\.\d+)?|pitch|mm/i.test(text)) {
      return 'pixel_pitch_mm';
    }
    
    return null;
  };

  const CATEGORIES = [
    { id: 'batch_number', label: 'Batchnummer' },
    { id: 'name', label: 'Artikelnamn' },
    { id: 'manufacturer', label: 'Tillverkare' },
    { id: 'manufacturing_date', label: 'Tillverkningsdatum' },
    { id: 'pixel_pitch_mm', label: 'Pixel Pitch (mm)' },
    { id: 'category', label: 'Kategori' },
    { id: 'warehouse', label: 'Lagerställe' },
    { id: 'sku', label: 'SKU/Artikelnummer' },
    { id: 'other', label: 'Övrigt' }
  ];

  const handleSelect = (groupId, value) => {
    setSelectedValues(prev => ({
      ...prev,
      [groupId]: value
    }));
  };

  const handleCopyValue = (value) => {
    navigator.clipboard.writeText(value);
    toast.success('Kopierat!');
  };

  const getGroupColor = (index) => {
    const colors = [
      'from-blue-500/20 to-blue-600/20 border-blue-500/30',
      'from-purple-500/20 to-purple-600/20 border-purple-500/30',
      'from-emerald-500/20 to-emerald-600/20 border-emerald-500/30',
      'from-amber-500/20 to-amber-600/20 border-amber-500/30',
      'from-rose-500/20 to-rose-600/20 border-rose-500/30',
    ];
    return colors[index % colors.length];
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="text-center">
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center mx-auto mb-3">
          <Search className="w-7 h-7 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          Detaljerad bildanalys
        </h2>
        <p className="text-slate-400">
          Alla identifierade texter och områden från kortet
        </p>
      </div>

      {/* Bild */}
      {imageUrl && (
        <div className="rounded-xl overflow-hidden border border-slate-700 bg-slate-900">
          <img
            src={imageUrl}
            alt="Analyserad kort"
            className="w-full h-48 object-contain"
          />
        </div>
      )}

      {/* Alla områden på en sida */}
      {analysisGroups && analysisGroups.length > 0 && (
        <div className="space-y-6">
          {analysisGroups.map((group, groupIdx) => (
            <div key={groupIdx}>
              {/* Område header */}
              <h3 className="text-lg font-semibold text-white">
                {group.location}
              </h3>
              <p className="text-sm text-slate-400">
                {group.description}
              </p>

              {/* Identifierade värden */}
              {group.values && group.values.length > 0 ? (
                <div className="space-y-3">
                  {group.values.map((item, idx) => {
                  const valueKey = `${groupIdx}_${idx}`;
                  const autoCategory = getCategoryForText(item.text);
                  const selectedCategory = selectedValues[valueKey]?.category || autoCategory;
                    
                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="p-3 rounded-lg bg-slate-800/50 border border-slate-700 hover:border-slate-600 transition-all"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-mono font-semibold text-sm break-words">
                              {item.text}
                            </p>
                          </div>
                        </div>

                        {/* Kategori väljare */}
                        <div className="mt-2 grid grid-cols-2 gap-1.5">
                          {CATEGORIES.map(cat => (
                            <button
                              key={cat.id}
                              onClick={() => handleSelect(valueKey, { text: item.text, category: cat.id })}
                              className={cn(
                                "px-2 py-1.5 rounded-md text-xs font-medium transition-all",
                                selectedCategory === cat.id
                                  ? autoCategory === cat.id
                                    ? "bg-emerald-600 text-white ring-1 ring-emerald-400"
                                    : "bg-indigo-600 text-white ring-1 ring-indigo-400"
                                  : "bg-slate-700/50 text-slate-300 hover:bg-slate-700 hover:text-white"
                              )}
                            >
                              {cat.label}
                              {autoCategory === cat.id && <span className="ml-1">✓</span>}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700 text-slate-400 text-sm">
                  Inga texter identifierade i detta område
                </div>
              )}

              {/* Kopiera knapp */}
              {selectedValues[groupIdx] && (
                <Button
                  onClick={() => handleCopyValue(selectedValues[groupIdx])}
                  variant="outline"
                  className="w-full bg-white/5 border-white/10 hover:bg-white/10 text-slate-300 h-9 text-xs"
                >
                  <Copy className="w-3 h-3 mr-2" />
                  Kopiera: {selectedValues[groupIdx]}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Sammanfattning */}
      <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
        <p className="text-sm font-medium text-white mb-3">Valda värden ({Object.keys(selectedValues).length})</p>
        {Object.keys(selectedValues).length > 0 ? (
          <div className="space-y-2">
            {Object.entries(selectedValues).map(([key, item]) => {
              const category = CATEGORIES.find(c => c.id === item.category);
              return (
                <div key={key} className="p-2 rounded-lg bg-slate-700/50 border border-slate-600">
                  <p className="text-xs text-slate-400">{category?.label}</p>
                  <p className="text-sm font-mono text-white">{item.text}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-slate-400">Välj värden och deras kategorier ovan</p>
        )}
      </div>

      {/* Åtgärder */}
      <div className="flex gap-3 pt-4">
        <Button
          onClick={() => {
            // Återställ
            setSelectedValues({});
          }}
          variant="outline"
          className="flex-1 bg-white/5 border-white/10 hover:bg-white/10 text-white h-11"
        >
          Återställ val
        </Button>
        <Button
          onClick={() => {
            // Skicka valda värden till auto-review
            onProceed(selectedValues);
          }}
          disabled={isLoading || Object.keys(selectedValues).length === 0}
          className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white h-11"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Analyserar...
            </>
          ) : (
            <>
              <ArrowRight className="w-4 h-4 mr-2" />
              Fortsätt
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}