import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Package, ArrowLeft, CheckCircle2, Camera, MapPin, XCircle, Plus, RotateCcw, Minus, ArrowDownToLine, ArrowUpFromLine, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import CameraCapture from "@/components/scanner/CameraCapture";
import AIProcessingScreen from "@/components/scanner/AIProcessingScreen";
import { createPageUrl } from "@/utils";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";

export default function ScanPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState("capture"); // capture | result_found | result_not_found
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState(null);
  const [progress, setProgress] = useState(0);

  const [foundArticle, setFoundArticle] = useState(null);
  const [extractedBatchNumber, setExtractedBatchNumber] = useState("");
  const [imageUrls, setImageUrls] = useState([]);

  // Stock adjustment state
  const [adjustQty, setAdjustQty] = useState(1);
  const [isAdjusting, setIsAdjusting] = useState(false);

  const handleStockAdjust = async (delta) => {
    if (!foundArticle?.id) return;
    setIsAdjusting(true);
    try {
      const currentQty = foundArticle.stock_qty ?? 0;
      const newQty = Math.max(0, currentQty + delta);
      await base44.entities.Article.update(foundArticle.id, { stock_qty: newQty });
      setFoundArticle(prev => ({ ...prev, stock_qty: newQty }));
      toast({ title: delta > 0 ? `+${delta} st tillagd` : `${delta} st uttagen` });
    } catch {
      toast({ title: "Kunde inte uppdatera lagersaldo", variant: "destructive" });
    } finally {
      setIsAdjusting(false);
    }
  };

  const handleReset = () => {
    setStep("capture");
    setIsProcessing(false);
    setProcessingError(null);
    setProgress(0);
    setFoundArticle(null);
    setExtractedBatchNumber("");
    setImageUrls([]);
  };

  const handleImageCaptured = async (files) => {
    const fileArray = Array.isArray(files) ? files : [files];
    setIsProcessing(true);
    setProcessingError(null);
    setProgress(10);

    try {
      const urls = [];
      for (let i = 0; i < fileArray.length; i++) {
        setProgress(10 + Math.round((i / fileArray.length) * 30));
        const { file_url } = await base44.integrations.Core.UploadFile({ file: fileArray[i] });
        urls.push(file_url);
      }
      setImageUrls(urls);
      setProgress(50);

      const scanPromise = base44.functions.invoke('mobileScan', {
        image_urls: urls,
        context: 'manual_scan',
      });
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Analysen tog för lång tid. Försök igen.')), 60000)
      );

      setProgress(70);
      const scanResp = await Promise.race([scanPromise, timeoutPromise]);
      const result = scanResp.data;
      setProgress(95);

      const extracted = result.extracted_summary || {};
      const batchNum = extracted.batch_number || result.all_numbers?.[0] || "";
      setExtractedBatchNumber(batchNum);

      const matches = result.all_matches || [];
      const batchMatch = matches.find(m => m.entity_type === 'Batch');
      const articleMatch = matches.find(m => m.entity_type === 'Article');
      const topMatch = batchMatch || articleMatch;

      if (topMatch) {
        setFoundArticle({
          id: topMatch.article_id || topMatch.entity_id,
          name: topMatch.article_name || topMatch.entity_name || "Okänd artikel",
          stock_qty: topMatch.stock_qty ?? 0,
          shelf_address: topMatch.shelf_address || null,
          sku: topMatch.article_sku || null,
          supplier_name: topMatch.supplier_name || null,
          image_urls: topMatch.article_image_url ? [topMatch.article_image_url] : [],
        });
        setStep("result_found");
      } else {
        setStep("result_not_found");
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

  return (
    <div className="min-h-screen bg-black p-4 md:p-6">
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          {step !== "capture" ? (
            <Button variant="ghost" onClick={handleReset} className="text-slate-400 hover:text-white hover:bg-slate-800">
              <ArrowLeft className="w-4 h-4 mr-2" />Tillbaka
            </Button>
          ) : <div />}
          <Link to={createPageUrl("Inventory")}>
            <Button variant="ghost" className="text-slate-400 hover:text-white">
              <Package className="w-4 h-4 mr-2" />Lager
            </Button>
          </Link>
        </div>

        {/* AI Processing Overlay */}
        {(isProcessing || processingError) && (
          <AIProcessingScreen
            progress={progress}
            error={processingError}
            onRetry={() => { setProcessingError(null); handleReset(); }}
            onManual={() => { setProcessingError(null); setIsProcessing(false); handleReset(); }}
          />
        )}

        <AnimatePresence mode="wait">

          {/* ── STEG 1: KAMERA ── */}
          {step === "capture" && (
            <motion.div key="capture" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-signal/20 flex items-center justify-center">
                  <Camera className="w-8 h-8 text-signal" />
                </div>
                <h1 className="text-2xl font-brand text-white mb-2">SCANNA ETIKETT</h1>
                <p className="text-slate-400 text-sm">Ta foto av etiketten — AI söker automatiskt i lagret</p>
              </div>
              <CameraCapture onImageCaptured={handleImageCaptured} isProcessing={isProcessing} progress={progress} />
            </motion.div>
          )}

          {/* ── RESULTAT: HITTAD ── */}
          {step === "result_found" && foundArticle && (
            <motion.div key="found" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-5">

              {/* Big green success card */}
              <div className="p-6 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/40">
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-brand text-emerald-400 tracking-wider">HITTAD I LAGRET</p>
                    <h2 className="text-xl font-bold text-white leading-tight mt-0.5">{foundArticle.name}</h2>
                  </div>
                </div>

                {extractedBatchNumber && (
                  <p className="text-sm text-slate-400 font-mono mb-4">Batch: {extractedBatchNumber}</p>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-black/40 rounded-xl p-4">
                    <p className="text-xs text-slate-500 mb-1">I LAGER</p>
                    <p className="text-3xl font-bold text-white">{foundArticle.stock_qty ?? 0}<span className="text-base font-normal text-slate-400 ml-1">st</span></p>
                  </div>
                  <div className="bg-black/40 rounded-xl p-4">
                    <p className="text-xs text-slate-500 mb-1">HYLLPLATS</p>
                    {foundArticle.shelf_address?.length > 0 ? (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <p className="text-lg font-bold text-white truncate">
                          {Array.isArray(foundArticle.shelf_address) ? foundArticle.shelf_address[0] : foundArticle.shelf_address}
                        </p>
                      </div>
                    ) : (
                      <p className="text-slate-500 text-sm">Ej angiven</p>
                    )}
                  </div>
                </div>

                {foundArticle.supplier_name && (
                  <p className="text-xs text-slate-500 mt-3">Leverantör: <span className="text-slate-300">{foundArticle.supplier_name}</span></p>
                )}
              </div>

              {/* Article image if available */}
              {foundArticle.image_urls?.[0] && (
                <img src={foundArticle.image_urls[0]} alt={foundArticle.name} className="w-full h-40 object-contain rounded-xl bg-slate-900 border border-slate-800" />
              )}

              {/* Quantity selector */}
              <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4">
                <p className="text-xs font-brand text-slate-400 tracking-wider mb-3">ANTAL ATT JUSTERA</p>
                <div className="flex items-center gap-4 mb-4">
                  <button onClick={() => setAdjustQty(q => Math.max(1, q - 1))} className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-white transition-colors">
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-3xl font-bold text-white flex-1 text-center">{adjustQty}</span>
                  <button onClick={() => setAdjustQty(q => q + 1)} className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-white transition-colors">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={() => handleStockAdjust(-adjustQty)}
                    disabled={isAdjusting || (foundArticle.stock_qty ?? 0) === 0}
                    className="h-12 bg-orange-500/20 border border-orange-500/40 hover:bg-orange-500/30 text-orange-300 disabled:opacity-40"
                  >
                    <ArrowUpFromLine className="w-4 h-4 mr-2" />Plocka ut
                  </Button>
                  <Button
                    onClick={() => handleStockAdjust(adjustQty)}
                    disabled={isAdjusting}
                    className="h-12 bg-emerald-500/20 border border-emerald-500/40 hover:bg-emerald-500/30 text-emerald-300 disabled:opacity-40"
                  >
                    <ArrowDownToLine className="w-4 h-4 mr-2" />Lägg till
                  </Button>
                </div>
              </div>

              {/* Navigation actions */}
              <div className="grid grid-cols-2 gap-3">
                <Link to={`/Inventory?articleId=${foundArticle.id}`} className="flex-1">
                  <Button variant="outline" className="w-full h-12 bg-slate-800 border-slate-600 hover:bg-slate-700 text-white">
                    <ExternalLink className="w-4 h-4 mr-2" />Produktsida
                  </Button>
                </Link>
                <Button onClick={handleReset} className="flex-1 h-12 bg-signal hover:bg-signal-hover">
                  <Camera className="w-4 h-4 mr-2" />Skanna igen
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── RESULTAT: INTE HITTAD ── */}
          {step === "result_not_found" && (
            <motion.div key="not_found" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-5">

              <div className="p-6 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 text-center">
                <XCircle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
                <p className="text-xs font-brand text-amber-400 tracking-wider mb-2">INGEN MATCHNING</p>
                <h2 className="text-xl font-bold text-white mb-1">
                  {extractedBatchNumber ? extractedBatchNumber : "Okänt batchnummer"}
                </h2>
                <p className="text-slate-400 text-sm">Artikeln finns inte i lagret</p>
              </div>

              {imageUrls[0] && (
                <img src={imageUrls[0]} alt="Skannad etikett" className="w-full h-40 object-contain rounded-xl bg-slate-900 border border-slate-800" />
              )}

              <div className="flex gap-3">
                <Button onClick={handleReset} variant="outline" className="flex-1 h-12 bg-slate-800 border-slate-600 hover:bg-slate-700 text-white">
                  <RotateCcw className="w-4 h-4 mr-2" />Försök igen
                </Button>
                <Link to={createPageUrl("Inventory")} className="flex-1">
                  <Button className="w-full h-12 bg-signal hover:bg-signal-hover">
                    <Plus className="w-4 h-4 mr-2" />Lägg till artikel
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