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
  ArrowRight, ScanLine, Sparkles, Camera, Plus, Printer
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import CameraCapture from "@/components/scanner/CameraCapture";
import LabelDownloader from "@/components/labels/LabelDownloader";

export default function FindPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [mode, setMode] = useState("search"); // "search" or "scan"
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanResult, setScanResult] = useState(null); // "found" or "not_found"
  const [extractedData, setExtractedData] = useState({});
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [capturedImages, setCapturedImages] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const searchInputRef = useRef(null);

  const { data: articles = [] } = useQuery({
    queryKey: ['articles'],
    queryFn: () => base44.entities.Article.list(),
  });

  // Check for articleId in URL on mount
  const hasInitialized = useRef(false);
  useEffect(() => {
    if (hasInitialized.current || articles.length === 0) return;
    
    const params = new URLSearchParams(window.location.hash.split('?')[1]);
    const articleId = params.get('articleId');
    
    if (articleId) {
      const article = articles.find(a => a.id === articleId);
      if (article) {
        setSelectedArticle(article);
        setScanResult("found");
        hasInitialized.current = true;
      }
    }
  }, [articles.length]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    let results = articles.filter(article => 
      article.name?.toLowerCase().includes(query) ||
      article.batch_number?.toLowerCase().includes(query) ||
      article.manufacturer?.toLowerCase().includes(query) ||
      article.shelf_address?.toLowerCase().includes(query)
    );

    // Apply status filter
    if (statusFilter !== "all") {
      results = results.filter(article => article.status === statusFilter);
    }

    setSearchResults(results.slice(0, 10));
  }, [searchQuery, articles, statusFilter]);

  const handleSelectArticle = (article) => {
    setSelectedArticle(article);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleClear = () => {
    setSelectedArticle(null);
    setSearchQuery("");
    setSearchResults([]);
    setMode("search");
    setScanResult(null);
    setExtractedData({});
    setCapturedImages([]);
    setStatusFilter("all");
    searchInputRef.current?.focus();
  };

  const handleImageCaptured = async (file) => {
    // Upload image first
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    
    // Add to captured images
    setCapturedImages(prev => [...prev, file_url]);
    toast.success(`Bild ${capturedImages.length + 1} tillagd`);
  };

  const handleProcessImages = async () => {
    if (capturedImages.length === 0) {
      toast.error("Ingen bild att analysera");
      return;
    }

    setIsProcessing(true);

    try {
      // Extract data using AI with all captured images
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analysera dessa ${capturedImages.length} bilder av samma artikel/etikett och extrahera följande information:
        - Batchnummer/artikelnummer
        - Artikelnamn
        - Tillverkare
        - Pixel Pitch (om synlig)
        - Dimensioner (bredd × höjd i mm, om synlig)
        
Kombinera informationen från alla bilder för att få så komplett data som möjligt.
Returnera informationen i JSON-format.`,
        file_urls: capturedImages,
        response_json_schema: {
          type: "object",
          properties: {
            batch_number: { type: "string" },
            name: { type: "string" },
            manufacturer: { type: "string" },
            pixel_pitch_mm: { type: "number" },
            dimensions_width_mm: { type: "number" },
            dimensions_height_mm: { type: "number" }
          }
        }
      });

      setExtractedData({ ...result, image_urls: capturedImages });

      // Search for article in database
      let found = null;
      
      if (result.batch_number) {
        const byBatch = await base44.entities.Article.filter({ 
          batch_number: result.batch_number 
        });
        if (byBatch.length > 0) found = byBatch[0];
      }
      
      if (!found && result.name) {
        const byName = articles.filter(a => 
          a.name?.toLowerCase() === result.name?.toLowerCase()
        );
        if (byName.length > 0) found = byName[0];
      }

      if (found) {
        setSelectedArticle(found);
        setScanResult("found");
        toast.success("Artikel hittad i lagret!");
      } else {
        setScanResult("not_found");
        toast.info("Artikeln finns inte i lagret");
      }
      
    } catch (error) {
      console.error("Error processing images:", error);
      toast.error("Kunde inte analysera bilderna. Försök igen.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveImage = (index) => {
    setCapturedImages(prev => prev.filter((_, i) => i !== index));
    toast.success("Bild borttagen");
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
            Sök eller skanna artikel för att se om den finns i lagret
          </p>
        </motion.div>

        {/* Mode Toggle */}
        <div className="flex gap-2 mb-6">
          <Button
            onClick={() => setMode("search")}
            className={cn(
              "flex-1 h-[52px] text-base md:text-sm backdrop-blur-xl transition-all duration-300",
              mode === "search" 
                ? "bg-emerald-500/30 border border-emerald-500/60 text-emerald-300 hover:bg-emerald-500/40" 
                : "bg-white/10 border border-white/20 text-white hover:bg-white/15"
            )}
          >
            <Search className="w-5 h-5 md:w-4 md:h-4 mr-2" />
            Sök
          </Button>
          <Button
            onClick={() => {
              setMode("scan");
              setSelectedArticle(null);
              setScanResult(null);
            }}
            className={cn(
              "flex-1 h-[52px] text-base md:text-sm backdrop-blur-xl transition-all duration-300",
              mode === "scan" 
                ? "bg-emerald-500/30 border border-emerald-500/60 text-emerald-300 hover:bg-emerald-500/40" 
                : "bg-white/10 border border-white/20 text-white hover:bg-white/15"
            )}
          >
            <Camera className="w-5 h-5 md:w-4 md:h-4 mr-2" />
            Skanna
          </Button>
        </div>

        {/* Status Filter */}
        {mode === "search" && (
          <div className="mb-6">
            <p className="text-xs font-semibold text-white/50 uppercase tracking-wide mb-3">Status</p>
            <div className="grid grid-cols-4 gap-2">
              {['all', 'active', 'low_stock', 'out_of_stock'].map((status) => {
                const labels = { all: 'Alla', active: 'Aktiv', low_stock: 'Lågt lager', out_of_stock: 'Slut' };
                return (
                  <motion.button
                    key={status}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setStatusFilter(status)}
                    className={cn(
                      "p-3 rounded-lg transition-all duration-300 text-sm font-medium",
                      statusFilter === status
                        ? "bg-emerald-500/30 border border-emerald-500/60 text-emerald-300"
                        : "bg-white/5 border border-white/10 hover:bg-white/10 text-white/70"
                    )}
                  >
                    {labels[status]}
                  </motion.button>
                );
              })}
            </div>
          </div>
        )}

        {/* Search or Scan Mode */}
         <div className="mb-6 min-h-[64px] md:min-h-[56px]">
         {mode === "search" ? (
          <div className="relative">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 md:w-5 md:h-5 text-slate-400" />
            <Input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Sök artikel, batchnummer eller hyllplats..."
              className="pl-14 md:pl-12 pr-14 md:pr-12 h-16 md:h-14 bg-slate-800/50 border-slate-700 text-white text-xl md:text-lg placeholder:text-slate-500 focus:border-emerald-500"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <X className="w-6 h-6 md:w-5 md:h-5" />
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
          </div>
        ) : (
          <div>
            <CameraCapture
              onImageCaptured={handleImageCaptured}
              isProcessing={isProcessing}
            />
            
            {/* Captured Images Preview */}
            {capturedImages.length > 0 && (
              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-300">
                    {capturedImages.length} {capturedImages.length === 1 ? 'bild' : 'bilder'} tillagd{capturedImages.length > 1 ? 'e' : ''}
                  </p>
                  <Button
                    onClick={handleProcessImages}
                    disabled={isProcessing}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white"
                  >
                    {isProcessing ? (
                      <>
                        <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                        Analyserar...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Analysera bilderna
                      </>
                    )}
                  </Button>
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  {capturedImages.map((url, index) => (
                    <div key={index} className="relative group">
                      <img 
                        src={url} 
                        alt={`Bild ${index + 1}`}
                        className="w-full aspect-square object-cover rounded-lg border-2 border-slate-700"
                      />
                      <button
                        onClick={() => handleRemoveImage(index)}
                        className="absolute top-1 right-1 w-7 h-7 bg-red-600 hover:bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                      <div className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-2 py-1 rounded">
                        {index + 1}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        </div>

        {/* Scan Result - Not Found */}
        <AnimatePresence mode="wait">
          {scanResult === "not_found" && (
            <motion.div
              key="not-found"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-6"
            >
              <div className="p-8 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center">
                <Package className="w-16 h-16 text-amber-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">
                  Artikeln finns inte i lagret
                </h3>
                <p className="text-slate-400 mb-6">
                  Vill du lägga till denna artikel som en ny vara?
                </p>

                {extractedData.name && (
                  <div className="bg-slate-800/50 rounded-xl p-4 mb-6 text-left space-y-4">
                    <p className="text-sm text-slate-400">Extraherad information från {extractedData.image_urls?.length || 1} {extractedData.image_urls?.length === 1 ? 'bild' : 'bilder'}:</p>
                    <div className="space-y-2 text-sm">
                      {extractedData.name && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Namn:</span>
                          <span className="text-white font-medium">{extractedData.name}</span>
                        </div>
                      )}
                      {extractedData.batch_number && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Batchnummer:</span>
                          <span className="text-white font-medium">{extractedData.batch_number}</span>
                        </div>
                      )}
                      {extractedData.manufacturer && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Tillverkare:</span>
                          <span className="text-white font-medium">{extractedData.manufacturer}</span>
                        </div>
                      )}
                      {extractedData.pixel_pitch_mm && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Pixel Pitch:</span>
                          <span className="text-white font-medium">{extractedData.pixel_pitch_mm} mm</span>
                        </div>
                      )}
                      {extractedData.dimensions_width_mm && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Dimensioner:</span>
                          <span className="text-white font-medium">
                            {extractedData.dimensions_width_mm} × {extractedData.dimensions_height_mm || '—'} mm
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Show captured images */}
                    {extractedData.image_urls && extractedData.image_urls.length > 0 && (
                      <div>
                        <p className="text-xs text-slate-400 mb-2">Analyserade bilder:</p>
                        <div className="grid grid-cols-3 gap-2">
                          {extractedData.image_urls.map((url, idx) => (
                            <img 
                              key={idx}
                              src={url} 
                              alt={`Scannad ${idx + 1}`}
                              className="w-full aspect-square object-cover rounded border border-slate-700"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    onClick={handleClear}
                    variant="outline"
                    className="flex-1 h-[52px] bg-slate-800 border-slate-600 hover:bg-slate-700 text-white text-base md:text-sm"
                  >
                    Avbryt
                  </Button>
                  <Link 
                    to={createPageUrl("Scan")}
                    className="flex-1"
                  >
                    <Button className="w-full h-[52px] bg-emerald-600 hover:bg-emerald-500 text-base md:text-sm">
                      <Plus className="w-5 h-5 md:w-4 md:h-4 mr-2" />
                      Lägg till artikel
                    </Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          )}

          {/* Selected Article - Location Display */}
          {selectedArticle && scanResult !== "not_found" ? (
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
                  className="relative overflow-hidden rounded-2xl bg-white/5 border border-white/10 p-8 md:p-12 text-center"
                >
                  <div className="relative z-10">
                    <div className="flex items-center justify-center gap-2 text-white/50 text-sm mb-4">
                      <MapPin className="w-5 h-5" />
                      <span>Hyllplats</span>
                    </div>
                    
                    <div className="text-7xl md:text-8xl font-bold text-white mb-4 tracking-tight">
                      {selectedArticle.shelf_address}
                    </div>
                    
                    {selectedArticle.warehouse && (
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/10 text-white text-sm">
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
                  onClick={() => setShowPrintModal(true)}
                  variant="outline"
                  className="flex-1 h-[52px] bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 text-base md:text-sm"
                >
                  <Printer className="w-5 h-5 md:w-4 md:h-4 mr-2" />
                  Skriv ut etikett
                </Button>
                <Button
                  onClick={handleClear}
                  className="flex-1 h-[52px] bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 text-base md:text-sm"
                >
                  <Search className="w-5 h-5 md:w-4 md:h-4 mr-2" />
                  {mode === "scan" ? "Skanna igen" : "Sök igen"}
                </Button>
              </div>
            </motion.div>
          ) : !searchQuery && mode === "search" && !scanResult && (
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
                {mode === "search" ? "Börja skriva för att söka artiklar" : "Ta foto av artikel för att kontrollera om den finns i lagret"}
              </p>
              <p className="text-sm text-slate-500">
                {mode === "search" ? "Sök på artikelnamn, batchnummer eller hyllplats" : "AI kommer att analysera bilden och söka automatiskt"}
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

          {/* Print Modal */}
          {showPrintModal && selectedArticle && (
            <LabelDownloader
              articles={[selectedArticle]}
              onClose={() => setShowPrintModal(false)}
            />
          )}
          </div>
          </div>
          );
          }