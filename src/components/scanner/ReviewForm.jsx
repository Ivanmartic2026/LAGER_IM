import React from 'react';
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Check, X, AlertTriangle, Package } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import ExtractedFieldCard from './ExtractedFieldCard';

const CATEGORY_OPTIONS = [
  { value: "LED Module", label: "LED-modul" },
  { value: "Cabinet", label: "Kabinett" },
  { value: "Controller", label: "Controller" },
  { value: "Power Supply", label: "Strömförsörjning" },
  { value: "Cable", label: "Kabel" },
  { value: "Accessory", label: "Tillbehör" },
  { value: "Other", label: "Övrigt" }
];

const STORAGE_TYPE_OPTIONS = [
  { value: "company_owned", label: "Företagsägt lager" },
  { value: "customer_owned", label: "Kundägt lager" }
];

export default function ReviewForm({ 
  extractedData, 
  confidences = {},
  onFieldChange,
  onSave,
  onCancel,
  isSaving,
  mode = "inbound"
}) {
  const lowConfidenceCount = Object.values(confidences).filter(c => c < 0.85).length;

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => base44.entities.Warehouse.list(),
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {lowConfidenceCount > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <p className="text-sm text-amber-200">
            <strong>{lowConfidenceCount} fält</strong> behöver verifieras. Kontrollera markerade fält.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ExtractedFieldCard
          field="batch_number"
          label="Batchnummer"
          value={extractedData.batch_number}
          confidence={confidences.batch_number}
          onChange={onFieldChange}
          required
          placeholder="T.ex. P2.5250721228"
        />
        
        <ExtractedFieldCard
          field="name"
          label="Artikelnamn"
          value={extractedData.name}
          confidence={confidences.name}
          onChange={onFieldChange}
          required
          placeholder="T.ex. P2.5 Gob"
        />

        <ExtractedFieldCard
          field="manufacturer"
          label="Tillverkare"
          value={extractedData.manufacturer}
          confidence={confidences.manufacturer}
          onChange={onFieldChange}
          placeholder="T.ex. Nick Everlasting"
        />

        <ExtractedFieldCard
          field="manufacturing_date"
          label="Tillverkningsdatum"
          value={extractedData.manufacturing_date}
          confidence={confidences.manufacturing_date}
          onChange={onFieldChange}
          type="date"
        />

        <ExtractedFieldCard
          field="category"
          label="Kategori"
          value={extractedData.category}
          confidence={confidences.category}
          onChange={onFieldChange}
          type="select"
          options={CATEGORY_OPTIONS}
        />

        <ExtractedFieldCard
          field="pixel_pitch_mm"
          label="Pixel Pitch (mm)"
          value={extractedData.pixel_pitch_mm}
          confidence={confidences.pixel_pitch_mm}
          onChange={onFieldChange}
          type="number"
          placeholder="T.ex. 2.5"
        />

        <ExtractedFieldCard
          field="shelf_address"
          label="Hyllplats"
          value={extractedData.shelf_address}
          confidence={confidences.shelf_address}
          onChange={onFieldChange}
          placeholder="T.ex. F3-H1"
        />

        <ExtractedFieldCard
          field="stock_qty"
          label={mode === "inventory" ? "Inventerat antal" : "Antal (inleverans)"}
          value={extractedData.stock_qty}
          confidence={confidences.stock_qty}
          onChange={onFieldChange}
          type="number"
          required
          placeholder="0"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <ExtractedFieldCard
          field="dimensions_width_mm"
          label="Bredd (mm)"
          value={extractedData.dimensions_width_mm}
          confidence={confidences.dimensions_width_mm}
          onChange={onFieldChange}
          type="number"
        />
        <ExtractedFieldCard
          field="dimensions_height_mm"
          label="Höjd (mm)"
          value={extractedData.dimensions_height_mm}
          confidence={confidences.dimensions_height_mm}
          onChange={onFieldChange}
          type="number"
        />
        <ExtractedFieldCard
          field="dimensions_depth_mm"
          label="Djup (mm)"
          value={extractedData.dimensions_depth_mm}
          confidence={confidences.dimensions_depth_mm}
          onChange={onFieldChange}
          type="number"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ExtractedFieldCard
          field="weight_kg"
          label="Vikt (kg)"
          value={extractedData.weight_kg}
          confidence={confidences.weight_kg}
          onChange={onFieldChange}
          type="number"
          placeholder="T.ex. 1.5"
        />

        <ExtractedFieldCard
          field="warehouse"
          label="Lagerställe"
          value={extractedData.warehouse}
          confidence={confidences.warehouse}
          onChange={onFieldChange}
          type="select"
          options={warehouses.map(w => ({ value: w.name, label: w.name }))}
          placeholder="Välj lagerställe..."
        />

        <ExtractedFieldCard
          field="storage_type"
          label="Lagertyp"
          value={extractedData.storage_type || 'company_owned'}
          confidence={confidences.storage_type || 1.0}
          onChange={onFieldChange}
          type="select"
          options={STORAGE_TYPE_OPTIONS}
          required
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium text-slate-300">Anteckningar</Label>
        <Textarea
          value={extractedData.notes || ""}
          onChange={(e) => onFieldChange("notes", e.target.value)}
          placeholder="Valfria anteckningar..."
          className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500 min-h-[80px]"
        />
      </div>

      <div className="flex gap-3 pt-4">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isSaving}
          className="flex-1 bg-slate-800 border-slate-600 hover:bg-slate-700 text-white"
        >
          <X className="w-4 h-4 mr-2" />
          Avbryt
        </Button>
        <Button
          onClick={onSave}
          disabled={isSaving || !extractedData.batch_number || !extractedData.name}
          className="flex-1 bg-blue-600 hover:bg-blue-500 text-white"
        >
          {isSaving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Sparar...
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              Godkänn & Spara
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}