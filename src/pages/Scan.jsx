import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { 
  Package, ClipboardList, ArrowLeft, Sparkles, 
  CheckCircle2, Camera, Download, AlertTriangle, Scan as ScanIcon, PackageSearch, Activity, Printer, X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import CameraCapture from "@/components/scanner/CameraCapture";
import ReviewForm from "@/components/scanner/ReviewForm";
import AutoAnalysisReview from "@/components/scanner/AutoAnalysisReview";
import QuickConfirmReview from "@/components/scanner/QuickConfirmReview";

import BarcodeScanner from "@/components/scanner/BarcodeScanner";
import UnknownDeliveryForm from "@/components/scanner/UnknownDeliveryForm";
import SiteDocumentationFlow from "@/components/scan/SiteDocumentationFlow";
import ImageZoomViewer from "@/components/scanner/ImageZoomViewer";
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
  },
  {
    id: "repair",
    title: "Reparation",
    description: "Skanna modul för reparation och skriv ut bekräftelse",
    icon: Activity,
    color: "from-red-500 to-red-600"
  },
  {
    id: "site_documentation",
    title: "Site-Dokumentation",
    description: "Dokumentera komponenter på plats",
    icon: Camera,
    color: "from-cyan-500 to-cyan-600"
  },
  {
    id: "unknown",
    title: "Okänd Leverans",
    description: "Registrera vara som kommit utan order",
    icon: PackageSearch,
    color: "from-amber-500 to-amber-600"
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
  const [imageCompareModal, setImageCompareModal] = useState(null);
  const [zoomViewerOpen, setZoomViewerOpen] = useState(null);
  const [repairArticle, setRepairArticle] = useState(null);
  const [repairQuantity, setRepairQuantity] = useState(1);
  const [repairNotes, setRepairNotes] = useState("");
  const [isGeneratingLabel, setIsGeneratingLabel] = useState(false);


  const levenshteinDistance = (str1, str2) => {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  };

  const calculateBatchMatch = (extracted, existing) => {
    const extractedStr = extracted.toString().toUpperCase().replace(/\s+/g, '');
    const existingStr = existing.toString().toUpperCase().replace(/\s+/g, '');
    
    // Exact match
    if (extractedStr === existingStr) return 100;
    
    // Substring match (one contains the other)
    if (extractedStr.includes(existingStr) || existingStr.includes(extractedStr)) {
      return 95;
    }
    
    // Levenshtein distance-based similarity
    const distance = levenshteinDistance(extractedStr, existingStr);
    const maxLen = Math.max(extractedStr.length, existingStr.length);
    const similarity = Math.round(((maxLen - distance) / maxLen) * 100);
    
    return similarity;
  };

  const handleModeSelect = (selectedMode) => {
    setMode(selectedMode);
    if (selectedMode === "barcode") {
      setStep("barcode");
    } else if (selectedMode === "site_documentation") {
      setStep("site_documentation");
    } else if (selectedMode === "unknown") {
      setStep("capture"); // Use same capture for unknown delivery
    } else if (selectedMode === "repair") {
      setStep("capture"); // Use capture for repair scanning
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
      setProgress(5);
      const urls = [];
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        const uploadProgress = 5 + ((i / fileArray.length) * 25);
        setProgress(uploadProgress);
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        urls.push(file_url);
      }
      setImageUrls(urls);
      setProgress(30);
      
      // First, do detailed image analysis for better accuracy
      setProgress(35);
      
      const detailedAnalysisPrompt = `ANALYSERA DENNA BILD MYCKET GRUNDLIGT OCH IDENTIFIERA ALLA TEXTER OCH OMRÅDEN:

Gå igenom bilden systematiskt och identifiera varje område med texter eller märkningar. 
För varje område, lista ALLA texter du kan se, exakt som de visas.

Organisera dina fynd i tydliga grupper baserat på FYSISK PLATS på bilden:
1. "Mitten av kortet" - all text i mitten
2. "Övre vänster hörn" - text här
3. "Övre höger hörn" - text här
4. "Nedre vänster hörn" - text här
5. "Nedre höger hörn" - text här
6. "Etiketter/Labels" - separata etiketter
7. "Andra märkningar" - strömkontakter, komponenter etc

För VARJE textsnutt, ange:
- Exakt text (kopiera ordet för ord)
- Vad det verkar vara (batch, SKU, tillverkare, datum, etc)
- Närliggande kontext

Returnera som strukturerad JSON med denna format:
{
  "analysisGroups": [
    {
      "location": "Område namn",
      "description": "Beskrivning av området",
      "values": [
        {"text": "EXAKT TEXT", "context": "Vad det är"},
        ...
      ]
    }
  ]
}`;

      try {
        const detailedAnalysis = await base44.integrations.Core.InvokeLLM({
          prompt: detailedAnalysisPrompt,
          file_urls: urls,
          response_json_schema: {
            type: "object",
            properties: {
              analysisGroups: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    location: { type: "string" },
                    description: { type: "string" },
                    values: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          text: { type: "string" },
                          context: { type: "string" }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });

        // Skip detailed analysis and go to auto-review instead
      } catch (analysisError) {
        console.log("Detailed analysis failed, continuing with auto extract:", analysisError);
      }
      
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
          prompt: `ANALYSERA DENNA BILD MYCKET NOGGRANT OCH EXTRAHERA ALLA NUMMER/KODER:

      Du MÅSTE läsa av ALLA siffror, bokstäver och nummer som syns på bilden, speciellt:
      - BATCHNUMMER (ofta i format som "123-456-789", "LOT123", "BATCH-001", etc)
      - ARTIKELNUMMER / SKU
      - SERIENUMMER
      - PRODUKTKODER

      VAR EXAKT: Skriv EXAKT vad du ser, ingen gissning eller normalisering.

      Identifiera även:
      - Artikelnamn/benämning
      - Tillverkare
      - Tillverkningsdatum
      - Pixel pitch (mm) - om det är en LED-modul
      - Kategori baserat på vad produkten är:
      * LED Module - om det är LED-panel, LED-modul, ljusmodul
      * Cabinet - om det är ett kabinett, hölje, låda
      * Controller - om det är en kontrollenhet, processor
      * Power Supply - om det är en strömförsörjning, transformator
      * Cable - om det är en kabel, kontakt
      * Accessory - övriga tillbehör
      * Other - om det inte passar någon av ovanstående

      För VARJE fält ge ett confidence-värde (0-1):
      - 1.0 = helt säker, kan läsa tydligt
      - 0.7-0.9 = säker, läsbara men lite suddig
      - 0.4-0.6 = osäker, svårläst
      - <0.4 = mycket osäker eller inte läsbar`,
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
      let uniqueMatches = [];
      
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
        
        setProgress(95);
        
        // Remove duplicates and sort by match score
        const seenIds = new Set();
        potentialMatches
          .sort((a, b) => b.matchScore - a.matchScore)
          .forEach(match => {
            if (!seenIds.has(match.article.id)) {
              seenIds.add(match.article.id);
              uniqueMatches.push(match);
            }
          });
        
        // If we found a match, verify batch number specifically
        if (uniqueMatches.length > 0) {
          const topMatch = uniqueMatches[0];
          
          // Calculate batch number match percentage using advanced algorithm
          let batchMatchPercentage = 0;
          if (data.batch_number && topMatch.article.batch_number) {
            batchMatchPercentage = calculateBatchMatch(data.batch_number, topMatch.article.batch_number);
          }

          console.log(`Match found. Batch similarity: ${batchMatchPercentage}%`);
          console.log(`Scanned: ${data.batch_number}, Existing: ${topMatch.article.batch_number}`);
          
          // Lowered threshold to 70% to catch more OCR variations
          // Also check if names are similar for additional confidence
          const hasBatchNumbers = !!(data.batch_number && topMatch.article.batch_number);
          let shouldShowMatch = false;
          
          if (hasBatchNumbers && batchMatchPercentage >= 70) {
            shouldShowMatch = true;
          } else if (hasBatchNumbers && batchMatchPercentage >= 60) {
            // For 60-69% similarity, also check if names match
            const namesMatch = data.name && topMatch.article.name &&
              (data.name.toLowerCase().includes(topMatch.article.name.toLowerCase()) ||
               topMatch.article.name.toLowerCase().includes(data.name.toLowerCase()));
            if (namesMatch) {
              shouldShowMatch = true;
              console.log('Name similarity boosted confidence');
            }
          }

          if (shouldShowMatch) {
            setPotentialMatches([{ 
              ...topMatch, 
              batchMatchPercentage 
            }]);
            setExistingArticle(topMatch.article);
            setExtractedData({ ...data, image_urls: urls });
            setConfidences(confs);
            setProgress(100);
            setShowMatchConfirm(true);
            return;
          }
        }
      } catch (searchError) {
        console.log("Could not search for existing articles:", searchError);
      }
      
      setExtractedData({ ...data, image_urls: urls });
      setConfidences(confs);
      setProgress(100);
      
      // For unknown delivery mode, skip review and go to unknown form
      if (mode === "unknown") {
        setStep("unknown_review");
      } else if (mode === "repair") {
        // For repair mode, automatically find matching article
        try {
          let matchedArticle = null;
          
          // Search by batch number first
          if (data.batch_number) {
            const byBatch = await base44.entities.Article.filter({ 
              batch_number: data.batch_number 
            });
            if (byBatch.length > 0) matchedArticle = byBatch[0];
          }
          
          // If not found, search by name
          if (!matchedArticle && data.name) {
            const allArticles = await base44.entities.Article.list();
            const byName = allArticles.filter(a => 
              a.name?.toLowerCase().includes(data.name.toLowerCase()) ||
              data.name.toLowerCase().includes(a.name?.toLowerCase())
            );
            if (byName.length > 0) matchedArticle = byName[0];
          }
          
          if (matchedArticle) {
            setRepairArticle(matchedArticle);
            setRepairQuantity(1);
            setStep("repair_match");
            toast.success(`Artikel hittad: ${matchedArticle.name}`);
          } else {
            setStep("repair_match");
            toast.info("Ingen matchande artikel hittades - välj manuellt");
          }
        } catch (error) {
          console.error("Error finding article for repair:", error);
          setStep("repair_match");
        }
      } else {
        // Check if we should skip to quick confirm
        const allFieldsHighConfidence = Object.keys(confs).every(field => {
          const conf = confs[field] || 0;
          return conf >= 0.9;
        });

        if (allFieldsHighConfidence && uniqueMatches.length > 0) {
          const topMatch = uniqueMatches[0];
          const batchMatchPercentage = data.batch_number && topMatch.article.batch_number
            ? calculateBatchMatch(data.batch_number, topMatch.article.batch_number)
            : 0;

          if (batchMatchPercentage >= 95) {
            setSelectedArticle(topMatch.article);
            setExtractedData({ ...data, image_urls: urls });
            setConfidences(confs);
            setProgress(100);
            setStep("quick_confirm");
            return;
          }
        }

        // Show auto review with extracted data
        setStep("auto_review");
      }

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

  const handleSaveUnknown = async (formData) => {
    setIsSaving(true);

    try {
      // Create article with unknown_delivery status
      const article = await base44.entities.Article.create({
        ...formData,
        stock_qty: parseInt(formData.stock_qty) || 0
      });

      // Create stock movement record
      await base44.entities.StockMovement.create({
        article_id: article.id,
        movement_type: "inbound",
        quantity: parseInt(formData.stock_qty) || 0,
        previous_qty: 0,
        new_qty: article.stock_qty,
        reason: "Okänd inleverans registrerad"
      });

      setSavedArticle(article);
      setStep("success");
      toast.success("Okänd leverans registrerad!");
    } catch (error) {
      console.error("Error saving unknown delivery:", error);
      toast.error("Kunde inte registrera leveransen");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRepairSubmit = async () => {
    if (!repairArticle || repairQuantity <= 0) {
      toast.error("Välj artikel och ange antal");
      return;
    }

    setIsSaving(true);

    try {
      // Update article status to on_repair and reduce stock
      const newStockQty = (repairArticle.stock_qty || 0) - repairQuantity;
      await base44.entities.Article.update(repairArticle.id, {
        status: "on_repair",
        stock_qty: newStockQty,
        repair_notes: repairNotes || "Registrerad via scanning",
        repair_date: new Date().toISOString()
      });

      // Create stock movement
      await base44.entities.StockMovement.create({
        article_id: repairArticle.id,
        movement_type: "adjustment",
        quantity: -repairQuantity,
        previous_qty: repairArticle.stock_qty || 0,
        new_qty: newStockQty,
        reason: `Skickad på reparation: ${repairNotes || "Via scanning"}`
      });

      // Create repair log
      await base44.entities.RepairLog.create({
        article_id: repairArticle.id,
        article_name: repairArticle.name,
        article_batch_number: repairArticle.batch_number,
        repair_date_start: new Date().toISOString(),
        notes: repairNotes || "Registrerad via scanning",
        status: "in_progress"
      });

      setStep("repair_label");
      toast.success("Reparation registrerad!");
    } catch (error) {
      console.error("Error registering repair:", error);
      toast.error("Kunde inte registrera reparation");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrintRepairLabel = async () => {
    setIsGeneratingLabel(true);
    try {
      const response = await base44.functions.invoke('generateA4Label', {
        article: repairArticle,
        quantity: repairQuantity,
        labelType: 'repair',
        repairNotes: repairNotes
      });

      // Create blob and download
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
      console.error("Error generating label:", error);
      toast.error("Kunde inte generera etikett");
    } finally {
      setIsGeneratingLabel(false);
    }
  };

  const handleSave = async (dataToSave = null) => {
    setIsSaving(true);

    // Use provided data or fall back to extractedData
    const finalData = dataToSave || extractedData;

    // Validate required fields
    if (!finalData.name || finalData.name.trim() === '') {
      toast.error("Artikelnamn måste fyllas i");
      setIsSaving(false);
      setStep("review");
      return;
    }

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
        ...finalData,
        shelf_address: finalData.shelf_address 
          ? (Array.isArray(finalData.shelf_address) 
            ? finalData.shelf_address 
            : [finalData.shelf_address])
          : [],
        storage_type: finalData.storage_type || 'company_owned',
        manufacturing_date: finalData.manufacturing_date && finalData.manufacturing_date !== '-' 
          ? finalData.manufacturing_date 
          : undefined
      };

      if (existing.length > 0) {
        // Update existing article
        article = existing[0];
        previousQty = article.stock_qty || 0;
        
        const updateData = { ...preparedData };
        if (mode === "inbound") {
          updateData.stock_qty = previousQty + (parseInt(finalData.stock_qty) || 0);
        }
        
        await base44.entities.Article.update(article.id, updateData);
        article = { ...article, ...updateData };
        
      } else {
        // Create new article
        article = await base44.entities.Article.create({
          ...preparedData,
          stock_qty: parseInt(finalData.stock_qty) || 0,
          status: "active",
          ai_extracted_data: extractedData,
          ai_confidence_scores: confidences
        });
      }

      // Create stock movement record
      await base44.entities.StockMovement.create({
        article_id: article.id,
        movement_type: mode,
        quantity: parseInt(finalData.stock_qty) || 0,
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
    setRepairArticle(null);
    setRepairQuantity(1);
    setRepairNotes("");
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

          <Button 
            variant="ghost" 
            className="text-slate-400 hover:text-white"
            onClick={() => window.location.href = createPageUrl("Inventory")}
          >
            <Package className="w-4 h-4 mr-2" />
            Lager
          </Button>
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
                  {mode === "inbound" ? "Inleverans" : 
                   mode === "repair" ? "Reparation" : 
                   mode === "unknown" ? "Okänd leverans" : 
                   "Inventering"}
                </h2>
                <p className="text-slate-400">
                  {mode === "repair" 
                    ? "Ta foto av modulen som ska på reparation" 
                    : "Ta foto av etikett, följesedel eller produktmärkning"}
                </p>
              </div>

              <CameraCapture 
                onImageCaptured={handleImageCaptured}
                isProcessing={isProcessing}
                progress={progress}
              />

              <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                <Sparkles className="w-4 h-4" />
                <span>{mode === "repair" 
                  ? "AI hittar modulen i lagret och förbereder reparation" 
                  : "AI analyserar bilden och fyller i fälten automatiskt"}</span>
              </div>

              {mode !== "repair" && (
                <div className="text-center pt-2">
                  <button
                    onClick={() => {
                      setExtractedData({ stock_qty: 1 });
                      setConfidences({});
                      setStep("review");
                    }}
                    className="text-sm text-slate-500 hover:text-slate-300 underline underline-offset-2 transition-colors"
                  >
                    Registrera manuellt utan AI
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* Step: Quick Confirm */}
           {step === "quick_confirm" && (
             <motion.div
               key="quick_confirm"
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: -20 }}
               className="space-y-6"
             >
               <QuickConfirmReview
                 article={selectedArticle}
                 mode={mode}
                 onConfirm={async (quantity) => {
                   setIsSaving(true);
                   try {
                     let article = selectedArticle;
                     let previousQty = article.stock_qty || 0;

                     if (mode === "inbound") {
                       await base44.entities.Article.update(article.id, {
                         stock_qty: previousQty + quantity
                       });
                       article.stock_qty = previousQty + quantity;
                     } else if (mode === "inventory") {
                       const newQty = previousQty + quantity;
                       await base44.entities.Article.update(article.id, {
                         stock_qty: newQty
                       });
                       article.stock_qty = newQty;
                     }

                     await base44.entities.StockMovement.create({
                       article_id: article.id,
                       movement_type: mode,
                       quantity: quantity,
                       previous_qty: previousQty,
                       new_qty: article.stock_qty,
                       reason: mode === "inbound" 
                         ? "Inleverans via snabb-scanning" 
                         : "Inventering via snabb-scanning"
                     });

                     setSavedArticle(article);
                     setStep("success");
                     toast.success("Artikel sparad!");
                   } catch (error) {
                     console.error("Error saving:", error);
                     toast.error("Kunde inte spara. Försök igen.");
                   } finally {
                     setIsSaving(false);
                   }
                 }}
                 onCancel={() => setStep("auto_review")}
                 isLoading={isSaving}
               />
             </motion.div>
           )}



          {/* Step: Auto Review */}
           {step === "auto_review" && (
             <motion.div
               key="auto_review"
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: -20 }}
               className="space-y-6"
             >
               <AutoAnalysisReview
                 imageUrl={imageUrls[0]}
                 extractedData={extractedData}
                 confidences={confidences}
                 onAccept={() => handleSave()}
                 onReject={() => {
                   setStep("capture");
                   setImageFiles([]);
                   setImageUrls([]);
                   setExtractedData({});
                   setConfidences({});
                   setProgress(0);
                 }}
                 onEdit={handleFieldChange}
                 onManualReview={() => setStep("review")}
                 isLoading={isSaving}
               />
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
                      <div key={index} className="rounded-lg overflow-hidden bg-slate-800 relative group cursor-pointer">
                        <img 
                          src={url} 
                          alt={`Bild ${index + 1}`} 
                          className="w-full h-24 object-contain"
                          onClick={() => setZoomViewerOpen(url)}
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                          <Button
                            size="icon"
                            variant="secondary"
                            className="h-8 w-8 bg-slate-900/80 hover:bg-slate-800"
                            onClick={(e) => {
                              e.stopPropagation();
                              setZoomViewerOpen(url);
                            }}
                            title="Zooma och läs etikett"
                          >
                            <Download className="w-3 h-3" />
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
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4"
                  onClick={handleCancelDuplicate}
                >
                  <motion.div
                    initial={{ y: "100%", opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: "100%", opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-slate-900 border border-amber-500/30 rounded-t-3xl md:rounded-2xl p-6 max-w-md w-full md:max-h-[90vh] overflow-y-auto"
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

          {/* Step: Site Documentation */}
          {step === "site_documentation" && (
            <motion.div
              key="site_documentation"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <SiteDocumentationFlow onComplete={handleReset} onCancel={handleReset} />
            </motion.div>
          )}

          {/* Step: Repair Match */}
          {step === "repair_match" && (
            <motion.div
              key="repair_match"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-white mb-2">
                  Registrera reparation
                </h2>
                <p className="text-slate-400">
                  Bekräfta artikel och antal för reparation
                </p>
              </div>

              {imageUrls.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm text-slate-400 mb-2">Skannad bild</p>
                  <img 
                    src={imageUrls[0]} 
                    alt="Skannad modul"
                    className="w-full h-48 object-contain rounded-xl bg-slate-900 border border-slate-700"
                  />
                </div>
              )}

              {/* Show extracted data to help find article */}
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-2 text-sm">
                    <p className="text-blue-300 font-semibold">AI hittade följande information:</p>
                    {extractedData.batch_number && (
                      <p className="text-white">Batch: <span className="font-mono">{extractedData.batch_number}</span></p>
                    )}
                    {extractedData.name && (
                      <p className="text-white">Namn: {extractedData.name}</p>
                    )}
                    {extractedData.manufacturer && (
                      <p className="text-white">Tillverkare: {extractedData.manufacturer}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Article found automatically or search manually */}
              {!repairArticle ? (
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-white">Artikel hittades inte automatiskt</Label>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      try {
                        // Search for articles matching the extracted data
                        let articles = [];
                        if (extractedData.batch_number) {
                          articles = await base44.entities.Article.filter({ 
                            batch_number: extractedData.batch_number 
                          });
                        }

                        if (articles.length === 0 && extractedData.name) {
                          const allArticles = await base44.entities.Article.list();
                          articles = allArticles.filter(a => 
                            a.name?.toLowerCase().includes(extractedData.name.toLowerCase())
                          );
                        }

                        if (articles.length > 0) {
                          setRepairArticle(articles[0]);
                          toast.success(`Artikel hittad: ${articles[0].name}`);
                        } else {
                          toast.error("Ingen matchande artikel hittades i lagret");
                        }
                      } catch (error) {
                        console.error("Error searching article:", error);
                        toast.error("Kunde inte söka i lagret");
                      }
                    }}
                    className="w-full bg-white/5 border-white/10 hover:bg-white/10 text-white"
                  >
                    <Package className="w-4 h-4 mr-2" />
                    Sök manuellt i lager
                  </Button>
                </div>
              ) : null}

              {repairArticle && (
                  <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
                    <div className="flex items-start gap-3 mb-4">
                      {repairArticle.image_urls?.[0] && (
                        <img 
                          src={repairArticle.image_urls[0]} 
                          alt={repairArticle.name}
                          className="w-16 h-16 rounded-lg object-cover bg-slate-900"
                        />
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-white mb-1">{repairArticle.name}</p>
                        <div className="space-y-1 text-xs text-slate-400">
                          <div>Batch: <span className="text-white font-mono">{repairArticle.batch_number}</span></div>
                          <div>I lager: <span className="text-white font-semibold">{repairArticle.stock_qty || 0} st</span></div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm text-slate-300 mb-2 block">Antal för reparation</Label>
                        <Input
                          type="number"
                          min="1"
                          max={repairArticle.stock_qty || 1}
                          value={repairQuantity}
                          onChange={(e) => setRepairQuantity(parseInt(e.target.value) || 1)}
                          className="bg-white/5 border-white/10 text-white"
                        />
                      </div>

                      <div>
                        <Label className="text-sm text-slate-300 mb-2 block">Anledning (frivilligt)</Label>
                        <Textarea
                          value={repairNotes}
                          onChange={(e) => setRepairNotes(e.target.value)}
                          placeholder="T.ex. Defekt LED, Skadad panel..."
                          className="bg-white/5 border-white/10 text-white placeholder:text-white/40 min-h-[80px]"
                        />
                      </div>
                    </div>
                  </div>
                )}

              <div className="flex gap-3 pt-6">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  disabled={isSaving}
                  className="flex-1 bg-white/5 border-white/10 hover:bg-white/10 text-white"
                >
                  <X className="w-4 h-4 mr-2" />
                  Avbryt
                </Button>
                <Button
                  onClick={handleRepairSubmit}
                  disabled={isSaving || !repairArticle || repairQuantity <= 0}
                  className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white"
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Registrerar...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Registrera reparation
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step: Repair Label */}
          {step === "repair_label" && (
            <motion.div
              key="repair_label"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                  <Activity className="w-8 h-8 text-red-400" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">
                  Reparation registrerad
                </h2>
                <p className="text-slate-400">
                  Skriv ut bekräftelseetikett att sätta på modulen
                </p>
              </div>

              {repairArticle && (
                <div className="p-6 rounded-2xl bg-slate-800/50 border border-slate-700">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                      <Activity className="w-6 h-6 text-red-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-white">{repairArticle.name}</p>
                      <p className="text-sm text-slate-400">Batch: {repairArticle.batch_number}</p>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Antal:</span>
                      <span className="text-white font-semibold">{repairQuantity} st</span>
                    </div>
                    {repairNotes && (
                      <div className="pt-2 border-t border-slate-700">
                        <span className="text-slate-400 block mb-1">Anledning:</span>
                        <span className="text-white">{repairNotes}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3">
                <Button
                  onClick={handlePrintRepairLabel}
                  disabled={isGeneratingLabel}
                  className="w-full bg-red-600 hover:bg-red-500 text-white h-12"
                >
                  {isGeneratingLabel ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Genererar...
                    </>
                  ) : (
                    <>
                      <Printer className="w-4 h-4 mr-2" />
                      Skriv ut bekräftelse
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="w-full bg-white/5 border-white/10 hover:bg-white/10 text-white"
                >
                  Hoppa över & stäng
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step: Unknown Delivery Review */}
          {step === "unknown_review" && (
            <motion.div
              key="unknown_review"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-white mb-2">
                  Registrera okänd leverans
                </h2>
                <p className="text-slate-400">
                  Fyll i vad du vet om leveransen
                </p>
              </div>

              {imageUrls.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm text-slate-400 mb-2">{imageUrls.length} bild{imageUrls.length > 1 ? 'er' : ''} uppladdad{imageUrls.length > 1 ? 'e' : ''}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {imageUrls.map((url, index) => (
                      <img 
                        key={index}
                        src={url} 
                        alt={`Bild ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg bg-slate-900"
                      />
                    ))}
                  </div>
                </div>
              )}

              <UnknownDeliveryForm
                imageUrls={imageUrls}
                onSave={handleSaveUnknown}
                onCancel={handleReset}
                isSaving={isSaving}
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
                  <Button
                    variant="outline"
                    className="w-full mt-4 bg-slate-700 border-slate-600 hover:bg-slate-600 text-white"
                    onClick={() => window.location.href = `${createPageUrl("Inventory")}?articleId=${selectedArticle.id}`}
                  >
                    Visa detaljer
                  </Button>
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
                <Button
                  variant="outline"
                  className="w-full sm:w-auto bg-slate-800 border-slate-600 hover:bg-slate-700 text-white"
                  onClick={() => window.location.href = createPageUrl("Inventory")}
                >
                  <Package className="w-4 h-4 mr-2" />
                  Visa lager
                </Button>
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
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4"
              onClick={() => setShowMatchConfirm(false)}
            >
              <motion.div
                initial={{ y: "100%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "100%", opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-slate-900 border border-blue-500/30 rounded-t-3xl md:rounded-2xl p-6 max-w-md w-full md:max-h-[90vh] overflow-y-auto"
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

                <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 mb-4 space-y-3">
                  <div className="flex gap-3">
                    {existingArticle.image_urls?.[0] && (
                      <button
                        onClick={() => setImageCompareModal({
                          scannedImage: imageUrls[0],
                          existingImage: existingArticle.image_urls[0],
                          existingName: existingArticle.name
                        })}
                        className="relative group cursor-pointer"
                      >
                        <img 
                          src={existingArticle.image_urls[0]} 
                          alt={existingArticle.name}
                          className="w-20 h-20 rounded-lg object-cover bg-slate-900 group-hover:opacity-75 transition-opacity"
                        />
                        <div className="absolute inset-0 rounded-lg bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Package className="w-4 h-4 text-white" />
                        </div>
                      </button>
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

                  {potentialMatches[0]?.batchMatchPercentage !== undefined && (
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-amber-300">Batch-nummer match</span>
                        <span className="text-sm font-bold text-amber-400">{potentialMatches[0].batchMatchPercentage}%</span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-1.5">
                        <div 
                          className={`h-1.5 rounded-full transition-all ${
                            potentialMatches[0].batchMatchPercentage >= 90 ? 'bg-emerald-500' :
                            potentialMatches[0].batchMatchPercentage >= 80 ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${potentialMatches[0].batchMatchPercentage}%` }}
                        />
                      </div>
                      <div className="mt-2 text-xs text-amber-200 space-y-1">
                        <div>Skannad: <span className="font-mono">{extractedData.batch_number || 'N/A'}</span></div>
                        <div>Befintlig: <span className="font-mono">{existingArticle.batch_number || 'N/A'}</span></div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm border-t border-slate-700 pt-3">
                    <span className="text-slate-400">Lagersaldo:</span>
                    <span className="text-white font-semibold">{existingArticle.stock_qty || 0} st</span>
                  </div>
                  {existingArticle.shelf_address && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Hyllplats:</span>
                      <span className="text-white">{existingArticle.shelf_address}</span>
                    </div>
                  )}
                </div>

                <p className="text-sm text-slate-400 mb-6">
                  Är det denna artikel du skannade?
                </p>

                <div className="flex flex-col-reverse md:flex-row gap-3">
                   <Button
                     onClick={() => {
                       setShowMatchConfirm(false);
                       setMode(null);
                       setStep("mode");
                       handleReset();
                     }}
                     variant="outline"
                     className="flex-1 bg-slate-800 border-slate-600 hover:bg-slate-700 text-white"
                   >
                     ✕ Avbryt
                   </Button>
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

        {/* Image Zoom Viewer */}
        <AnimatePresence>
          {zoomViewerOpen && (
            <ImageZoomViewer
              imageUrl={zoomViewerOpen}
              onClose={() => setZoomViewerOpen(null)}
              onAnalyzeZoomArea={async (croppedImage) => {
                // Upload cropped image and analyze
                try {
                  const { file_url } = await base44.integrations.Core.UploadFile({ file: new File([croppedImage], 'crop.png', { type: 'image/png' }) });
                  
                  // Analyze the cropped area
                  const schema = {
                    type: "object",
                    properties: {
                      batch_number: { type: "string" },
                      batch_number_confidence: { type: "number" },
                      sku: { type: "string" },
                      sku_confidence: { type: "number" },
                      serial_number: { type: "string" },
                      serial_number_confidence: { type: "number" }
                    }
                  };

                  const result = await base44.integrations.Core.InvokeLLM({
                    prompt: `ANALYSERA DENNA FÖRSTORAD ETIKETT MYCKET NOGGRANT:

Du MÅSTE läsa och extrahera ALLA siffror, bokstäver och nummer som syns:
- BATCHNUMMER (oft i format "123-456", "LOT123", "BATCH-001")
- ARTIKELNUMMER / SKU
- SERIENUMMER
- PRODUKTKODER

VAR EXAKT: Skriv EXAKT vad du ser, ingen normalisering.

För varje fält ge confidence (0-1):
- 1.0 = helt säker
- 0.7-0.9 = säker men lite suddig
- 0.4-0.6 = osäker
- <0.4 = mycket osäker/oläsbar`,
                    file_urls: [file_url],
                    response_json_schema: schema
                  });

                  // Auto-fill the fields
                  if (result.batch_number) {
                    handleFieldChange('batch_number', result.batch_number);
                  }
                  if (result.sku) {
                    handleFieldChange('sku', result.sku);
                  }

                  toast.success('Etiketten analyserad och fält uppdaterade!');
                  setZoomViewerOpen(null);
                } catch (error) {
                  console.error('Error analyzing zoomed area:', error);
                  toast.error('Kunde inte analysera området');
                }
              }}
            />
          )}
        </AnimatePresence>

        {/* Image Comparison Modal */}
        <AnimatePresence>
          {imageCompareModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setImageCompareModal(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-auto"
              >
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-white mb-2">
                    Jämför bilder
                  </h3>
                  <p className="text-sm text-slate-400">
                    {imageCompareModal.existingName}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Ny skannad bild</p>
                    <img 
                      src={imageCompareModal.scannedImage}
                      alt="Scanned"
                      className="w-full rounded-lg border border-slate-700 object-contain max-h-96 bg-slate-800"
                    />
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Befintlig artikel</p>
                    <img 
                      src={imageCompareModal.existingImage}
                      alt="Existing"
                      className="w-full rounded-lg border border-slate-700 object-contain max-h-96 bg-slate-800"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={() => setImageCompareModal(null)}
                    variant="outline"
                    className="flex-1 bg-slate-800 border-slate-600 hover:bg-slate-700"
                  >
                    Stäng
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