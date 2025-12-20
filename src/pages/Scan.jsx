import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { 
  Package, ClipboardList, ArrowLeft, Sparkles, 
  CheckCircle2, Camera, Download, AlertTriangle 
} from "lucide-react";
import { cn } from "@/lib/utils";
import CameraCapture from "@/components/scanner/CameraCapture";
import ReviewForm from "@/components/scanner/ReviewForm";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";

const MODE_OPTIONS = [
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
  const [step, setStep] = useState("mode"); // mode, capture, review, success
  const [imageFiles, setImageFiles] = useState([]);
  const [imageUrls, setImageUrls] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [extractedData, setExtractedData] = useState({});
  const [confidences, setConfidences] = useState({});
  const [savedArticle, setSavedArticle] = useState(null);
  const [duplicateWarning, setDuplicateWarning] = useState(null);

  const handleModeSelect = (selectedMode) => {
    setMode(selectedMode);
    setStep("capture");
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
                product_url: { type: "string" },
                notes: { type: "string" }
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

      setProgress(95);
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
    // Check if article with same batch number exists
    const existing = await base44.entities.Article.filter({ 
      batch_number: extractedData.batch_number 
    });

    if (existing.length > 0 && !duplicateWarning) {
      // Show duplicate warning
      setDuplicateWarning(existing[0]);
      return;
    }

    setIsSaving(true);

    try {
      let article;
      let previousQty = 0;

      if (existing.length > 0) {
        // Update existing article
        article = existing[0];
        previousQty = article.stock_qty || 0;
        
        const updateData = { ...extractedData };
        if (mode === "inbound") {
          updateData.stock_qty = previousQty + (parseInt(extractedData.stock_qty) || 0);
        }
        
        await base44.entities.Article.update(article.id, updateData);
        article = { ...article, ...updateData };
        
      } else {
        // Create new article
        article = await base44.entities.Article.create({
          ...extractedData,
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
      setDuplicateWarning(null);
      setStep("success");
      toast.success(existing.length > 0 ? "Artikel uppdaterad!" : "Ny artikel skapad!");
      
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("Kunde inte spara. Försök igen.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setMode(null);
    setStep("mode");
    setImageFiles([]);
    setImageUrls([]);
    setExtractedData({});
    setConfidences({});
    setSavedArticle(null);
    setDuplicateWarning(null);
    setProgress(0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-6">
      <div className="max-w-2xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          {step !== "mode" && step !== "success" ? (
            <Button
              variant="ghost"
              onClick={() => setStep(step === "review" ? "capture" : "mode")}
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

              {duplicateWarning ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-6 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30"
                >
                  <div className="flex items-start gap-3 mb-4">
                    <AlertTriangle className="w-6 h-6 text-amber-400 flex-shrink-0" />
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-1">
                        Artikel finns redan!
                      </h3>
                      <p className="text-amber-200 text-sm">
                        En artikel med batch {duplicateWarning.batch_number} finns redan i systemet.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-slate-900/50 border border-slate-700 mb-4">
                    <p className="text-white font-medium mb-1">{duplicateWarning.name}</p>
                    <p className="text-slate-400 text-sm">
                      Nuvarande lagersaldo: {duplicateWarning.stock_qty || 0} st
                    </p>
                    {duplicateWarning.shelf_address && (
                      <p className="text-slate-400 text-sm">
                        Hyllplats: {duplicateWarning.shelf_address}
                      </p>
                    )}
                  </div>

                  <p className="text-slate-300 text-sm mb-4">
                    Vad vill du göra?
                  </p>

                  <div className="flex flex-col gap-2">
                    <Button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="w-full bg-blue-600 hover:bg-blue-500"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Uppdaterar...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Uppdatera befintlig artikel
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setDuplicateWarning(null)}
                      className="w-full bg-slate-800 border-slate-600 hover:bg-slate-700 text-white"
                    >
                      Ändra information
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleReset}
                      className="w-full bg-slate-800 border-slate-600 hover:bg-slate-700 text-white"
                    >
                      Avbryt
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <ReviewForm
                  extractedData={extractedData}
                  confidences={confidences}
                  onFieldChange={handleFieldChange}
                  onSave={handleSave}
                  onCancel={handleReset}
                  isSaving={isSaving}
                  mode={mode}
                />
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
                Sparat!
              </h2>
              <p className="text-slate-400 mb-8">
                {savedArticle?.name} har registrerats i lagret
              </p>

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
      </div>
    </div>
  );
}