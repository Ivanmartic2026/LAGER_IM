import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { 
  Package, ClipboardList, ArrowLeft, Sparkles, 
  CheckCircle2, Camera, Download, AlertTriangle, Scan as ScanIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import CameraCapture from "@/components/scanner/CameraCapture";
import ReviewForm from "@/components/scanner/ReviewForm";
import BarcodeScanner from "@/components/scanner/BarcodeScanner";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";

const MODE_OPTIONS = [
  {
    id: "barcode",
    title: "Skanna Streckkod",
    description: "Snabbsök artikel med streckkod eller QR-kod",
    icon: ScanIcon,
    color: "from-purple-500 to-purple-600"
  },
  {
    id: "inbound",
    title: "Inleverans",
    description: "Registrera ny artikel eller lägg till lager",
    icon: Package,
    color: "from-blue-500 to-blue-600"
  },
  {
    id: "inventory",
    title: "Inventering",
    description: "Justera lagersaldo för befintlig artikel",
    icon: ClipboardList,
    color: "from-emerald-500 to-emerald-600"
  }
];

export default function ScanPage() {
  const [mode, setMode] = useState(null);
  const [step, setStep] = useState("mode"); // mode, capture, barcode, review, success
  const [barcodeResult, setBarcodeResult] = useState(null);
  const [searchingArticle, setSearchingArticle] = useState(false);
  const [imageFiles, setImageFiles] = useState([]);
  const [imageUrls, setImageUrls] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [extractedData, setExtractedData] = useState({});
  const [confidences, setConfidences] = useState({});
  const [savedArticle, setSavedArticle] = useState(null);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [existingArticle, setExistingArticle] = useState(null);
  const [showDuplicateConfirm, setShowDuplicateConfirm] = useState(false);
  const [showMatchConfirm, setShowMatchConfirm] = useState(false);
  const [potentialMatches, setPotentialMatches] = useState([]);

  const handleModeSelect = (selectedMode) => {
    setMode(selectedMode);
    if (selectedMode === "barcode") {
      setStep("barcode");
    } else {
      setStep("capture");
    }
  };

  const handleBarcodeDetected = async (code, format) => {
    setBarcodeResult({ code, format });
    setSearchingArticle(true);

    try {
      // Search for article by batch_number or sku
      const articles = await base44.entities.Article.filter({ 
        batch_number: code 
      });

      if (articles.length === 0) {
        // Try searching by SKU
        const articlesBySku = await base44.entities.Article.filter({ 
          sku: code 
        });

        if (articlesBySku.length > 0) {
          // Found by SKU - show article
          setSelectedArticle(articlesBySku[0]);
          setStep("success");
          toast.success(`Artikel hittad: ${articlesBySku[0].name}`);
        } else {
          // Not found - create new with barcode
          setExtractedData({ 
            batch_number: code,
            stock_qty: 1,
            image_urls: []
          });
          setConfidences({ batch_number: 1.0 });
          setStep("review");
          toast.info("Artikel ej funnen - skapa ny med streckkod");
        }
      } else {
        // Found by batch number - show article
        setSelectedArticle(articles[0]);
        setStep("success");
        toast.success(`Artikel hittad: ${articles[0].name}`);
      }
    } catch (error) {
      console.error("Error searching article:", error);
      toast.error("Kunde inte söka efter artikel");
      setStep("barcode");
    } finally {
      setSearchingArticle(false);
    }
  };

  const handleImageCaptured = async (files) => {
    const fileArray = Array.isArray(files) ? files : [files];
    setImageFiles(fileArray);
    setIsProcessing(true);
    setProgress(0);

    try {
      // Upload images first
      setProgress(10);
      const uploadPromises = fileArray.map(file => 
        base44.integrations.Core.UploadFile({ file })
      );
      const uploadResults = await Promise.all(uploadPromises);
      const urls = uploadResults.map(r => r.file_url);
      setImageUrls(urls);
      setProgress(30);
      
      // Extract data using AI from all images
      setProgress(40);
      
      const schema = {
        type: "object",
        properties: {
          batch_number: { type: "string" },
          batch_number_confidence: { type: "number" },
          name: { type: "string" },
          name_confidence: { type: "number" },
          manufacturer: { type: "string" },
          manufacturer_confidence: { type: "number" },
          manufacturing_date: { type: "string" },
          manufacturing_date_confidence: { type: "number" },
          pixel_pitch_mm: { type: "number" },
          pixel_pitch_mm_confidence: { type: "number" },
          shelf_address: { type: "string" },
          shelf_address_confidence: { type: "number" },
          dimensions_width_mm: { type: "number" },
          dimensions_width_mm_confidence: { type: "number" },
          dimensions_height_mm: { type: "number" },
          dimensions_height_mm_confidence: { type: "number" },
          dimensions_depth_mm: { type: "number" },
          dimensions_depth_mm_confidence: { type: "number" },
          weight_kg: { type: "number" },
          weight_kg_confidence: { type: "number" },
          stock_qty: { type: "number" },
          stock_qty_confidence: { type: "number" },
          category: { type: "string" },
          category_confidence: { type: "number" },
          warehouse: { type: "string" },
          warehouse_confidence: { type: "number" }
        }
      };

      // Analyze all images in parallel
      const analysisPromises = urls.map(url => 
        base44.integrations.Core.InvokeLLM({
          prompt: `Analysera denna bild av en artikel/etikett/följesedel och extrahera all relevant information för ett lagersystem.

        Bilden kan innehålla:
        - Batchnummer/artikelnummer
        - Artikelnamn
        - Tillverkare
        - Tillverkningsdatum
        - Pixel pitch (mm)
        - Hyllplats/lagerlokation
        - Dimensioner (bredd, höjd, djup i mm)
        - Vikt (kg)
        - Antal
        - Kategori (LED Module, Cabinet, Controller, Power Supply, Cable, Accessory, Other)

        Returnera all information du kan hitta. För varje fält, ge ett confidence-värde (0-1) baserat på hur säker du är.`,
          file_urls: [url],
          response_json_schema: schema
        })
      );

      const results = await Promise.all(analysisPromises);
      setProgress(60);

      // Merge results from all images, keeping the value with highest confidence for each field
      let result = {};
      results.forEach(imageResult => {
        Object.keys(imageResult).forEach(key => {
          if (key.endsWith('_confidence')) {
            const fieldName = key.replace('_confidence', '');
            const currentConfidence = result[key] || 0;
            const newConfidence = imageResult[key] || 0;
            
            if (newConfidence > currentConfidence) {
              result[key] = newConfidence;
              if (imageResult[fieldName]) {
                result[fieldName] = imageResult[fieldName];
              }
            }
          }
        });
      });
      
      setProgress(70);

      // Enrich data with web search if we have manufacturer and name
      let enrichedData = { ...result };
      if (result.name || result.manufacturer) {
        try {
          setProgress(75);
          const webInfo = await base44.integrations.Core.InvokeLLM({
            prompt: `Sök på internet efter produkten "${result.name || ''}" från tillverkare "${result.manufacturer || ''}" och hitta ytterligare information som:
            - Fullständigt produktnamn
            - Korrekt tillverkarnamn
            - Tekniska specifikationer (pixel pitch, dimensioner, vikt)
            - Kategori
            - Länk till produktsida eller datasheet om möjligt

            Returnera bara information du hittar med hög säkerhet.`,
            add_context_from_internet: true,
            response_json_schema: {
              type: "object",
              properties: {
                name: { type: "string" },
                manufacturer: { type: "string" },
                pixel_pitch_mm: { type: "number" },
                dimensions_width_mm: { type: "number" },
                dimensions_height_mm: { type: "number" },
                dimensions_depth_mm: { type: "number" },
                weight_kg: { type: "number" },
                category: { type: "string" },
                product_url: { type: "string" }
              }
            }
          });

          // Merge web info with extracted data (prefer web info if confidence is low)
          Object.keys(webInfo).forEach(key => {
            if (webInfo[key] && (!enrichedData[key] || (enrichedData[`${key}_confidence`] || 0) < 0.7)) {
              enrichedData[key] = webInfo[key];
              enrichedData[`${key}_confidence`] = 0.9; // High confidence from web
            }
          });
        } catch (webError) {
          console.log("Could not enrich data from web:", webError);
          // Continue with original data
        }
      }
      setProgress(90);

      // Separate data and confidence values
      const data = {};
      const confs = {};

      Object.keys(enrichedData).forEach(key => {
        if (key.endsWith('_confidence')) {
          const fieldName = key.replace('_confidence', '');
          confs[fieldName] = enrichedData[key] || 0.5;
        } else {
          data[key] = enrichedData[key];
        }
      });

      setProgress(85);
      
      // Search for existing articles based on extracted data
      let potentialMatches = [];
      try {
        const searchPromises = [];
        
        // Search by batch number
        if (data.batch_number) {
          searchPromises.push(
            base44.entities.Article.filter({ batch_number: data.batch_number })
              .then(articles => articles.map(a => ({ article: a, matchScore: 10, matchField: 'batch_number' })))
          );
        }
        
        // Search by SKU
        if (data.sku) {
          searchPromises.push(
            base44.entities.Article.filter({ sku: data.sku })
              .then(articles => articles.map(a => ({ article: a, matchScore: 9, matchField: 'sku' })))
          );
        }
        
        // Search by name + manufacturer
        if (data.name && data.manufacturer) {
          searchPromises.push(
            base44.entities.Article.list()
              .then(articles => {
                return articles
                  .filter(a => {
                    const nameMatch = a.name?.toLowerCase().includes(data.name.toLowerCase()) || 
                                     data.name.toLowerCase().includes(a.name?.toLowerCase());
                    const mfgMatch = a.manufacturer?.toLowerCase() === data.manufacturer.toLowerCase();
                    return nameMatch && mfgMatch;
                  })
                  .map(a => ({ article: a, matchScore: 7, matchField: 'name+manufacturer' }));
              })
          );
        }
        
        const results = await Promise.allSettled(searchPromises);
        results.forEach(result => {
          if (result.status === 'fulfilled') {
            potentialMatches.push(...result.value);
          }
        });
        
        // Remove duplicates and sort by match score
        const uniqueMatches = [];
        const seenIds = new Set();
        potentialMatches
          .sort((a, b) => b.matchScore - a.matchScore)
          .forEach(match => {
            if (!seenIds.has(match.article.id)) {
              seenIds.add(match.article.id);
              uniqueMatches.push(match);
            }
          });
        
        setProgress(90);
        
        // Visual image comparison with existing articles (always run, not just when no text matches)
        console.log("Starting visual comparison with existing articles...");
        
        // Get all articles with images
        const allArticles = await base44.entities.Article.list();
        const articlesWithImages = allArticles.filter(a => 
          a.image_urls && a.image_urls.length > 0
        );
        
        if (articlesWithImages.length > 0) {
          // Take up to 50 most recent articles with images for comparison
          const recentArticlesWithImages = articlesWithImages.slice(0, 50);
          
          try {
            // Build article reference map for AI
            const articleReferences = recentArticlesWithImages.map((a, idx) => ({
              index: idx + 1, // Image index in the array (after the scanned image at index 0)
              article_id: a.id,
              name: a.name,
              batch_number: a.batch_number,
              manufacturer: a.manufacturer
            }));
            
            const visualComparison = await base44.integrations.Core.InvokeLLM({
              prompt: `Du ska jämföra den FÖRSTA bilden (den nyligen skannade bilden) med alla andra produktbilder i listan.

VIKTIGT: Den skannade bilden är bild nummer 0. Resten av bilderna (1-${recentArticlesWithImages.length}) är från vårt lager.

Artikelreferenser:
${articleReferences.map(ref => `Bild ${ref.index}: ${ref.name || 'Okänd'} (ID: ${ref.article_id}, Batch: ${ref.batch_number || 'N/A'}, Tillverkare: ${ref.manufacturer || 'N/A'})`).join('\n')}

Analysera om den skannade bilden (bild 0) visar SAMMA produkt/produktmodell som någon av de andra bilderna.
En matchning betyder att det är exakt samma produktmodell - samma utseende, design, kabinett, LED-panel typ etc.
Det spelar ingen roll om vinkeln är annorlunda eller om färgen på bakgrunden skiljer sig.

För VARJE lagerbild som matchar, returnera:
- article_id: ID för den matchande artikeln
- is_match: true om det är samma produkt
- confidence: 0-1 (hur säker du är)
- reason: Förklaring av varför det är en matchning

Returnera bara artiklar där is_match är true och confidence är minst 0.5.`,
              file_urls: [
                urls[0], // The scanned image at index 0
                ...recentArticlesWithImages.flatMap(a => a.image_urls.slice(0, 1))
              ],
              response_json_schema: {
                type: "object",
                properties: {
                  matches: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        article_id: { type: "string" },
                        is_match: { type: "boolean" },
                        confidence: { type: "number" },
                        reason: { type: "string" }
                      }
                    }
                  }
                }
              }
            });
            
            if (visualComparison.matches && visualComparison.matches.length > 0) {
              console.log(`Found ${visualComparison.matches.length} visual match(es):`, visualComparison.matches);
              
              visualComparison.matches.forEach(match => {
                const article = recentArticlesWithImages.find(a => a.id === match.article_id);
                if (article && match.is_match && match.confidence >= 0.5) {
                  // Check if this article is already in uniqueMatches
                  const existingMatch = uniqueMatches.find(m => m.article.id === article.id);
                  if (existingMatch) {
                    // Boost score if we have both text and visual match
                    existingMatch.matchScore += Math.round(match.confidence * 3);
                    existingMatch.visualConfidence = match.confidence;
                    existingMatch.visualReason = match.reason;
                  } else {
                    // Add as new visual match
                    uniqueMatches.push({
                      article: article,
                      matchScore: Math.round(match.confidence * 8), // 0.5-1.0 -> 4.0-8.0 score
                      matchField: 'visual',
                      visualConfidence: match.confidence,
                      visualReason: match.reason
                    });
                  }
                }
              });
              
              // Re-sort after adding/updating visual matches
              uniqueMatches.sort((a, b) => b.matchScore - a.matchScore);
            }
          } catch (visualError) {
            console.log("Visual comparison failed:", visualError);
          }
        }
        
        setProgress(95);
        
        // If we found a match, show confirmation dialog
        if (uniqueMatches.length > 0) {
          console.log(`Found ${uniqueMatches.length} potential match(es)`);
          setPotentialMatches(uniqueMatches);
          setExistingArticle(uniqueMatches[0].article);
          setExtractedData({ ...data, image_urls: urls });
          setConfidences(confs);
          setProgress(100);
          setShowMatchConfirm(true);
          return; // Don't proceed to review yet
        }
      } catch (searchError) {
        console.log("Could not search for existing articles:", searchError);
      }
      
      setExtractedData({ ...data, image_urls: urls });
      setConfidences(confs);
      setProgress(100);
      setStep("review");

      } catch (error) {
      console.error("Error processing image:", error);
      toast.error(`Kunde inte analysera bilden: ${error.message || 'Okänt fel'}`);
      setIsProcessing(false);
      setProgress(0);
      setStep("capture");
    }
  };

  const handleFieldChange = (field, value) => {
    setExtractedData(prev => ({ ...prev, [field]: value }));
    // Boost confidence when user manually edits
    setConfidences(prev => ({ ...prev, [field]: 1.0 }));
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      // Check if article exists using multiple criteria
      let existing = [];
      
      // If we already identified an existing article during scanning, use that
      if (existingArticle) {
        existing = [existingArticle];
      } else {
        // Search for matches by batch number, SKU, or name+manufacturer
        const searchPromises = [];
        
        if (extractedData.batch_number) {
          searchPromises.push(
            base44.entities.Article.filter({ batch_number: extractedData.batch_number })
          );
        }
        
        if (extractedData.sku) {
          searchPromises.push(
            base44.entities.Article.filter({ sku: extractedData.sku })
          );
        }
        
        const results = await Promise.allSettled(searchPromises);
        results.forEach(result => {
          if (result.status === 'fulfilled' && result.value.length > 0) {
            existing.push(...result.value);
          }
        });
        
        // Remove duplicates
        const seenIds = new Set();
        existing = existing.filter(article => {
          if (seenIds.has(article.id)) return false;
          seenIds.add(article.id);
          return true;
        });
      }

      if (existing.length > 0 && !showDuplicateConfirm) {
        // Found duplicate - show confirmation
        setExistingArticle(existing[0]);
        setShowDuplicateConfirm(true);
        setIsSaving(false);
        return;
      }

      let article;
      let previousQty = 0;

      // Prepare data - ensure shelf_address is an array and handle invalid dates
      const preparedData = {
        ...extractedData,
        shelf_address: extractedData.shelf_address 
          ? (Array.isArray(extractedData.shelf_address) 
            ? extractedData.shelf_address 
            : [extractedData.shelf_address])
          : [],
        storage_type: extractedData.storage_type || 'company_owned',
        manufacturing_date: extractedData.manufacturing_date && extractedData.manufacturing_date !== '-' 
          ? extractedData.manufacturing_date 
          : undefined
      };

      if (existing.length > 0) {
        // Update existing article
        article = existing[0];
        previousQty = article.stock_qty || 0;
        
        const updateData = { ...preparedData };
        if (mode === "inbound") {
          updateData.stock_qty = previousQty + (parseInt(extractedData.stock_qty) || 0);
        }
        
        await base44.entities.Article.update(article.id, updateData);
        article = { ...article, ...updateData };
        
      } else {
        // Create new article
        article = await base44.entities.Article.create({
          ...preparedData,
          stock_qty: parseInt(extractedData.stock_qty) || 0,
          status: "active"
        });
      }

      // Create stock movement record
      await base44.entities.StockMovement.create({
        article_id: article.id,
        movement_type: mode,
        quantity: parseInt(extractedData.stock_qty) || 0,
        previous_qty: previousQty,
        new_qty: article.stock_qty,
        reason: mode === "inbound" ? "Inleverans via scanning" : "Inventering via scanning"
      });

      setSavedArticle(article);
      setStep("success");
      setShowDuplicateConfirm(false);
      setExistingArticle(null);
      toast.success(existing.length > 0 ? "Artikel uppdaterad!" : "Ny artikel skapad!");
      
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("Kunde inte spara. Försök igen.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDuplicate = async () => {
    await handleSave();
  };

  const handleCancelDuplicate = () => {
    setShowDuplicateConfirm(false);
    setExistingArticle(null);
    setIsSaving(false);
  };

  const handleConfirmMatch = () => {
    // User confirmed this is the same article
    setSelectedArticle(existingArticle);
    setShowMatchConfirm(false);
    setStep("success");
  };

  const handleRejectMatch = () => {
    // User wants to create a new article
    setShowMatchConfirm(false);
    setPotentialMatches([]);
    setStep("review");
  };

  const handleReset = () => {
    setMode(null);
    setStep("mode");
    setImageFiles([]);
    setImageUrls([]);
    setExtractedData({});
    setConfidences({});
    setSavedArticle(null);
    setSelectedArticle(null);
    setExistingArticle(null);
    setShowDuplicateConfirm(false);
    setShowMatchConfirm(false);
    setPotentialMatches([]);
    setProgress(0);
    setBarcodeResult(null);
    setSearchingArticle(false);
  };

  return (
    <div className="min-h-screen bg-black p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          {step !== "mode" && step !== "success" ? (
            <Button
              variant="ghost"
              onClick={() => {
                if (step === "review") {
                  setStep(mode === "barcode" ? "barcode" : "capture");
                } else if (step === "barcode") {
                  setStep("mode");
                } else {
                  setStep("mode");
                }
              }}
              className="text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Tillbaka
            </Button>
          ) : (
            <div />
          )}

          <Link to={createPageUrl("Inventory")}>
            <Button variant="ghost" className="text-slate-400 hover:text-white">
              <Package className="w-4 h-4 mr-2" />
              Lager
            </Button>
          </Link>
        </div>

        {/* Step: Mode Selection */}
        <AnimatePresence mode="wait">
          {step === "mode" && (
            <motion.div
              key="mode"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mx-auto mb-4">
                  <Camera className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">
                  Smart Lagerskanning
                </h1>
                <p className="text-slate-400">
                  Fotografera en etikett och låt AI fylla i alla fält automatiskt
                </p>
              </div>

              <div className="grid gap-4">
                {MODE_OPTIONS.map((option) => (
                  <motion.button
                    key={option.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleModeSelect(option.id)}
                    className={cn(
                      "w-full p-6 rounded-2xl text-left transition-all",
                      "bg-slate-800/50 border border-slate-700/50",
                      "hover:border-slate-600 hover:bg-slate-800"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-14 h-14 rounded-xl flex items-center justify-center",
                        `bg-gradient-to-br ${option.color}`
                      )}>
                        <option.icon className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-1">
                          {option.title}
                        </h3>
                        <p className="text-sm text-slate-400">
                          {option.description}
                        </p>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step: Barcode Scanning */}
          {step === "barcode" && (
            <motion.div
              key="barcode"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-white mb-2">
                  Skanna Streckkod
                </h2>
                <p className="text-slate-400">
                  Rikta kameran mot streckkod eller QR-kod
                </p>
              </div>

              <BarcodeScanner 
                onBarcodeDetected={handleBarcodeDetected}
                onClose={() => setStep("mode")}
              />

              {searchingArticle && (
                <div className="flex items-center justify-center gap-3 p-4 rounded-xl bg-slate-800/50 border border-slate-700">
                  <div className="w-5 h-5 border-2 border-slate-400 border-t-blue-400 rounded-full animate-spin" />
                  <span className="text-slate-300">Söker efter artikel...</span>
                </div>
              )}

              {barcodeResult && !searchingArticle && (
                <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
                  <div className="flex items-center gap-3 mb-2">
                    <ScanIcon className="w-5 h-5 text-blue-400" />
                    <span className="text-white font-medium">Kod läst</span>
                  </div>
                  <p className="text-slate-300 font-mono text-sm">{barcodeResult.code}</p>
                  <p className="text-slate-500 text-xs mt-1">Format: {barcodeResult.format}</p>
                </div>
              )}

              <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                <Sparkles className="w-4 h-4" />
                <span>Artikeln hämtas automatiskt från databasen</span>
              </div>
            </motion.div>
          )}

          {/* Step: Capture */}
          {step === "capture" && (
            <motion.div
              key="capture"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-white mb-2">
                  {mode === "inbound" ? "Inleverans" : "Inventering"}
                </h2>
                <p className="text-slate-400">
                  Ta foto av etikett, följesedel eller produktmärkning
                </p>
              </div>

              <CameraCapture 
                onImageCaptured={handleImageCaptured}
                isProcessing={isProcessing}
                progress={progress}
              />

              <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                <Sparkles className="w-4 h-4" />
                <span>AI analyserar bilden och fyller i fälten automatiskt</span>
              </div>
            </motion.div>
          )}

          {/* Step: Review */}
          {step === "review" && (
            <motion.div
              key="review"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-white mb-2">
                  Granska & Godkänn
                </h2>
                <p className="text-slate-400">
                  Kontrollera att informationen är korrekt
                </p>
              </div>

              {imageUrls.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm text-slate-400 mb-2">{imageUrls.length} bild{imageUrls.length > 1 ? 'er' : ''} uppladdad{imageUrls.length > 1 ? 'e' : ''}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {imageUrls.map((url, index) => (
                      <div key={index} className="rounded-lg overflow-hidden bg-slate-800 relative group">
                        <img 
                          src={url} 
                          alt={`Bild ${index + 1}`} 
                          className="w-full h-24 object-contain"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                          <Button
                            size="icon"
                            variant="secondary"
                            className="h-8 w-8 bg-slate-900/80 hover:bg-slate-800"
                            onClick={() => window.open(url, '_blank')}
                          >
                            <Package className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <ReviewForm
                extractedData={extractedData}
                confidences={confidences}
                onFieldChange={handleFieldChange}
                onSave={handleSave}
                onCancel={handleReset}
                isSaving={isSaving}
                mode={mode}
              />

              {/* Duplicate Confirmation Modal */}
              {showDuplicateConfirm && existingArticle && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                  onClick={handleCancelDuplicate}
                >
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-slate-900 border border-amber-500/30 rounded-2xl p-6 max-w-md w-full"
                  >
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="w-6 h-6 text-amber-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white mb-2">
                          Artikel finns redan
                        </h3>
                        <p className="text-sm text-slate-300">
                          En artikel med batchnummer <span className="font-semibold text-white">{extractedData.batch_number}</span> finns redan i systemet.
                        </p>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 mb-4">
                      <p className="text-sm text-slate-400 mb-2">Befintlig artikel:</p>
                      <p className="font-medium text-white mb-1">{existingArticle.name}</p>
                      <div className="flex items-center gap-4 text-xs text-slate-400">
                        <span>Lagersaldo: {existingArticle.stock_qty || 0} st</span>
                        {existingArticle.shelf_address && (
                          <span>Plats: {existingArticle.shelf_address}</span>
                        )}
                      </div>
                    </div>

                    <p className="text-sm text-slate-400 mb-6">
                      {mode === "inbound" 
                        ? `Vill du lägga till ${extractedData.stock_qty || 0} st till befintligt lager?`
                        : "Vill du uppdatera artikelns information?"
                      }
                    </p>

                    <div className="flex gap-3">
                      <Button
                        onClick={handleCancelDuplicate}
                        variant="outline"
                        className="flex-1 bg-slate-800 border-slate-600 hover:bg-slate-700 text-white"
                      >
                        Avbryt
                      </Button>
                      <Button
                        onClick={handleConfirmDuplicate}
                        disabled={isSaving}
                        className="flex-1 bg-amber-600 hover:bg-amber-500 text-white"
                      >
                        {isSaving ? "Sparar..." : mode === "inbound" ? "Lägg till" : "Uppdatera"}
                      </Button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Step: Success */}
          {step === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-12"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6"
              >
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              </motion.div>

              <h2 className="text-2xl font-bold text-white mb-2">
                {savedArticle ? "Sparat!" : "Hittad!"}
              </h2>
              <p className="text-slate-400 mb-8">
                {savedArticle ? 
                  `${savedArticle.name} har registrerats i lagret` :
                  selectedArticle ? 
                    `${selectedArticle.name} finns i lagret` :
                    "Artikeln har bearbetats"
                }
              </p>

              {selectedArticle && (
                <div className="mb-8 p-6 rounded-2xl bg-slate-800/50 border border-slate-700 text-left max-w-md mx-auto">
                  <h3 className="text-lg font-semibold text-white mb-4">
                    {selectedArticle.name}
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Batch:</span>
                      <span className="text-white font-mono">{selectedArticle.batch_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Lagersaldo:</span>
                      <span className="text-white font-semibold">{selectedArticle.stock_qty || 0} st</span>
                    </div>
                    {selectedArticle.shelf_address && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Hyllplats:</span>
                        <span className="text-white">{selectedArticle.shelf_address}</span>
                      </div>
                    )}
                    {selectedArticle.warehouse && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Lagerställe:</span>
                        <span className="text-white">{selectedArticle.warehouse}</span>
                      </div>
                    )}
                  </div>
                  <Link to={`${createPageUrl("Inventory")}?articleId=${selectedArticle.id}`}>
                    <Button
                      variant="outline"
                      className="w-full mt-4 bg-slate-700 border-slate-600 hover:bg-slate-600 text-white"
                    >
                      Visa detaljer
                    </Button>
                  </Link>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={handleReset}
                  className="bg-blue-600 hover:bg-blue-500"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Skanna ny artikel
                </Button>
                <Link to={createPageUrl("Inventory")}>
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto bg-slate-800 border-slate-600 hover:bg-slate-700 text-white"
                  >
                    <Package className="w-4 h-4 mr-2" />
                    Visa lager
                  </Button>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Match Confirmation Dialog */}
        <AnimatePresence>
          {showMatchConfirm && existingArticle && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-slate-900 border border-blue-500/30 rounded-2xl p-6 max-w-md w-full"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white mb-2">
                      Liknande artikel hittad
                    </h3>
                    <p className="text-sm text-slate-300">
                      Systemet har hittat en artikel som verkar matcha din skannade bild.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 mb-4">
                  <div className="flex gap-3 mb-3">
                    {existingArticle.image_urls?.[0] && (
                      <img 
                        src={existingArticle.image_urls[0]} 
                        alt={existingArticle.name}
                        className="w-20 h-20 rounded-lg object-cover bg-slate-900"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white mb-1 truncate">{existingArticle.name}</p>
                      <div className="space-y-1 text-xs text-slate-400">
                        {existingArticle.batch_number && (
                          <div>Batch: <span className="text-white font-mono">{existingArticle.batch_number}</span></div>
                        )}
                        {existingArticle.manufacturer && (
                          <div>Tillverkare: <span className="text-white">{existingArticle.manufacturer}</span></div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm border-t border-slate-700 pt-3">
                    <span className="text-slate-400">Lagersaldo:</span>
                    <span className="text-white font-semibold">{existingArticle.stock_qty || 0} st</span>
                  </div>
                  {existingArticle.shelf_address && (
                    <div className="flex items-center justify-between text-sm mt-2">
                      <span className="text-slate-400">Hyllplats:</span>
                      <span className="text-white">{existingArticle.shelf_address}</span>
                    </div>
                  )}
                </div>

                <p className="text-sm text-slate-400 mb-6">
                  Är det denna artikel du skannade?
                </p>

                <div className="flex gap-3">
                  <Button
                    onClick={handleRejectMatch}
                    variant="outline"
                    className="flex-1 bg-slate-800 border-slate-600 hover:bg-slate-700 text-white"
                  >
                    Nej, skapa ny
                  </Button>
                  <Button
                    onClick={handleConfirmMatch}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white"
                  >
                    Ja, det är den här
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