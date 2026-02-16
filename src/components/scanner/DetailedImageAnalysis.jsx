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
  const [activeTab, setActiveTab] = useState(0);

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

      {/* Tabs för olika områden */}
      {analysisGroups && analysisGroups.length > 0 && (
        <Tabs value={activeTab.toString()} onValueChange={(v) => setActiveTab(parseInt(v))}>
          <TabsList className="w-full grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(analysisGroups.length, 3)}, 1fr)` }}>
            {analysisGroups.map((group, idx) => (
              <TabsTrigger
                key={idx}
                value={idx.toString()}
                className="text-xs data-[state=active]:bg-indigo-600"
              >
                {group.location}
              </TabsTrigger>
            ))}
          </TabsList>

          {analysisGroups.map((group, groupIdx) => (
            <TabsContent key={groupIdx} value={groupIdx.toString()} className="space-y-3 mt-4">
              {/* Område beskrivning */}
              <div className={cn(
                "p-4 rounded-xl border bg-gradient-to-br",
                getGroupColor(groupIdx)
              )}>
                <p className="text-sm font-semibold text-white mb-2">
                  {group.location}
                </p>
                <p className="text-xs text-slate-300">
                  {group.description}
                </p>
              </div>

              {/* Identifierade värden */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-white">Identifierade texter:</p>
                {group.values && group.values.length > 0 ? (
                  <div className="space-y-2">
                    {group.values.map((item, idx) => (
                      <motion.button
                        key={idx}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        onClick={() => handleSelect(groupIdx, item.text)}
                        className={cn(
                          "w-full p-3 rounded-lg text-left transition-all border",
                          selectedValues[groupIdx] === item.text
                            ? "bg-indigo-600/20 border-indigo-500 ring-2 ring-indigo-500/50"
                            : "bg-slate-800/50 border-slate-700 hover:border-slate-600 hover:bg-slate-800"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-mono text-sm truncate">
                              {item.text}
                            </p>
                            {item.context && (
                              <p className="text-xs text-slate-400 mt-1">
                                {item.context}
                              </p>
                            )}
                          </div>
                          {selectedValues[groupIdx] === item.text && (
                            <CheckCircle2 className="w-5 h-5 text-indigo-400 flex-shrink-0 ml-2" />
                          )}
                        </div>
                      </motion.button>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700 text-slate-400 text-sm">
                    Inga texter identifierade i detta område
                  </div>
                )}
              </div>

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
            </TabsContent>
          ))}
        </Tabs>
      )}

      {/* Sammanfattning */}
      <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
        <p className="text-sm font-medium text-white mb-2">Valda värden ({Object.keys(selectedValues).length})</p>
        {Object.keys(selectedValues).length > 0 ? (
          <div className="space-y-1">
            {Object.entries(selectedValues).map(([groupIdx, value]) => (
              <div key={groupIdx} className="text-xs text-slate-300">
                <span className="text-slate-500">{analysisGroups[parseInt(groupIdx)]?.location}:</span> <span className="font-mono text-white">{value}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400">Välj värden från tabben ovan</p>
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