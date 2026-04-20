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
import { toast } from "sonner";

export default function ArticleEditForm({ article, onSave, onCancel, isSaving }) {
  const [formData, setFormData] = useState({
    sku: article.sku || '',
    name: article.name || '',
    supplier_id: article.supplier_id || '',
    supplier_name: article.supplier_name || '',
    unit_cost: article.unit_cost || article.supplier_price || article.calculated_cost || '',
    category: article.category || '',
    storage_type: article.storage_type || '',
    status: article.status || 'active',
    transit_expected_date: article.transit_expected_date || '',
    dimensions_width_mm: article.dimensions_width_mm || '',
    dimensions_height_mm: article.dimensions_height_mm || '',
    dimensions_depth_mm: article.dimensions_depth_mm || '',
    weight_g: article.weight_g || (article.weight_kg ? article.weight_kg * 1000 : ''),
    stock_qty: article.stock_qty || 0,
    warehouse: article.warehouse || '',
    shelf_address: Array.isArray(article.shelf_address) ? article.shelf_address : (article.shelf_address ? [article.shelf_address] : []),
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
  const [supplierSearch, setSupplierSearch] = useState('');
  const [shelfSearch, setShelfSearch] = useState('');
  const [safetyStockManual, setSafetyStockManual] = useState(!!article.min_stock_level);

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

  // Filter suppliers based on search
  const filteredSuppliers = suppliers
    .filter(s => s.is_active !== false)
    .filter(s => 
      !supplierSearch || 
      s.name.toLowerCase().includes(supplierSearch.toLowerCase())
    );

  // Filter shelves based on selected warehouse
  const availableShelves = formData.warehouse 
    ? shelves.filter(s => {
        const warehouse = warehouses.find(w => 
          w.name === formData.warehouse || 
          w.id === formData.warehouse ||
          w.code === formData.warehouse
        );
        return warehouse && s.warehouse_id === warehouse.id;
      })
    : [];

  // Filter shelves based on search
  const filteredShelves = availableShelves.filter(s => 
    !shelfSearch || 
    s.shelf_code.toLowerCase().includes(shelfSearch.toLowerCase())
  );

  const handleChange = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      // Auto-calculate safety stock at 5% of stock_qty if not manually set
      if (field === 'stock_qty' && !safetyStockManual) {
        const qty = parseFloat(value) || 0;
        updated.min_stock_level = qty > 0 ? Math.ceil(qty * 0.05) : '';
      }
      return updated;
    });
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
      transit_expected_date: formData.transit_expected_date || null,
      unit_cost: formData.unit_cost ? parseFloat(formData.unit_cost) : undefined,
      dimensions_width_mm: formData.dimensions_width_mm ? parseFloat(formData.dimensions_width_mm) : undefined,
      dimensions_height_mm: formData.dimensions_height_mm ? parseFloat(formData.dimensions_height_mm) : undefined,
      dimensions_depth_mm: formData.dimensions_depth_mm ? parseFloat(formData.dimensions_depth_mm) : undefined,
      weight_g: formData.weight_g ? parseFloat(formData.weight_g) : undefined,
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
          quantity: formData.stock_qty || 1
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
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-700 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Edit Product</h2>
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
            {/* Overview Information */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Overview Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">
                    Article Number
                    <span className="text-xs text-slate-400 ml-2">(Auto-generated)</span>
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      value={formData.sku}
                      onChange={(e) => handleChange('sku', e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white flex-1"
                      placeholder="Genereras vid sparning"
                      readOnly={!formData.sku}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={async () => {
                        if (!formData.name || !formData.category) {
                          toast.error('Fyll i artikelnamn och kategori först');
                          return;
                        }
                        try {
                          const response = await base44.functions.invoke('generateArticleSku', {
                            name: formData.name,
                            category: formData.category,
                            supplier_name: formData.supplier_name,
                            batch_number: formData.batch_number
                          });
                          if (response.data.success) {
                            handleChange('sku', response.data.sku);
                            toast.success('SKU genererad: ' + response.data.sku);
                          }
                        } catch (error) {
                          toast.error('Kunde inte generera SKU');
                        }
                      }}
                      className="bg-slate-700 border-slate-600 hover:bg-slate-600 whitespace-nowrap"
                    >
                      Generera
                    </Button>
                  </div>
                </div>
                <div>
                  <Label className="text-slate-300">Product Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white"
                    placeholder="Artikelnamn"
                    required
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Batch ID</Label>
                  <div className="flex gap-2">
                    <Input
                      value={formData.batch_number}
                      onChange={(e) => handleChange('batch_number', e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white flex-1"
                      placeholder="Batch-123"
                    />
                    {!formData.batch_number && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          const year = new Date().getFullYear().toString().slice(-2);
                          const month = String(new Date().getMonth() + 1).padStart(2, '0');
                          const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
                          handleChange('batch_number', `B${year}${month}-${rand}`);
                        }}
                        className="bg-slate-700 border-slate-600 hover:bg-slate-600 whitespace-nowrap"
                      >
                        Generera
                      </Button>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-slate-300">Supplier</Label>
                  <Select 
                    value={formData.supplier_id} 
                    onValueChange={(value) => {
                      const supplier = suppliers.find(s => s.id === value);
                      setFormData(prev => ({
                        ...prev,
                        supplier_id: value,
                        supplier_name: supplier?.name || ''
                      }));
                      setSupplierSearch('');
                    }}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue placeholder="Välj leverantör" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[60vh]" style={{zIndex: 9999}} onCloseAutoFocus={(e) => e.preventDefault()}>
                      <div 
                        className="p-2 border-b border-slate-700 sticky top-0 bg-slate-900 z-10"
                        onPointerDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        <Input
                          placeholder="Sök leverantör..."
                          value={supplierSearch}
                          onChange={(e) => setSupplierSearch(e.target.value)}
                          className="h-9 bg-slate-800 border-slate-700 text-white"
                          onKeyDown={(e) => e.stopPropagation()}
                          onPointerDown={(e) => e.stopPropagation()}
                          onTouchStart={(e) => e.stopPropagation()}
                        />
                      </div>
                      {filteredSuppliers.length === 0 ? (
                        <div className="p-4 text-center text-slate-400 text-sm">
                          Ingen leverantör hittades
                        </div>
                      ) : (
                        filteredSuppliers.map((supplier) => (
                          <SelectItem 
                            key={supplier.id} 
                            value={supplier.id}
                          >
                            {supplier.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-slate-300">Unit Price</Label>
                  <Input
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    value={formData.unit_cost}
                    onChange={(e) => handleChange('unit_cost', e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Stock Quantity</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={formData.stock_qty}
                    onChange={(e) => handleChange('stock_qty', e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white"
                    placeholder="0"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-slate-300">Safety Stock</Label>
                    {!safetyStockManual && formData.stock_qty > 0 && (
                      <span className="text-xs text-blue-400">Auto (5%)</span>
                    )}
                  </div>
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={formData.min_stock_level}
                    onChange={(e) => {
                      setSafetyStockManual(true);
                      handleChange('min_stock_level', e.target.value);
                    }}
                    className="bg-slate-800 border-slate-700 text-white"
                    placeholder={formData.stock_qty > 0 ? `Auto: ${Math.ceil(formData.stock_qty * 0.05)}` : ''}
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Category</Label>
                  <Select value={formData.category} onValueChange={(value) => handleChange('category', value)}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue placeholder="Välj kategori" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[60vh]" onCloseAutoFocus={(e) => e.preventDefault()}>
                      <SelectItem value="Cabinet">10 - Cabinet</SelectItem>
                      <SelectItem value="LED Module">11 - LED Module</SelectItem>
                      <SelectItem value="Power Supply">12 - Power Supply</SelectItem>
                      <SelectItem value="Receiving Card">13 - Receiving Card</SelectItem>
                      <SelectItem value="Control Processor">14 - Control Processor</SelectItem>
                      <SelectItem value="Computer">20 - Computer</SelectItem>
                      <SelectItem value="Cable">70 - Cable</SelectItem>
                      <SelectItem value="Accessory">80 - Accessory</SelectItem>
                      <SelectItem value="Other">90 - Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-slate-300">Stock Type *</Label>
                  <Select 
                    value={formData.storage_type} 
                    onValueChange={(value) => handleChange('storage_type', value)}
                    required
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue placeholder="Select stock type" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[60vh]" onCloseAutoFocus={(e) => e.preventDefault()}>
                       <SelectItem value="company_owned">Company-owned stock</SelectItem>
                       <SelectItem value="customer_owned">Customer-owned stock</SelectItem>
                       <SelectItem value="rental_stock">Rental stock</SelectItem>
                     </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Volume Calculation */}
              {formData.dimensions_width_mm && formData.dimensions_height_mm && formData.dimensions_depth_mm && formData.stock_qty > 0 && (
                <div className="mt-4 p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                  <h4 className="text-sm font-semibold text-blue-300 mb-2">Volymberäkning</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-slate-400">Volym per enhet:</span>
                      <span className="text-white ml-2 font-medium">
                        {((formData.dimensions_width_mm * formData.dimensions_height_mm * formData.dimensions_depth_mm) / 1000000).toFixed(2)} L
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">Total volym:</span>
                      <span className="text-white ml-2 font-medium">
                        {((formData.dimensions_width_mm * formData.dimensions_height_mm * formData.dimensions_depth_mm * formData.stock_qty) / 1000000).toFixed(2)} L
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400">Antal i lager:</span>
                      <span className="text-white ml-2 font-medium">{formData.stock_qty} st</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Mått & Vikt */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Dimensions & Weight</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">Width (mm)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    inputMode="decimal"
                    value={formData.dimensions_width_mm}
                    onChange={(e) => handleChange('dimensions_width_mm', e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Height (mm)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    inputMode="decimal"
                    value={formData.dimensions_height_mm}
                    onChange={(e) => handleChange('dimensions_height_mm', e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Depth (mm)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    inputMode="decimal"
                    value={formData.dimensions_depth_mm}
                    onChange={(e) => handleChange('dimensions_depth_mm', e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Weight (g)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    inputMode="decimal"
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
                <h3 className="text-lg font-semibold text-white">Warehouse Locations</h3>
                {formData.dimensions_width_mm && formData.dimensions_height_mm && formData.dimensions_depth_mm && formData.stock_qty > 0 && (
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
                        Föreslå {formData.stock_qty} st
                      </>
                    )}
                  </Button>
                )}
              </div>

              {placementSuggestions && (
                <div className="mb-4 p-4 rounded-lg bg-purple-500/10 border border-purple-500/30">
                  <h4 className="text-sm font-semibold text-purple-300 mb-3">
                    Rekommenderade hyllor för {formData.stock_qty} st:
                  </h4>
                  {placementSuggestions.suggestions.length > 0 ? (
                    <div className="space-y-2">
                      {placementSuggestions.suggestions.slice(0, 5).map((suggestion, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            handleChange('shelf_address', suggestion.shelf_code);
                            setPlacementSuggestions(null);
                          }}
                          className="w-full p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-purple-500/50 transition-all text-left"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-purple-400" />
                              <span className="text-white font-medium">{suggestion.shelf_code}</span>
                            </div>
                            <span className="text-xs text-slate-400">
                              {suggestion.occupancyAfter.toFixed(0)}% beläggning
                            </span>
                          </div>
                          {suggestion.itemsFit && (
                            <div className="text-xs text-green-400">
                              ✓ Plats för alla {formData.stock_qty} enheter
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-amber-300">
                      Inga tillgängliga platser hittades för denna volym. 
                      {formData.stock_qty > 1 && " Överväg att fördela på flera hyllor."}
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">Warehouse</Label>
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
                       handleChange('shelf_address', []);
                     }}
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                        <SelectValue placeholder="Välj lagerställe" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[60vh]" onCloseAutoFocus={(e) => e.preventDefault()}>
                       {warehouses.map((warehouse) => (
                          <SelectItem key={warehouse.id} value={warehouse.name}>
                            {warehouse.code ? `${warehouse.code} - ${warehouse.name}` : warehouse.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="md:col-span-2">
                  <Label className="text-slate-300">Select Location</Label>
                  {!formData.warehouse ? (
                    <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700 text-sm text-slate-500">
                      Välj lagerställe först
                    </div>
                  ) : availableShelves.length === 0 ? (
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm text-amber-300">
                      Inga hyllor hittades för detta lagerställe. Kontrollera att hyllor är skapade under Warehouses.
                      <div className="mt-1 text-xs text-amber-400/70">Warehouse: "{formData.warehouse}"</div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {formData.shelf_address.map((shelf, index) => (
                        <div key={index} className="flex gap-2">
                          <Select 
                            value={shelf} 
                            onValueChange={(value) => {
                              const newShelves = [...formData.shelf_address];
                              newShelves[index] = value;
                              handleChange('shelf_address', newShelves);
                            }}
                          >
                            <SelectTrigger className="bg-slate-800 border-slate-700 text-white flex-1">
                              <SelectValue placeholder="Välj lagerplats" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[60vh]" onCloseAutoFocus={(e) => e.preventDefault()}>
                              <div 
                                className="p-2 border-b border-slate-700 sticky top-0 bg-slate-900 z-10"
                                onPointerDown={(e) => e.stopPropagation()}
                                onKeyDown={(e) => e.stopPropagation()}
                              >
                                <Input
                                  placeholder="Sök lagerplats..."
                                  value={shelfSearch}
                                  onChange={(e) => setShelfSearch(e.target.value)}
                                  className="h-9 bg-slate-800 border-slate-700 text-white"
                                  onKeyDown={(e) => e.stopPropagation()}
                                />
                              </div>
                              {filteredShelves.length === 0 ? (
                                <div className="p-4 text-center text-slate-400 text-sm">
                                  Ingen lagerplats hittades
                                </div>
                              ) : (
                                filteredShelves.map((s) => (
                                  <SelectItem key={s.id} value={s.shelf_code}>
                                    {s.shelf_code}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const newShelves = formData.shelf_address.filter((_, i) => i !== index);
                              handleChange('shelf_address', newShelves);
                            }}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        onClick={() => {
                          handleChange('shelf_address', [...formData.shelf_address, '']);
                        }}
                        variant="outline"
                        size="sm"
                        className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-white w-full"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Lägg till lagerplats
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>



            {/* Tilläggsinfo */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Tilläggsinfo</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label className="text-slate-300">Manufacture Date</Label>
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

            {/* AI-extraherad data (read-only) */}
            {article.ai_extracted_data && Object.keys(article.ai_extracted_data).length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <h3 className="text-lg font-semibold text-white">AI-Extraherad Data</h3>
                </div>
                <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/30">
                  <p className="text-xs text-purple-300 mb-3">Ursprunglig data från AI-scanning</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    {Object.entries(article.ai_extracted_data)
                      .filter(([key, value]) => value && !key.includes('confidence') && !key.includes('image_urls'))
                      .map(([key, value]) => {
                        const confidence = article.ai_confidence_scores?.[key];
                        return (
                          <div key={key} className="flex justify-between items-center">
                            <span className="text-slate-400 capitalize">
                              {key.replace(/_/g, ' ').replace('mm', '(mm)').replace('kg', '(kg)')}:
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-white font-medium">{value}</span>
                              {confidence !== undefined && (
                                <span className={`text-xs px-1.5 py-0.5 rounded ${
                                  confidence >= 0.9 ? 'bg-green-500/20 text-green-400' :
                                  confidence >= 0.7 ? 'bg-yellow-500/20 text-yellow-400' :
                                  'bg-red-500/20 text-red-400'
                                }`}>
                                  {Math.round(confidence * 100)}%
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            )}

            {/* Status */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">Status</Label>
                  <Select value={formData.status} onValueChange={(value) => handleChange('status', value)}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue placeholder="Välj status" />
                    </SelectTrigger>
                    <SelectContent style={{ zIndex: 300 }} onCloseAutoFocus={(e) => e.preventDefault()}>
                      <SelectItem value="active">✅ Aktiv / I lager</SelectItem>
                      <SelectItem value="in_transit">🚢 In Production / I transit</SelectItem>
                      <SelectItem value="low_stock">⚠️ Lågt lager</SelectItem>
                      <SelectItem value="out_of_stock">❌ Slut i lager</SelectItem>
                      <SelectItem value="on_repair">🔧 På reparation</SelectItem>
                      <SelectItem value="discontinued">🚫 Utgått</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.status === 'in_transit' && (
                  <div>
                    <Label className="text-slate-300">Förväntat ankomstdatum</Label>
                    <Input
                      type="date"
                      value={formData.transit_expected_date}
                      onChange={(e) => handleChange('transit_expected_date', e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label className="text-slate-300">Notes</Label>
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
            disabled={isSaving || !formData.name || !formData.storage_type}
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