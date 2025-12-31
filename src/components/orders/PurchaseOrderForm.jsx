import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { X, Plus, Trash2, Package } from "lucide-react";

export default function PurchaseOrderForm({ purchaseOrder, onClose }) {
  const [formData, setFormData] = useState({
    po_number: purchaseOrder?.po_number || '',
    supplier_id: purchaseOrder?.supplier_id || '',
    supplier_name: purchaseOrder?.supplier_name || '',
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

      // Calculate total cost
      const totalCost = poItems.reduce((sum, item) => {
        return sum + (item.quantity_ordered * (item.unit_price || 0));
      }, 0);

      await base44.entities.PurchaseOrder.update(savedPO.id, { total_cost: totalCost });

      // Save PO items
      for (const item of poItems) {
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

      return savedPO;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      queryClient.invalidateQueries({ queryKey: ['purchaseOrderItems'] });
      toast.success(purchaseOrder ? "Inköpsorder uppdaterad" : "Inköpsorder skapad");
      onClose();
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

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.supplier_name) {
      toast.error("Leverantör krävs");
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
                  <SelectItem value="partially_received">Delvis mottagen</SelectItem>
                  <SelectItem value="received">Mottagen</SelectItem>
                  <SelectItem value="cancelled">Avbruten</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
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

          {/* PO Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-slate-300">
                Artiklar
              </label>
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

            {customArticleMode ? (
              <div className="flex gap-2 mb-3">
                <Input
                  value={customArticleName}
                  onChange={(e) => setCustomArticleName(e.target.value)}
                  placeholder="Artikelnamn..."
                  className="flex-1 bg-slate-800 border-slate-700 text-white"
                />
                <Input
                  value={customBatchNumber}
                  onChange={(e) => setCustomBatchNumber(e.target.value)}
                  placeholder="Batch (valfritt)"
                  className="w-32 bg-slate-800 border-slate-700 text-white"
                />
                <Input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  placeholder="Antal"
                  className="w-24 bg-slate-800 border-slate-700 text-white"
                />
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                  placeholder="Pris"
                  className="w-32 bg-slate-800 border-slate-700 text-white"
                />
                <Button
                  type="button"
                  onClick={handleAddArticle}
                  className="bg-blue-600 hover:bg-blue-500"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Lägg till
                </Button>
              </div>
            ) : (
              <div className="flex gap-2 mb-3">
                <Select value={selectedArticle} onValueChange={setSelectedArticle}>
                  <SelectTrigger className="flex-1 bg-slate-800 border-slate-700 text-white">
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

                <Input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  placeholder="Antal"
                  className="w-24 bg-slate-800 border-slate-700 text-white"
                />

                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                  placeholder="Pris"
                  className="w-32 bg-slate-800 border-slate-700 text-white"
                />

                <Button
                  type="button"
                  onClick={handleAddArticle}
                  className="bg-blue-600 hover:bg-blue-500"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Lägg till
                </Button>
              </div>
            )}

            {poItems.length > 0 ? (
              <div className="space-y-2">
                {poItems.map((item, index) => {
                  const itemTotal = item.quantity_ordered * (item.unit_price || 0);
                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <Package className="w-4 h-4 text-slate-400" />
                        <div className="flex-1">
                          <div className="font-medium text-white text-sm flex items-center gap-2">
                            {item.article_name}
                            {item.is_custom && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                Egen
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500">
                            {item.article_batch_number && `Batch: ${item.article_batch_number}`}
                          </div>
                        </div>
                        <div className="text-sm text-slate-400">
                          {item.quantity_ordered} st × {item.unit_price || 0} kr
                        </div>
                        <div className="text-sm font-semibold text-white min-w-[80px] text-right">
                          {itemTotal.toLocaleString('sv-SE')} kr
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => handleRemoveItem(index)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 ml-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
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