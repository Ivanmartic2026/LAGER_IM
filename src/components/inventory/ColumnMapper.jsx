import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Define available article fields
const ARTICLE_FIELDS = [
  { value: 'ignore', label: '— Hoppa över —', group: 'Övrigt' },
  { value: 'sku', label: 'Artikelnummer', group: 'Grundläggande' },
  { value: 'name', label: 'Benämning', group: 'Grundläggande' },
  { value: 'batch_number', label: 'Batch Nummer', group: 'Grundläggande' },
  { value: 'supplier_name', label: 'Leverantör', group: 'Grundläggande' },
  { value: 'supplier_price', label: 'Leverantörspris', group: 'Grundläggande' },
  { value: 'supplier_product_code', label: 'Produktkod', group: 'Grundläggande' },
  { value: 'category', label: 'Typ av artikel', group: 'Grundläggande' },
  { value: 'storage_type', label: 'Lagertyp', group: 'Lagerhantering' },
  { value: 'stock_qty', label: 'I lager', group: 'Lagerhantering' },
  { value: 'warehouse', label: 'Lagerställe', group: 'Lagerhantering' },
  { value: 'shelf_address', label: 'Lagerplats', group: 'Lagerhantering' },
  { value: 'min_stock_level', label: 'Min. Lagernivå', group: 'Lagerhantering' },
  { value: 'dimensions_width_mm', label: 'Bredd (mm)', group: 'Mått & Vikt' },
  { value: 'dimensions_height_mm', label: 'Höjd (mm)', group: 'Mått & Vikt' },
  { value: 'dimensions_depth_mm', label: 'Djup (mm)', group: 'Mått & Vikt' },
  { value: 'weight_g', label: 'Vikt (g)', group: 'Mått & Vikt' },
  { value: 'calculated_cost', label: 'Kalkylkostnad', group: 'Kostnader' },
  { value: 'pixel_pitch_mm', label: 'Pixel Pitch (mm)', group: 'Teknisk' },
  { value: 'customer_name', label: 'Kundnamn', group: 'Teknisk' },
  { value: 'pitch_value', label: 'Pitch värde', group: 'Teknisk' },
  { value: 'series', label: 'Serie', group: 'Teknisk' },
  { value: 'product_version', label: 'Version', group: 'Teknisk' },
  { value: 'brightness_nits', label: 'Ljusstyrka (nits)', group: 'Teknisk' },
  { value: 'manufacturer', label: 'Tillverkare', group: 'Teknisk' },
  { value: 'manufacturing_date', label: 'Tillverkningsdatum', group: 'Teknisk' },
  { value: 'status', label: 'Status', group: 'Övrigt' },
  { value: 'notes', label: 'Anteckningar', group: 'Övrigt' }
];

export default function ColumnMapper({ columns, previewData, onConfirm, onCancel }) {
  const [mapping, setMapping] = useState(() => {
    // Auto-detect mapping based on column names
    const initialMapping = {};
    columns.forEach(col => {
      const normalized = col.toLowerCase().trim();
      
      if (normalized.includes('artikelnummer') || normalized === 'sku') {
        initialMapping[col] = 'sku';
      } else if (normalized.includes('benämning') || normalized.includes('artikelnamn')) {
        initialMapping[col] = 'name';
      } else if (normalized.includes('batch')) {
        initialMapping[col] = 'batch_number';
      } else if (normalized.includes('leverantör')) {
        initialMapping[col] = 'supplier_name';
      } else if (normalized.includes('leverantörspris')) {
        initialMapping[col] = 'supplier_price';
      } else if (normalized.includes('typ av artikel') || normalized === 'kategori') {
        initialMapping[col] = 'category';
      } else if (normalized.includes('lagertyp')) {
        initialMapping[col] = 'storage_type';
      } else if (normalized.includes('i lager') || normalized.includes('lagersaldo')) {
        initialMapping[col] = 'stock_qty';
      } else if (normalized.includes('lagerställe') || normalized === 'lager') {
        initialMapping[col] = 'warehouse';
      } else if (normalized.includes('lagerplats') || normalized.includes('hyllplats')) {
        initialMapping[col] = 'shelf_address';
      } else if (normalized.includes('bredd')) {
        initialMapping[col] = 'dimensions_width_mm';
      } else if (normalized.includes('höjd')) {
        initialMapping[col] = 'dimensions_height_mm';
      } else if (normalized.includes('djup')) {
        initialMapping[col] = 'dimensions_depth_mm';
      } else if (normalized.includes('vikt')) {
        initialMapping[col] = 'weight_g';
      } else if (normalized.includes('kalkylkostnad')) {
        initialMapping[col] = 'calculated_cost';
      } else if (normalized.includes('pixel pitch')) {
        initialMapping[col] = 'pixel_pitch_mm';
      } else if (normalized.includes('kundnamn')) {
        initialMapping[col] = 'customer_name';
      } else if (normalized.includes('tillverkare')) {
        initialMapping[col] = 'manufacturer';
      } else if (normalized.includes('min') && normalized.includes('lager')) {
        initialMapping[col] = 'min_stock_level';
      } else if (normalized.includes('produktkod')) {
        initialMapping[col] = 'supplier_product_code';
      } else {
        initialMapping[col] = 'ignore';
      }
    });
    
    return initialMapping;
  });

  const handleMappingChange = (column, field) => {
    setMapping(prev => ({
      ...prev,
      [column]: field
    }));
  };

  const handleConfirm = () => {
    onConfirm(mapping);
  };

  // Count mapped fields
  const mappedCount = Object.values(mapping).filter(v => v !== 'ignore').length;
  const canProceed = mappedCount > 0;

  return (
    <div className="flex flex-col h-full max-h-[80vh]">
      {/* Header */}
      <div className="p-6 border-b border-slate-700">
        <h2 className="text-xl font-bold text-white mb-2 tracking-tight">
          Mappa kolumner
        </h2>
        <p className="text-sm text-slate-400">
          Välj vilket fält varje Excel-kolumn motsvarar i systemet
        </p>
        
        <div className="flex items-center gap-3 mt-4">
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
            {columns.length} kolumner funna
          </Badge>
          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
            {mappedCount} mappade
          </Badge>
        </div>
      </div>

      {/* Column Mapping */}
      <ScrollArea className="flex-1 p-6">
        <div className="space-y-3">
          {columns.map((column, index) => {
            const previewValues = previewData.slice(0, 3).map(row => row[column]);
            const currentMapping = mapping[column];
            const fieldInfo = ARTICLE_FIELDS.find(f => f.value === currentMapping);

            return (
              <div
                key={index}
                className={cn(
                  "p-4 rounded-xl border transition-all",
                  currentMapping === 'ignore' 
                    ? "bg-slate-800/30 border-slate-700/50" 
                    : "bg-slate-800/50 border-blue-500/30"
                )}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-white truncate">
                        {column}
                      </span>
                      {currentMapping !== 'ignore' && (
                        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs flex-shrink-0">
                          Mappad
                        </Badge>
                      )}
                    </div>
                    {previewValues.length > 0 && (
                      <div className="text-xs text-slate-500 truncate">
                        Exempel: {previewValues.filter(v => v).slice(0, 2).join(', ')}
                      </div>
                    )}
                  </div>

                  <ArrowRight className="w-4 h-4 text-slate-600 flex-shrink-0" />

                  <div className="w-64 flex-shrink-0">
                    <Select 
                      value={currentMapping} 
                      onValueChange={(value) => handleMappingChange(column, value)}
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                        <SelectValue placeholder="Välj fält..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {/* Group by category */}
                        {['Grundläggande', 'Lagerhantering', 'Mått & Vikt', 'Kostnader', 'Teknisk', 'Övrigt'].map(group => {
                          const groupFields = ARTICLE_FIELDS.filter(f => f.group === group);
                          if (groupFields.length === 0) return null;

                          return (
                            <div key={group}>
                              <div className="px-2 py-1.5 text-xs font-semibold text-slate-400 bg-slate-900/50">
                                {group}
                              </div>
                              {groupFields.map((field) => (
                                <SelectItem 
                                  key={field.value} 
                                  value={field.value}
                                  className={cn(
                                    field.value === 'ignore' && "text-slate-500"
                                  )}
                                >
                                  {field.label}
                                </SelectItem>
                              ))}
                            </div>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-6 border-t border-slate-700">
        {!canProceed && (
          <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm text-amber-300">
            ⚠️ Du måste mappa minst en kolumn för att fortsätta
          </div>
        )}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex-1 bg-slate-800 border-slate-700 hover:bg-slate-700 text-white"
          >
            Avbryt
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!canProceed}
            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Fortsätt till förhandsgranskning
          </Button>
        </div>
      </div>
    </div>
  );
}