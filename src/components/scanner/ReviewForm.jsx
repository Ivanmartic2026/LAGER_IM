import React, { useState } from 'react';
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Check, X, AlertTriangle, Package, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import ExtractedFieldCard from './ExtractedFieldCard';
import ConfidenceIndicator from './ConfidenceIndicator';
import DuplicateWarning from './DuplicateWarning';

const CATEGORY_OPTIONS = [
  { value: "Cabinet", label: "Kabinett" },
  { value: "LED Module", label: "LED-modul" },
  { value: "Power Supply", label: "Strömförsörjning" },
  { value: "Receiving Card", label: "Receiving card" },
  { value: "Control Processor", label: "Control Processor" },
  { value: "Computer", label: "Dator" },
  { value: "Cable", label: "Kabel" },
  { value: "Accessory", label: "Tillbehör" },
  { value: "Other", label: "Övrigt" }
];

const STORAGE_TYPE_OPTIONS = [
  { value: "company_owned", label: "Företagsägt lager" },
  { value: "customer_owned", label: "Kundägt lager" },
  { value: "rental_stock", label: "Hyrlager" }
];

const FIELD_LABELS = {
  batch_number: "Batchnummer",
  name: "Artikelnamn",
  supplier_name: "Leverantör",
  manufacturer: "Tillverkare",
  manufacturing_date: "Tillverkningsdatum",
  category: "Kategori",
  pixel_pitch_mm: "Pixel Pitch (mm)",
  shelf_address: "Hyllplats",
  stock_qty: "Antal",
  dimensions_width_mm: "Bredd (mm)",
  dimensions_height_mm: "Höjd (mm)",
  dimensions_depth_mm: "Djup (mm)",
  weight_kg: "Vikt (kg)",
  warehouse: "Lagerställe",
  storage_type: "Lagertyp",
  sku: "SKU/Artikelnummer",
  supplier_product_code: "Leverantörskod",
  notes: "Anteckningar"
};

export default function ReviewForm({ 
  extractedData, 
  confidences = {},
  onFieldChange,
  onSave,
  onCancel,
  isSaving,
  mode = "inbound",
  isAnalyzing = false,
  isManual = false
}) {
  const [duplicateArticles, setDuplicateArticles] = useState([]);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [selectedFields, setSelectedFields] = useState(() => {
    // Auto-select fields that have values
    const initial = {};
    Object.keys(extractedData).forEach(key => {
      if (extractedData[key] && key !== 'image_urls') {
        initial[key] = true;
      }
    });
    // Always select required fields
    initial.batch_number = true;
    initial.name = true;
    initial.stock_qty = true;
    initial.storage_type = true;
    return initial;
  });

  // For manual mode: ensure all fields are shown with empty values
  const allFields = isManual
    ? Object.keys(FIELD_LABELS)
    : Object.keys(extractedData).filter(key => key !== 'image_urls');

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => base44.entities.Warehouse.list(),
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list(),
  });

  const { data: allArticles = [] } = useQuery({
    queryKey: ['articles'],
    queryFn: () => base44.entities.Article.list(),
  });

  // Check for duplicates when batch number changes
  React.useEffect(() => {
    if (extractedData.batch_number && extractedData.batch_number.trim()) {
      const duplicates = allArticles.filter(
        article => article.batch_number === extractedData.batch_number.trim()
      );
      setDuplicateArticles(duplicates);
    } else {
      setDuplicateArticles([]);
    }
  }, [extractedData.batch_number, allArticles]);

  // Get all extracted fields (excluding image_urls)
  // Always include required fields even if AI found nothing
  const REQUIRED_FIELDS = ['batch_number', 'name', 'storage_type', 'stock_qty'];
  const aiFoundFields = Object.keys(extractedData).filter(key => key !== 'image_urls' && extractedData[key]);
  const allExtractedFields = isManual
    ? Object.keys(FIELD_LABELS)
    : [...new Set([
        ...REQUIRED_FIELDS,
        ...Object.keys(extractedData).filter(key => key !== 'image_urls')
      ])];
  
  const toggleField = (field) => {
    // Can't deselect required fields
    if (field === 'batch_number' || field === 'storage_type') {
      return;
    }
    setSelectedFields(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleSaveClick = () => {
    // Check for duplicates before saving
    if (duplicateArticles.length > 0 && !showDuplicateWarning) {
      setShowDuplicateWarning(true);
      return;
    }

    // Filter extractedData to only include selected fields
    const filteredData = {};
    Object.keys(extractedData).forEach(key => {
      if (selectedFields[key] || key === 'image_urls') {
        filteredData[key] = extractedData[key];
      }
    });
    onSave(filteredData);
  };

  const handleUpdateExisting = () => {
    // Update the first duplicate found (or let user choose if multiple)
    const existingArticle = duplicateArticles[0];
    const newQuantity = (existingArticle.stock_qty || 0) + (extractedData.stock_qty || 0);
    
    onSave({
      ...extractedData,
      id: existingArticle.id,
      stock_qty: newQuantity,
      _isUpdate: true
    });
  };

  const handleCreateNew = () => {
    // Proceed with creation despite duplicates
    const filteredData = {};
    Object.keys(extractedData).forEach(key => {
      if (selectedFields[key] || key === 'image_urls') {
        filteredData[key] = extractedData[key];
      }
    });
    onSave(filteredData);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Duplicate Warning */}
      {showDuplicateWarning && duplicateArticles.length > 0 && (
        <DuplicateWarning
          existingArticles={duplicateArticles}
          onUpdate={handleUpdateExisting}
          onCreateNew={handleCreateNew}
          onCancel={() => setShowDuplicateWarning(false)}
        />
      )}

      {/* AI Extraction Summary or Loading State */}
      {!isManual && (
       <div className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
         isAnalyzing 
           ? 'bg-cyan-500/10 border-cyan-500/30' 
           : 'bg-blue-500/10 border-blue-500/30'
       }`}>
         <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
           isAnalyzing ? 'bg-cyan-500/20' : 'bg-blue-500/20'
         }`}>
           <Sparkles className={`w-5 h-5 ${isAnalyzing ? 'text-cyan-400 animate-spin' : 'text-blue-400'}`} />
         </div>
         <div>
           {isAnalyzing ? (
             <>
               <p className="text-sm font-semibold text-cyan-300">
                 Analyserar bilderna...
               </p>
               <p className="text-xs text-cyan-200/70">
                 Du kan redan börja redigera medan vi slutför analysen
               </p>
             </>
           ) : (
             <>
               <p className="text-sm font-semibold text-blue-300">
                  AI hittade {aiFoundFields.length} fält
                </p>
               <p className="text-xs text-blue-200/70">
                 Välj vilka fält som ska sparas för denna artikel
               </p>
             </>
           )}
         </div>
       </div>
      )}

      {/* Fields List */}
      {!isAnalyzing && (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-white/70">{isManual ? 'Fyll i artikeluppgifter:' : 'Extraherade fält från bild:'}</h3>
        {allExtractedFields.map(field => {
          const value = extractedData[field];
          const confidence = confidences[field] || 0;
          const isRequired = field === 'batch_number' || field === 'storage_type';
          const label = FIELD_LABELS[field] || field;
          
          return (
            <div
              key={field}
              onClick={(e) => {
                // Only toggle if clicking the card itself, not the input inside
                if (!isManual && e.target === e.currentTarget) toggleField(field);
              }}
              className={`p-4 rounded-xl border-2 transition-all ${
                isManual
                  ? 'bg-white/5 border-white/10'
                  : selectedFields[field]
                    ? `bg-blue-500/10 border-blue-500/40 hover:bg-blue-500/15 cursor-pointer`
                    : `bg-white/5 border-white/10 hover:bg-white/10 cursor-pointer ${isRequired ? 'cursor-not-allowed' : ''}`
              }`}
            >
              <div className="flex items-start gap-3">
                {!isManual && (
                  <div className="pt-1">
                    <Checkbox
                      checked={selectedFields[field] || false}
                      disabled={isRequired}
                      className="pointer-events-none"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-white">
                      {label}
                      {isRequired && <span className="text-red-400 ml-1">*</span>}
                    </span>
                    {!isManual && <ConfidenceIndicator confidence={confidence} />}
                  </div>
                  
                  {(isManual || selectedFields[field]) ? (
                    <ExtractedFieldCard
                      field={field}
                      label=""
                      value={value}
                      confidence={isManual ? 1 : confidence}
                      onChange={onFieldChange}
                      required={isRequired}
                      type={
                        field === 'manufacturing_date' ? 'date' :
                        field === 'category' ? 'select' :
                        field === 'storage_type' ? 'select' :
                        field === 'warehouse' ? 'select' :
                        field === 'supplier_name' ? 'select' :
                        field.includes('_mm') || field.includes('_kg') || field === 'stock_qty' || field === 'pixel_pitch_mm' ? 'number' :
                        field === 'notes' ? 'textarea' :
                        'text'
                      }
                      options={
                        field === 'category' ? CATEGORY_OPTIONS :
                        field === 'storage_type' ? STORAGE_TYPE_OPTIONS :
                        field === 'warehouse' ? warehouses.map(w => ({ value: w.name, label: w.name })) :
                        field === 'supplier_name' ? suppliers.map(s => ({ value: s.name, label: s.name })) :
                        undefined
                      }
                      placeholder={
                        field === 'batch_number' ? 'T.ex. P2.5250721228' :
                        field === 'name' ? 'T.ex. P2.5 Gob' :
                        field === 'manufacturer' ? 'T.ex. Nick Everlasting' :
                        ''
                      }
                    />
                  ) : (
                    <div className="text-sm text-white/50 font-mono">
                      {value ? String(value) : '—'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        </div>
        )}

      {/* Required Fields Warning */}
      {!extractedData.batch_number && (
        <div className="p-4 rounded-xl bg-red-500/10 border-2 border-red-500/40">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-300 mb-1">
                Obligatoriska fält saknas
              </p>
              <p className="text-xs text-red-200/70">
                Fyll i Batchnummer före sparning.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Selected Fields Summary */}
      {!isManual && (
        <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
          <p className="text-sm text-slate-300">
            <span className="font-semibold text-white">{Object.values(selectedFields).filter(Boolean).length}</span> fält valda för sparning
          </p>
        </div>
      )}

      <div className="flex gap-3 pt-6">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isSaving}
          className="flex-1 bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-white transition-all h-12"
        >
          <X className="w-4 h-4 mr-2" />
          Avbryt
        </Button>
        <Button
          onClick={handleSaveClick}
          disabled={isSaving || !extractedData.batch_number}
          className={`flex-1 text-white shadow-lg transition-all h-12 ${
            isSaving 
              ? 'bg-slate-600/60 shadow-slate-500/50'
              : 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/50 hover:shadow-blue-500/70 disabled:opacity-50 disabled:cursor-not-allowed'
          }`}
        >
          {isSaving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Sparar...
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              Spara {Object.values(selectedFields).filter(Boolean).length} fält
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}