import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Save, Plus, Sparkles, MapPin, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function ArticleEditForm({ article, onSave, onCancel, isSaving }) {
  const [formData, setFormData] = useState({
    sku: article.sku || '',
    name: article.name || '',
    supplier_id: article.supplier_id || '',
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
    notes: article.notes || '',
    image_urls: article.image_urls || []
  });

  const [uploadingImages, setUploadingImages] = useState(false);
  const [placementSuggestions, setPlacementSuggestions] = useState(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Fetch warehouses, shelves, and suppliers
  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => base44.entities.Warehouse.list(),
  });

  const { data: shelves = [] } = useQuery({
    queryKey: ['shelves'],
    queryFn: () => base44.entities.Shelf.list(),
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list(),
  });

  // Filter shelves based on selected warehouse
  const availableShelves = formData.warehouse 
    ? shelves.filter(s => {
        const warehouse = warehouses.find(w => w.name === formData.warehouse);
        return warehouse && s.warehouse_id === warehouse.id;
      })
    : [];

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadingImages(true);
    try {
      const uploadPromises = files.map(file => 
        base44.integrations.Core.UploadFile({ file })
      );
      const results = await Promise.all(uploadPromises);
      const newUrls = results.map(r => r.file_url);
      
      setFormData(prev => ({
        ...prev,
        image_urls: [...(prev.image_urls || []), ...newUrls]
      }));
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploadingImages(false);
    }
  };

  const handleRemoveImage = (urlToRemove) => {
    setFormData(prev => ({
      ...prev,
      image_urls: (prev.image_urls || []).filter(url => url !== urlToRemove)
    }));
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

  const handleGetPlacementSuggestions = async () => {
    if (!formData.dimensions_width_mm || !formData.dimensions_height_mm || !formData.dimensions_depth_mm) {
      return;
    }

    setLoadingSuggestions(true);
    try {
      const warehouseObj = warehouses.find(w => w.name === formData.warehouse);
      const response = await base44.functions.invoke('suggestPlacements', {
        items: [{
          article_id: article.id,
          quantity: 1
        }],
        warehouseId: warehouseObj?.id || null
      });

      setPlacementSuggestions(response.data);
    } catch (error) {
      console.error('Error getting placement suggestions:', error);
    } finally {
      setLoadingSuggestions(false);
    }
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
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
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
        <div className="flex-1 overflow-y-auto p-6">
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
                  <Select 
                    value={formData.supplier_id} 
                    onValueChange={(value) => {
                      const supplier = suppliers.find(s => s.id === value);
                      handleChange('supplier_id', value);
                      handleChange('supplier_name', supplier?.name || '');
                    }}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue placeholder="Välj leverantör" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.filter(s => s.is_active !== false).map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Lagerplats</h3>
                {formData.dimensions_width_mm && formData.dimensions_height_mm && formData.dimensions_depth_mm && (
                  <Button
                    type="button"
                    onClick={handleGetPlacementSuggestions}
                    disabled={loadingSuggestions}
                    size="sm"
                    variant="outline"
                    className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 border-purple-500/30 hover:from-purple-600/30 hover:to-blue-600/30 text-purple-300"
                  >
                    {loadingSuggestions ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Beräknar...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Föreslå plats
                      </>
                    )}
                  </Button>
                )}
              </div>

              {placementSuggestions && (
                <div className="mb-4 p-4 rounded-lg bg-purple-500/10 border border-purple-500/30">
                  <h4 className="text-sm font-semibold text-purple-300 mb-2">Föreslagna platser:</h4>
                  {placementSuggestions.suggestions.length > 0 ? (
                    <div className="space-y-2">
                      {placementSuggestions.suggestions.slice(0, 3).map((suggestion, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            handleChange('shelf_address', suggestion.shelf_code);
                            setPlacementSuggestions(null);
                          }}
                          className="w-full p-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-purple-500/50 transition-all text-left"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-purple-400" />
                              <span className="text-white font-medium">{suggestion.shelf_code}</span>
                            </div>
                            <span className="text-xs text-slate-400">
                              {suggestion.occupancyAfter.toFixed(0)}% beläggning
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-amber-300">Inga tillgängliga platser hittades</p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">Lagerställe</Label>
                  {warehouses.length === 0 ? (
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm text-amber-300">
                      Inga lagerställen skapade. Gå till Lagerställen-sidan för att skapa ett.
                    </div>
                  ) : (
                    <Select 
                      value={formData.warehouse} 
                      onValueChange={(value) => {
                        handleChange('warehouse', value);
                        // Reset shelf when warehouse changes
                        handleChange('shelf_address', '');
                      }}
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                        <SelectValue placeholder="Välj lagerställe" />
                      </SelectTrigger>
                      <SelectContent>
                        {warehouses.map((warehouse) => (
                          <SelectItem key={warehouse.id} value={warehouse.name}>
                            {warehouse.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div>
                  <Label className="text-slate-300">Lagerplats</Label>
                  {!formData.warehouse ? (
                    <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700 text-sm text-slate-500">
                      Välj lagerställe först
                    </div>
                  ) : availableShelves.length === 0 ? (
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm text-amber-300">
                      Inga hyllor i detta lagerställe. Lägg till hyllor på Lagerställen-sidan.
                    </div>
                  ) : (
                    <Select 
                      value={formData.shelf_address} 
                      onValueChange={(value) => handleChange('shelf_address', value)}
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                        <SelectValue placeholder="Välj lagerplats" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableShelves.map((shelf) => (
                          <SelectItem key={shelf.id} value={shelf.shelf_code}>
                            {shelf.shelf_code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div>
                  <Label className="text-slate-300">Batch nummer</Label>
                  <Input
                    value={formData.batch_number}
                    onChange={(e) => handleChange('batch_number', e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white"
                    placeholder="Batch-123"
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

            {/* Bilder & Filer */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Bilder & Filer</h3>
              
              {formData.image_urls && formData.image_urls.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
                  {formData.image_urls.map((url, index) => {
                    const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url);
                    const fileName = url.split('/').pop().split('?')[0];
                    
                    return (
                      <div key={index} className="relative group">
                        {isImage ? (
                          <img 
                            src={url} 
                            alt={`Bild ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg bg-slate-800"
                          />
                        ) : (
                          <div className="w-full h-32 flex flex-col items-center justify-center rounded-lg bg-slate-800 p-2">
                            <div className="text-2xl mb-2">📄</div>
                            <div className="text-xs text-slate-400 text-center truncate w-full px-2">
                              {fileName}
                            </div>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(url)}
                          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              <div>
                <input
                  type="file"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                  disabled={uploadingImages}
                />
                <label
                  htmlFor="image-upload"
                  className="flex items-center justify-center gap-2 p-4 rounded-lg border-2 border-dashed border-slate-700 hover:border-slate-600 bg-slate-800/50 cursor-pointer transition-colors"
                >
                  {uploadingImages ? (
                    <>
                      <div className="w-5 h-5 border-2 border-slate-400 border-t-blue-400 rounded-full animate-spin" />
                      <span className="text-slate-400">Laddar upp...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5 text-slate-400" />
                      <span className="text-slate-400">Lägg till bilder & filer</span>
                    </>
                  )}
                </label>
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
        </div>

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