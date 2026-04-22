import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Package, ArrowLeft, CheckCircle2, Camera, MapPin, ClipboardList, MoreHorizontal, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import CameraCapture from "@/components/scanner/CameraCapture";
import AIProcessingScreen from "@/components/scanner/AIProcessingScreen";
import ReviewForm from "@/components/scanner/ReviewForm";
import { createPageUrl } from "@/utils";

const PURPOSE_OPTIONS = [
  { id: "inbound", label: "Inleverans", description: "Ta emot varor till lagret", icon: Package },
  { id: "inventory_count", label: "Inventering", description: "Räkna och stäm av saldo", icon: ClipboardList },
  { id: "other", label: "Annat", description: "Övrig registrering", icon: MoreHorizontal },
];

export default function ScanPage() {
  const [step, setStep] = useState("capture"); // capture | processing | found | not_found | new_article | success
  const [imageUrls, setImageUrls] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState(null);
  const [progress, setProgress] = useState(0);

  // Match results
  const [foundArticle, setFoundArticle] = useState(null);   // Article entity
  const [foundBatch, setFoundBatch] = useState(null);       // Batch entity
  const [extractedBatchNumber, setExtractedBatchNumber] = useState("");
  const [extractedFields, setExtractedFields] = useState({});

  // Step 3a
  const [selectedPurpose, setSelectedPurpose] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Step 3b new article form
  const [showNewForm, setShowNewForm] = useState(false);

  const handleReset = () => {
    setStep("capture");
    setImageUrls([]);
    setIsProcessing(false);
    setProcessingError(null);
    setProgress(0);
    setFoundArticle(null);
    setFoundBatch(null);
    setExtractedBatchNumber("");
    setExtractedFields({});
    setSelectedPurpose(null);
    setShowNewForm(false);
  };

  const handleImageCaptured = async (files) => {
    const fileArray = Array.isArray(files) ? files : [files];
    setIsProcessing(true);
    setProcessingError(null);
    setProgress(10);

    try {
      // Upload images
      const urls = [];
      for (let i = 0; i < fileArray.length; i++) {
        setProgress(10 + Math.round((i / fileArray.length) * 30));
        const { file_url } = await base44.integrations.Core.UploadFile({ file: fileArray[i] });
        urls.push(file_url);
      }
      setImageUrls(urls);
      setProgress(40);

      // Call mobileScan (Kimi vision + matching)
      const scanPromise = base44.functions.invoke('mobileScan', {
        image_urls: urls,
        context: 'manual_scan',
      });
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Analysen tog för lång tid. Försök igen.')), 60000)
      );

      setProgress(60);
      const scanResp = await Promise.race([scanPromise, timeoutPromise]);
      const result = scanResp.data;
      setProgress(90);

      const extracted = result.extracted_summary || {};
      const batchNum = extracted.batch_number || result.all_numbers?.[0] || "";
      setExtractedBatchNumber(batchNum);
      setExtractedFields(extracted);

      // Use match data directly from response — no extra entity fetches needed
      const matches = result.all_matches || [];
      const batchMatch = matches.find(m => m.entity_type === 'Batch');
      const articleMatch = matches.find(m => m.entity_type === 'Article');
      const topMatch = batchMatch || articleMatch;

      if (topMatch) {
        // Build article object from match data
        const articleFromMatch = {
          id: topMatch.article_id || topMatch.entity_id,
          name: topMatch.article_name || topMatch.entity_name || "Okänd artikel",
          stock_qty: topMatch.stock_qty ?? 0,
          shelf_address: topMatch.shelf_address || null,
          sku: topMatch.article_sku || null,
          supplier_name: topMatch.supplier_name || null,
          image_urls: topMatch.article_image_url ? [topMatch.article_image_url] : [],
        };
        setFoundArticle(articleFromMatch);
        if (batchMatch) {
          setFoundBatch({ id: batchMatch.entity_id, batch_number: batchMatch.entity_name });
        }
        setStep("found");
      } else {
        setStep("not_found");
      }

      setProgress(100);
      setIsProcessing(false);
      setProgress(0);
    } catch (err) {
      setProcessingError(err.message || 'Analysen misslyckades');
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const handleConfirmPurpose = async () => {
    if (!selectedPurpose) return;
    setIsSaving(true);
    try {
      const articleId = foundArticle?.id;
      const prev = foundArticle?.stock_qty || 0;
      if (articleId && selectedPurpose === "inbound") {
        await base44.entities.Article.update(articleId, { stock_qty: prev + 1 });
        await base44.entities.StockMovement.create({
          article_id: articleId, movement_type: "inbound",
          quantity: 1, previous_qty: prev, new_qty: prev + 1,
          reason: "Inleverans via scanning"
        });
      } else if (articleId && selectedPurpose === "inventory_count") {
        await base44.entities.StockMovement.create({
          article_id: articleId, movement_type: "inventory_count",
          quantity: prev, previous_qty: prev, new_qty: prev,
          reason: "Inventering via scanning"
        });
      }
      const purposeLabel = PURPOSE_OPTIONS.find(p => p.id === selectedPurpose)?.label || "";
      toast.success(`${foundArticle?.name || "Artikel"} — ${purposeLabel} registrerad!`);
      setStep("success");
    } catch {
      toast.error("Kunde inte spara. Försök igen.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleNewArticleSaved = async (data) => {
    setIsSaving(true);
    try {
      const article = await base44.entities.Article.create({
        ...data,
        stock_qty: parseInt(data.stock_qty) || 0,
        status: "active",
        image_urls: imageUrls,
      });
      await base44.entities.StockMovement.create({
        article_id: article.id, movement_type: "inbound",
        quantity: article.stock_qty, previous_qty: 0, new_qty: article.stock_qty,
        reason: "Ny artikel skapad via scanning"
      });
      setFoundArticle(article);
      toast.success("Ny artikel skapad!");
      setStep("success");
    } catch {
      toast.error("Kunde inte spara artikel");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-black p-4 md:p-6">
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          {step !== "capture" && step !== "success" ? (
            <Button variant="ghost" onClick={handleReset} className="text-slate-400 hover:text-white hover:bg-slate-800">
              <ArrowLeft className="w-4 h-4 mr-2" />Tillbaka
            </Button>
          ) : <div />}
          <Button variant="ghost" className="text-slate-400 hover:text-white" onClick={() => window.location.href = createPageUrl("Inventory")}>
            <Package className="w-4 h-4 mr-2" />Lager
          </Button>
        </div>

        {/* AI Processing Overlay */}
        {(isProcessing || processingError) && (
          <AIProcessingScreen
            progress={progress}
            error={processingError}
            onRetry={() => { setProcessingError(null); handleReset(); }}
            onManual={() => {
              setProcessingError(null);
              setIsProcessing(false);
              setExtractedFields({ batch_number: extractedBatchNumber });
              setShowNewForm(true);
              setStep("not_found");
            }}
          />
        )}

        <AnimatePresence mode="wait">

          {/* ── STEG 1: CAPTURE ── */}
          {step === "capture" && (
            <motion.div key="capture" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-signal/20 flex items-center justify-center">
                  <Camera className="w-8 h-8 text-signal" />
                </div>
                <h1 className="text-2xl font-brand text-white mb-2">SCANNA ETIKETT</h1>
                <p className="text-slate-400 text-sm">Ta foto eller ladda upp bild — AI söker automatiskt i lagret</p>
              </div>
              <CameraCapture onImageCaptured={handleImageCaptured} isProcessing={isProcessing} progress={progress} />
            </motion.div>
          )}

          {/* ── STEG 3a: ARTIKEL HITTAD ── */}
          {step === "found" && (foundArticle || foundBatch) && (
            <motion.div key="found" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">

              {/* Match card */}
              <div className="p-5 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/40">
                <div className="flex items-start gap-3 mb-4">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-brand text-emerald-400 tracking-wider mb-1">HITTAD I LAGRET</p>
                    <h2 className="text-lg font-semibold text-white leading-tight">
                      {foundArticle?.name || foundBatch?.article_name || "Okänd artikel"}
                    </h2>
                    {extractedBatchNumber && (
                      <p className="text-sm text-slate-400 font-mono mt-1">Batch: {extractedBatchNumber}</p>
                    )}
                  </div>
                </div>

                {foundArticle && (
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className="bg-black/30 rounded-xl p-3">
                      <p className="text-xs text-slate-500 mb-1">I lager</p>
                      <p className="text-xl font-bold text-white">{foundArticle.stock_qty ?? 0} <span className="text-sm font-normal text-slate-400">st</span></p>
                    </div>
                    {foundArticle.shelf_address?.length > 0 && (
                      <div className="bg-black/30 rounded-xl p-3">
                        <p className="text-xs text-slate-500 mb-1">Lagerplats</p>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <p className="text-sm font-medium text-white truncate">
                            {Array.isArray(foundArticle.shelf_address) ? foundArticle.shelf_address[0] : foundArticle.shelf_address}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Purpose selection */}
              <div>
                <p className="text-sm font-brand text-slate-400 tracking-wider mb-3">VAD ÄR SYFTET MED DENNA SCAN?</p>
                <div className="space-y-2">
                  {PURPOSE_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setSelectedPurpose(opt.id)}
                      className={cn(
                        "w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all",
                        selectedPurpose === opt.id
                          ? "border-signal bg-signal/10"
                          : "border-white/10 bg-white/5 hover:border-white/20"
                      )}
                    >
                      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                        selectedPurpose === opt.id ? "bg-signal/20" : "bg-white/10"
                      )}>
                        <opt.icon className={cn("w-5 h-5", selectedPurpose === opt.id ? "text-signal" : "text-slate-400")} />
                      </div>
                      <div>
                        <p className={cn("font-semibold text-sm", selectedPurpose === opt.id ? "text-signal" : "text-white")}>{opt.label}</p>
                        <p className="text-xs text-slate-500">{opt.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleConfirmPurpose}
                disabled={!selectedPurpose || isSaving}
                className="w-full h-12 text-base bg-signal hover:bg-signal-hover"
              >
                {isSaving ? "Sparar..." : "Bekräfta"}
              </Button>
            </motion.div>
          )}

          {/* ── STEG 3b: INTE HITTAD ── */}
          {step === "not_found" && !showNewForm && (
            <motion.div key="not_found" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
              <div className="p-5 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 text-center">
                <p className="text-amber-400 text-sm font-brand tracking-wider mb-2">INGEN ARTIKEL HITTAD</p>
                <p className="text-white font-semibold text-lg mb-1">
                  {extractedBatchNumber ? `Batch: ${extractedBatchNumber}` : "Okänt batchnummer"}
                </p>
                <p className="text-slate-400 text-sm">Artikeln finns inte i lagret</p>
              </div>

              {imageUrls[0] && (
                <img src={imageUrls[0]} alt="Skannad" className="w-full h-40 object-contain rounded-xl bg-slate-900 border border-slate-800" />
              )}

              <p className="text-center text-slate-300 font-medium">Vill du lägga upp detta som en ny artikel?</p>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="flex-1 bg-white/5 border-white/20 text-white hover:bg-white/10 h-12"
                >
                  <X className="w-4 h-4 mr-2" />
                  Nej, avbryt
                </Button>
                <Button
                  onClick={() => setShowNewForm(true)}
                  className="flex-1 bg-signal hover:bg-signal-hover h-12"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Ja, lägg upp
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── NY ARTIKEL FORMULÄR ── */}
          {step === "not_found" && showNewForm && (
            <motion.div key="new_form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
              <div className="text-center mb-4">
                <h2 className="text-xl font-brand text-white mb-1">NY ARTIKEL</h2>
                <p className="text-slate-400 text-sm">Fält förifyllda från etiketten</p>
              </div>
              <ReviewForm
                extractedData={{
                  batch_number: extractedBatchNumber,
                  name: extractedFields.article_name || extractedFields.name || "",
                  supplier_name: extractedFields.supplier_name || "",
                  manufacturing_date: extractedFields.manufacturing_date || "",
                  stock_qty: extractedFields.quantity || 1,
                  storage_type: "company_owned",
                }}
                confidences={{}}
                onFieldChange={(field, value) => setExtractedFields(prev => ({ ...prev, [field]: value }))}
                onSave={handleNewArticleSaved}
                onCancel={() => setShowNewForm(false)}
                isSaving={isSaving}
                mode="inbound"
                isManual={true}
              />
            </motion.div>
          )}

          {/* ── SUCCESS ── */}
          {step === "success" && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="text-center py-16">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }}
                className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              </motion.div>
              <h2 className="text-2xl font-brand text-white mb-2">KLART!</h2>
              <p className="text-slate-400 mb-8">
                {foundArticle?.name ? `${foundArticle.name} registrerad` : "Åtgärden genomfördes"}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={handleReset} className="bg-signal hover:bg-signal-hover">
                  <Camera className="w-4 h-4 mr-2" />Skanna ny
                </Button>
                <Button variant="outline" className="bg-slate-800 border-slate-600 hover:bg-slate-700 text-white"
                  onClick={() => window.location.href = createPageUrl("Inventory")}>
                  <Package className="w-4 h-4 mr-2" />Visa lager
                </Button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}