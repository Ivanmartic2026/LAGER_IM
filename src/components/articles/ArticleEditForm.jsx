import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Save } from "lucide-react";
import { motion } from "framer-motion";

export default function ArticleEditForm({ article, onSave, onCancel, isSaving }) {
  const [formData, setFormData] = useState({
    sku: article.sku || '',
    name: article.name || '',
    supplier_name: article.supplier_name || '',
    supplier_price: article.supplier_price || '',
    category: article.category || '',
    is_stock_item: article.is_stock_item !== false,
    dimensions_width_mm: article.dimensions_width_mm || '',
    dimensions_height_mm: article.dimensions_height_mm || '',
    dimensions_depth_mm: article.dimensions_depth_mm || '',
    weight_g: article.weight_g || (article.weight_kg ? article.weight_kg * 1000 : ''),
    warehouse: article.warehouse || '',
    shelf_address: article.shelf_address || '',
    calculated_cost: article.calculated_cost || '',
    batch_number: article.batch_number || '',
    pixel_pitch_mm: article.pixel_pitch_mm || '',
    customer_name: article.customer_name || '',
    pitch_value: article.pitch_value || '',
    series: article.series || '',
    product_version: article.product_version || '',
    brightness_nits: article.brightness_nits || '',
    manufacturer: article.manufacturer || '',
    manufacturing_date: article.manufacturing_date || '',
    min_stock_level: article.min_stock_level || '',
    supplier_product_code: article.supplier_product_code || '',
    notes: article.notes || ''
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Convert numeric fields
    const dataToSave = {
      ...formData,
      supplier_price: formData.supplier_price ? parseFloat(formData.supplier_price) : undefined,
      dimensions_width_mm: formData.dimensions_width_mm ? parseFloat(formData.dimensions_width_mm) : undefined,
      dimensions_height_mm: formData.dimensions_height_mm ? parseFloat(formData.dimensions_height_mm) : undefined,
      dimensions_depth_mm: formData.dimensions_depth_mm ? parseFloat(formData.dimensions_depth_mm) : undefined,
      weight_g: formData.weight_g ? parseFloat(formData.weight_g) : undefined,
      calculated_cost: formData.calculated_cost ? parseFloat(formData.calculated_cost) : undefined,
      pixel_pitch_mm: formData.pixel_pitch_mm ? parseFloat(formData.pixel_pitch_mm) : undefined,
      brightness_nits: formData.brightness_nits ? parseFloat(formData.brightness_nits) : undefined,
      min_stock_level: formData.min_stock_level ? parseInt(formData.min_stock_level) : undefined
    };

    onSave(dataToSave);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-700 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Redigera artikel</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onCancel}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Form */}
        <ScrollArea className="flex-1 p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Grundläggande information */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Grundläggande information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">Artikelnummer</Label>
                  <Input
                    value={formData.sku}
                    onChange={(e) => handleChange('sku', e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white"
                    placeholder="SKU-123"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Benämning *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white"
                    placeholder="Artikelnamn"
                    required
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Leverantör</Label>
                  <Input
                    value={formData.supplier_name}
                    onChange={(e) => handleChange('supplier_name', e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white"
                    placeholder="Leverantörens namn"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Leverantörspris</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.supplier_price}
                    onChange={(e) => handleChange('supplier_price', e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Typ av artikel</Label>
                  <Select value={formData.category} onValueChange={(value) => handleChange('category', value)}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue placeholder="Välj kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LED Module">LED Module</SelectItem>
                      <SelectItem value="Cabinet">Cabinet</SelectItem>
                      <SelectItem value="Controller">Controller</SelectItem>
                      <SelectItem value="Power Supply">Power Supply</SelectItem>
                      <SelectItem value="Cable">Cable</SelectItem>
                      <SelectItem value="Accessory">Accessory</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2 pt-6">
                  <Checkbox
                    id="is_stock_item"
                    checked={formData.is_stock_item}
                    onCheckedChange={(checked) => handleChange('is_stock_item', checked)}
                  />
                  <Label htmlFor="is_stock_item" className="text-slate-300 cursor-pointer">
                    Lagervara
                  </Label>
                </div>
              </div>
            </div>

            {/* Mått & Vikt */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Mått & Vikt</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">Bredd (mm)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.dimensions_width_mm}
                    onChange={(e) => handleChange('dimensions_width_mm', e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Höjd (mm)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.dimensions_height_mm}
                    onChange={(e) => handleChange('dimensions_height_mm', e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Djup (mm)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.dimensions_depth_mm}
                    onChange={(e) => handleChange('dimensions_depth_mm', e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Vikt (g)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.weight_g}
                    onChange={(e) => handleChange('weight_g', e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </div>
            </div>

            {/* Lagerplats */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Lagerplats</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">Lagerställe</Label>
                  <Input
                    value={formData.warehouse}
                    onChange={(e) => handleChange('warehouse', e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white"
                    placeholder="t.ex. Huvudlager"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Lagerplats</Label>
                  <Input
                    value={formData.shelf_address}
                    onChange={(e) => handleChange('shelf_address', e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white"
                    placeholder="t.ex. A1-B2"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Batch Nummer</Label>
                  <Input
                    value={formData.batch_number}
                    onChange={(e) => handleChange('batch_number', e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Min. lagernivå</Label>
                  <Input
                    type="number"
                    value={formData.min_stock_level}
                    onChange={(e) => handleChange('min_stock_level', e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </div>
            </div>

            {/* Kostnader & Teknisk */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Kostnader & Teknisk info</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">Kalkylkostnad</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.calculated_cost}
                    onChange={(e) => handleChange('calculated_cost', e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Pixel Pitch (mm)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.pixel_pitch_mm}
                    onChange={(e) => handleChange('pixel_pitch_mm', e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Produktkod</Label>
                  <Input
                    value={formData.supplier_product_code}
                    onChange={(e) => handleChange('supplier_product_code', e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </div>
            </div>

            {/* Tilläggsinfo */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Tilläggsinfo</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">Kundnamn</Label>
                  <Input
                    value={formData.customer_name}
                    onChange={(e) => handleChange('customer_name', e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Pitch värde</Label>
                  <Input
                    value={formData.pitch_value}
                    onChange={(e) => handleChange('pitch_value', e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white"
                    placeholder="t.ex. P2.5"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Serie</Label>
                  <Select value={formData.series} onValueChange={(value) => handleChange('series', value)}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue placeholder="Välj serie" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Indoor">Indoor</SelectItem>
                      <SelectItem value="Outdoor">Outdoor</SelectItem>
                      <SelectItem value="UltraBright">UltraBright</SelectItem>
                      <SelectItem value="QP4">QP4</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-slate-300">Version</Label>
                  <Input
                    value={formData.product_version}
                    onChange={(e) => handleChange('product_version', e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Ljusstyrka (nits)</Label>
                  <Input
                    type="number"
                    value={formData.brightness_nits}
                    onChange={(e) => handleChange('brightness_nits', e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Tillverkare</Label>
                  <Input
                    value={formData.manufacturer}
                    onChange={(e) => handleChange('manufacturer', e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-slate-300">Tillverkningsdatum</Label>
                  <Input
                    type="date"
                    value={formData.manufacturing_date}
                    onChange={(e) => handleChange('manufacturing_date', e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
              </div>
            </div>

            {/* Anteckningar */}
            <div>
              <Label className="text-slate-300">Anteckningar</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                className="bg-slate-800 border-slate-700 text-white min-h-[100px]"
                placeholder="Ytterligare information om artikeln..."
              />
            </div>
          </form>
        </ScrollArea>

        {/* Footer */}
        <div className="p-6 border-t border-slate-700 flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSaving}
            className="flex-1 bg-slate-800 border-slate-700 hover:bg-slate-700 text-white"
          >
            Avbryt
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSaving || !formData.name}
            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                Sparar...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Spara ändringar
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}