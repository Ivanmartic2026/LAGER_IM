import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Package, ClipboardList, ArrowLeft, Sparkles,
  CheckCircle2, Camera, AlertTriangle, Scan as ScanIcon,
  PackageSearch, Activity, X, ShoppingCart, PackagePlus,
  PackageMinus, ArrowRightLeft, Calculator, ClipboardCheck,
  Wrench, ShieldCheck, Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import CameraCapture from "@/components/scanner/CameraCapture";
import ReviewForm from "@/components/scanner/ReviewForm";
import AutoAnalysisReview from "@/components/scanner/AutoAnalysisReview";
import QuickConfirmReview from "@/components/scanner/QuickConfirmReview";
import BarcodeScanner from "@/components/scanner/BarcodeScanner";
import UnknownDeliveryForm from "@/components/scanner/UnknownDeliveryForm";
import PendingVerificationForm from "@/components/scanner/PendingVerificationForm";
import LinkToOrderModal from "@/components/scanner/LinkToOrderModal";
import { RepairMatchStep, RepairLabelStep } from "@/components/scanner/RepairSteps";
import SiteDocumentationFlow from "@/components/scan/SiteDocumentationFlow";
import ImageZoomViewer from "@/components/scanner/ImageZoomViewer";
import NoMatchDecisionModal from "@/components/scanner/NoMatchDecisionModal";
import MobileScanResult from "@/components/scanner/MobileScanResult";
import { createPageUrl } from "@/utils";
import ScanQuickActionDialog from "@/components/scanner/ScanQuickActionDialog";

// ── Context → mode mapping ──
const CTX_TO_MODE = {
  purchase_receiving: 'inbound',
  repair_return: 'repair',
  site_report: 'site_documentation',
  production: 'inbound',
  article_creation: 'inbound',
  manual_scan: 'quickscan',
  pick: 'pick',
  ship_out: 'ship_out',
  move_location: 'move_location',
  stock_adjustment: 'stock_adjustment',
  inventory_count: 'inventory_count',
  service: 'service',
};

const LAGER_OPTIONS = [
  {
    id: "pick",
    context: "pick",
    title: "PLOCKA",
    description: "Plocka för kundorder",
    icon: ShoppingCart,
    accent: "text-blue-400",
    border: "border-blue-500/20",
    bg: "bg-blue-500/10"
  },
  {
    id: "inbound",
    context: "purchase_receiving",
    title: "INLEVERERA",
    description: "Mottagning av varor — vi söker alltid befintliga först",
    icon: PackagePlus,
    accent: "text-emerald-400",
    border: "border-emerald-500/20",
    bg: "bg-emerald-500/10"
  },
  {
    id: "ship_out",
    context: "ship_out",
    title: "UTLEVERERA",
    description: "Skicka iväg mot följesedel",
    icon: PackageMinus,
    accent: "text-orange-400",
    border: "border-orange-500/20",
    bg: "bg-orange-500/10"
  },
  {
    id: "move_location",
    context: "move_location",
    title: "FLYTTA",
    description: "Mellan lagerplatser",
    icon: ArrowRightLeft,
    accent: "text-purple-400",
    border: "border-purple-500/20",
    bg: "bg-purple-500/10"
  },
  {
    id: "stock_adjustment",
    context: "stock_adjustment",
    title: "JUSTERA SALDO",
    description: "Korrigering vid differens",
    icon: Calculator,
    accent: "text-yellow-400",
    border: "border-yellow-500/20",
    bg: "bg-yellow-500/10"
  },
  {
    id: "inventory_count",
    context: "inventory_count",
    title: "INVENTERING",
    description: "Räkna och avstäm saldo",
    icon: ClipboardCheck,
    accent: "text-green-400",
    border: "border-green-500/20",
    bg: "bg-green-500/10"
  },
];

const SERVICE_OPTIONS = [
  {
    id: "repair",
    context: "repair_return",
    title: "REPARERA",
    description: "Felanmälan och reparation",
    icon: Wrench,
    accent: "text-red-400",
    border: "border-red-500/20",
    bg: "bg-red-500/10"
  },
  {
    id: "service",
    context: "service",
    title: "SERVA",
    description: "Planerat underhåll och service",
    icon: ShieldCheck,
    accent: "text-cyan-400",
    border: "border-cyan-500/20",
    bg: "bg-cyan-500/10"
  },
];

// All quick-action contexts shown in QuickScan result dialog
const QUICK_ACTIONS = [
  { id: "pick", label: "Plocka", icon: ShoppingCart, context: "pick" },
  { id: "move_location", label: "Flytta", icon: ArrowRightLeft, context: "move_location" },
  { id: "stock_adjustment", label: "Justera saldo", icon: Calculator, context: "stock_adjustment" },
  { id: "inventory_count", label: "Inventering", icon: ClipboardCheck, context: "inventory_count" },
  { id: "repair", label: "Reparation", icon: Wrench, context: "repair_return" },
  { id: "service", label: "Serva", icon: ShieldCheck, context: "service" },
  { id: "ship_out", label: "Utleverans", icon: PackageMinus, context: "ship_out" },
];

export default function ScanPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const urlContext = urlParams.get('context');
  const urlRef = urlParams.get('ref');

  const [mode, setMode] = useState(() => {
    if (urlContext) return CTX_TO_MODE[urlContext] || 'inbound';
    return null;
  });
  const [scanContext, setScanContext] = useState(urlContext || null);
  const [scanContextRef, setScanContextRef] = useState(urlRef || null);
  const [step, setStep] = useState(() => urlContext ? 'capture' : 'mode');

  const [noMatchData, setNoMatchData] = useState(null);
  const [mobileScanResult, setMobileScanResult] = useState(null); // { allNumbers, allMatches, imageUrl, labelScanId }
  const [quickMatchResult, setQuickMatchResult] = useState(null); // { batch, article, labelScanId }
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
  const [zoomViewerOpen, setZoomViewerOpen] = useState(null);
  const [repairArticle, setRepairArticle] = useState(null);
  const [repairQuantity, setRepairQuantity] = useState(1);
  const [repairNotes, setRepairNotes] = useState("");
  const [isGeneratingLabel, setIsGeneratingLabel] = useState(false);
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [showLinkToOrder, setShowLinkToOrder] = useState(false);
  const [pendingArticleForLink, setPendingArticleForLink] = useState(null);
  const [scanAndProcessResult, setScanAndProcessResult] = useState(null);

  const levenshteinDistance = (str1, str2) => {
    const matrix = [];
    for (let i = 0; i <= str2.length; i++) matrix[i] = [i];
    for (let j = 0; j <= str1.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
        }
      }
    }
    return matrix[str2.length][str1.length];
  };

  const calculateBatchMatch = (extracted, existing) => {
    const a = extracted.toString().toUpperCase().replace(/\s+/g, '');
    const b = existing.toString().toUpperCase().replace(/\s+/g, '');
    if (a === b) return 100;
    if (a.includes(b) || b.includes(a)) return 95;
    const dist = levenshteinDistance(a, b);
    return Math.round(((Math.max(a.length, b.length) - dist) / Math.max(a.length, b.length)) * 100);
  };

  const handleModeSelect = (modeId, ctx) => {
    setMode(modeId);
    setScanContext(ctx);
    if (modeId === "site_documentation") {
      setStep("site_documentation");
    } else {
      setStep("capture");
    }
  };

  const handleImageCaptured = async (files) => {
    const fileArray = Array.isArray(files) ? files : [files];
    setImageFiles(fileArray);
    setIsProcessing(true);
    setProgress(0);

    try {
      setProgress(5);
      const urls = [];
      for (let i = 0; i < fileArray.length; i++) {
        setProgress(5 + ((i / fileArray.length) * 25));
        const { file_url } = await base44.integrations.Core.UploadFile({ file: fileArray[i] });
        urls.push(file_url);
      }
      setImageUrls(urls);
      setProgress(30);

      // ── mobileScan: extract all numbers, search, let user choose ──
      const resolvedContext = scanContext || (mode === 'inbound' ? 'article_creation' : 'manual_scan');

      try {
        // 30s timeout — never hang forever
        const scanPromise = base44.functions.invoke('mobileScan', {
          image_urls: urls,
          context: resolvedContext,
          context_reference_id: scanContextRef || undefined
        });
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 30000)
        );
        const scanResp = await Promise.race([scanPromise, timeoutPromise]);
        const result = scanResp.data;
        setScanAndProcessResult(result);
        setProgress(100);
        setIsProcessing(false);
        setProgress(0);
        setMobileScanResult({
          allNumbers: result.all_numbers || [],
          allMatches: result.all_matches || [],
          imageUrl: result.image_url || urls[0],
          labelScanId: result.label_scan_id,
          extractedSummary: result.extracted_summary || {},
          kimiError: result.kimi_error || null
        });
        setStep('mobile_result');
        return;
      } catch (scanErr) {
        console.warn('mobileScan failed, showing empty result:', scanErr.message);
        // Never block — show empty result so user can retry or create new
        setIsProcessing(false);
        setProgress(0);
        setMobileScanResult({
          allNumbers: [],
          allMatches: [],
          imageUrl: urls[0],
          labelScanId: null,
          extractedSummary: {},
          kimiError: scanErr.message
        });
        setStep('mobile_result');
        return;
      }

      // ── Fallback: pending_verification ──
      if (mode === "pending_verification") {
        setExtractedData({ image_urls: urls, batch_number: "" });
        setIsProcessing(false);
        setProgress(0);
        setStep("pending_form");
        base44.functions.invoke('parseImage', { fileUrls: urls })
          .then(r => {
            const ex = r?.data?.extracted || {};
            let bn = ex.batch_numbers?.sort((a, b) => (b.confidence || 0) - (a.confidence || 0))[0]?.value || "";
            if (!bn) bn = ex.article_numbers?.sort((a, b) => (b.confidence || 0) - (a.confidence || 0))[0]?.value || "";
            if (bn) setExtractedData(prev => ({ ...prev, batch_number: bn }));
          }).catch(() => {});
        return;
      }

      // ── Repair mode fallback ──
      if (mode === "repair") {
        setStep("repair_match");
        setIsProcessing(false);
        setProgress(0);
        return;
      }

      setStep("auto_review");
      setIsProcessing(false);
      setProgress(0);

    } catch (error) {
      console.error("Error processing image:", error);
      toast.error(`Kunde inte analysera bilden: ${error.message || 'Okänt fel'}`);
      setStep("capture");
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const handleFieldChange = (field, value) => {
    setExtractedData(prev => ({ ...prev, [field]: value }));
    setConfidences(prev => ({ ...prev, [field]: 1.0 }));
  };

  const handleSavePending = async (formData) => {
    setIsSaving(true);
    try {
      const article = await base44.entities.Article.create({
        ...formData, stock_qty: parseInt(formData.stock_qty) || 0,
        status: "pending_verification", image_urls: imageUrls,
      });
      await base44.entities.StockMovement.create({
        article_id: article.id, movement_type: "inbound",
        quantity: parseInt(formData.stock_qty) || 0,
        previous_qty: 0, new_qty: article.stock_qty,
        reason: "Registrerad utan inköp – väntande verifiering"
      });
      setPendingArticleForLink(article);
      setShowLinkToOrder(true);
    } catch (error) {
      toast.error("Kunde inte spara artikel");
    } finally { setIsSaving(false); }
  };

  const handleLinkToOrder = async ({ type, id }) => {
    setShowLinkToOrder(false);
    const article = pendingArticleForLink;
    if (!article) { setStep("success"); return; }
    try {
      if (type === 'order') {
        await base44.entities.OrderItem.create({
          order_id: id, article_id: article.id,
          article_name: article.name || article.batch_number,
          article_batch_number: article.batch_number,
          quantity_ordered: article.stock_qty || 1, quantity_picked: 0, status: "pending"
        });
        toast.success("Kopplad till order!");
      } else {
        const woList = await base44.entities.WorkOrder.filter({ id });
        if (woList.length > 0) {
          const ex = woList[0].materials_needed || [];
          await base44.entities.WorkOrder.update(id, {
            materials_needed: [...ex, {
              article_id: article.id, article_name: article.name || article.batch_number,
              batch_number: article.batch_number, quantity: article.stock_qty || 1,
              in_stock: article.stock_qty || 0, missing: 0, needs_purchase: false
            }]
          });
          toast.success("Kopplad till arbetsorder!");
        }
      }
    } catch { toast.error("Kunde inte koppla, men artikel är sparad"); }
    setSavedArticle(article);
    setPendingArticleForLink(null);
    setStep("success");
  };

  const handleSkipLink = () => {
    setShowLinkToOrder(false);
    setSavedArticle(pendingArticleForLink);
    setPendingArticleForLink(null);
    setStep("success");
  };

  const handleRepairSubmit = async () => {
    if (!repairArticle || repairQuantity <= 0) {
      toast.error("Välj artikel och ange antal");
      return;
    }
    setIsSaving(true);
    try {
      const newStockQty = (repairArticle.stock_qty || 0) - repairQuantity;
      await base44.entities.Article.update(repairArticle.id, {
        status: "on_repair", stock_qty: newStockQty,
        repair_notes: repairNotes || "Registrerad via scanning",
        repair_date: new Date().toISOString()
      });
      await base44.entities.StockMovement.create({
        article_id: repairArticle.id, movement_type: "adjustment",
        quantity: -repairQuantity, previous_qty: repairArticle.stock_qty || 0, new_qty: newStockQty,
        reason: `Skickad på reparation: ${repairNotes || "Via scanning"}`
      });
      await base44.entities.RepairLog.create({
        article_id: repairArticle.id, article_name: repairArticle.name,
        article_batch_number: repairArticle.batch_number,
        repair_date_start: new Date().toISOString(),
        notes: repairNotes || "Registrerad via scanning", status: "in_progress"
      });
      setStep("repair_label");
      toast.success("Reparation registrerad!");
    } catch (error) {
      toast.error("Kunde inte registrera reparation");
    } finally { setIsSaving(false); }
  };

  const handlePrintRepairLabel = async () => {
    setIsGeneratingLabel(true);
    try {
      const response = await base44.functions.invoke('generateA4Label', {
        article: repairArticle, quantity: repairQuantity,
        labelType: 'repair', repairNotes
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reparation_${repairArticle.batch_number}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success("Etikett genererad!");
      setStep("success");
    } catch (error) {
      toast.error("Kunde inte generera etikett");
    } finally { setIsGeneratingLabel(false); }
  };

  const handleSave = async (dataToSave = null) => {
    setIsSaving(true);
    const finalData = dataToSave || extractedData;
    if (!finalData.name || finalData.name.trim() === '') {
      toast.error("Artikelnamn måste fyllas i");
      setIsSaving(false);
      setStep("review");
      return;
    }
    try {
      let existing = existingArticle ? [existingArticle] : [];
      if (!existing.length) {
        const results = await Promise.allSettled([
          extractedData.batch_number ? base44.entities.Article.filter({ batch_number: extractedData.batch_number }) : Promise.resolve([]),
          extractedData.sku ? base44.entities.Article.filter({ sku: extractedData.sku }) : Promise.resolve([]),
        ]);
        results.forEach(r => { if (r.status === 'fulfilled') existing.push(...r.value); });
        const seen = new Set();
        existing = existing.filter(a => { if (seen.has(a.id)) return false; seen.add(a.id); return true; });
      }
      if (existing.length > 0 && !showDuplicateConfirm) {
        setExistingArticle(existing[0]);
        setShowDuplicateConfirm(true);
        setIsSaving(false);
        return;
      }
      let article;
      let previousQty = 0;
      const preparedData = {
        ...finalData,
        shelf_address: finalData.shelf_address
          ? (Array.isArray(finalData.shelf_address) ? finalData.shelf_address : [finalData.shelf_address]) : [],
        storage_type: finalData.storage_type || 'company_owned',
        manufacturing_date: finalData.manufacturing_date && finalData.manufacturing_date !== '-' ? finalData.manufacturing_date : undefined
      };
      if (existing.length > 0) {
        article = existing[0];
        previousQty = article.stock_qty || 0;
        const updateData = { ...preparedData };
        if (mode === "inbound") updateData.stock_qty = previousQty + (parseInt(finalData.stock_qty) || 0);
        await base44.entities.Article.update(article.id, updateData);
        article = { ...article, ...updateData };
      } else {
        article = await base44.entities.Article.create({
          ...preparedData, stock_qty: parseInt(finalData.stock_qty) || 0,
          status: "active", ai_extracted_data: extractedData, ai_confidence_scores: confidences
        });
      }
      await base44.entities.StockMovement.create({
        article_id: article.id, movement_type: mode,
        quantity: parseInt(finalData.stock_qty) || 0,
        previous_qty: previousQty, new_qty: article.stock_qty,
        reason: mode === "inbound" ? "Inleverans via scanning" : "Inventering via scanning"
      });
      setSavedArticle(article);
      setStep("success");
      setShowDuplicateConfirm(false);
      setExistingArticle(null);
      toast.success(existing.length > 0 ? "Artikel uppdaterad!" : "Ny artikel skapad!");
    } catch (error) {
      toast.error("Kunde inte spara. Försök igen.");
    } finally { setIsSaving(false); }
  };

  const handleReset = () => {
    setMode(null); setStep("mode"); setImageFiles([]); setImageUrls([]);
    setExtractedData({}); setConfidences({}); setSavedArticle(null);
    setSelectedArticle(null); setExistingArticle(null);
    setShowDuplicateConfirm(false); setShowMatchConfirm(false);
    setPotentialMatches([]); setProgress(0); setBarcodeResult(null);
    setSearchingArticle(false); setRepairArticle(null); setRepairQuantity(1);
    setRepairNotes(""); setIsManualEntry(false); setShowLinkToOrder(false);
    setPendingArticleForLink(null); setQuickMatchResult(null);
    setScanContext(null); setScanContextRef(null); setScanAndProcessResult(null);
    setMobileScanResult(null);
  };

  const getCaptureTitle = () => {
    const titles = {
      quickscan: "Snabbscan",
      inbound: "Inleverans",
      repair: "Reparation",
      ship_out: "Utleverans",
      pick: "Plockning",
      move_location: "Flytta",
      stock_adjustment: "Justera Saldo",
      inventory_count: "Inventering",
      service: "Service",
    };
    return titles[mode] || "Skanna";
  };

  return (
    <div className="min-h-screen bg-black p-4 md:p-6">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          {step !== "mode" && step !== "success" ? (
            <Button variant="ghost" onClick={() => { if (step === "capture" || step === "barcode") { setStep("mode"); setMode(null); } else { setStep("mode"); } }} className="text-slate-400 hover:text-white hover:bg-slate-800">
              <ArrowLeft className="w-4 h-4 mr-2" />Tillbaka
            </Button>
          ) : <div />}
          <Button variant="ghost" className="text-slate-400 hover:text-white" onClick={() => window.location.href = createPageUrl("Inventory")}>
            <Package className="w-4 h-4 mr-2" />Lager
          </Button>
        </div>

        <AnimatePresence mode="wait">

          {/* ── MODE SELECTION ── */}
          {step === "mode" && (
            <motion.div key="mode" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">

              {/* Quick Scan — primary CTA */}
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => { setMode("quickscan"); setScanContext("manual_scan"); setStep("capture"); }}
                className="w-full p-6 rounded-2xl text-left border-2 border-signal/40 bg-signal/10 hover:bg-signal/20 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-signal flex items-center justify-center flex-shrink-0">
                    <Zap className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-brand text-white mb-1">SNABBSCAN</h2>
                    <p className="text-sm text-slate-300">Scanna först, vi föreslår vad du ska göra baserat på vad vi hittar</p>
                  </div>
                </div>
              </motion.button>

              {/* LAGER section */}
              <div>
                <p className="text-xs font-brand text-slate-500 tracking-widest mb-3">LAGERFLÖDEN</p>
                <div className="grid grid-cols-2 gap-3">
                  {LAGER_OPTIONS.map((opt) => (
                    <motion.button
                      key={opt.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleModeSelect(opt.id, opt.context)}
                      className={cn("p-4 rounded-xl text-left border transition-all", opt.border, opt.bg, "hover:opacity-90")}
                    >
                      <opt.icon className={cn("w-6 h-6 mb-2", opt.accent)} />
                      <p className="text-sm font-brand text-white mb-0.5">{opt.title}</p>
                      <p className="text-xs text-slate-400 leading-tight">{opt.description}</p>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* SERVICE section */}
              <div>
                <p className="text-xs font-brand text-slate-500 tracking-widest mb-3">SERVICE & UNDERHÅLL</p>
                <div className="grid grid-cols-2 gap-3">
                  {SERVICE_OPTIONS.map((opt) => (
                    <motion.button
                      key={opt.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleModeSelect(opt.id, opt.context)}
                      className={cn("p-4 rounded-xl text-left border transition-all", opt.border, opt.bg, "hover:opacity-90")}
                    >
                      <opt.icon className={cn("w-6 h-6 mb-2", opt.accent)} />
                      <p className="text-sm font-brand text-white mb-0.5">{opt.title}</p>
                      <p className="text-xs text-slate-400 leading-tight">{opt.description}</p>
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── CAPTURE ── */}
          {step === "capture" && (
            <motion.div key="capture" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-white mb-2">{getCaptureTitle()}</h2>
                <p className="text-slate-400">
                  {mode === "quickscan" ? "Scanna — vi söker i hela databasen och föreslår vad du kan göra" : "Ta foto av etikett, följesedel eller produktmärkning"}
                </p>
              </div>
              <CameraCapture onImageCaptured={handleImageCaptured} isProcessing={isProcessing} progress={progress} />
              <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                <Sparkles className="w-4 h-4" />
                <span>Match-först — vi söker alltid i befintliga poster</span>
              </div>
            </motion.div>
          )}

          {/* ── QUICK CONFIRM ── */}
          {step === "quick_confirm" && (
            <motion.div key="quick_confirm" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <QuickConfirmReview
                article={selectedArticle} mode={mode}
                onConfirm={async (quantity) => {
                  setIsSaving(true);
                  try {
                    let article = selectedArticle;
                    let previousQty = article.stock_qty || 0;
                    if (mode === "inbound" || mode === "inventory_count") {
                      await base44.entities.Article.update(article.id, { stock_qty: previousQty + quantity });
                      article.stock_qty = previousQty + quantity;
                    }
                    await base44.entities.StockMovement.create({
                      article_id: article.id, movement_type: mode, quantity,
                      previous_qty: previousQty, new_qty: article.stock_qty,
                      reason: "Via snabb-scanning"
                    });
                    setSavedArticle(article);
                    setStep("success");
                    toast.success("Artikel sparad!");
                  } catch (error) {
                    toast.error("Kunde inte spara. Försök igen.");
                  } finally { setIsSaving(false); }
                }}
                onCancel={() => setStep("auto_review")}
                isLoading={isSaving}
              />
            </motion.div>
          )}

          {/* ── MOBILE SCAN RESULT ── */}
          {step === "mobile_result" && mobileScanResult && (
            <motion.div key="mobile_result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <MobileScanResult
                imageUrl={mobileScanResult.imageUrl}
                allNumbers={mobileScanResult.allNumbers}
                allMatches={mobileScanResult.allMatches}
                labelScanId={mobileScanResult.labelScanId}
                onConfirmMatch={async (match) => {
                  // Update LabelScan with user's chosen match, then proceed to success
                  if (mobileScanResult.labelScanId) {
                    base44.entities.LabelScan.update(mobileScanResult.labelScanId, {
                      status: 'completed',
                      match_results: {
                        article_match_id: match.article_id || (match.entity_type === 'Article' ? match.entity_id : null),
                        batch_match_id: match.entity_type === 'Batch' ? match.entity_id : null,
                        batch_match_method: match.matched_field || 'user_selected',
                        review_queued: false,
                        user_selected: true
                      }
                    }).catch(() => {});
                  }
                  toast.success(`Matchad: ${match.article_name || match.entity_name}`);
                  setMobileScanResult(null);
                  setStep('success');
                }}
                onCreateNew={async (type, prefill) => {
                  const firstNumber = prefill.allNumbers?.[0] || '';
                  setExtractedData({ batch_number: firstNumber, name: '' });
                  setIsManualEntry(true);
                  setMobileScanResult(null);
                  setStep('review');
                  // Push: no match found, user chose to create new
                  base44.functions.invoke('sendPushToUser', {
                    user_email: (await base44.auth.me().catch(() => null))?.email,
                    title: '➕ Skapar ny ' + (type === 'batch' ? 'batch' : 'artikel'),
                    message: firstNumber ? `Nummer: ${firstNumber}` : 'Ingen match hittad i systemet',
                    link_page: 'Inventory',
                    type: 'scan_result'
                  }).catch(() => {});
                }}
                onRetake={() => {
                  setMobileScanResult(null);
                  setImageFiles([]);
                  setImageUrls([]);
                  setStep('capture');
                }}
              />
            </motion.div>
          )}

          {/* ── AUTO REVIEW ── */}
          {step === "auto_review" && (
            <motion.div key="auto_review" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <AutoAnalysisReview
                imageUrl={imageUrls[0]} extractedData={extractedData} confidences={confidences}
                onAccept={() => handleSave()}
                onReject={() => { setStep("capture"); setImageFiles([]); setImageUrls([]); setExtractedData({}); setConfidences({}); setProgress(0); }}
                onEdit={handleFieldChange}
                onManualReview={() => setStep("review")}
                isLoading={isSaving}
              />
            </motion.div>
          )}

          {/* ── REVIEW ── */}
          {step === "review" && (
            <motion.div key="review" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-white mb-2">{isManualEntry ? "Registrera artikel manuellt" : "Granska & Godkänn"}</h2>
                <p className="text-slate-400">{isManualEntry ? "Fyll i uppgifterna för den nya artikeln" : "Kontrollera att informationen är korrekt"}</p>
              </div>
              <ReviewForm extractedData={extractedData} confidences={confidences} onFieldChange={handleFieldChange} onSave={handleSave} onCancel={handleReset} isSaving={isSaving} mode={mode} isManual={isManualEntry} />
              {showDuplicateConfirm && existingArticle && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4" onClick={() => setShowDuplicateConfirm(false)}>
                  <motion.div initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} onClick={e => e.stopPropagation()} className="bg-slate-900 border border-amber-500/30 rounded-t-3xl md:rounded-2xl p-6 max-w-md w-full">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0"><AlertTriangle className="w-6 h-6 text-amber-400" /></div>
                      <div>
                        <h3 className="text-lg font-bold text-white mb-2">Artikel finns redan</h3>
                        <p className="text-sm text-slate-300">Batch <span className="font-semibold text-white">{extractedData.batch_number}</span> finns redan i systemet.</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Button onClick={() => setShowDuplicateConfirm(false)} variant="outline" className="flex-1 bg-slate-800 border-slate-600 text-white">Avbryt</Button>
                      <Button onClick={handleSave} disabled={isSaving} className="flex-1 bg-amber-600 hover:bg-amber-500 text-white">{isSaving ? "Sparar..." : mode === "inbound" ? "Lägg till" : "Uppdatera"}</Button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ── SITE DOCUMENTATION ── */}
          {step === "site_documentation" && (
            <motion.div key="site_documentation" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <SiteDocumentationFlow onComplete={handleReset} onCancel={handleReset} />
            </motion.div>
          )}

          {/* ── REPAIR MATCH ── */}
          {step === "repair_match" && (
            <RepairMatchStep imageUrls={imageUrls} extractedData={extractedData} repairArticle={repairArticle} setRepairArticle={setRepairArticle} repairQuantity={repairQuantity} setRepairQuantity={setRepairQuantity} repairNotes={repairNotes} setRepairNotes={setRepairNotes} isSaving={isSaving} onSubmit={handleRepairSubmit} onReset={handleReset} />
          )}

          {/* ── REPAIR LABEL ── */}
          {step === "repair_label" && (
            <RepairLabelStep repairArticle={repairArticle} repairQuantity={repairQuantity} repairNotes={repairNotes} isGeneratingLabel={isGeneratingLabel} onPrint={handlePrintRepairLabel} onReset={handleReset} />
          )}

          {/* ── PENDING FORM ── */}
          {step === "pending_form" && (
            <motion.div key="pending_form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-white mb-2">Registrera utan inköp</h2>
                <p className="text-slate-400">Fyll i batchnummer och minimal information</p>
              </div>
              {imageUrls.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {imageUrls.map((url, i) => <img key={i} src={url} alt={`Bild ${i + 1}`} className="w-full h-24 object-cover rounded-lg bg-slate-900" />)}
                </div>
              )}
              <PendingVerificationForm imageUrls={imageUrls} extractedBatch={extractedData.batch_number || ""} onSave={handleSavePending} onCancel={handleReset} isSaving={isSaving} />
            </motion.div>
          )}

          {/* ── SUCCESS ── */}
          {step === "success" && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="text-center py-12">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }} className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              </motion.div>
              <h2 className="text-2xl font-bold text-white mb-2">{savedArticle ? "Sparat!" : "Klart!"}</h2>
              <p className="text-slate-400 mb-8">{savedArticle ? `${savedArticle.name} har registrerats` : selectedArticle ? `${selectedArticle.name} finns i lagret` : "Åtgärden genomfördes"}</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={handleReset} className="bg-signal hover:bg-signal-hover">
                  <Camera className="w-4 h-4 mr-2" />Skanna ny
                </Button>
                <Button variant="outline" className="bg-slate-800 border-slate-600 hover:bg-slate-700 text-white" onClick={() => window.location.href = createPageUrl("Inventory")}>
                  <Package className="w-4 h-4 mr-2" />Visa lager
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Image Zoom Viewer ── */}
        <AnimatePresence>
          {zoomViewerOpen && (
            <ImageZoomViewer imageUrl={zoomViewerOpen} onClose={() => setZoomViewerOpen(null)}
              onAnalyzeZoomArea={async (croppedImage) => {
                try {
                  const { file_url } = await base44.integrations.Core.UploadFile({ file: new File([croppedImage], 'crop.png', { type: 'image/png' }) });
                  const result = await base44.integrations.Core.InvokeLLM({
                    prompt: 'Extrahera batch_number och sku från denna etikettbild. Ge confidence 0-1.',
                    file_urls: [file_url],
                    response_json_schema: { type: "object", properties: { batch_number: { type: "string" }, sku: { type: "string" } } }
                  });
                  if (result.batch_number) handleFieldChange('batch_number', result.batch_number);
                  if (result.sku) handleFieldChange('sku', result.sku);
                  toast.success('Fält uppdaterade!');
                  setZoomViewerOpen(null);
                } catch { toast.error('Kunde inte analysera'); }
              }}
            />
          )}
        </AnimatePresence>

        {/* ── No-Match Decision Modal ── */}
        <AnimatePresence>
          {noMatchData && (
            <NoMatchDecisionModal
              extractedSummary={noMatchData.extractedSummary}
              barcodeValues={noMatchData.barcodeValues}
              imageUrl={noMatchData.imageUrl}
              labelScanId={noMatchData.labelScanId}
              patternSuggestion={scanAndProcessResult?.pattern_suggestion}
              activeContext={scanContext}
              onCreated={(result) => { setNoMatchData(null); setSavedArticle(result?.article || null); setStep('success'); toast.success('Skapad!'); }}
              onCancel={() => { setNoMatchData(null); toast.info('Sparades som manuell granskning'); setStep('mode'); }}
            />
          )}
        </AnimatePresence>

        {/* ── Link to Order Modal ── */}
        <AnimatePresence>
          {showLinkToOrder && pendingArticleForLink && (
            <LinkToOrderModal article={pendingArticleForLink} onLink={handleLinkToOrder} onSkip={handleSkipLink} />
          )}
        </AnimatePresence>

        {/* ── QuickScan match action dialog ── */}
        <AnimatePresence>
          {quickMatchResult && (
            <ScanQuickActionDialog
              batch={quickMatchResult.batch}
              article={quickMatchResult.article}
              labelScanId={quickMatchResult.labelScanId}
              actions={QUICK_ACTIONS}
              onSelectAction={(ctx) => {
                setQuickMatchResult(null);
                // Update LabelScan context
                if (quickMatchResult.labelScanId) {
                  base44.entities.LabelScan.update(quickMatchResult.labelScanId, { context: ctx }).catch(() => {});
                }
                // Navigate to mode directly
                const modeId = CTX_TO_MODE[ctx] || ctx;
                setMode(modeId);
                setScanContext(ctx);
                setStep('success');
                toast.success(`Åtgärd vald: ${ctx}`);
              }}
              onCancel={() => { setQuickMatchResult(null); setStep('success'); }}
            />
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}