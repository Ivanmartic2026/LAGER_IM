import React, { useState, useEffect, useRef } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Search, MapPin, Package, Hash, Factory, 
  Ruler, Scale, Calendar, Grid3X3, X,
  ArrowRight, ScanLine, Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

export default function FindPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const searchInputRef = useRef(null);

  const { data: articles = [] } = useQuery({
    queryKey: ['articles'],
    queryFn: () => base44.entities.Article.list(),
  });

  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const results = articles.filter(article => 
        article.name?.toLowerCase().includes(query) ||
        article.batch_number?.toLowerCase().includes(query) ||
        article.manufacturer?.toLowerCase().includes(query) ||
        article.shelf_address?.toLowerCase().includes(query)
      ).slice(0, 10);
      setSearchResults(results);
    } else {
      setSearchResults([]);
      setSelectedArticle(null);
    }
  }, [searchQuery, articles]);

  const handleSelectArticle = (article) => {
    setSelectedArticle(article);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleClear = () => {
    setSelectedArticle(null);
    setSearchQuery("");
    setSearchResults([]);
    searchInputRef.current?.focus();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
            Hitta i lager
          </h1>
          <p className="text-slate-400">
            Sök artikel för att se exakt hyllplats
          </p>
        </motion.div>

        {/* Search Box */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative mb-6"
        >
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Sök artikel, batchnummer eller hyllplats..."
              className="pl-12 pr-12 h-14 bg-slate-800/50 border-slate-700 text-white text-lg placeholder:text-slate-500 focus:border-emerald-500"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Search Results Dropdown */}
          <AnimatePresence>
            {searchResults.length > 0 && !selectedArticle && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute z-50 w-full mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden"
              >
                <div className="max-h-[400px] overflow-y-auto">
                  {searchResults.map((article, index) => (
                    <motion.button
                      key={article.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      onClick={() => handleSelectArticle(article)}
                      className="w-full p-4 text-left hover:bg-slate-700/50 transition-colors border-b border-slate-700/50 last:border-0"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white truncate">
                            {article.name}
                          </p>
                          <p className="text-sm text-slate-400 flex items-center gap-2 mt-1">
                            <Hash className="w-3 h-3" />
                            {article.batch_number}
                          </p>
                        </div>
                        {article.shelf_address ? (
                          <div className="flex items-center gap-2 text-emerald-400">
                            <MapPin className="w-4 h-4" />
                            <span className="font-bold">{article.shelf_address}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500">Ingen plats</span>
                        )}
                      </div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Selected Article - Location Display */}
        <AnimatePresence mode="wait">
          {selectedArticle ? (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-6"
            >
              {/* Large Location Display */}
              {selectedArticle.shelf_address ? (
                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200 }}
                  className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 to-emerald-700 p-8 md:p-12 text-center"
                >
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
                  <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-400/20 rounded-full blur-2xl" />
                  
                  <div className="relative z-10">
                    <div className="flex items-center justify-center gap-2 text-emerald-200 text-sm mb-4">
                      <MapPin className="w-5 h-5" />
                      <span>Hyllplats</span>
                    </div>
                    
                    <div className="text-7xl md:text-8xl font-bold text-white mb-4 tracking-tight">
                      {selectedArticle.shelf_address}
                    </div>
                    
                    {selectedArticle.warehouse && (
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 text-white text-sm">
                        <Package className="w-4 h-4" />
                        {selectedArticle.warehouse}
                      </div>
                    )}
                  </div>
                </motion.div>
              ) : (
                <div className="p-8 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center">
                  <MapPin className="w-12 h-12 text-amber-400 mx-auto mb-3" />
                  <p className="text-lg font-medium text-amber-200">
                    Ingen hyllplats registrerad
                  </p>
                  <p className="text-sm text-amber-300/70 mt-1">
                    Artikeln finns i systemet men saknar hyllplats
                  </p>
                </div>
              )}

              {/* Article Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700/50">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                      <Package className="w-5 h-5 text-blue-400" />
                    </div>
                    <h3 className="font-semibold text-white">Artikel</h3>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-slate-400">Namn</p>
                      <p className="font-medium text-white">{selectedArticle.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400 flex items-center gap-1.5">
                        <Hash className="w-3.5 h-3.5" />
                        Batchnummer
                      </p>
                      <p className="font-medium text-white">{selectedArticle.batch_number}</p>
                    </div>
                    {selectedArticle.manufacturer && (
                      <div>
                        <p className="text-sm text-slate-400 flex items-center gap-1.5">
                          <Factory className="w-3.5 h-3.5" />
                          Tillverkare
                        </p>
                        <p className="font-medium text-white">{selectedArticle.manufacturer}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700/50">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                      <Package className="w-5 h-5 text-emerald-400" />
                    </div>
                    <h3 className="font-semibold text-white">Lagerstatus</h3>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-slate-400">I lager</p>
                      <div className="flex items-baseline gap-2">
                        <p className="text-3xl font-bold text-white">{selectedArticle.stock_qty || 0}</p>
                        <span className="text-slate-400">st</span>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-sm text-slate-400">Status</p>
                      <Badge className={cn(
                        "mt-1",
                        selectedArticle.status === "active" && "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
                        selectedArticle.status === "low_stock" && "bg-amber-500/20 text-amber-400 border-amber-500/30",
                        selectedArticle.status === "out_of_stock" && "bg-red-500/20 text-red-400 border-red-500/30"
                      )}>
                        {selectedArticle.status === "active" && "I lager"}
                        {selectedArticle.status === "low_stock" && "Lågt lager"}
                        {selectedArticle.status === "out_of_stock" && "Slut"}
                        {!selectedArticle.status && "Okänd"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Info */}
              {(selectedArticle.pixel_pitch_mm || selectedArticle.dimensions_width_mm || selectedArticle.weight_kg || selectedArticle.manufacturing_date) && (
                <div className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700/50">
                  <h3 className="font-semibold text-white mb-4">Ytterligare information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedArticle.pixel_pitch_mm && (
                      <div className="flex items-center gap-3">
                        <Grid3X3 className="w-4 h-4 text-slate-400" />
                        <div>
                          <p className="text-xs text-slate-400">Pixel Pitch</p>
                          <p className="font-medium text-white">{selectedArticle.pixel_pitch_mm} mm</p>
                        </div>
                      </div>
                    )}
                    
                    {selectedArticle.dimensions_width_mm && (
                      <div className="flex items-center gap-3">
                        <Ruler className="w-4 h-4 text-slate-400" />
                        <div>
                          <p className="text-xs text-slate-400">Dimensioner</p>
                          <p className="font-medium text-white text-sm">
                            {selectedArticle.dimensions_width_mm} × {selectedArticle.dimensions_height_mm || "—"} mm
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {selectedArticle.weight_kg && (
                      <div className="flex items-center gap-3">
                        <Scale className="w-4 h-4 text-slate-400" />
                        <div>
                          <p className="text-xs text-slate-400">Vikt</p>
                          <p className="font-medium text-white">{selectedArticle.weight_kg} kg</p>
                        </div>
                      </div>
                    )}
                    
                    {selectedArticle.manufacturing_date && (
                      <div className="flex items-center gap-3">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <div>
                          <p className="text-xs text-slate-400">Tillverkad</p>
                          <p className="font-medium text-white">
                            {format(new Date(selectedArticle.manufacturing_date), "MMM yyyy", { locale: sv })}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={handleClear}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white border border-slate-600"
                >
                  <Search className="w-4 h-4 mr-2" />
                  Sök igen
                </Button>
              </div>
            </motion.div>
          ) : !searchQuery && (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-12"
            >
              <div className="w-20 h-20 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
                <Search className="w-10 h-10 text-slate-600" />
              </div>
              <p className="text-slate-400 mb-2">
                Börja skriva för att söka artiklar
              </p>
              <p className="text-sm text-slate-500">
                Sök på artikelnamn, batchnummer eller hyllplats
              </p>

              {/* Quick tips */}
              <div className="mt-8 grid gap-3 max-w-md mx-auto">
                <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-800/30 border border-slate-700/30 text-left">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white mb-1">Snabbsök</p>
                    <p className="text-xs text-slate-400">
                      Skriv del av artikelnamn eller batch för direktresultat
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-800/30 border border-slate-700/30 text-left">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white mb-1">Hitta hyllplats</p>
                    <p className="text-xs text-slate-400">
                      Se stor och tydlig hyllplats när du hittat rätt artikel
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Recent searches could go here */}
      </div>
    </div>
  );
}