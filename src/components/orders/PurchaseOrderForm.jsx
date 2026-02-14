import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { X, Plus, Trash2, Package, FileText, Sparkles, Edit2 } from "lucide-react";

export default function PurchaseOrderForm({ purchaseOrder, onClose }) {
  const [formData, setFormData] = useState({
    po_number: purchaseOrder?.po_number || '',
    supplier_id: purchaseOrder?.supplier_id || '',
    supplier_name: purchaseOrder?.supplier_name || '',
    fortnox_project_number: purchaseOrder?.fortnox_project_number || '',
    status: purchaseOrder?.status || 'draft',
    expected_delivery_date: purchaseOrder?.expected_delivery_date || '',
    order_date: purchaseOrder?.order_date || new Date().toISOString().split('T')[0],
    notes: purchaseOrder?.notes || ''
  });

  const [poItems, setPOItems] = useState([]);
  const [selectedArticle, setSelectedArticle] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [customArticleMode, setCustomArticleMode] = useState(false);
  const [customArticleName, setCustomArticleName] = useState('');
  const [customBatchNumber, setCustomBatchNumber] = useState('');
  const [isScanningInvoice, setIsScanningInvoice] = useState(false);
  const invoiceInputRef = React.useRef(null);

  const queryClient = useQueryClient();

  const { data: articles = [] } = useQuery({
    queryKey: ['articles'],
    queryFn: () => base44.entities.Article.list(),
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list(),
  });

  const { data: existingItems = [] } = useQuery({
    queryKey: ['purchaseOrderItems', purchaseOrder?.id],
    queryFn: () => purchaseOrder?.id ? base44.entities.PurchaseOrderItem.filter({ purchase_order_id: purchaseOrder.id }) : Promise.resolve([]),
    enabled: !!purchaseOrder?.id,
    onSuccess: (items) => {
      if (items.length > 0) {
        setPOItems(items);
      }
    }
  });

  const savePOMutation = useMutation({
    mutationFn: async (data) => {
      let savedPO;
      if (purchaseOrder?.id) {
        await base44.entities.PurchaseOrder.update(purchaseOrder.id, data);
        savedPO = { ...purchaseOrder, ...data };
      } else {
        savedPO = await base44.entities.PurchaseOrder.create(data);
      }

      // Delete removed items
      if (purchaseOrder?.id) {
        const existingIds = existingItems.map(item => item.id);
        const currentIds = poItems.filter(item => item.id).map(item => item.id);
        const toDelete = existingIds.filter(id => !currentIds.includes(id));
        await Promise.all(toDelete.map(id => base44.entities.PurchaseOrderItem.delete(id)));
      }

      // Create articles for custom items and map IDs
      const updatedPoItems = [];
      for (const item of poItems) {
        let finalArticleId = item.article_id;
        
        // If this is a custom article without an article_id, create it
        if (item.is_custom && !item.article_id) {
          const newArticle = await base44.entities.Article.create({
            name: item.article_name,
            batch_number: item.article_batch_number || null,
            supplier_id: formData.supplier_id || null,
            supplier_name: formData.supplier_name || null,
            unit_cost: item.unit_price || 0,
            stock_qty: 0,
            status: 'out_of_stock',
            storage_type: 'company_owned'
          });
          finalArticleId = newArticle.id;
        }
        
        updatedPoItems.push({
          ...item,
          article_id: finalArticleId
        });
      }

      // Save PO items with correct article IDs
      for (const item of updatedPoItems) {
        const article = articles.find(a => a.id === item.article_id);
        const itemData = {
          purchase_order_id: savedPO.id,
          article_id: item.article_id,
          article_name: article?.name || item.article_name,
          article_batch_number: article?.batch_number || item.article_batch_number,
          quantity_ordered: item.quantity_ordered,
          quantity_received: item.quantity_received || 0,
          unit_price: item.unit_price || 0,
          status: item.status || 'pending'
        };

        if (item.id) {
          await base44.entities.PurchaseOrderItem.update(item.id, itemData);
        } else {
          await base44.entities.PurchaseOrderItem.create(itemData);
        }
      }

      // Calculate total cost after all items are saved
      const totalCost = poItems.reduce((sum, item) => {
        return sum + (item.quantity_ordered * (item.unit_price || 0));
      }, 0);

      await base44.entities.PurchaseOrder.update(savedPO.id, { total_cost: totalCost });

      return savedPO;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      queryClient.invalidateQueries({ queryKey: ['purchaseOrderItems'] });
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      toast.success(purchaseOrder ? "Inköpsorder uppdaterad" : "Inköpsorder skapad");
      onClose();
    },
    onError: (error) => {
      console.error('Save PO error:', error);
      toast.error('Kunde inte spara inköpsorder: ' + error.message);
    }
  });

  const handleSupplierChange = (supplierId) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    setFormData({
      ...formData,
      supplier_id: supplierId,
      supplier_name: supplier?.name || ''
    });
  };

  const handleAddArticle = () => {
    if (customArticleMode) {
      if (!customArticleName.trim()) {
        toast.error("Ange artikelnamn");
        return;
      }

      setPOItems([...poItems, {
        article_id: null,
        article_name: customArticleName,
        article_batch_number: customBatchNumber || null,
        quantity_ordered: quantity,
        quantity_received: 0,
        unit_price: unitPrice || 0,
        status: 'pending',
        is_custom: true
      }]);

      setCustomArticleName('');
      setCustomBatchNumber('');
      setQuantity(1);
      setUnitPrice(0);
      setCustomArticleMode(false);
      return;
    }

    if (!selectedArticle) {
      toast.error("Välj en artikel");
      return;
    }

    const article = articles.find(a => a.id === selectedArticle);
    if (!article) return;

    const existingItem = poItems.find(item => item.article_id === selectedArticle);
    if (existingItem) {
      setPOItems(poItems.map(item => 
        item.article_id === selectedArticle
          ? { ...item, quantity_ordered: item.quantity_ordered + quantity }
          : item
      ));
    } else {
      setPOItems([...poItems, {
        article_id: article.id,
        article_name: article.name,
        article_batch_number: article.batch_number,
        quantity_ordered: quantity,
        quantity_received: 0,
        unit_price: unitPrice || article.supplier_price || 0,
        status: 'pending'
      }]);
    }

    setSelectedArticle('');
    setQuantity(1);
    setUnitPrice(0);
  };

  const handleRemoveItem = (index) => {
    setPOItems(poItems.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (index, field, value) => {
    setPOItems(poItems.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const handleInvoiceScan = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanningInvoice(true);
    const loadingToast = toast.loading('Skannar faktura...');

    try {
      // Upload file
      toast.loading('Laddar upp faktura...', { id: loadingToast });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Extract data with AI
      toast.loading('AI analyserar faktura...', { id: loadingToast });
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            invoice_number: { type: "string" },
            invoice_date: { type: "string" },
            supplier_name: { type: "string" },
            total_amount: { type: "number" },
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  article_number: { type: "string" },
                  description: { type: "string" },
                  quantity: { type: "number" },
                  unit_price: { type: "number" },
                  line_total: { type: "number" }
                }
              }
            }
          }
        }
      });

      if (result.status === 'success' && result.output) {
        const data = result.output;
        
        // Check if supplier exists, create if not
        let supplierId = formData.supplier_id;
        if (data.supplier_name) {
          const existingSupplier = suppliers.find(s => 
            s.name.toLowerCase() === data.supplier_name.toLowerCase()
          );
          
          if (!existingSupplier) {
            // Create new supplier
            const newSupplier = await base44.entities.Supplier.create({
              name: data.supplier_name,
              is_active: true
            });
            supplierId = newSupplier.id;
            queryClient.invalidateQueries({ queryKey: ['suppliers'] });
            toast.success(`Ny leverantör "${data.supplier_name}" skapad`);
          } else {
            supplierId = existingSupplier.id;
          }
        }
        
        // Fill in PO details
        setFormData(prev => ({
          ...prev,
          po_number: data.invoice_number || prev.po_number,
          supplier_id: supplierId || prev.supplier_id,
          supplier_name: data.supplier_name || prev.supplier_name,
          order_date: data.invoice_date || prev.order_date
        }));

        // Add items
        if (data.items && data.items.length > 0) {
          const newItems = data.items.map(item => ({
            article_id: null,
            article_name: item.description || '',
            article_batch_number: item.article_number || '',
            quantity_ordered: item.quantity || 1,
            quantity_received: 0,
            unit_price: item.unit_price || 0,
            status: 'pending',
            is_custom: true
          }));
          
          setPOItems([...poItems, ...newItems]);
          toast.success(`${data.items.length} artiklar tillagda från faktura!`, { id: loadingToast });
        } else {
          toast.success('Faktura skannad!', { id: loadingToast });
        }
      } else {
        toast.error('Kunde inte läsa fakturan', { id: loadingToast });
      }
    } catch (error) {
      console.error('Invoice scan error:', error);
      toast.error('Fel vid skanning: ' + error.message, { id: loadingToast });
    } finally {
      setIsScanningInvoice(false);
      if (invoiceInputRef.current) {
        invoiceInputRef.current.value = '';
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.supplier_name) {
      toast.error("Leverantör krävs");
      return;
    }

    if (!formData.fortnox_project_number) {
      toast.error("Projektnummer Fortnox krävs");
      return;
    }

    if (poItems.length === 0) {
      toast.error("Lägg till minst en artikel");
      return;
    }

    savePOMutation.mutate(formData);
  };

  const totalCost = poItems.reduce((sum, item) => {
    return sum + (item.quantity_ordered * (item.unit_price || 0));
  }, 0);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-auto"
      >
        <div className="sticky top-0 bg-slate-900 border-b border-slate-700 p-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">
            {purchaseOrder ? 'Redigera inköpsorder' : 'Ny inköpsorder'}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">
                Ordernummer
              </label>
              <Input
                value={formData.po_number}
                onChange={(e) => setFormData({ ...formData, po_number: e.target.value })}
                placeholder="T.ex. PO-2025-001"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">
                Leverantör *
              </label>
              <Select 
                value={formData.supplier_id} 
                onValueChange={handleSupplierChange}
              >
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Välj leverantör..." />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">
                Projektnummer Fortnox *
              </label>
              <Input
                value={formData.fortnox_project_number}
                onChange={(e) => setFormData({ ...formData, fortnox_project_number: e.target.value })}
                placeholder="T.ex. PRJ-2025-001"
                className="bg-slate-800 border-slate-700 text-white"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">
                Orderdatum
              </label>
              <Input
                type="date"
                value={formData.order_date}
                onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">
                Förväntat leveransdatum
              </label>
              <Input
                type="date"
                value={formData.expected_delivery_date}
                onChange={(e) => setFormData({ ...formData, expected_delivery_date: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">
                Status
              </label>
              <Select 
                value={formData.status} 
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Utkast</SelectItem>
                  <SelectItem value="ordered">Beställd</SelectItem>
                  <SelectItem value="prepaid">Förskottbetald</SelectItem>
                  <SelectItem value="received">Mottagen</SelectItem>
                  <SelectItem value="cancelled">Avbruten</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex-1">
              <label className="text-sm font-medium text-slate-300 mb-2 block">
                Anteckningar
              </label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Interna anteckningar..."
                className="bg-slate-800 border-slate-700 text-white h-20"
              />
            </div>
            <div>
              <input
                ref={invoiceInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleInvoiceScan}
                className="hidden"
              />
              <Button
                type="button"
                size="sm"
                onClick={() => invoiceInputRef.current?.click()}
                disabled={isScanningInvoice}
                className="bg-gradient-to-r from-purple-600 to-blue-600 border-0 hover:from-purple-500 hover:to-blue-500 text-white h-20 whitespace-normal"
              >
                {isScanningInvoice ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Skannar...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Skanna faktura
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* PO Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-slate-300">
                Artiklar
              </label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setCustomArticleMode(!customArticleMode)}
                  className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-white"
                >
                  {customArticleMode ? 'Välj från lager' : 'Egen artikel'}
                </Button>
              </div>
            </div>

            {customArticleMode ? (
              <div className="space-y-2 mb-3">
                <div className="text-xs font-medium text-slate-400 mb-1">Artiklar</div>
                <div className="grid grid-cols-[150px_1fr_100px_100px_auto] gap-2">
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Artikelnr</div>
                    <Input
                      value={customBatchNumber}
                      onChange={(e) => setCustomBatchNumber(e.target.value)}
                      placeholder="Batch"
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Benämning</div>
                    <Input
                      value={customArticleName}
                      onChange={(e) => setCustomArticleName(e.target.value)}
                      placeholder="Artikelnamn..."
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Enhetspris</div>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={unitPrice}
                      onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                      placeholder="Pris"
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Antal</div>
                    <Input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                      placeholder="Antal"
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      onClick={handleAddArticle}
                      className="bg-blue-600 hover:bg-blue-500 w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Lägg till
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2 mb-3">
                <div className="text-xs font-medium text-slate-400 mb-1">Artiklar</div>
                <div className="grid grid-cols-[1fr_100px_100px_auto] gap-2">
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Välj artikel</div>
                    <Select value={selectedArticle} onValueChange={setSelectedArticle}>
                      <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                        <SelectValue placeholder="Välj artikel..." />
                      </SelectTrigger>
                      <SelectContent>
                        {articles.map((article) => (
                          <SelectItem key={article.id} value={article.id}>
                            {article.name} ({article.batch_number || 'N/A'})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Enhetspris</div>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={unitPrice}
                      onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                      placeholder="Pris"
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Antal</div>
                    <Input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                      placeholder="Antal"
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      onClick={handleAddArticle}
                      className="bg-blue-600 hover:bg-blue-500 w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Lägg till
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {poItems.length > 0 ? (
              <div className="space-y-2">
                <div className="grid grid-cols-[150px_1fr_100px_100px_100px_auto] gap-2 px-3 py-2 text-xs font-medium text-slate-500">
                  <div>Artikelnr</div>
                  <div>Benämning</div>
                  <div>Enhetspris</div>
                  <div>Antal</div>
                  <div className="text-right">Summa</div>
                  <div></div>
                </div>
                {poItems.map((item, index) => {
                  const itemTotal = item.quantity_ordered * (item.unit_price || 0);
                  return (
                    <div
                      key={index}
                      className="grid grid-cols-[150px_1fr_100px_100px_100px_auto] gap-2 p-3 rounded-lg bg-slate-800/50 border border-slate-700 items-center"
                    >
                      <div>
                        <Input
                          value={item.article_batch_number || ''}
                          onChange={(e) => handleUpdateItem(index, 'article_batch_number', e.target.value)}
                          placeholder="Batch"
                          className="bg-slate-800 border-slate-700 text-white text-sm h-9"
                        />
                      </div>
                      <div>
                        <Input
                          value={item.article_name}
                          onChange={(e) => handleUpdateItem(index, 'article_name', e.target.value)}
                          placeholder="Benämning"
                          className="bg-slate-800 border-slate-700 text-white text-sm h-9"
                        />
                      </div>
                      <div>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_price || 0}
                          onChange={(e) => handleUpdateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                          className="bg-slate-800 border-slate-700 text-white text-sm h-9"
                        />
                      </div>
                      <div>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity_ordered}
                          onChange={(e) => handleUpdateItem(index, 'quantity_ordered', parseInt(e.target.value) || 1)}
                          className="bg-slate-800 border-slate-700 text-white text-sm h-9"
                        />
                      </div>
                      <div className="text-sm font-semibold text-white text-right">
                        {itemTotal.toLocaleString('sv-SE')} kr
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => handleRemoveItem(index)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-9 w-9"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
                
                {/* Total */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                  <span className="font-semibold text-white">Totalt</span>
                  <span className="text-lg font-bold text-white">
                    {totalCost.toLocaleString('sv-SE')} kr
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 border border-dashed border-slate-700 rounded-lg">
                <Package className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-500">
                  Inga artiklar tillagda ännu
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-white"
            >
              Avbryt
            </Button>
            <Button
              type="submit"
              disabled={savePOMutation.isPending}
              className="bg-blue-600 hover:bg-blue-500"
            >
              {savePOMutation.isPending ? 'Sparar...' : purchaseOrder ? 'Uppdatera' : 'Skapa inköpsorder'}
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}