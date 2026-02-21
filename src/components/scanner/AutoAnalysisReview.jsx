import React, { useState } from 'react';
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2, AlertCircle, Edit3, X, Sparkles, Eye, EyeOff
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function AutoAnalysisReview({ 
  imageUrl,
  extractedData, 
  confidences,
  onAccept,
  onReject,
  onEdit,
  isLoading
}) {
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [showLowConfidence, setShowLowConfidence] = useState(false);
  const [showValuePicker, setShowValuePicker] = useState(false);

  // Fält som ska visas
  const importantFields = [
    { key: 'batch_number', label: 'Batchnummer', icon: '📦' },
    { key: 'name', label: 'Artikelnamn', icon: '📝' },
    { key: 'manufacturer', label: 'Tillverkare', icon: '🏭' },
    { key: 'category', label: 'Kategori', icon: '📂' },
    { key: 'stock_qty', label: 'Lagermängd', icon: '📊' },
    { key: 'pixel_pitch_mm', label: 'Pixel Pitch (mm)', icon: '📐' },
    { key: 'warehouse', label: 'Lagerställe', icon: '🏢' },
  ];

  const optionalFields = [
    { key: 'dimensions_width_mm', label: 'Bredd (mm)', icon: '📏' },
    { key: 'dimensions_height_mm', label: 'Höjd (mm)', icon: '📏' },
    { key: 'dimensions_depth_mm', label: 'Djup (mm)', icon: '📏' },
    { key: 'weight_kg', label: 'Vikt (kg)', icon: '⚖️' },
    { key: 'manufacturing_date', label: 'Tillverkningsdatum', icon: '📅' },
  ];

  const getConfidenceColor = (confidence) => {
    if (!confidence) return 'text-slate-500';
    if (confidence >= 0.9) return 'text-emerald-400';
    if (confidence >= 0.7) return 'text-amber-400';
    return 'text-red-400';
  };

  const getConfidenceBg = (confidence) => {
    if (!confidence) return 'bg-slate-500/10';
    if (confidence >= 0.9) return 'bg-emerald-500/10';
    if (confidence >= 0.7) return 'bg-amber-500/10';
    return 'bg-red-500/10';
  };

  const startEdit = (field, value) => {
    setEditingField(field);
    setEditValue(value || '');
    setShowValuePicker(false);
  };

  // Samla alla unika värden från extraherad data
  const getAllValues = () => {
    const values = [];
    Object.entries(extractedData).forEach(([key, val]) => {
      if (val && typeof val === 'string') {
        values.push({ value: val, source: key });
      }
    });
    return values.filter((v, i, arr) => arr.findIndex(x => x.value === v.value) === i);
  };

  const saveEdit = (field) => {
    onEdit(field, editValue);
    setEditingField(null);
  };

  const renderField = (field) => {
    const value = extractedData[field.key];
    const confidence = confidences[field.key] || 0;
    const isEditing = editingField === field.key;

    if (!value && confidence < 0.5) return null;

    return (
      <motion.div
        key={field.key}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className={cn(
          "p-4 rounded-xl border transition-all",
          getConfidenceBg(confidence),
          confidence >= 0.7 ? "border-slate-700" : "border-amber-500/50"
        )}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">{field.icon}</span>
            <span className="font-medium text-white">{field.label}</span>
          </div>
          <div className="flex items-center gap-2">
            {confidence && (
              <Badge 
                className={cn(
                  "text-xs",
                  getConfidenceBg(confidence),
                  getConfidenceColor(confidence)
                )}
              >
                {Math.round(confidence * 100)}%
              </Badge>
            )}
          </div>
        </div>

        {isEditing ? (
          <div className="space-y-2">
            <Input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="bg-white/5 border-white/10 text-white"
              autoFocus
            />
            
            {/* Värde-förslag */}
            {showValuePicker && getAllValues().length > 0 && (
              <div className="p-2 rounded-lg bg-slate-800/50 border border-slate-700 space-y-1 max-h-32 overflow-y-auto">
                <p className="text-xs text-slate-400 px-1 py-0.5">Andra extraherade värden:</p>
                {getAllValues().map((item, idx) => (
                  item.value !== editValue && (
                    <button
                      key={idx}
                      onClick={() => {
                        setEditValue(item.value);
                        setShowValuePicker(false);
                      }}
                      className="w-full text-left px-2 py-1.5 text-xs rounded-md bg-slate-700/50 hover:bg-slate-700 text-white transition-colors"
                    >
                      <span className="block truncate">{item.value}</span>
                      <span className="text-slate-400 text-xs">från {importantFields.find(f => f.key === item.source)?.label || item.source}</span>
                    </button>
                  )
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowValuePicker(!showValuePicker)}
                className="flex-1 bg-blue-600/20 border-blue-500/30 hover:bg-blue-600/30 text-blue-300 h-8 text-xs"
              >
                Byt värde
              </Button>
              <Button
                size="sm"
                onClick={() => saveEdit(field.key)}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 h-8"
              >
                Spara
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditingField(null)}
                className="flex-1 bg-white/5 border-white/10 hover:bg-white/10 h-8"
              >
                Avbryt
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-white">{value || '—'}</span>
            <button
              onClick={() => startEdit(field.key, value)}
              className="text-slate-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity p-1"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          </div>
        )}
      </motion.div>
    );
  };

  const filledImportant = importantFields.filter(f => extractedData[f.key]);
  const filledOptional = optionalFields.filter(f => extractedData[f.key]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Bild */}
      {imageUrl && (
        <div className="rounded-xl overflow-hidden bg-slate-900 border border-slate-700">
          <img
            src={imageUrl}
            alt="Skannad bild"
            className="w-full h-48 object-contain"
          />
        </div>
      )}

      {/* AI Status */}
      <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-blue-300 font-medium mb-1">AI-analys genomförd</p>
          <p className="text-sm text-blue-200">
            {filledImportant.length}/{importantFields.length} viktiga fält är ifyllda
          </p>
        </div>
      </div>

      {/* Viktiga fält */}
      <div className="space-y-3">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          Viktiga fält ({filledImportant.length})
        </h3>
        <div className="space-y-2 group">
          {filledImportant.map(field => renderField(field))}
        </div>
      </div>

      {/* Valfria fält */}
      {filledOptional.length > 0 && (
        <div className="space-y-3">
          <button
            onClick={() => setShowLowConfidence(!showLowConfidence)}
            className="font-semibold text-white flex items-center gap-2 hover:text-slate-300"
          >
            {showLowConfidence ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            Ytterligare fält ({filledOptional.length})
          </button>
          {showLowConfidence && (
            <div className="space-y-2 group">
              {filledOptional.map(field => renderField(field))}
            </div>
          )}
        </div>
      )}

      {/* Fält med låg säkerhet */}
      {Object.keys(extractedData).some(key => {
        const conf = confidences[key] || 0;
        return conf < 0.5 && extractedData[key];
      }) && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-amber-300 font-medium mb-1">Låg säkerhet på vissa fält</p>
            <p className="text-sm text-amber-200">
              Kontrollera dessa fält extra noga innan du godkänner
            </p>
          </div>
        </div>
      )}

      {/* Åtgärder */}
      <div className="space-y-3 pt-4">
        <div className="flex gap-3">
          <Button
            onClick={onReject}
            disabled={isLoading}
            variant="outline"
            className="flex-1 bg-white/5 border-white/10 hover:bg-white/10 text-white h-11"
          >
            <X className="w-4 h-4 mr-2" />
            Avvisa & ta nytt foto
          </Button>
          <Button
            onClick={onAccept}
            disabled={isLoading || filledImportant.length === 0}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white h-11"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Sparar...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Godkänn & spara
              </>
            )}
          </Button>
        </div>
        
        {onManualReview && (
          <Button
            onClick={onManualReview}
            disabled={isLoading}
            variant="outline"
            className="w-full bg-blue-600/20 border-blue-500/40 hover:bg-blue-600/30 text-blue-300 h-11"
          >
            <Edit3 className="w-4 h-4 mr-2" />
            Granska och redigera alla fält
          </Button>
        )}
      </div>
    </motion.div>
  );
}