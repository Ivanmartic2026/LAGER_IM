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
  ArrowRight, ScanLine, Sparkles, Camera, Plus, Printer, Wrench, ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import CameraCapture from "@/components/scanner/CameraCapture";
import LabelDownloader from "@/components/labels/LabelDownloader";
import ReviewForm from "@/components/scanner/ReviewForm";
import RepairModal from "@/components/articles/RepairModal";
import { useQueryClient } from "@tanstack/react-query";

// Make this page public/unauthenticated
export async function getPublicAccess() {
  return true;
}

export default function FindPage() {
  const navigate = useNavigate();
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

  const [showReviewForm, setShowReviewForm] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [matchingArticles, setMatchingArticles] = useState([]);
  const searchInputRef = useRef(null);
  const [showRepairModal, setShowRepairModal] = useState(false);
  const [isSubmittingRepair, setIsSubmittingRepair] = useState(false);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [selectedLabelSize, setSelectedLabelSize] = useState(null);
  const queryClient = useQueryClient();

  const { data: articles = [] } = useQuery({
    queryKey: ['articles'],
    queryFn: () => base44.entities.Article.list(),
  });

  // Check for articleId in URL on mount - only once
  const hasInitialized = useRef(false);
  useEffect(() => {
    if (hasInitialized.current || articles.length === 0) return;
    hasInitialized.current = true;

    const params = new URLSearchParams(window.location.search);
    const articleId = params.get('articleId');
    
    if (articleId) {
      const article = articles.find(a => a.id === articleId);
      if (article) {
        setSelectedArticle(article);
        setScanResult("found");
      }
    }
  }, [articles.length]); // use .length instead of array ref to avoid infinite loop

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
      (Array.isArray(article.shelf_address) 
        ? article.shelf_address.join(', ') 
        : article.shelf_address || ''
      ).toLowerCase().includes(query)
    );

    if (statusFilter !== "all") {
      results = results.filter(article => article.status === statusFilter);
    }

    setSearchResults(results.slice(0, 10));
  }, [searchQuery, statusFilter, articles.length]); // use .length to avoid new array ref on every render

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
    setShowReviewForm(false);
    setMatchingArticles([]);
    searchInputRef.current?.focus();
  };

  const handleSaveArticle = async (data) => {
    try {
      const query = (data.batch_number || "").toLowerCase();
      
      // Find matches: exact batch first, then fuzzy (batch contains or name contains)
      const exactBatch = articles.filter(a => 
        a.batch_number?.toLowerCase() === query
      );
      
      const fuzzyMatches = articles.filter(a => {
        if (exactBatch.find(e => e.id === a.id)) return false; // skip exact already found
        return (
          (query && a.batch_number?.toLowerCase().includes(query)) ||
          (data.name && a.name?.toLowerCase().includes(data.name.toLowerCase()))
        );
      });

      const allMatches = [...exactBatch, ...fuzzyMatches];

      if (allMatches.length === 1) {
        // Single exact match — go directly
        setSelectedArticle(allMatches[0]);
        setScanResult("found");
        setShowReviewForm(false);
        toast.success("Artikel hittad i lagret!");
      } else if (allMatches.length > 1) {
        // Multiple matches — show picker
        setMatchingArticles(allMatches);
        setScanResult("multiple_matches");
        setShowReviewForm(false);
      } else {
        // Not found
        setScanResult("not_found");
        setShowReviewForm(false);
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Kunde inte söka efter artikel");
    }
  };

  const handleClearMatchingArticles = () => {
    setMatchingArticles([]);
    setScanResult(null);
  };

  const handleImageCaptured = async (file) => {
    // Upload image first
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    
    // If we're in upload mode for existing article, save directly
    if (showImageUpload && selectedArticle) {
      const currentImages = selectedArticle.image_urls || [];
      await base44.entities.Article.update(selectedArticle.id, {
        image_urls: [...currentImages, file_url]
      });
      
      setSelectedArticle(prev => ({
        ...prev,
        image_urls: [...currentImages, file_url]
      }));
      
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      toast.success("Bild tillagd till artikel");
    } else {
      // Add to captured images for new article scan
      setCapturedImages(prev => [...prev, file_url]);
      toast.success(`Bild ${capturedImages.length + 1} tillagd`);
    }
  };

  const handleProcessImages = async () => {
    if (capturedImages.length === 0) {
      toast.error("Ingen bild att analysera");
      return;
    }

    setIsProcessing(true);
    setAnalysisProgress(0);

    try {
      // Show form immediately with progress
      setExtractedData({ image_urls: capturedImages });
      setShowReviewForm(true);
      setAnalysisProgress(20);

      // Timeout after 15 seconds - user can save with existing data
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Analysis timeout')), 15000)
      );

      // Extract data using AI with all captured images in background
      const llmPromise = base44.integrations.Core.InvokeLLM({
        prompt: `Du är en expert på LED-displayprodukter och lagerhantering. Analysera dessa ${capturedImages.length} bilder av samma artikel/etikett noggrant.

Extrahera EXAKT följande information (var mycket precis — detta används för lagermatchning):
- batch_number: Det exakta batchnumret/serienumret som syns på etiketten (t.ex. "P3.076-250915-2084", "P2.5-ABC123"). INTE ett generellt modellnamn.
- name: Produktens fullständiga namn/modellbeteckning (t.ex. "IM Vision P3 UltraBright LED-modul v1.0")
- manufacturer: Tillverkarens namn (t.ex. "Unilumin", "Absen", "Leyard", "Nick Everlasting")
- pixel_pitch_mm: Pixel Pitch i mm som ett nummer (t.ex. 3.076 för P3.076, 2.5 för P2.5)
- dimensions_width_mm: Bredd i mm om synlig
- dimensions_height_mm: Höjd i mm om synlig

VIKTIGT: batch_number ska vara det EXAKTA numret från etiketten, inte ett approximerat värde. Om det inte går att läsa tydligt, returnera null för det fältet.`,
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

      try {
        const result = await Promise.race([llmPromise, timeoutPromise]);
        setAnalysisProgress(100);
        setExtractedData({ ...result, image_urls: capturedImages });
      } catch (timeoutError) {
        // Timeout or error - allow user to save with manual input
        setAnalysisProgress(100);
        toast.info("Analysen tog längre tid - du kan spara med befintlig data");
      }

    } catch (error) {
      console.error("Error processing images:", error);
      toast.error("Kunde inte analysera bilderna. Försök igen.");
      setAnalysisProgress(0);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveImage = (index) => {
    setCapturedImages(prev => prev.filter((_, i) => i !== index));
    toast.success("Bild borttagen");
  };

  const handleReportToRepair = async (repairNotes, quantity) => {
    if (!selectedArticle) return;
    
    try {
      setIsSubmittingRepair(true);
      
      const currentQty = selectedArticle.stock_qty || 0;
      const newQty = currentQty - quantity;
      
      await base44.entities.Article.update(selectedArticle.id, {
        status: "on_repair",
        repair_notes: repairNotes,
        repair_date: new Date().toISOString(),
        stock_qty: newQty
      });

      await base44.entities.StockMovement.create({
        article_id: selectedArticle.id,
        movement_type: "outbound",
        quantity: -quantity,
        previous_qty: currentQty,
        new_qty: newQty,
        reason: `Skickad på reparation: ${repairNotes}`
      });

      queryClient.invalidateQueries({ queryKey: ['articles'] });
      toast.success(`${quantity} st skickad på reparation`);
      
      // Update selected article locally
      setSelectedArticle(prev => ({
        ...prev,
        status: "on_repair",
        repair_notes: repairNotes,
        repair_date: new Date().toISOString(),
        stock_qty: newQty
      }));
    } catch (error) {
      console.error("Repair error:", error);
      toast.error("Kunde inte rapportera till reparation");
      throw error;
    } finally {
      setIsSubmittingRepair(false);
    }
  };

  const stats = {
    total: articles.length,
    active: articles.filter(a => a.status === "active").length,
    lowStock: articles.filter(a => a.status === "low_stock").length,
  };

  return (
    <div className="min-h-screen bg-black p-4 md:p-6 overflow-x-hidden">
      <div className="max-w-4xl mx-auto w-full">
        
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-white tracking-tight">Hitta</h1>
              <div className="flex items-center gap-3 text-sm">
                <Badge 
                  variant="outline" 
                  className="bg-blue-500/10 text-blue-400 border-blue-500/30"
                >
                  {stats.total} totalt
                </Badge>
                <Badge 
                  variant="outline" 
                  className="bg-green-500/10 text-green-400 border-green-500/30"
                >
                  {stats.active} aktiv
                </Badge>
                {stats.lowStock > 0 && (
                  <Badge 
                    variant="outline" 
                    className="bg-amber-500/10 text-amber-400 border-amber-500/30"
                  >
                    {stats.lowStock} lågt
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Mode Toggle */}
          <div className="flex gap-3 mb-6">
            <Button
              onClick={() => setMode("search")}
              className={cn(
                "flex-1 h-11 backdrop-blur-xl transition-all duration-300 border",
                mode === "search" 
                  ? "bg-blue-600 border-blue-500 text-white hover:bg-blue-500 shadow-lg shadow-blue-500/50" 
                  : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:border-white/20"
              )}
            >
              <Search className="w-4 h-4 mr-2" />
              Sök
            </Button>
            <Button
              onClick={() => {
                setMode("scan");
                setSelectedArticle(null);
                setScanResult(null);
              }}
              className={cn(
                "flex-1 h-11 backdrop-blur-xl transition-all duration-300 border",
                mode === "scan" 
                  ? "bg-blue-600 border-blue-500 text-white hover:bg-blue-500 shadow-lg shadow-blue-500/50" 
                  : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:border-white/20"
              )}
            >
              <Camera className="w-4 h-4 mr-2" />
              Skanna
            </Button>
          </div>
        </div>

        {/* Status Filter */}
        {mode === "search" && (
          <div className="mb-6">
            <div className="flex gap-3 flex-wrap">
              {['all', 'active', 'low_stock', 'out_of_stock'].map((status) => {
                const labels = { all: 'Alla', active: 'Aktiv', low_stock: 'Lågt lager', out_of_stock: 'Slut' };
                return (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-sm font-medium transition-all border",
                      statusFilter === status
                        ? "bg-blue-600 border-blue-500 text-white"
                        : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:border-white/20"
                    )}
                  >
                    {labels[status]}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Search or Scan Mode */}
        <div className="mb-6">
          {mode === "search" ? (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <Input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Sök artikel, batchnummer eller hyllplats..."
                className="pl-11 h-11 bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-white placeholder:text-white/40 backdrop-blur-xl transition-all"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              )}

              {/* Search Results Dropdown */}
              <AnimatePresence>
                {searchResults.length > 0 && !selectedArticle && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute z-50 w-full mt-2 bg-zinc-900 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden"
                  >
                    <div className="max-h-96 overflow-y-auto">
                      {searchResults.map((article) => (
                        <button
                          key={article.id}
                          onClick={() => handleSelectArticle(article)}
                          className="w-full p-4 text-left hover:bg-white/10 transition-all border-b border-white/10 last:border-0"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-white truncate">
                                {article.name}
                              </p>
                              <p className="text-sm text-white/50 flex items-center gap-2 mt-1">
                                <Hash className="w-3 h-3" />
                                {article.batch_number}
                              </p>
                            </div>
                            {article.shelf_address ? (
                              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                                <MapPin className="w-3 h-3 mr-1" />
                                {article.shelf_address}
                              </Badge>
                            ) : (
                              <span className="text-xs text-white/30">Ingen plats</span>
                            )}
                          </div>
                        </button>
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
                    <p className="text-sm text-white/70">
                      {capturedImages.length} {capturedImages.length === 1 ? 'bild' : 'bilder'} tillagd{capturedImages.length > 1 ? 'e' : ''}
                    </p>
                    <Button
                      onClick={handleProcessImages}
                      disabled={isProcessing}
                      className="bg-blue-600 border-blue-500 text-white hover:bg-blue-500"
                    >
                      {isProcessing ? (
                        <>
                          <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                          Analyserar...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Analysera
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
                          className="w-full aspect-square object-cover rounded-lg border-2 border-white/10"
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

        {/* Review Form Modal */}
         <AnimatePresence>
           {showReviewForm && (
             <motion.div
               initial={{ opacity: 0, y: 30 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: 30 }}
               className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 overflow-y-auto p-4 flex items-start justify-center pt-12"
             >
               <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl">
                 <div className="flex items-center justify-between p-6 border-b border-slate-700">
                   <h2 className="text-xl font-bold text-white">
                     {isProcessing ? 'Analyserar...' : 'Granska extraherad data'}
                   </h2>
                   <button
                     onClick={() => setShowReviewForm(false)}
                     disabled={isProcessing}
                     className="text-slate-400 hover:text-white disabled:opacity-50"
                   >
                     <X className="w-6 h-6" />
                   </button>
                 </div>

                 {/* Progress Bar */}
                 {isProcessing && analysisProgress > 0 && (
                   <motion.div
                     initial={{ opacity: 0, height: 0 }}
                     animate={{ opacity: 1, height: 'auto' }}
                     className="px-6 pt-6 pb-4 border-b border-slate-700"
                   >
                     <div className="flex items-center justify-between mb-3">
                       <span className="text-sm text-slate-300">Analyserar innehål</span>
                       <span className="text-sm font-bold text-cyan-400">{analysisProgress}%</span>
                     </div>
                     <div className="h-2 bg-slate-700 rounded-full overflow-hidden border border-slate-600">
                       <motion.div
                         initial={{ width: 0 }}
                         animate={{ width: `${analysisProgress}%` }}
                         transition={{ duration: 0.5 }}
                         className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-500 shadow-lg shadow-cyan-500/50"
                       />
                     </div>
                   </motion.div>
                 )}

                 <div className="p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
                   <ReviewForm
                     extractedData={extractedData}
                     onFieldChange={(field, value) => {
                       setExtractedData(prev => ({ ...prev, [field]: value }));
                     }}
                     onSave={handleSaveArticle}
                     onCancel={() => setShowReviewForm(false)}
                     isSaving={false}
                     mode="inbound"
                     isAnalyzing={isProcessing}
                   />
                 </div>
               </div>
             </motion.div>
           )}
         </AnimatePresence>

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
              <div className="p-8 rounded-2xl bg-gradient-to-br from-amber-500/15 to-orange-500/5 backdrop-blur-xl border border-amber-500/40 text-center shadow-lg shadow-amber-500/10">
                <Package className="w-16 h-16 text-amber-300 mx-auto mb-4" />
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
                     className="flex-1 h-[52px] bg-white/10 border border-white/20 hover:bg-white/15 text-white text-base md:text-sm backdrop-blur-xl transition-all duration-300"
                   >
                     Avbryt
                   </Button>
                   <Button
                     onClick={() => {
                       setShowReviewForm(true);
                       setScanResult(null);
                     }}
                     className="flex-1 h-[52px] bg-emerald-500/30 border border-emerald-500/60 hover:bg-emerald-500/40 text-emerald-300 text-base md:text-sm backdrop-blur-xl transition-all duration-300"
                   >
                     <Plus className="w-5 h-5 md:w-4 md:h-4 mr-2" />
                     Lägg till artikel
                   </Button>
                 </div>
              </div>
            </motion.div>
          )}

          {/* Multiple Matches - Let user pick */}
          {scanResult === "multiple_matches" && matchingArticles.length > 0 && (
            <motion.div
              key="multiple-matches"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <Package className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-300">{matchingArticles.length} matchande artiklar hittade</p>
                  <p className="text-xs text-emerald-200/70">Välj rätt artikel eller skapa ny</p>
                </div>
              </div>

              <div className="space-y-3">
                {matchingArticles.map(article => (
                  <button
                    key={article.id}
                    onClick={() => {
                      setSelectedArticle(article);
                      setScanResult("found");
                      setMatchingArticles([]);
                    }}
                    className="w-full p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-left flex items-center gap-4"
                  >
                    {article.image_urls?.[0] ? (
                      <img src={article.image_urls[0]} alt={article.name} className="w-14 h-14 object-cover rounded-lg flex-shrink-0 bg-slate-800" />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
                        <Package className="w-6 h-6 text-slate-600" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white truncate">{article.name || "—"}</p>
                      <p className="text-xs text-slate-400 mt-1">Batch: <span className="text-slate-300 font-mono">{article.batch_number || "—"}</span></p>
                      {article.manufacturer && <p className="text-xs text-slate-400">Tillverkare: <span className="text-slate-300">{article.manufacturer}</span></p>}
                      <p className="text-xs text-slate-400">Kategori: <span className="text-slate-300">{article.category || "—"}</span></p>
                      <p className="text-xs text-slate-400">Lagersaldo: <span className="text-white font-bold">{article.stock_qty || 0} st</span></p>
                      {article.shelf_address && <p className="text-xs text-slate-400">Hyllplats: <span className="text-blue-300">{Array.isArray(article.shelf_address) ? article.shelf_address.join(', ') : article.shelf_address}</span></p>}
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-500 flex-shrink-0" />
                  </button>
                ))}
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleClear}
                  className="flex-1 h-12 bg-white/10 border border-white/20 hover:bg-white/15 text-white"
                >
                  <X className="w-4 h-4 mr-2" />
                  Avbryt
                </Button>
                <Button
                  onClick={() => {
                    setMatchingArticles([]);
                    setScanResult(null);
                    setShowReviewForm(true);
                  }}
                  className="flex-1 h-12 bg-emerald-500/20 border border-emerald-500/40 hover:bg-emerald-500/30 text-emerald-300"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Skapa ny artikel
                </Button>
              </div>
            </motion.div>
          )}

          {/* Selected Article - Location Display */}
          {selectedArticle && scanResult !== "not_found" && scanResult !== "multiple_matches" ? (
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
                  className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 p-8 md:p-12 text-center shadow-[0_0_30px_rgba(16,185,129,0.4)]"
                >
                  <div className="relative z-10">
                    <div className="flex items-center justify-center gap-2 text-white/50 text-sm mb-4">
                      <MapPin className="w-5 h-5" />
                      <span>Hyllplats</span>
                    </div>
                    
                    <div className="text-7xl md:text-8xl font-bold text-white mb-4 tracking-tight">
                      {Array.isArray(selectedArticle.shelf_address) 
                        ? selectedArticle.shelf_address.join(', ') 
                        : selectedArticle.shelf_address}
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
                <div className="p-8 rounded-2xl bg-gradient-to-br from-amber-500/15 to-orange-500/5 backdrop-blur-xl border border-amber-500/40 text-center shadow-lg shadow-amber-500/10">
                  <MapPin className="w-12 h-12 text-amber-300 mx-auto mb-3" />
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
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="p-5 rounded-2xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 backdrop-blur-xl border border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/30 flex items-center justify-center">
                      <Package className="w-5 h-5 text-blue-300" />
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
                  </motion.div>

                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 backdrop-blur-xl border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/30 flex items-center justify-center">
                      <Package className="w-5 h-5 text-emerald-300" />
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
                  </motion.div>
                  </div>

                  {/* Additional Info */}
                  {(selectedArticle.pixel_pitch_mm || selectedArticle.dimensions_width_mm || selectedArticle.weight_kg || selectedArticle.manufacturing_date) && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="p-5 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 shadow-[0_0_15px_rgba(148,163,184,0.2)]">
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
                  </motion.div>
                  )}

                  {/* On Site Reports Section */}


              {/* Action Buttons */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="grid grid-cols-2 md:grid-cols-4 gap-3">
               <Button
                 onClick={() => navigate(`/Inventory?articleId=${selectedArticle.id}`)}
                 className="col-span-2 md:col-span-4 h-[52px] bg-signal hover:bg-signal-hover text-white text-base font-semibold mb-1"
               >
                 <ExternalLink className="w-5 h-5 mr-2" />
                 Visa artikel i Lager
               </Button>
               <Button
                 onClick={() => setShowRepairModal(true)}
                 disabled={selectedArticle.status === "on_repair"}
                 className="h-[52px] bg-orange-600/20 backdrop-blur-xl border border-orange-500/40 hover:bg-orange-600/30 text-orange-200 text-base md:text-sm transition-all duration-300 font-semibold disabled:opacity-50"
               >
                 <Wrench className="w-5 h-5 md:w-4 md:h-4 mr-2" />
                 Till reparation
               </Button>
               <Button
                 onClick={() => setShowImageUpload(true)}
                 className="h-[52px] bg-blue-600/20 backdrop-blur-xl border border-blue-500/40 hover:bg-blue-600/30 text-blue-200 text-base md:text-sm transition-all duration-300 font-semibold"
               >
                 <Camera className="w-5 h-5 md:w-4 md:h-4 mr-2" />
                 Fota
               </Button>
               <Button
                 onClick={() => setShowPrintModal(true)}
                 className="h-[52px] bg-white/10 backdrop-blur-xl border border-white/20 hover:bg-white/15 text-white text-base md:text-sm transition-all duration-300 font-semibold"
               >
                 <Printer className="w-5 h-5 md:w-4 md:h-4 mr-2" />
                 Skriv ut
               </Button>
               <Button
                 onClick={handleClear}
                 className="h-[52px] bg-emerald-500/20 backdrop-blur-xl border border-emerald-500/40 hover:bg-emerald-500/30 text-emerald-200 text-base md:text-sm transition-all duration-300 font-semibold"
               >
                 <Search className="w-5 h-5 md:w-4 md:h-4 mr-2" />
                 {mode === "scan" ? "Skanna igen" : "Sök igen"}
               </Button>
              </motion.div>
            </motion.div>
          ) : !searchQuery && mode === "search" && !scanResult && scanResult !== "multiple_matches" && (
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
               <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-8 grid gap-3 max-w-md mx-auto">
                 <motion.div whileHover={{ scale: 1.02 }} className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 backdrop-blur-xl border border-blue-500/30 text-left shadow-[0_0_15px_rgba(59,130,246,0.2)] hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-shadow">
                   <div className="w-8 h-8 rounded-lg bg-blue-500/30 flex items-center justify-center flex-shrink-0">
                     <Sparkles className="w-4 h-4 text-blue-300" />
                   </div>
                   <div>
                     <p className="text-sm font-medium text-white mb-1">Snabbsök</p>
                     <p className="text-xs text-slate-300">
                       Skriv del av artikelnamn eller batch för direktresultat
                     </p>
                   </div>
                 </motion.div>

                 <motion.div whileHover={{ scale: 1.02 }} className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 backdrop-blur-xl border border-emerald-500/30 text-left shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-shadow">
                   <div className="w-8 h-8 rounded-lg bg-emerald-500/30 flex items-center justify-center flex-shrink-0">
                     <MapPin className="w-4 h-4 text-emerald-300" />
                   </div>
                   <div>
                     <p className="text-sm font-medium text-white mb-1">Hitta hyllplats</p>
                     <p className="text-xs text-slate-300">
                       Se stor och tydlig hyllplats när du hittat rätt artikel
                     </p>
                   </div>
                 </motion.div>
               </motion.div>
            </motion.div>
          )}
          </AnimatePresence>

          {/* Print Modal */}
          <AnimatePresence>
            {showPrintModal && selectedArticle && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={() => setShowPrintModal(false)}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-slate-800/90 backdrop-blur-xl border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md p-6"
                >
                  <h3 className="text-xl font-bold text-white mb-6">Skriv ut etikett</h3>
                  <p className="text-sm text-slate-400 mb-6">
                    Etiketten öppnas i ett nytt fönster där du kan justera storleken och skriva ut.
                  </p>
                  <div className="space-y-3">
                    <Button
                      onClick={async () => {
                        try {
                          const response = await base44.functions.invoke('generateResponsiveLabel', {
                            articleId: selectedArticle.id
                          });
                          
                          const printWindow = window.open('', '_blank');
                          if (printWindow) {
                            printWindow.document.write(response.data);
                            printWindow.document.close();
                            setShowPrintModal(false);
                            toast.success('Etikett öppnad!');
                          } else {
                            toast.error('Kunde inte öppna popup. Kontrollera popup-blockerare.');
                          }
                        } catch (error) {
                          console.error('Error:', error);
                          toast.error('Kunde inte generera etikett');
                        }
                      }}
                      className="w-full h-[52px] bg-blue-600/20 backdrop-blur-xl border border-blue-500/40 hover:bg-blue-600/30 text-blue-200 text-base transition-all duration-300 font-semibold"
                    >
                      <Printer className="w-5 h-5 mr-2" />
                      HTML Etikett (responsiv)
                    </Button>
                  </div>
                  <Button
                    onClick={() => setShowPrintModal(false)}
                    className="w-full h-[52px] mt-4 bg-white/10 backdrop-blur-xl border border-white/20 hover:bg-white/15 text-white transition-all duration-300"
                  >
                    Avbryt
                  </Button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Repair Modal */}
          <RepairModal
            isOpen={showRepairModal}
            onClose={() => setShowRepairModal(false)}
            article={selectedArticle}
            onSubmit={handleReportToRepair}
            isSubmitting={isSubmittingRepair}
          />

          {/* Image Upload Modal */}
          <AnimatePresence>
            {showImageUpload && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-slate-800/90 backdrop-blur-xl border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md p-6"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-white">Lägg till bilder</h3>
                    <button
                      onClick={() => setShowImageUpload(false)}
                      className="text-slate-400 hover:text-white transition-colors"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  <CameraCapture
                    onImageCaptured={handleImageCaptured}
                    isProcessing={false}
                  />

                  <div className="mt-6">
                    <Button
                      onClick={() => setShowImageUpload(false)}
                      className="w-full h-[52px] bg-emerald-500/30 border border-emerald-500/60 hover:bg-emerald-500/40 text-emerald-300 backdrop-blur-xl"
                    >
                      Klar
                    </Button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
          </div>
          </div>
          );
          }