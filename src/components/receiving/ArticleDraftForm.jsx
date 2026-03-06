import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check, Copy, Lightbulb, ImagePlus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { base44 } from "@/api/base44Client";

export default function ArticleDraftForm({ extracted, onFieldChange, onSave, isSaving }) {
  const [expandedField, setExpandedField] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    batch_number: '',
    sku: '',
    supplier_name: '',
    unit: 'st',
    stock_qty: 1,
    manufacturing_date: '',
    notes: ''
  });
  const [images, setImages] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const imageInputRef = useRef(null);

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    onFieldChange(field, value);
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploadingImages(true);
    try {
      const uploadedUrls = await Promise.all(
        files.map(async (file) => {
          const { file_url } = await base44.integrations.Core.UploadFile({ file });
          return file_url;
        })
      );
      const newImages = [...images, ...uploadedUrls];
      setImages(newImages);
      onFieldChange('image_urls', newImages);
    } finally {
      setUploadingImages(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const removeImage = (index) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
    onFieldChange('image_urls', newImages);
  };

  const applySuggestion = (field, value) => {
    handleFieldChange(field, value);
  };

  const getSuggestions = (field) => {
    if (!extracted) return [];
    
    const fieldMap = {
      name: extracted.product_names || [],
      batch_number: extracted.batch_numbers || [],
      sku: extracted.article_numbers || [],
      supplier_name: extracted.suppliers || [],
      unit: extracted.units || [],
      stock_qty: extracted.quantities || []
    };

    return fieldMap[field] || [];
  };

  const renderExtractedSection = () => {
    if (!extracted || !extracted.raw_text) return null;

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/50"
      >
        <button
          onClick={() => setExpandedField(expandedField === 'raw' ? null : 'raw')}
          className="w-full flex items-center justify-between text-left mb-3"
        >
          <h4 className="font-semibold text-white flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-yellow-400" />
            Allt som upptäcktes
          </h4>
          <ChevronDown className={cn("w-4 h-4 transition-transform", expandedField === 'raw' && "rotate-180")} />
        </button>

        <AnimatePresence>
          {expandedField === 'raw' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3"
            >
              {/* Raw Text */}
              {extracted.raw_text && (
                <div className="p-3 rounded-lg bg-slate-900/50">
                  <p className="text-xs text-slate-400 mb-2">Rå text från dokument:</p>
                  <p className="text-sm text-slate-300 whitespace-pre-wrap max-h-32 overflow-y-auto">
                    {extracted.raw_text}
                  </p>
                </div>
              )}

              {/* Structured Fields */}
              <div className="space-y-2">
                {extracted.article_numbers && extracted.article_numbers.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-400 mb-1">Artikelnummer:</p>
                    <div className="flex flex-wrap gap-1">
                      {extracted.article_numbers.map((item, idx) => (
                        <Badge
                          key={idx}
                          variant="outline"
                          className="bg-blue-500/10 text-blue-300 border-blue-500/30 cursor-pointer hover:bg-blue-500/20"
                          onClick={() => applySuggestion('sku', item.value)}
                        >
                          {item.value} <span className="text-xs ml-1">({Math.round(item.confidence * 100)}%)</span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {extracted.ean_gtin && extracted.ean_gtin.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-400 mb-1">Streckkoder (EAN/GTIN/SSCC):</p>
                    <div className="flex flex-wrap gap-1">
                      {extracted.ean_gtin.map((item, idx) => (
                        <Badge
                          key={idx}
                          variant="outline"
                          className="bg-purple-500/10 text-purple-300 border-purple-500/30"
                        >
                          {item.type}: {item.value} <span className="text-xs ml-1">({Math.round(item.confidence * 100)}%)</span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {extracted.serial_numbers && extracted.serial_numbers.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-400 mb-1">Serienummer:</p>
                    <div className="flex flex-wrap gap-1">
                      {extracted.serial_numbers.map((item, idx) => (
                        <Badge key={idx} variant="outline" className="bg-amber-500/10 text-amber-300 border-amber-500/30">
                          {item.value} <span className="text-xs ml-1">({Math.round(item.confidence * 100)}%)</span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {extracted.dates && extracted.dates.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-400 mb-1">Datum:</p>
                    <div className="flex flex-wrap gap-1">
                      {extracted.dates.map((item, idx) => (
                        <Badge key={idx} variant="outline" className="bg-emerald-500/10 text-emerald-300 border-emerald-500/30">
                          {item.type}: {item.value} <span className="text-xs ml-1">({Math.round(item.confidence * 100)}%)</span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  const SuggestionBox = ({ field, label }) => {
    const suggestions = getSuggestions(field);
    if (suggestions.length === 0) return null;

    return (
      <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
        <p className="text-xs text-blue-300 font-medium mb-2">{label} förslag:</p>
        <div className="flex flex-col gap-2">
          {suggestions.slice(0, 3).map((item, idx) => (
            <button
              key={idx}
              onClick={() => applySuggestion(field, item.value)}
              className="text-left p-2 rounded bg-blue-500/10 hover:bg-blue-500/20 transition-colors text-sm text-blue-200 flex items-center justify-between"
            >
              <span>{item.value}</span>
              <Copy className="w-3 h-3 opacity-50" />
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Form Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-white mb-2">Produktnamn *</label>
          <Input
            value={formData.name}
            onChange={(e) => handleFieldChange('name', e.target.value)}
            placeholder="T.ex. LED Panel 1.95mm"
            className="bg-slate-800 border-slate-700 text-white"
          />
          <SuggestionBox field="name" label="Produktnamn" />
        </div>

        <div>
          <label className="block text-sm font-semibold text-white mb-2">Artikelnummer</label>
          <Input
            value={formData.sku}
            onChange={(e) => handleFieldChange('sku', e.target.value)}
            placeholder="T.ex. SKU-12345"
            className="bg-slate-800 border-slate-700 text-white"
          />
          <SuggestionBox field="sku" label="Artikelnummer" />
        </div>

        <div>
          <label className="block text-sm font-semibold text-white mb-2">Batch/Lot-nummer</label>
          <Input
            value={formData.batch_number}
            onChange={(e) => handleFieldChange('batch_number', e.target.value)}
            placeholder="T.ex. LOT-2026-001"
            className="bg-slate-800 border-slate-700 text-white"
          />
          <SuggestionBox field="batch_number" label="Batch" />
        </div>

        <div>
          <label className="block text-sm font-semibold text-white mb-2">Leverantör</label>
          <Input
            value={formData.supplier_name}
            onChange={(e) => handleFieldChange('supplier_name', e.target.value)}
            placeholder="T.ex. ABC Electronics"
            className="bg-slate-800 border-slate-700 text-white"
          />
          <SuggestionBox field="supplier_name" label="Leverantör" />
        </div>

        <div>
          <label className="block text-sm font-semibold text-white mb-2">Enhet</label>
          <Input
            value={formData.unit}
            onChange={(e) => handleFieldChange('unit', e.target.value)}
            placeholder="st, pcs, pack, kg"
            className="bg-slate-800 border-slate-700 text-white"
          />
          <SuggestionBox field="unit" label="Enhet" />
        </div>

        <div>
          <label className="block text-sm font-semibold text-white mb-2">Antal</label>
          <Input
            type="number"
            value={formData.stock_qty}
            onChange={(e) => handleFieldChange('stock_qty', parseInt(e.target.value) || 0)}
            placeholder="1"
            className="bg-slate-800 border-slate-700 text-white"
          />
          <SuggestionBox field="stock_qty" label="Antal" />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-semibold text-white mb-2">Tillverkningsdatum</label>
          <Input
            type="date"
            value={formData.manufacturing_date}
            onChange={(e) => handleFieldChange('manufacturing_date', e.target.value)}
            className="bg-slate-800 border-slate-700 text-white"
          />
        </div>
      </div>

      {/* Images */}
      <div>
        <label className="block text-sm font-semibold text-white mb-2">Bilder</label>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageUpload}
          className="hidden"
        />
        <div className="flex flex-wrap gap-2">
          {images.map((url, i) => (
            <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-700 group">
              <img src={url} alt={`Bild ${i + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            disabled={uploadingImages}
            className="w-20 h-20 rounded-lg border border-dashed border-slate-600 hover:border-slate-400 flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-slate-300 transition-colors"
          >
            {uploadingImages ? (
              <div className="w-5 h-5 border-2 border-slate-500 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <ImagePlus className="w-5 h-5" />
                <span className="text-xs">Lägg till</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Extracted Data Panel */}
      {renderExtractedSection()}

      {/* Notes */}
      <div>
        <label className="block text-sm font-semibold text-white mb-2">Anteckningar</label>
        <Textarea
          value={formData.notes}
          onChange={(e) => handleFieldChange('notes', e.target.value)}
          placeholder="Övrig information från dokumentet..."
          className="bg-slate-800 border-slate-700 text-white min-h-20"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1 bg-slate-800 border-slate-600 hover:bg-slate-700"
        >
          Avbryt
        </Button>
        <Button
          onClick={onSave}
          disabled={!formData.name.trim() || isSaving}
          className="flex-1 bg-emerald-600 hover:bg-emerald-500"
        >
          {isSaving ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
              Sparar...
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              Spara artikel
            </>
          )}
        </Button>
      </div>
    </div>
  );
}