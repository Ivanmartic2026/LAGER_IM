import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { 
  Package, ClipboardList, ArrowLeft, Sparkles, 
  CheckCircle2, Camera 
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
  const [imageFile, setImageFile] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [extractedData, setExtractedData] = useState({});
  const [confidences, setConfidences] = useState({});
  const [savedArticle, setSavedArticle] = useState(null);

  const handleModeSelect = (selectedMode) => {
    setMode(selectedMode);
    setStep("capture");
  };

  const handleImageCaptured = async (file) => {
    setImageFile(file);
    setIsProcessing(true);

    try {
      // Upload image first
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setImageUrl(file_url);

      // Extract data using AI
      const result = await base44.integrations.Core.InvokeLLM({
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
        file_urls: [file_url],
        response_json_schema: {
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
        }
      });

      // Enrich with web search if we have basic product info
      if (result.name || result.manufacturer) {
        try {
          const enrichedData = await base44.integrations.Core.InvokeLLM({
            prompt: `Sök på internet efter produkten "${result.name || ''}" från tillverkare "${result.manufacturer || ''}" och hitta ytterligare information som kan vara användbar för ett lagersystem. 

      Fokusera på att hitta:
      - Fullständigt produktnamn
      - Komplett tillverkarinformation och kontaktuppgifter
      - Tekniska specifikationer (dimensioner, vikt, pixel pitch om det är en LED-modul/skärm)
      - Produktkategori
      - Eventuella varningar eller särskilda hanteringsinstruktioner

      Returnera endast information du hittar med hög säkerhet från tillförlitliga källor.`,
            add_context_from_internet: true,
            response_json_schema: {
              type: "object",
              properties: {
                full_product_name: { type: "string" },
                manufacturer_details: { type: "string" },
                technical_specs: { type: "string" },
                category_suggestion: { type: "string" },
                additional_notes: { type: "string" }
              }
            }
          });

          // Merge enriched data with confidence boost for internet-sourced info
          if (enrichedData.full_product_name && !result.name) {
            result.name = enrichedData.full_product_name;
            result.name_confidence = 0.8;
          }
          if (enrichedData.manufacturer_details && !result.manufacturer) {
            result.manufacturer = enrichedData.manufacturer_details;
            result.manufacturer_confidence = 0.8;
          }
          if (enrichedData.category_suggestion && !result.category) {
            result.category = enrichedData.category_suggestion;
            result.category_confidence = 0.75;
          }
          if (enrichedData.additional_notes) {
            result.notes = enrichedData.additional_notes;
          }
        } catch (error) {
          console.log("Could not enrich with web data:", error);
          // Continue without enrichment
        }
      }

      // Separate data and confidence values
      const data = {};
      const confs = {};
      
      Object.keys(result).forEach(key => {
        if (key.endsWith('_confidence')) {
          const fieldName = key.replace('_confidence', '');
          confs[fieldName] = result[key] || 0.5;
        } else {
          data[key] = result[key];
        }
      });

      setExtractedData({ ...data, image_url: file_url });
      setConfidences(confs);
      setStep("review");
      
    } catch (error) {
      console.error("Error processing image:", error);
      toast.error("Kunde inte analysera bilden. Försök igen.");
    } finally {
      setIsProcessing(false);
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
      // Check if article with same batch number exists
      const existing = await base44.entities.Article.filter({ 
        batch_number: extractedData.batch_number 
      });

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
    setImageFile(null);
    setImageUrl(null);
    setExtractedData({});
    setConfidences({});
    setSavedArticle(null);
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

              {imageUrl && (
                <div className="rounded-xl overflow-hidden bg-slate-800 mb-4">
                  <img 
                    src={imageUrl} 
                    alt="Scannad bild" 
                    className="w-full h-40 object-contain"
                  />
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