import React, { useState, useEffect, useRef } from 'react';
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { X, Plus, Trash2, Package, FileText, Sparkles, Edit2, CheckCircle2, ExternalLink, Zap, AlertTriangle, Search } from "lucide-react";

export default function PurchaseOrderForm({ purchaseOrder, onClose }) {
  const [formData, setFormData] = useState({
     po_number: purchaseOrder?.po_number || '',
     intern_reference: purchaseOrder?.intern_reference || purchaseOrder?.po_number || '',
     supplier_id: purchaseOrder?.supplier_id || '',
     supplier_name: purchaseOrder?.supplier_name || '',
     warehouse_id: purchaseOrder?.warehouse_id || '',
     warehouse_name: purchaseOrder?.warehouse_name || '',
     fortnox_project_number: purchaseOrder?.fortnox_project_number || '',
     status: purchaseOrder?.status || 'draft',
     expected_delivery_date: purchaseOrder?.expected_delivery_date || '',
     order_date: purchaseOrder?.order_date || new Date().toISOString().split('T')[0],
     notes: purchaseOrder?.notes || '',
     rm_system_id: purchaseOrder?.rm_system_id || '',
     rm_system_url: purchaseOrder?.rm_system_url || '',
     invoice_file_url: purchaseOrder?.invoice_file_url || '',
     invoice_number: purchaseOrder?.invoice_number || '',
     delivery_terms: purchaseOrder?.delivery_terms || '',
     mode_of_transport: purchaseOrder?.mode_of_transport || '',
     payment_terms: purchaseOrder?.payment_terms || '',
     shipping_cost: purchaseOrder?.shipping_cost || '',
     cost_center: purchaseOrder?.cost_center || '',
   });

  const [poItems, setPOItems] = useState([]);
  const [selectedArticle, setSelectedArticle] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [customArticleMode, setCustomArticleMode] = useState(false);
  const [customArticleName, setCustomArticleName] = useState('');
  const [customBatchNumber, setCustomBatchNumber] = useState('');
  const [customSku, setCustomSku] = useState('');
  const [isScanningInvoice, setIsScanningInvoice] = useState(false);
  const [isReceiving, setIsReceiving] = useState(false);
  const [receivedQuantities, setReceivedQuantities] = useState({});
  const invoiceInputRef = React.useRef(null);
  const invoiceFileUrlRef = React.useRef(purchaseOrder?.invoice_file_url || '');

  const queryClient = useQueryClient();

  const { data: articles = [] } = useQuery({
    queryKey: ['articles'],
    queryFn: () => base44.entities.Article.list(),
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list(),
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => base44.entities.Warehouse.filter({ is_active: true }),
  });

  const [fortnoxProjects, setFortnoxProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [projectsLoaded, setProjectsLoaded] = useState(false);
  const [projectSearch, setProjectSearch] = useState('');

  const loadFortnoxProjects = async () => {
    if (projectsLoaded || loadingProjects) return;
    setLoadingProjects(true);
    try {
      const res = await base44.functions.invoke('getFortnoxProjects', {});
      setFortnoxProjects(res.data?.projects || []);
      setProjectsLoaded(true);
    } catch (e) {
      console.warn('Kunde inte hämta Fortnox-projekt:', e.message);
    } finally {
      setLoadingProjects(false);
    }
  };

  const { data: existingItems = [] } = useQuery({
    queryKey: ['purchaseOrderItems', purchaseOrder?.id],
    queryFn: () => purchaseOrder?.id ? base44.entities.PurchaseOrderItem.filter({ purchase_order_id: purchaseOrder.id }) : Promise.resolve([]),
    enabled: !!purchaseOrder?.id,
  });

  const [itemsLoaded, setItemsLoaded] = useState(false);

  useEffect(() => {
    if (!itemsLoaded && existingItems.length > 0) {
      setPOItems(existingItems);
      setItemsLoaded(true);
    }
  }, [existingItems]);

  const savePOMutation = useMutation({
    mutationFn: async (data) => {
      let savedPO;
      if (purchaseOrder?.id) {
        await base44.entities.PurchaseOrder.update(purchaseOrder.id, data);
        savedPO = { ...purchaseOrder, ...data };
      } else {
        // Generate a unique supplier portal token
        const token = crypto.randomUUID().replace(/-/g, '');
        savedPO = await base44.entities.PurchaseOrder.create({ ...data, supplier_portal_token: token });
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
          sku: item.article_sku || null,
          batch_number: item.article_batch_number || null,
          supplier_id: formData.supplier_id || null,
          supplier_name: formData.supplier_name || null,
          unit_cost: item.unit_price != null ? item.unit_price : 0,
          stock_qty: 0,
          status: 'out_of_stock',
          storage_type: 'company_owned',
          // Koppla artikeln till inköpsordern och originalfakturan
          source_purchase_order_id: savedPO.id,
          source_invoice_url: data.invoice_file_url || null,
          source_invoice_number: data.invoice_number || null,
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
          article_id: item.article_id || null,
          article_name: article?.name || item.article_name,
          article_sku: item.article_sku || article?.sku,
          article_batch_number: item.article_batch_number || article?.batch_number,
          quantity_ordered: item.quantity_ordered,
          quantity_received: item.quantity_received || 0,
          unit_price: item.unit_price != null ? item.unit_price : 0,
          status: item.status || 'pending',
          warranty_period_months: item.warranty_period_months ?? null
        };

        if (item.id) {
          await base44.entities.PurchaseOrderItem.update(item.id, itemData);
        } else {
          await base44.entities.PurchaseOrderItem.create(itemData);
        }

        // Sync article SKU back to Inventory and update other fields
        if (item.article_id) {
          try {
            const articleUpdate = {};
            // Sync name if changed in PO
            if (item.article_name && item.article_name !== article?.name) {
              articleUpdate.name = item.article_name;
            }
            // Sync SKU if changed in PO
            if (item.article_sku && item.article_sku !== article?.sku) {
              articleUpdate.sku = item.article_sku;
            }
            if (data.expected_delivery_date) {
              articleUpdate.transit_expected_date = data.expected_delivery_date;
              articleUpdate.status = 'in_transit';
            }
            if (item.unit_price != null && item.unit_price !== undefined) {
              articleUpdate.unit_cost = item.unit_price;
            }
            if (Object.keys(articleUpdate).length > 0) {
              await base44.entities.Article.update(item.article_id, articleUpdate);
            }
          } catch (e) {
            console.warn('Could not update article', item.article_id, e.message);
          }
        }
      }

      // Calculate total cost after all items are saved (inkl. leveranskostnad)
      const itemsCost = poItems.reduce((sum, item) => {
        return sum + (item.quantity_ordered * (item.unit_price || 0));
      }, 0);
      const totalCost = itemsCost + (Number(data.shipping_cost) || 0);

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

  const selectedSupplier = suppliers.find(s => s.id === formData.supplier_id);
  const supplierMissingFortnoxNumber = formData.supplier_id && !selectedSupplier?.fortnox_supplier_number;
  const itemsMissingSkus = poItems.filter(item => !item.article_sku && !(item.article_id && articles.find(a => a.id === item.article_id)?.sku));

  const handleSupplierChange = (supplierId) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    setFormData(prev => ({
      ...prev,
      supplier_id: supplierId,
      supplier_name: supplier?.name || ''
    }));
  };

  const handleWarehouseChange = (warehouseId) => {
    const warehouse = warehouses.find(w => w.id === warehouseId);
    setFormData(prev => ({
      ...prev,
      warehouse_id: warehouseId,
      warehouse_name: warehouse?.name || ''
    }));
  };

  const handlePoNumberChange = (value) => {
    setFormData(prev => ({
      ...prev,
      po_number: value,
      // Auto-fill intern_reference only if it hasn't been manually changed
      intern_reference: prev.intern_reference === prev.po_number ? value : prev.intern_reference
    }));
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
        article_sku: customSku || null,
        article_batch_number: customBatchNumber || null,
        quantity_ordered: quantity,
        quantity_received: 0,
        unit_price: unitPrice || 0,
        status: 'pending',
        is_custom: true
      }]);

      setCustomArticleName('');
      setCustomBatchNumber('');
      setCustomSku('');
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
        article_sku: article.sku,
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

  const generateSku = (item, index) => {
    const name = item.article_name || '';
    const words = name.replace(/[^a-zA-Z0-9\s]/g, '').trim().toUpperCase().split(/\s+/).filter(w => w.length > 0);
    const namePart = words.slice(0, 3).map(w => w.substring(0, 4)).join('-');
    const batchSuffix = item.article_batch_number?.length >= 4 ? `-${item.article_batch_number.slice(-4)}` : '';
    const prefix = '90';
    const baseSku = `${prefix}-${namePart}${batchSuffix}`;
    // Check for duplicates among current items
    const siblings = poItems.filter((it, i) => i !== index && it.article_sku?.startsWith(baseSku));
    const sku = siblings.length > 0 ? `${baseSku}-${String(siblings.length + 1).padStart(2, '0')}` : baseSku;
    handleUpdateItem(index, 'article_sku', sku);
  };

  const handleInvoiceScan = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanningInvoice(true);
    const loadingToast = toast.loading('Skannar faktura...');

    try {
      // Upload file and save URL permanently
      toast.loading('Laddar upp faktura...', { id: loadingToast });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Save the original file URL immediately - both in ref (sync) and state (async)
      invoiceFileUrlRef.current = file_url;
      setFormData(prev => ({ ...prev, invoice_file_url: file_url }));

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
        let supplierName = formData.supplier_name;
        if (data.supplier_name) {
          const existingSupplier = suppliers.find(s => 
            s.name.toLowerCase() === data.supplier_name.toLowerCase()
          );
          
          if (!existingSupplier) {
            const newSupplier = await base44.entities.Supplier.create({
              name: data.supplier_name,
              is_active: true
            });
            supplierId = newSupplier.id;
            supplierName = newSupplier.name;
            await queryClient.invalidateQueries({ queryKey: ['suppliers'] });
            toast.success(`Ny leverantör "${data.supplier_name}" skapad automatiskt`);
          } else {
            supplierId = existingSupplier.id;
            supplierName = existingSupplier.name;
          }
        }
        
        // Fill in PO details (including invoice number and file url)
        setFormData(prev => ({
          ...prev,
          po_number: data.invoice_number || prev.po_number,
          invoice_number: data.invoice_number || prev.invoice_number,
          supplier_id: supplierId || prev.supplier_id,
          supplier_name: supplierName || prev.supplier_name,
          order_date: data.invoice_date || prev.order_date,
          invoice_file_url: file_url, // explicit to ensure it's not lost from earlier setState
        }));

        // Add items
        if (data.items && data.items.length > 0) {
          const newItems = data.items.map(item => ({
            article_id: null,
            article_name: item.description || '',
            article_sku: item.article_number || '',
            article_batch_number: '',
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

  const handleReceiveItem = async (item, index) => {
    const received = parseFloat(receivedQuantities[index] || 0);
    if (received <= 0) {
      toast.error("Ange antal som mottagits");
      return;
    }

    setIsReceiving(true);
    try {
      if (item.article_id) {
        const article = articles.find(a => a.id === item.article_id);
        const newStock = (article?.stock_qty || 0) + received;
        
        await base44.entities.Article.update(item.article_id, {
          stock_qty: newStock,
          status: 'active'
        });

        await base44.entities.StockMovement.create({
          article_id: item.article_id,
          movement_type: 'inbound',
          quantity: received,
          previous_qty: article?.stock_qty || 0,
          new_qty: newStock,
          reason: `Mottagning från inköpsorder ${formData.po_number || 'N/A'}`
        });

        // Update PO item received quantity
        if (item.id) {
          await base44.entities.PurchaseOrderItem.update(item.id, {
            quantity_received: (item.quantity_received || 0) + received
          });
        }

        toast.success(`${received} st mottaget och lagret uppdaterat!`);
        queryClient.invalidateQueries({ queryKey: ['articles'] });
        queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
        
        setReceivedQuantities({
          ...receivedQuantities,
          [index]: 0
        });
      }
    } catch (error) {
      console.error('Error receiving item:', error);
      toast.error('Kunde inte uppdatera: ' + error.message);
    } finally {
      setIsReceiving(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.supplier_name) {
      toast.error("Leverantör krävs");
      return;
    }

    if (poItems.length === 0 && !purchaseOrder) {
      toast.error("Lägg till minst en artikel");
      return;
    }

    // Use ref for invoice_file_url to avoid stale React state closure
    savePOMutation.mutate({ ...formData, invoice_file_url: invoiceFileUrlRef.current || formData.invoice_file_url });
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
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-auto"
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
                Ordernummer / Referens
              </label>
              <Input
                value={formData.po_number}
                onChange={(e) => handlePoNumberChange(e.target.value)}
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
                      {supplier.name}{supplier.fortnox_supplier_number ? ` (FN: ${supplier.fortnox_supplier_number})` : ' ⚠️ Saknar FN-nr'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">
                Lagerställe *
              </label>
              <Select
                value={formData.warehouse_id}
                onValueChange={handleWarehouseChange}
              >
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Välj lagerställe..." />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((wh) => (
                    <SelectItem key={wh.id} value={wh.id}>
                      {wh.name}{wh.fortnox_stock_point_code ? ` (${wh.fortnox_stock_point_code})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">
                Vår referens
              </label>
              <Input
                value={formData.intern_reference}
                onChange={(e) => setFormData(prev => ({ ...prev, intern_reference: e.target.value }))}
                placeholder="Fylls i automatiskt från ordernummer"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">
                Projekt (Fortnox)
              </label>
              <Select
                value={formData.fortnox_project_number || '__none__'}
                onValueChange={(value) => setFormData(prev => ({ ...prev, fortnox_project_number: value === '__none__' ? '' : value }))}
                onOpenChange={(open) => { if (open) { loadFortnoxProjects(); setProjectSearch(''); } }}
              >
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Välj projekt (valfritt)...">
                    {formData.fortnox_project_number
                      ? (() => { const p = fortnoxProjects.find(p => p.projectNumber === formData.fortnox_project_number); return p ? `${p.projectNumber} – ${p.description}` : formData.fortnox_project_number; })()
                      : 'Välj projekt...'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <div className="px-2 py-2 sticky top-0 bg-popover">
                    <div className="flex items-center gap-2 rounded-md border border-slate-700 bg-slate-800 px-2">
                      <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <input
                        className="flex-1 bg-transparent text-sm text-white placeholder-slate-400 outline-none py-1.5"
                        placeholder="Sök projekt..."
                        value={projectSearch}
                        onChange={(e) => setProjectSearch(e.target.value)}
                        onKeyDown={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                  <SelectItem value="__none__">— Inget projekt —</SelectItem>
                  {loadingProjects && (
                    <div className="px-3 py-2 text-sm text-slate-400">Hämtar projekt från Fortnox...</div>
                  )}
                  {fortnoxProjects
                    .filter(p => !projectSearch || `${p.projectNumber} ${p.description}`.toLowerCase().includes(projectSearch.toLowerCase()))
                    .map((p) => (
                      <SelectItem key={p.projectNumber} value={p.projectNumber}>
                        {p.projectNumber} – {p.description}
                      </SelectItem>
                    ))}
                  {!loadingProjects && projectsLoaded && fortnoxProjects.length === 0 && (
                    <div className="px-3 py-2 text-sm text-slate-400">Inga projekt hittades</div>
                  )}
                  {formData.fortnox_project_number && !fortnoxProjects.find(p => p.projectNumber === formData.fortnox_project_number) && (
                    <SelectItem value={formData.fortnox_project_number}>
                      {formData.fortnox_project_number} (nuvarande)
                    </SelectItem>
                  )}
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
                Leveransdatum
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
                  <SelectItem value="sent">Skickad till leverantör</SelectItem>
                  <SelectItem value="confirmed">Bekräftad av leverantör</SelectItem>
                  <SelectItem value="waiting_for_supplier_documentation">Väntar på dokumentation</SelectItem>
                  <SelectItem value="in_production">Under produktion</SelectItem>
                  <SelectItem value="shipped">Skickad / I transit</SelectItem>
                  <SelectItem value="ready_for_reception">Klar för mottagning</SelectItem>
                  <SelectItem value="received">Mottagen</SelectItem>
                  <SelectItem value="cancelled">Avbruten</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">
                Leveransvillkor
              </label>
              <Select
                value={formData.delivery_terms}
                onValueChange={(value) => setFormData({ ...formData, delivery_terms: value })}
              >
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Välj leveransvillkor..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EXW">EXW – Ex Works</SelectItem>
                  <SelectItem value="FOB">FOB – Free On Board</SelectItem>
                  <SelectItem value="CIF">CIF – Cost, Insurance &amp; Freight</SelectItem>
                  <SelectItem value="DAP">DAP – Delivered At Place</SelectItem>
                  <SelectItem value="DDP">DDP – Delivered Duty Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">
                Fraktsätt
              </label>
              <Select
                value={formData.mode_of_transport}
                onValueChange={(value) => setFormData({ ...formData, mode_of_transport: value })}
              >
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Välj transportsätt..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="air_freight_express">Flygfrakt Express</SelectItem>
                  <SelectItem value="air_freight_economy">Flygfrakt Economy</SelectItem>
                  <SelectItem value="sea_freight">Sjöfrakt</SelectItem>
                  <SelectItem value="rail_transport">Järnväg</SelectItem>
                  <SelectItem value="road_transport">Landtransport</SelectItem>
                  <SelectItem value="courier">Kurir/Paket</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">
                Betalningsvillkor
              </label>
              <Select
                value={formData.payment_terms}
                onValueChange={(value) => setFormData({ ...formData, payment_terms: value })}
              >
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Välj betalningsvillkor..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30_dagar_netto">30 dagar netto</SelectItem>
                  <SelectItem value="10_dagar_2_procent">10 dagar 2%</SelectItem>
                  <SelectItem value="omedelbar_betalning">Omedelbar betalning</SelectItem>
                  <SelectItem value="60_dagar_netto">60 dagar netto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">
                Kostnadsställe (Fortnox)
              </label>
              <Select
                value={formData.cost_center}
                onValueChange={(value) => setFormData(prev => ({ ...prev, cost_center: value }))}
              >
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Välj kostnadsställe..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10_support_service">10 – Support/Service</SelectItem>
                  <SelectItem value="20_rental">20 – Rental</SelectItem>
                  <SelectItem value="30_sales">30 – Sales</SelectItem>
                  <SelectItem value="99_generell">99 – Generell</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">
                Leveranskostnad (SEK)
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.shipping_cost}
                onChange={(e) => setFormData({ ...formData, shipping_cost: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                placeholder="T.ex. 1500"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">
                RM-system ID
              </label>
              <Input
                value={formData.rm_system_id}
                onChange={(e) => setFormData({ ...formData, rm_system_id: e.target.value })}
                placeholder="ID/referens i RM-systemet"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">
                RM-system länk
              </label>
              <Input
                value={formData.rm_system_url}
                onChange={(e) => setFormData({ ...formData, rm_system_url: e.target.value })}
                placeholder="Länk till ordern i RM-systemet"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
          </div>

          {/* Invoice upload section */}
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-400" />
                Fakturadokument (originalformat)
              </label>
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
                className="bg-gradient-to-r from-purple-600 to-blue-600 border-0 hover:from-purple-500 hover:to-blue-500 text-white"
              >
                {isScanningInvoice ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Skannar...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    {formData.invoice_file_url ? 'Byt faktura' : 'Skanna & ladda upp faktura'}
                  </>
                )}
              </Button>
            </div>

            {formData.invoice_file_url && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span className="text-sm text-emerald-300 flex-1 truncate">Faktura uppladdad och sparad</span>
                <button
                  type="button"
                  onClick={() => window.open(formData.invoice_file_url, '_blank')}
                  className="text-emerald-400 hover:text-emerald-300"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Fakturanummer</label>
                <Input
                  value={formData.invoice_number}
                  onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                  placeholder="T.ex. INV-2025-001"
                  className="bg-slate-900 border-slate-700 text-white text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Anteckningar</label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Interna anteckningar..."
                  className="bg-slate-900 border-slate-700 text-white h-9 text-sm resize-none"
                />
              </div>
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
                <div className="grid grid-cols-[130px_130px_1fr_90px_80px_auto] gap-2">
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Article Number</div>
                    <Input
                      value={customSku}
                      onChange={(e) => setCustomSku(e.target.value)}
                      placeholder="SKU"
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Batch ID</div>
                    <Input
                      value={customBatchNumber}
                      onChange={(e) => setCustomBatchNumber(e.target.value)}
                      placeholder="Batchnr"
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
              <div className="space-y-3">
                <div className="grid grid-cols-[110px_110px_minmax(160px,1fr)_90px_80px_70px_90px_auto] gap-3 px-3 py-2 text-xs font-medium text-slate-500">
                 <div>Article Number</div>
                 <div>Batch ID</div>
                 <div>Benämning</div>
                 <div>Enhetspris</div>
                 <div>Antal</div>
                 <div>Garanti (mån)</div>
                 <div className="text-right">Summa</div>
                 <div></div>
                </div>
                {poItems.map((item, index) => {
                   const itemTotal = item.quantity_ordered * (item.unit_price || 0);
                    // Get latest article data if article_id exists
                    const currentArticle = item.article_id ? articles.find(a => a.id === item.article_id) : null;
                    const displaySku = currentArticle?.sku || item.article_sku || '';
                    const alreadyReceived = item.quantity_received || 0;
                    const stillNeedReceive = item.quantity_ordered - alreadyReceived;
                    return (
                     <div
                      key={index}
                      className="rounded-lg bg-slate-800/50 border border-slate-700 p-4 space-y-3"
                     >
                      <div className="grid grid-cols-[110px_110px_minmax(160px,1fr)_90px_80px_70px_90px_auto] gap-3 items-center">
                         <div className="flex gap-1 items-center">
                            <Input
                              value={displaySku}
                              onChange={(e) => handleUpdateItem(index, 'article_sku', e.target.value)}
                              placeholder="Article Number"
                              className="bg-slate-800 border-slate-700 text-white text-sm h-9 flex-1"
                            />
                           <button
                             type="button"
                             title="Auto-generera SKU"
                             onClick={() => generateSku(item, index)}
                             className="h-9 w-9 flex-shrink-0 flex items-center justify-center rounded-md bg-slate-700 hover:bg-amber-500/20 hover:text-amber-400 text-slate-400 border border-slate-600 transition-colors"
                           >
                             <Zap className="w-3.5 h-3.5" />
                           </button>
                         </div>
                         <div>
                           <Input
                             value={item.article_batch_number || ''}
                             onChange={(e) => handleUpdateItem(index, 'article_batch_number', e.target.value)}
                             placeholder="Batch ID"
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
                             value={item.unit_price ?? ''}
                             onChange={(e) => handleUpdateItem(index, 'unit_price', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                             className="bg-slate-800 border-slate-700 text-white text-sm h-9"
                           />
                         </div>
                         <div>
                           <Input
                             type="number"
                             min="0"
                             step="any"
                             value={item.quantity_ordered}
                             onChange={(e) => handleUpdateItem(index, 'quantity_ordered', parseFloat(e.target.value) || 0)}
                             className="bg-slate-800 border-slate-700 text-white text-sm h-9"
                           />
                         </div>
                         <div>
                           <Input
                             type="number"
                             min="0"
                             step="1"
                             value={item.warranty_period_months ?? ''}
                             onChange={(e) => handleUpdateItem(index, 'warranty_period_months', e.target.value === '' ? null : parseInt(e.target.value))}
                             placeholder="mån"
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

                       {purchaseOrder && stillNeedReceive > 0 && (
                         <div className="bg-slate-700/50 rounded p-3 flex items-center gap-3">
                           <div className="flex-1">
                             <div className="text-xs text-slate-400 mb-1">Mottagning: {alreadyReceived}/{item.quantity_ordered} mottaget</div>
                             <div className="flex gap-2">
                               <Input
                                 type="number"
                                 min="1"
                                 max={stillNeedReceive}
                                 value={receivedQuantities[index] || ''}
                                 onChange={(e) => setReceivedQuantities({...receivedQuantities, [index]: e.target.value})}
                                 placeholder={`Max ${stillNeedReceive}`}
                                 className="bg-slate-800 border-slate-700 text-white text-sm h-8 flex-1"
                               />
                               <Button
                                 type="button"
                                 size="sm"
                                 onClick={() => handleReceiveItem(item, index)}
                                 disabled={isReceiving}
                                 className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm"
                               >
                                 Ta emot
                               </Button>
                             </div>
                           </div>
                         </div>
                       )}
                     </div>
                  );
                })}
                
                {/* Total */}
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/60">Artiklar</span>
                    <span className="text-white">{totalCost.toLocaleString('sv-SE')} kr</span>
                  </div>
                  {formData.shipping_cost > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/60">Leveranskostnad</span>
                      <span className="text-white">{Number(formData.shipping_cost).toLocaleString('sv-SE')} kr</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between border-t border-blue-500/30 pt-1.5">
                    <span className="font-semibold text-white">Totalt</span>
                    <span className="text-lg font-bold text-white">
                      {(totalCost + (Number(formData.shipping_cost) || 0)).toLocaleString('sv-SE')} kr
                    </span>
                  </div>
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

          {/* Fortnox sync readiness warnings */}
          {(supplierMissingFortnoxNumber || itemsMissingSkus.length > 0) && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-medium text-sm">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                Förutsättningar saknas för Fortnox-sync
              </div>
              {supplierMissingFortnoxNumber && (
                <p className="text-xs text-amber-300/80 pl-6">
                  Leverantören saknar <strong>Fortnox leverantörsnummer</strong> — lägg till det under Leverantörer för att inleverans-sync ska fungera.
                </p>
              )}
              {itemsMissingSkus.length > 0 && (
                <p className="text-xs text-amber-300/80 pl-6">
                  <strong>{itemsMissingSkus.length} artikel{itemsMissingSkus.length > 1 ? 'ar' : ''}</strong> saknar Article Number (SKU) — krävs för att Fortnox ska känna igen artiklarna vid inleverans.
                </p>
              )}
            </div>
          )}

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