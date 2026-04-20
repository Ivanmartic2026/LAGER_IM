import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { 
  Search, Camera, Package, AlertTriangle, Filter, TrendingUp,
  Grid3X3, List, Plus, SlidersHorizontal, Sparkles,
  ClipboardList, Download, Upload, ArrowUpDown, MapPin, Building,
  CheckSquare, Trash2, Edit2, X, Database, Printer,
  ChevronDown, MoreHorizontal, TrendingDown, AlertCircle, Wrench, ArrowUpCircle, ChevronUp, Truck
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import ArticleDetail from "@/components/articles/ArticleDetail";
import StockAdjustmentModal from "@/components/articles/StockAdjustmentModal";
import ArticleEditForm from "@/components/articles/ArticleEditForm";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import QuickInventory from "@/components/inventory/QuickInventory";
import PickListGenerator from "@/components/inventory/PickListGenerator";
import ImportPreview from "@/components/inventory/ImportPreview";
import ColumnMapper from "@/components/inventory/ColumnMapper";
import PullToRefresh from "@/components/utils/PullToRefresh";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Highlight matching text in search results
function HighlightText({ text, query }) {
  if (!query || !text) return <>{text}</>;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = String(text).split(new RegExp(`(${escaped})`, 'gi'));
  return <>{parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase()
      ? <mark key={i} style={{background:'#fde047',color:'#000',borderRadius:'2px',padding:'0 1px'}}>{part}</mark>
      : part
  )}</>;
}

export default function InventoryPage() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const initialStatus = urlParams.get('status') || 'all';
  
  // Restore state from localStorage
  const getStoredState = () => {
    try {
      const stored = localStorage.getItem('inventory_state');
      const parsed = stored ? JSON.parse(stored) : {};
      // Only restore safe status filters from cache
      const safeFilters = ['all', 'active', 'low_stock', 'out_of_stock'];
      if (!safeFilters.includes(parsed.statusFilter)) parsed.statusFilter = 'all';
      return parsed;
    } catch {
      return {};
    }
  };

  const storedState = getStoredState();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [viewMode, setViewMode] = useState(storedState.viewMode || "grid");
  const [statusFilter, setStatusFilter] = useState(initialStatus !== 'all' ? initialStatus : 'all');
  const [warehouseFilter, setWarehouseFilter] = useState(storedState.warehouseFilter || "all");
  const [storageTypeFilter, setStorageTypeFilter] = useState(storedState.storageTypeFilter || "all");
  const [categoryFilter, setCategoryFilter] = useState(storedState.categoryFilter || "all");
  const [shelfFilter, setShelfFilter] = useState(storedState.shelfFilter || "");
  const [adjustmentModal, setAdjustmentModal] = useState({ open: false, type: null });
  const [editingArticle, setEditingArticle] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [quickInventoryOpen, setQuickInventoryOpen] = useState(false);
  const [pickListOpen, setPickListOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [sortBy, setSortBy] = useState('newest');
  const [selectedArticleIds, setSelectedArticleIds] = useState([]);
  const [quickActionArticle, setQuickActionArticle] = useState(null);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const fileInputRef = React.useRef(null);
  
  const queryClient = useQueryClient();

  const { data: articles = [], isLoading, refetch } = useQuery({
    queryKey: ['articles'],
    queryFn: () => base44.entities.Article.list('-created_date'),
    staleTime: 60000,
    gcTime: 300000,
    refetchOnWindowFocus: false,
  });

  // Subscribe to article changes for real-time reserved stock updates
  React.useEffect(() => {
    const unsubscribe = base44.entities.Article.subscribe((event) => {
      if (event.type === 'update' && event.data?.reserved_stock_qty !== undefined) {
        queryClient.setQueryData(['articles'], (oldData) => {
          if (!Array.isArray(oldData)) return oldData;
          return oldData.map(a => a.id === event.id ? event.data : a);
        });
      }
    });
    return unsubscribe;
  }, [queryClient]);

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list(),
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => base44.entities.Warehouse.list(),
  });

  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ['purchaseOrders'],
    queryFn: () => base44.entities.PurchaseOrder.list(),
  });

  const { data: purchaseOrderItems = [] } = useQuery({
    queryKey: ['purchaseOrderItems'],
    queryFn: () => base44.entities.PurchaseOrderItem.list(),
  });

  const updateArticleMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const updatedArticle = await base44.entities.Article.update(id, data);
      // Sync sku, article_name, and supplier to linked PurchaseOrderItems
      const linkedItems = await base44.entities.PurchaseOrderItem.filter({ article_id: id });
      if (linkedItems.length > 0) {
        const syncData = {};
        if (data.sku !== undefined) syncData.article_sku = data.sku;
        if (data.name !== undefined) syncData.article_name = data.name;
        if (data.supplier_name !== undefined) syncData.supplier_name = data.supplier_name;
        if (data.supplier_id !== undefined) syncData.supplier_id = data.supplier_id;
        if (Object.keys(syncData).length > 0) {
          await Promise.all(linkedItems.map(item => base44.entities.PurchaseOrderItem.update(item.id, syncData)));
        }
      }
      return updatedArticle;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      queryClient.invalidateQueries({ queryKey: ['purchaseOrderItems'] });
      setEditingArticle(null);
      toast.success("Artikel uppdaterad");
    }
  });

  const deleteArticleMutation = useMutation({
    mutationFn: (id) => base44.entities.Article.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      setSelectedArticle(null);
      toast.success("Artikel borttagen");
    }
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids) => {
      console.log('Bulk delete starting for IDs:', ids);
      const results = await Promise.allSettled(
        ids.map(id => base44.entities.Article.delete(id))
      );
      const failed = results.filter(r => r.status === 'rejected');
      if (failed.length > 0) {
        console.error('Failed deletes:', failed);
        throw new Error(`${failed.length} av ${ids.length} artiklar kunde inte tas bort`);
      }
      console.log('Bulk delete completed successfully');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      setSelectedArticleIds([]);
      toast.success("Artiklar borttagna");
    },
    onError: (error) => {
      console.error('Bulk delete error:', error);
      toast.error(error.message || "Kunde inte ta bort artiklar");
    }
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ ids, data }) => {
      const results = await Promise.allSettled(
        ids.map(id => base44.entities.Article.update(id, data))
      );
      const failed = results.filter(r => r.status === 'rejected');
      if (failed.length > 0) {
        throw new Error(`${failed.length} artikel(ar) kunde inte uppdateras`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      setSelectedArticleIds([]);
      setBulkEditOpen(false);
      toast.success("Artiklar uppdaterade");
    },
    onError: (error) => {
      toast.error(error.message || "Kunde inte uppdatera artiklar");
    }
  });

  const createMovementMutation = useMutation({
    mutationFn: (data) => base44.entities.StockMovement.create(data),
  });

  const handleAdjustStock = async ({ quantity, reason }) => {
    if (!selectedArticle) return;

    const previousQty = selectedArticle.stock_qty || 0;
    const newQty = previousQty + quantity;

    await updateArticleMutation.mutateAsync({
      id: selectedArticle.id,
      data: { 
        stock_qty: newQty,
        status: newQty <= 0 ? "out_of_stock" : 
                newQty <= (selectedArticle.min_stock_level || 5) ? "low_stock" : "active"
      }
    });

    await createMovementMutation.mutateAsync({
      article_id: selectedArticle.id,
      movement_type: quantity > 0 ? "inbound" : "outbound",
      quantity: quantity,
      previous_qty: previousQty,
      new_qty: newQty,
      reason: reason || (quantity > 0 ? "Manuell tillägg" : "Manuellt uttag")
    });

    setSelectedArticle(prev => ({ ...prev, stock_qty: newQty }));
    setAdjustmentModal({ open: false, type: null });
    toast.success("Lagersaldo uppdaterat");
  };

  const handleExportExcel = async () => {
    setIsExportingExcel(true);
    const loadingToast = toast.loading('Förbereder Excel-export...');

    try {
      const response = await base44.functions.invoke('exportArticles', {});

      let binaryData;

      if (typeof response.data === 'string') {
        const bytes = new Uint8Array(response.data.length);
        for (let i = 0; i < response.data.length; i++) {
          bytes[i] = response.data.charCodeAt(i);
        }
        binaryData = bytes;
      } else if (response.data instanceof ArrayBuffer) {
        binaryData = response.data;
      } else if (response.data instanceof Blob) {
        binaryData = response.data;
      } else {
        binaryData = new Uint8Array(response.data);
      }

      const blob = binaryData instanceof Blob 
        ? binaryData 
        : new Blob([binaryData], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `artiklar_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();

      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        a.remove();
      }, 100);

      toast.success('Excel-fil nedladdad!', { id: loadingToast });
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Kunde inte exportera: ' + error.message, { id: loadingToast });
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleExportCsv = async () => {
    setIsExportingCsv(true);
    const loadingToast = toast.loading('Förbereder CSV-export...');

    try {
      const response = await base44.functions.invoke('exportArticlesCsv', {});

      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `artiklar_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();

      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        a.remove();
      }, 100);

      toast.success('CSV-fil nedladdad!', { id: loadingToast });
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Kunde inte exportera: ' + error.message, { id: loadingToast });
    } finally {
      setIsExportingCsv(false);
    }
  };

  const [importPreview, setImportPreview] = useState(null);
  const [columnMappingData, setColumnMappingData] = useState(null);

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      console.log('No file selected');
      return;
    }

    console.log('Starting import for file:', file.name);
    setIsImporting(true);
    const loadingToast = toast.loading(`Läser in ${file.name}...`);

    try {
      toast.loading('Laddar upp fil...', { id: loadingToast });
      
      // Upload file first
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      console.log('File uploaded:', file_url);
      toast.loading('Analyserar artiklar...', { id: loadingToast });
      
      // Parse file to get preview (without mapping first)
      const result = await base44.functions.invoke('parseImportFile', { file_url });
      
      console.log('Parse result:', result);

      if (result.data?.success) {
        toast.dismiss(loadingToast);
        
        // Check if we need column mapping
        if (result.data.needsMapping) {
          setColumnMappingData({
            file_url,
            columns: result.data.columns,
            previewData: result.data.previewData
          });
        } else {
          setImportPreview(result.data.articles);
        }
      } else {
        toast.error(result.data?.error || 'Kunde inte läsa filen', { id: loadingToast });
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Kunde inte läsa filen: ' + error.message, { id: loadingToast });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleColumnMapping = async (mapping) => {
    setIsImporting(true);
    const loadingToast = toast.loading('Analyserar med mappning...');

    try {
      const result = await base44.functions.invoke('parseImportFile', { 
        file_url: columnMappingData.file_url,
        columnMapping: mapping
      });

      if (result.data?.success) {
        toast.dismiss(loadingToast);
        setImportPreview(result.data.articles);
        setColumnMappingData(null);
      } else {
        toast.error(result.data?.error || 'Kunde inte analysera filen', { id: loadingToast });
      }
    } catch (error) {
      console.error('Column mapping error:', error);
      toast.error('Kunde inte analysera: ' + error.message, { id: loadingToast });
    } finally {
      setIsImporting(false);
    }
  };

  const handleConfirmImport = async (selectedArticles) => {
    setIsImporting(true);
    const loadingToast = toast.loading('Importerar artiklar...');

    try {
      const result = await base44.functions.invoke('confirmImportArticles', { 
        articles: selectedArticles 
      });

      if (result.data?.success) {
        toast.success(result.data.message || 'Import slutförd!', { id: loadingToast });
        queryClient.invalidateQueries({ queryKey: ['articles'] });
        setImportPreview(null);
      } else {
        toast.error(result.data?.error || 'Import misslyckades', { id: loadingToast });
      }
    } catch (error) {
      console.error('Confirm import error:', error);
      toast.error('Kunde inte importera: ' + error.message, { id: loadingToast });
    } finally {
      setIsImporting(false);
    }
  };

  const supplierMap = {};
  suppliers.forEach(s => supplierMap[s.id] = s.name);

  // Calculate incoming quantities for each article
  const incomingQuantities = {};
  const ACTIVE_PO_STATUSES = ['draft', 'sent', 'confirmed', 'waiting_for_supplier_documentation', 'in_production', 'shipped', 'ready_for_reception'];
  purchaseOrderItems.forEach(item => {
    const po = purchaseOrders.find(p => p.id === item.purchase_order_id);
    if (po && ACTIVE_PO_STATUSES.includes(po.status)) {
      const remaining = item.quantity_ordered - (item.quantity_received || 0);
      if (remaining > 0) {
        if (!incomingQuantities[item.article_id]) {
          incomingQuantities[item.article_id] = { quantity: 0, dates: [], poStatus: po.status };
        }
        incomingQuantities[item.article_id].quantity += remaining;
        if (po.expected_delivery_date) {
          incomingQuantities[item.article_id].dates.push(po.expected_delivery_date);
        }
      }
    }
  });

  const filteredArticles = articles
    .filter(article => {
      const shelfStr = Array.isArray(article.shelf_address)
        ? article.shelf_address.join(' ')
        : (article.shelf_address || '');
      const matchesSearch = !searchQuery || 
        article.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.batch_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.manufacturer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.supplier_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        shelfStr.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || 
        (statusFilter === "on_purchase_order" 
          ? (!!incomingQuantities[article.id] || article.status === 'in_transit')
          : article.status === statusFilter);
      const matchesWarehouse = warehouseFilter === "all" || article.warehouse === warehouseFilter;
      const matchesStorageType = storageTypeFilter === "all" || article.storage_type === storageTypeFilter;
      const matchesCategory = categoryFilter === "all" || article.category === categoryFilter;
      const matchesShelf = !shelfFilter || shelfStr.toLowerCase().includes(shelfFilter.toLowerCase());
      
      return matchesSearch && matchesStatus && matchesWarehouse && matchesStorageType && matchesCategory && matchesShelf;
    })
    .sort((a, b) => {
      switch(sortBy) {
        case 'newest':
          return new Date(b.created_date) - new Date(a.created_date);
        case 'name':
          return (a.name || '').localeCompare(b.name || '');
        case 'shelf':
          const shelfA = Array.isArray(a.shelf_address) ? a.shelf_address[0] || '' : a.shelf_address || '';
          const shelfB = Array.isArray(b.shelf_address) ? b.shelf_address[0] || '' : b.shelf_address || '';
          return shelfA.localeCompare(shelfB);
        case 'supplier':
          const supplierA = supplierMap[a.supplier_id] || a.manufacturer || '';
          const supplierB = supplierMap[b.supplier_id] || b.manufacturer || '';
          return supplierA.localeCompare(supplierB);
        case 'stock':
          return (b.stock_qty || 0) - (a.stock_qty || 0);
        case 'batch':
          return (a.batch_number || '').localeCompare(b.batch_number || '');
        default:
          return 0;
      }
    });

  const stats = {
    total: articles.length,
    lowStock: articles.filter(a => a.status === "low_stock").length,
    outOfStock: articles.filter(a => a.status === "out_of_stock").length,
    onRepair: articles.filter(a => a.status === "on_repair").length,
    onPurchaseOrder: articles.filter(a => !!incomingQuantities[a.id] || a.status === 'in_transit').length,
    pendingVerification: articles.filter(a => a.status === "pending_verification").length
  };

  // Save state to localStorage when filters change
  React.useEffect(() => {
    const state = {
      viewMode,
      statusFilter,
      warehouseFilter,
      storageTypeFilter,
      categoryFilter,
      shelfFilter
    };
    localStorage.setItem('inventory_state', JSON.stringify(state));
  }, [viewMode, statusFilter, warehouseFilter, storageTypeFilter, categoryFilter, shelfFilter]);

  // Check URL for article selection and edit mode
  React.useEffect(() => {
    const articleId = urlParams.get('articleId');
    const editMode = urlParams.get('edit');
    
    if (articleId && articles.length > 0) {
      const article = articles.find(a => a.id === articleId);
      if (article) {
        setSelectedArticle(article);
        if (editMode === 'true') {
          setEditingArticle(article);
        }
      } else {
        // Article not found, clear the URL parameter
        window.history.replaceState({}, '', createPageUrl("Inventory"));
      }
    }
  }, [articles]);

  if (selectedArticle) {
    return (
      <div className="min-h-screen bg-black p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          <ArticleDetail
            article={selectedArticle}
            onBack={() => {
              setSelectedArticle(null);
              window.history.replaceState({}, '', createPageUrl("Inventory"));
            }}
            onEdit={() => setEditingArticle(selectedArticle)}
            onDelete={() => deleteArticleMutation.mutate(selectedArticle.id)}
            onAdjustStock={(type) => setAdjustmentModal({ open: true, type })}
          />

          <StockAdjustmentModal
            isOpen={adjustmentModal.open}
            onClose={() => setAdjustmentModal({ open: false, type: null })}
            article={selectedArticle}
            type={adjustmentModal.type}
            onSubmit={handleAdjustStock}
            isSubmitting={updateArticleMutation.isPending}
          />

          {editingArticle && (
            <ArticleEditForm
              article={editingArticle}
              onSave={(data) => {
                updateArticleMutation.mutate({ id: editingArticle.id, data });
                setSelectedArticle({ ...selectedArticle, ...data });
              }}
              onCancel={() => setEditingArticle(null)}
              isSaving={updateArticleMutation.isPending}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={async () => {
      await queryClient.invalidateQueries({ queryKey: ['articles'] });
      toast.success('Uppdaterad!');
    }}>
      <div className="min-h-screen bg-black p-4 md:p-6">
        <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-white tracking-tight">Lager</h1>

            <div className="flex gap-2 items-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImport}
                className="hidden"
                id="file-import-input"
              />

              {/* Actions Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" className="bg-white/10 border border-white/20 hover:bg-white/20 text-white">
                    <MoreHorizontal className="w-4 h-4 mr-2" />
                    Åtgärder
                    <ChevronDown className="w-3 h-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-zinc-900 border-white/10 text-white">
                  <DropdownMenuItem onClick={handleExportExcel} disabled={isExportingExcel} className="hover:bg-white/10 cursor-pointer">
                    <Download className="w-4 h-4 mr-2 text-green-400" />
                    {isExportingExcel ? "Exporterar Excel..." : "Exportera Excel"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportCsv} disabled={isExportingCsv} className="hover:bg-white/10 cursor-pointer">
                    <Download className="w-4 h-4 mr-2 text-blue-400" />
                    {isExportingCsv ? "Exporterar CSV..." : "Exportera CSV"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/10" />
                  <DropdownMenuItem onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="hover:bg-white/10 cursor-pointer">
                    <Upload className="w-4 h-4 mr-2 text-purple-400" />
                    {isImporting ? "Importerar..." : "Importera Excel"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Link to={createPageUrl("Scan")}>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-lg shadow-blue-500/30">
                  <Camera className="w-4 h-4 mr-2" />
                  Skanna
                </Button>
              </Link>
            </div>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
            <motion.button
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              onClick={() => setStatusFilter('all')}
              className="p-5 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 hover:border-white/20 hover:shadow-2xl hover:shadow-white/5 transition-all duration-300 cursor-pointer group text-left"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/30 to-blue-600/30 flex items-center justify-center group-hover:shadow-lg group-hover:shadow-blue-500/30 transition-all duration-300">
                  <Package className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform duration-300" />
                </div>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-3xl font-bold text-white mb-1 tracking-tight">{stats.total}</p>
              <p className="text-sm text-white/50">Artiklar</p>
            </motion.button>

            <motion.button
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              onClick={() => setStatusFilter(statusFilter === 'low_stock' ? 'all' : 'low_stock')}
              className={cn(
                "p-5 rounded-2xl backdrop-blur-sm border transition-all duration-300 cursor-pointer group text-left",
                statusFilter === 'low_stock'
                  ? "bg-amber-500/20 border-amber-500/40 shadow-lg shadow-amber-500/10"
                  : "bg-[#3a3d42]/60 border-[#5a5d62]/50 hover:bg-[#3a3d42]/80 hover:border-[#7B7F85] hover:shadow-xl hover:shadow-amber-500/10"
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/30 to-amber-600/30 flex items-center justify-center group-hover:shadow-lg group-hover:shadow-amber-500/30 transition-all duration-300">
                  <AlertTriangle className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform duration-300" />
                </div>
              </div>
              <p className="text-3xl font-bold text-white mb-1 tracking-tight">{stats.lowStock}</p>
              <p className="text-sm text-white/50">Lågt lager</p>
            </motion.button>

            <motion.button
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              onClick={() => setStatusFilter(statusFilter === 'out_of_stock' ? 'all' : 'out_of_stock')}
              className={cn(
                "p-5 rounded-2xl backdrop-blur-sm border transition-all duration-300 cursor-pointer group text-left",
                statusFilter === 'out_of_stock'
                  ? "bg-red-500/20 border-red-500/40 shadow-lg shadow-red-500/10"
                  : "bg-[#3a3d42]/60 border-[#5a5d62]/50 hover:bg-[#3a3d42]/80 hover:border-[#7B7F85] hover:shadow-xl hover:shadow-red-500/10"
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500/30 to-red-600/30 flex items-center justify-center group-hover:shadow-lg group-hover:shadow-red-500/30 transition-all duration-300">
                  <Package className="w-5 h-5 text-red-400 group-hover:scale-110 transition-transform duration-300" />
                </div>
              </div>
              <p className="text-3xl font-bold text-white mb-1 tracking-tight">{stats.outOfStock}</p>
              <p className="text-sm text-white/50">Slut i lager</p>
            </motion.button>

            <motion.button
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              onClick={() => setStatusFilter(statusFilter === 'on_repair' ? 'all' : 'on_repair')}
              className={cn(
                "p-5 rounded-2xl backdrop-blur-sm border transition-all duration-300 cursor-pointer group text-left",
                statusFilter === 'on_repair'
                  ? "bg-orange-500/20 border-orange-500/40 shadow-lg shadow-orange-500/10"
                  : "bg-[#3a3d42]/60 border-[#5a5d62]/50 hover:bg-[#3a3d42]/80 hover:border-[#7B7F85] hover:shadow-xl hover:shadow-orange-500/10"
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/30 to-orange-600/30 flex items-center justify-center group-hover:shadow-lg group-hover:shadow-orange-500/30 transition-all duration-300">
                  <Package className="w-5 h-5 text-orange-400 group-hover:scale-110 transition-transform duration-300" />
                </div>
              </div>
              <p className="text-3xl font-bold text-white mb-1 tracking-tight">{stats.onRepair}</p>
              <p className="text-sm text-white/50">På reparation</p>
            </motion.button>

            <motion.button
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              onClick={() => setStatusFilter(statusFilter === 'on_purchase_order' ? 'all' : 'on_purchase_order')}
              className={cn(
                "p-5 rounded-2xl backdrop-blur-sm border transition-all duration-300 cursor-pointer group text-left",
                statusFilter === 'on_purchase_order'
                  ? "bg-amber-500/20 border-amber-500/40 shadow-lg shadow-amber-500/10"
                  : "bg-[#3a3d42]/60 border-[#5a5d62]/50 hover:bg-[#3a3d42]/80 hover:border-[#7B7F85] hover:shadow-xl hover:shadow-amber-500/10"
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/30 to-amber-600/30 flex items-center justify-center group-hover:shadow-lg group-hover:shadow-amber-500/30 transition-all duration-300">
                  <Truck className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform duration-300" />
                </div>
              </div>
              <p className="text-3xl font-bold text-white mb-1 tracking-tight">{stats.onPurchaseOrder}</p>
              <p className="text-sm text-white/50">På inköp</p>
            </motion.button>
          </div>

          {/* Bulk Actions Toolbar */}
          <AnimatePresence>
            {selectedArticleIds.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-4 p-4 rounded-xl bg-blue-600 border border-blue-500 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <CheckSquare className="w-5 h-5 text-white" />
                  <span className="text-white font-medium">
                    {selectedArticleIds.length} artikel{selectedArticleIds.length !== 1 ? 'ar' : ''} vald{selectedArticleIds.length !== 1 ? 'a' : ''}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const loadingToast = toast.loading(`Genererar ${selectedArticleIds.length} etiketter...`);
                      try {
                        const response = await base44.functions.invoke('generateA4Label', { articleIds: selectedArticleIds });
                        const html2canvas = (await import('html2canvas')).default;
                        
                        const articlesList = response.data?.articles || [{ id: selectedArticleIds[0], name: 'artikel', html: response.data }];
                        
                        for (const item of articlesList) {
                          const iframe = document.createElement('iframe');
                          iframe.style.position = 'absolute';
                          iframe.style.width = '1240px';
                          iframe.style.height = '1754px';
                          iframe.style.left = '-9999px';
                          document.body.appendChild(iframe);
                          
                          iframe.contentDocument.write(item.html);
                          iframe.contentDocument.close();
                          
                          await new Promise(resolve => setTimeout(resolve, 500));
                          
                          const canvas = await html2canvas(iframe.contentDocument.body, {
                            width: 1240,
                            height: 1754,
                            scale: 2,
                            backgroundColor: '#ffffff'
                          });
                          
                          await new Promise((resolve) => {
                            canvas.toBlob((blob) => {
                              const url = window.URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `artikel_${item.name}_${Date.now()}.png`;
                              document.body.appendChild(a);
                              a.click();
                              window.URL.revokeObjectURL(url);
                              a.remove();
                              resolve();
                            }, 'image/png');
                          });
                          
                          document.body.removeChild(iframe);
                        }
                        
                        toast.success(`${articlesList.length} etiketter nedladdade!`, { id: loadingToast });
                      } catch (error) {
                        console.error('A4 bulk error:', error);
                        toast.error('Kunde inte generera etiketter: ' + error.message, { id: loadingToast });
                      }
                    }}
                    className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    A4
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBulkEditOpen(true)}
                    className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Redigera
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (confirm(`Är du säker på att du vill ta bort ${selectedArticleIds.length} artikel${selectedArticleIds.length !== 1 ? 'ar' : ''}?`)) {
                        console.log('Starting bulk delete for:', selectedArticleIds);
                        bulkDeleteMutation.mutate(selectedArticleIds);
                      }
                    }}
                    disabled={bulkDeleteMutation.isPending}
                    className="bg-red-500/20 border-red-500/30 text-white hover:bg-red-500/30"
                  >
                    {bulkDeleteMutation.isPending ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                        Tar bort...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Ta bort
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedArticleIds([])}
                    className="text-white hover:bg-white/10"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Search & Filters */}
          <div className="space-y-2">
            {/* Search + Filter toggle row */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Sök artikel, batch, SKU, hyllplats, leverantör..."
                  className="pl-10 h-10 bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-white placeholder:text-white/40 transition-all text-base"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFiltersOpen(f => !f)}
                className={cn(
                  "h-10 px-3 border transition-all",
                  filtersOpen || warehouseFilter !== 'all' || storageTypeFilter !== 'all' || categoryFilter !== 'all' || !!shelfFilter
                    ? "bg-blue-600/20 border-blue-500/40 text-blue-400"
                    : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                )}
              >
                <Filter className="w-4 h-4 mr-1.5" />
                Filter
                {filtersOpen ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
              </Button>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-10 w-36 bg-white/5 border-white/10 text-white/70">
                  <SelectValue placeholder="Kategori" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-white/10 text-white">
                  <SelectItem value="all">Alla kategorier</SelectItem>
                  <SelectItem value="Cabinet">Cabinet</SelectItem>
                  <SelectItem value="LED Module">LED Module</SelectItem>
                  <SelectItem value="Power Supply">Power Supply</SelectItem>
                  <SelectItem value="Receiving Card">Receiving Card</SelectItem>
                  <SelectItem value="Control Processor">Control Processor</SelectItem>
                  <SelectItem value="Computer">Computer</SelectItem>
                  <SelectItem value="Cable">Kabel</SelectItem>
                  <SelectItem value="Accessory">Tillbehör</SelectItem>
                  <SelectItem value="Other">Övrigt</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-10 w-36 bg-white/5 border-white/10 text-white/70">
                  <ArrowUpDown className="w-3 h-3 mr-1.5 text-white/40" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-white/10 text-white">
                  <SelectItem value="newest">Nyast</SelectItem>
                  <SelectItem value="name">Namn A–Ö</SelectItem>
                  <SelectItem value="shelf">Hyllplats</SelectItem>
                  <SelectItem value="stock">Saldo</SelectItem>
                  <SelectItem value="supplier">Leverantör</SelectItem>
                  <SelectItem value="batch">Batch</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Collapsible Filters */}
            <AnimatePresence>
              {filtersOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
                      <SelectTrigger className="w-48 h-9 bg-white/5 border-white/10 text-white text-sm">
                        <SelectValue placeholder="Lager" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-white/10 text-white">
                        <SelectItem value="all">Alla lager</SelectItem>
                        {warehouses.map(warehouse => (
                          <SelectItem key={warehouse.id} value={warehouse.name}>{warehouse.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={storageTypeFilter} onValueChange={setStorageTypeFilter}>
                      <SelectTrigger className="w-44 h-9 bg-white/5 border-white/10 text-white text-sm">
                        <SelectValue placeholder="Lagertyp" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-white/10 text-white">
                      <SelectItem value="all">Alla typer</SelectItem>
                      <SelectItem value="company_owned">Företagsägt</SelectItem>
                      <SelectItem value="customer_owned">Kundägt</SelectItem>
                      <SelectItem value="rental_stock">Hyrlager</SelectItem>
                      <SelectItem value="installation_register">Anläggsningsregister</SelectItem>
                      <SelectItem value="tillöko_ekonomi">Tillöko Ekonomi</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="w-48 h-9 bg-white/5 border-white/10 text-white text-sm">
                        <SelectValue placeholder="Kategori" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-white/10 text-white">
                        <SelectItem value="all">Alla kategorier</SelectItem>
                        <SelectItem value="Cabinet">Kabinett</SelectItem>
                        <SelectItem value="LED Module">LED-modul</SelectItem>
                        <SelectItem value="Power Supply">Strömförsörjning</SelectItem>
                        <SelectItem value="Receiving Card">Receiving card</SelectItem>
                        <SelectItem value="Control Processor">Control Processor</SelectItem>
                        <SelectItem value="Computer">Dator</SelectItem>
                        <SelectItem value="Cable">Kabel</SelectItem>
                        <SelectItem value="Accessory">Tillbehör</SelectItem>
                        <SelectItem value="Other">Övrigt</SelectItem>
                      </SelectContent>
                    </Select>

                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
                      <input
                        value={shelfFilter}
                        onChange={(e) => setShelfFilter(e.target.value)}
                        placeholder="Filtrera hyllplats..."
                        className="pl-9 h-9 w-40 bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/40 rounded-md px-3 focus:outline-none focus:border-blue-500/50"
                      />
                    </div>

                    {(warehouseFilter !== 'all' || storageTypeFilter !== 'all' || categoryFilter !== 'all' || shelfFilter) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setWarehouseFilter('all'); setStorageTypeFilter('all'); setCategoryFilter('all'); setShelfFilter(''); }}
                        className="h-9 text-white/50 hover:text-white hover:bg-white/10 text-sm"
                      >
                        <X className="w-3 h-3 mr-1" />
                        Rensa filter
                      </Button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Filter Chips */}
            <div className="flex gap-2 overflow-x-auto pb-1" style={{scrollbarWidth:'none'}}>
              {[
                { label: 'Alla', value: 'all', filter: 'status', count: articles.length },
                { label: 'Aktiv', value: 'active', filter: 'status', count: articles.filter(a => a.status === 'active').length },
                { label: 'Lågt lager', value: 'low_stock', filter: 'status', count: stats.lowStock },
                { label: 'Slut', value: 'out_of_stock', filter: 'status', count: stats.outOfStock },
                { label: 'Reparation', value: 'on_repair', filter: 'status', count: stats.onRepair },
                { label: 'På inköp', value: 'on_purchase_order', filter: 'status', count: stats.onPurchaseOrder },
                { label: '⏳ Väntande', value: 'pending_verification', filter: 'status', count: stats.pendingVerification },
                { label: 'Kundägd', value: 'customer_owned', filter: 'storage', count: articles.filter(a => a.storage_type === 'customer_owned').length },
                { label: 'Uthyrning', value: 'rental_stock', filter: 'storage', count: articles.filter(a => a.storage_type === 'rental_stock').length },
              ].map(chip => {
                const isActive = chip.filter === 'status' ? statusFilter === chip.value : storageTypeFilter === chip.value;
                return (
                  <button
                    key={chip.value}
                    onClick={() => {
                      if (chip.filter === 'status') setStatusFilter(chip.value);
                      else setStorageTypeFilter(v => v === chip.value ? 'all' : chip.value);
                    }}
                    className={cn(
                      'flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium border transition-all',
                      isActive
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
                    )}
                  >
                    {chip.label} {chip.count > 0 && <span className="opacity-70">({chip.count})</span>}
                  </button>
                );
              })}
            </div>

            {/* Results count */}
            <div className="text-xs text-white/40 pt-1">
              Visar {filteredArticles.length} av {articles.length} artiklar
            </div>
          </div>
        </div>

        {/* Articles List */}
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-20 md:h-24 rounded-2xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-white/30" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              {searchQuery ? "Inga artiklar hittades" : "Inga artiklar ännu"}
            </h3>
            <p className="text-white/50 mb-6">
              {searchQuery 
                ? "Prova ett annat sökord" 
                : "Börja med att skanna din första artikel"}
            </p>
            {!searchQuery && (
              <Link to={createPageUrl("Scan")}>
                <Button className="bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/50 hover:shadow-blue-500/70 transition-all duration-300">
                  <Camera className="w-4 h-4 mr-2" />
                  Skanna artikel
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {/* Desktop Table - scrollable */}
            <div className="hidden md:block overflow-x-auto rounded-2xl">
              {/* Header Row */}
              <div className="flex px-4 py-2 text-xs font-medium text-white/40 uppercase tracking-wider border-b border-white/10 items-center" style={{minWidth: '900px'}}>
                <div className="w-10 flex-shrink-0 flex items-center">
                  <Checkbox
                    checked={selectedArticleIds.length === filteredArticles.length && filteredArticles.length > 0}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedArticleIds(filteredArticles.map(a => a.id));
                      } else {
                        setSelectedArticleIds([]);
                      }
                    }}
                  />
                </div>
                <div className="w-16 flex-shrink-0"></div>
                <div className="flex gap-2 text-center">
                  <div className="w-16 flex-shrink-0">Lager</div>
                  <div className="w-16 flex-shrink-0">Res.</div>
                  <div className="w-16 flex-shrink-0">Till.</div>
                </div>
                <div className="w-28 flex-shrink-0 ml-2">ETA</div>
                <div className="flex-1 min-w-[300px] ml-2">Product Name</div>
                <div className="w-32 flex-shrink-0 ml-2">Location</div>
                <div className="w-44 flex-shrink-0 ml-2">Article Number</div>
                <div className="w-36 flex-shrink-0 ml-2">Batch ID</div>
              </div>

              <AnimatePresence>
                {filteredArticles.map((article) => {
                  const hasLowStock = article.stock_qty > 0 && article.stock_qty <= (article.min_stock_level || 10);
                  const isTransit = article.status === 'in_transit' || article.status === 'on_its_way_home';
                  const stockColor = isTransit ? 'text-blue-400' : (article.stock_qty || 0) <= 0 ? 'text-red-400' : hasLowStock ? 'text-orange-400' : 'text-green-400';
                  const imageUrl = article.image_urls?.[0] || article.image_url;
                  return (
                    <motion.div
                      key={article.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      onClick={() => setSelectedArticle(article)}
                      style={{minWidth: '1050px'}}
                      className={cn(
                        "flex items-center px-4 py-3 my-1 rounded-2xl cursor-pointer transition-all backdrop-blur-xl border active:scale-[0.98] duration-300 hover:shadow-2xl hover:shadow-white/5",
                        article.status === 'in_transit'
                          ? "bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/15 hover:border-blue-500/50"
                          : article.status === 'on_its_way_home'
                          ? "bg-violet-500/10 border-violet-500/30 hover:bg-violet-500/15 hover:border-violet-500/50"
                          : "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10"
                      )}
                    >
                      <div className="w-10 flex-shrink-0">
                        <Checkbox
                          checked={selectedArticleIds.includes(article.id)}
                          onCheckedChange={(checked) => {
                            if (checked) setSelectedArticleIds(prev => [...prev, article.id]);
                            else setSelectedArticleIds(prev => prev.filter(id => id !== article.id));
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      {/* Image */}
                      {imageUrl ? (
                        <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-slate-900/50">
                          <img src={imageUrl} alt={article.name} className="w-full h-full object-cover" loading="lazy" />
                        </div>
                      ) : (
                        <div className="flex-shrink-0 w-16 h-16 rounded-lg bg-white/5 flex items-center justify-center">
                          <Package className="w-6 h-6 text-white/30" />
                        </div>
                      )}
                      {/* Stock - Split into 3 columns */}
                       <div className="flex gap-2 ml-0">
                         {/* I Lager */}
                         <div className="w-16 text-center">
                           <div className={cn("text-xl font-bold leading-none mb-1 tracking-tight flex items-center justify-center gap-0.5", stockColor)}>
                             {(article.stock_qty || 0) === 0 && <span>⚠️</span>}
                             {article.stock_qty || 0}
                           </div>
                           <div className="text-[10px] text-white/40">Lager</div>
                         </div>
                         {/* Reserverat */}
                         <div className="w-16 text-center">
                           <div className="text-xl font-bold leading-none mb-1 text-purple-400 tracking-tight">
                             {article.reserved_stock_qty || 0}
                           </div>
                           <div className="text-[10px] text-white/40">Res.</div>
                         </div>
                         {/* Tillgängligt */}
                         <div className="w-16 text-center">
                           <div className={cn("text-xl font-bold leading-none mb-1 tracking-tight", Math.max(0, (article.stock_qty || 0) - (article.reserved_stock_qty || 0)) <= 0 ? "text-red-400" : "text-emerald-400")}>
                             {Math.max(0, (article.stock_qty || 0) - (article.reserved_stock_qty || 0))}
                           </div>
                           <div className="text-[10px] text-white/40">Till.</div>
                         </div>
                       </div>
                      {/* ETA */}
                      <div className="w-28 flex-shrink-0 ml-2">
                        {incomingQuantities[article.id] ? (
                          <div className="flex flex-col gap-0.5 bg-amber-500/15 border border-amber-500/40 rounded-xl px-2 py-1.5">
                            <div className="text-amber-300 text-[10px] font-semibold uppercase tracking-wider">🚚 ETA</div>
                            <span className="text-amber-200 font-bold text-xs truncate">
                              {incomingQuantities[article.id].quantity} st
                              {incomingQuantities[article.id].dates.length > 0 && 
                                ` · ${format(new Date(Math.min(...incomingQuantities[article.id].dates.map(d => new Date(d)))), "d MMM", { locale: sv })}`
                              }
                            </span>
                          </div>
                        ) : <span className="text-xs text-white/20">—</span>}
                      </div>
                      {/* Name */}
                      <div className="flex-1 min-w-[300px] ml-2">
                        <div className="font-semibold text-white text-sm mb-0.5 whitespace-normal word-break break-word tracking-tight"><HighlightText text={article.customer_name || article.name} query={searchQuery} /></div>
                        {article.supplier_name && (
                          <div className="text-xs text-white/50 whitespace-normal word-break break-word">
                            <HighlightText text={article.supplier_name} query={searchQuery} />{article.series && ` • ${article.series}`}{article.pitch_value && ` • ${article.pitch_value}`}
                          </div>
                        )}
                      </div>
                      {/* Location */}
                      <div className="w-32 flex-shrink-0 ml-2">
                        {article.shelf_address ? (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-white/40 flex-shrink-0" />
                            <span className="text-sm font-medium text-white truncate">{Array.isArray(article.shelf_address) ? article.shelf_address[0] : article.shelf_address}</span>
                          </div>
                        ) : <span className="text-xs text-white/20">—</span>}
                      </div>
                      {/* Article Number */}
                      <div className="w-44 flex-shrink-0 ml-2">
                        {article.sku ? (
                          <span className="text-sm font-mono text-blue-400 truncate block">{article.sku}</span>
                        ) : <span className="text-xs text-white/20">—</span>}
                      </div>
                      {/* Batch ID */}
                      <div className="w-36 flex-shrink-0 ml-2">
                        {article.batch_number ? (
                          <span className="text-sm font-medium text-white truncate block">{article.batch_number}</span>
                        ) : <span className="text-xs text-white/20">—</span>}
                      </div>
                      {/* Quick Actions */}
                      <div className="w-10 flex-shrink-0 flex items-center justify-center ml-1" onClick={e => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="w-8 h-8 rounded-lg flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 transition-all">
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="bg-zinc-900 border-white/10 text-white" align="end">
                            <DropdownMenuItem onClick={() => setSelectedArticle(article)} className="hover:bg-white/10 cursor-pointer">👁 Se detalj</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setSelectedArticle(article); setAdjustmentModal({open:true,type:'out'}); }} className="hover:bg-white/10 cursor-pointer">📦 Ta ut</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate('/PurchaseOrders')} className="hover:bg-white/10 cursor-pointer">🛒 Beställ</DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-white/10" />
                            <DropdownMenuItem onClick={() => { setSelectedArticle(article); setEditingArticle(article); }} className="hover:bg-white/10 cursor-pointer">✏️ Flytta / Redigera</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Mobile Layout */}
            <AnimatePresence>
              {filteredArticles.map((article) => {
                const hasLowStockM = article.stock_qty > 0 && article.stock_qty <= (article.min_stock_level || 10);
                const isTransitM = article.status === 'in_transit' || article.status === 'on_its_way_home';
                const stockColorM = isTransitM ? 'text-blue-400' : (article.stock_qty || 0) <= 0 ? 'text-red-400' : hasLowStockM ? 'text-orange-400' : 'text-green-400';
                const imageUrl = article.image_urls?.[0] || article.image_url;
                return (
                  <motion.div
                    key={article.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    onClick={() => setSelectedArticle(article)}
                    className={cn(
                      "md:hidden p-3 rounded-2xl cursor-pointer transition-all backdrop-blur-xl border active:scale-[0.98] duration-300",
                      article.status === 'in_transit'
                        ? "bg-blue-500/10 border-blue-500/30"
                        : article.status === 'on_its_way_home'
                        ? "bg-violet-500/10 border-violet-500/30"
                        : "bg-white/5 border-white/10"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedArticleIds.includes(article.id)}
                        onCheckedChange={(checked) => {
                          if (checked) setSelectedArticleIds(prev => [...prev, article.id]);
                          else setSelectedArticleIds(prev => prev.filter(id => id !== article.id));
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-1"
                      />
                      {imageUrl ? (
                        <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-slate-900/50">
                          <img src={imageUrl} alt={article.name} className="w-full h-full object-cover" loading="lazy" />
                        </div>
                      ) : (
                        <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center">
                          <Package className="w-5 h-5 text-white/30" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="font-semibold text-white text-sm leading-tight line-clamp-2 tracking-tight">
                             <HighlightText text={article.customer_name || article.name} query={searchQuery} />
                           </h3>
                           <div className={cn("text-lg font-bold leading-none flex-shrink-0", stockColorM)}>
                            {article.stock_qty || 0}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-white/50 mb-1">
                          {article.batch_number && <span className="font-mono">#{article.batch_number}</span>}
                          {article.supplier_name && <><span>•</span><span className="truncate">{article.supplier_name}</span></>}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap justify-between w-full">
                          <div className="flex items-center gap-2 flex-wrap">
                          {article.shelf_address && (
                            <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/30 text-xs">
                              <MapPin className="w-3 h-3 mr-1" />{Array.isArray(article.shelf_address) ? article.shelf_address[0] : article.shelf_address}
                            </Badge>
                          )}
                          {incomingQuantities[article.id] && (
                            <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-xs font-medium">
                              🚚 ETA ({incomingQuantities[article.id].quantity} st)
                            </Badge>
                          )}
                          {article.status !== 'active' && (
                            <Badge className={cn("text-xs border",
                              article.status === 'low_stock' ? "bg-amber-500/20 text-amber-400 border-amber-500/30" :
                              article.status === 'out_of_stock' ? "bg-red-500/20 text-red-400 border-red-500/30" :
                              article.status === 'on_repair' ? "bg-orange-500/20 text-orange-400 border-orange-500/30" :
                              article.status === 'in_transit' ? "bg-blue-500/20 text-blue-300 border-blue-500/30" :
                              article.status === 'on_its_way_home' ? "bg-violet-500/20 text-violet-400 border-violet-500/30" :
                              "bg-slate-500/20 text-slate-400 border-slate-500/30"
                            )}>
                              {article.status === 'low_stock' ? 'Lågt' :
                               article.status === 'out_of_stock' ? 'Slut' :
                               article.status === 'on_repair' ? 'Rep.' :
                               article.status === 'in_transit' ? '🚢 I produktion' :
                               article.status === 'on_its_way_home' ? '✈️ På väg hem' :
                               article.status === 'discontinued' ? 'Utgått' : article.status}
                            </Badge>
                          )}
                          </div>
                          {/* Mobile quick actions */}
                          <div onClick={e => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="w-8 h-8 rounded-lg flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10">
                                  <MoreHorizontal className="w-4 h-4" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent className="bg-zinc-900 border-white/10 text-white" align="end">
                                <DropdownMenuItem onClick={() => setSelectedArticle(article)} className="hover:bg-white/10 cursor-pointer">👁 Se detalj</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setSelectedArticle(article); setAdjustmentModal({open:true,type:'out'}); }} className="hover:bg-white/10 cursor-pointer">📦 Ta ut</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => navigate('/PurchaseOrders')} className="hover:bg-white/10 cursor-pointer">🛒 Beställ</DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-white/10" />
                                <DropdownMenuItem onClick={() => { setSelectedArticle(article); setEditingArticle(article); }} className="hover:bg-white/10 cursor-pointer">✏️ Flytta / Redigera</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Mobile Floating Action Button */}
        <Link to={createPageUrl("Scan")} className="md:hidden">
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.05 }}
            className="fixed bottom-24 right-4 w-14 h-14 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 shadow-2xl shadow-blue-500/50 flex items-center justify-center z-40 hover:shadow-blue-500/80 transition-all duration-300"
          >
            <Camera className="w-6 h-6 text-white" />
          </motion.button>
        </Link>

            {/* Modals */}
            <Dialog open={quickInventoryOpen} onOpenChange={setQuickInventoryOpen}>
            <DialogContent className="bg-zinc-950 border-white/10 text-white max-w-2xl backdrop-blur-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-white tracking-tight">
                <ClipboardList className="w-5 h-5" />
                Snabbinventering
              </DialogTitle>
            </DialogHeader>
            <QuickInventory articles={articles} />
            </DialogContent>
            </Dialog>

            <Dialog open={pickListOpen} onOpenChange={setPickListOpen}>
            <DialogContent className="bg-zinc-950 border-white/10 text-white max-w-2xl max-h-[90vh] overflow-auto backdrop-blur-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-white tracking-tight">
                <Sparkles className="w-5 h-5 text-blue-400" />
                AI Plocklistegenerator
              </DialogTitle>
            </DialogHeader>
            <PickListGenerator articles={articles} />
            </DialogContent>
            </Dialog>

            <Dialog open={!!columnMappingData} onOpenChange={(open) => !open && setColumnMappingData(null)}>
            <DialogContent className="bg-zinc-950 border-white/10 text-white max-w-4xl p-0 backdrop-blur-2xl">
              <ColumnMapper
                columns={columnMappingData?.columns || []}
                previewData={columnMappingData?.previewData || []}
                onConfirm={handleColumnMapping}
                onCancel={() => setColumnMappingData(null)}
              />
            </DialogContent>
            </Dialog>

            <Dialog open={!!importPreview} onOpenChange={(open) => !open && setImportPreview(null)}>
            <DialogContent className="bg-zinc-950 border-white/10 text-white max-w-4xl p-0 backdrop-blur-2xl">
              <ImportPreview
                articles={importPreview || []}
                onConfirm={handleConfirmImport}
                onCancel={() => setImportPreview(null)}
                isSubmitting={isImporting}
              />
            </DialogContent>
            </Dialog>

            <Dialog open={bulkEditOpen} onOpenChange={setBulkEditOpen}>
            <DialogContent className="bg-zinc-950 border-white/10 text-white backdrop-blur-2xl">
              <DialogHeader>
                <DialogTitle>Redigera {selectedArticleIds.length} artikel{selectedArticleIds.length !== 1 ? 'ar' : ''}</DialogTitle>
                <p className="text-sm text-white/50">Uppdatera flera artiklar samtidigt</p>
              </DialogHeader>
              <BulkEditForm
                articleCount={selectedArticleIds.length}
                warehouses={warehouses}
                onSave={(data) => bulkUpdateMutation.mutate({ ids: selectedArticleIds, data })}
                onCancel={() => setBulkEditOpen(false)}
                isSaving={bulkUpdateMutation.isPending}
              />
            </DialogContent>
        </Dialog>
      </div>
    </div>
    </PullToRefresh>
  );
}

            function BulkEditForm({ articleCount, warehouses, onSave, onCancel, isSaving }) {
            const [formData, setFormData] = useState({
            warehouse: "",
            status: "",
            storage_type: ""
            });

            const handleSubmit = (e) => {
            e.preventDefault();
            const updateData = {};
            if (formData.warehouse) updateData.warehouse = formData.warehouse;
            if (formData.status) updateData.status = formData.status;
            if (formData.storage_type) updateData.storage_type = formData.storage_type;

            if (Object.keys(updateData).length === 0) {
            toast.error("Välj minst ett fält att uppdatera");
            return;
            }

            onSave(updateData);
            };

            return (
            <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-white/50">
            Välj fält att uppdatera för alla {articleCount} artikel{articleCount !== 1 ? 'ar' : ''}. Tomma fält lämnas oförändrade.
            </p>

            <div>
            <label className="text-sm font-medium mb-2 block">Lagerställe</label>
            <Select value={formData.warehouse} onValueChange={(value) => setFormData(prev => ({ ...prev, warehouse: value }))}>
            <SelectTrigger className="bg-zinc-900 border-white/10 text-white">
            <SelectValue placeholder="Ingen ändring" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-white/10 text-white">
            <SelectItem value={null}>Ingen ändring</SelectItem>
            {warehouses.map(w => (
            <SelectItem key={w.id} value={w.name}>{w.name}</SelectItem>
            ))}
            </SelectContent>
            </Select>
            </div>

            <div>
            <label className="text-sm font-medium mb-2 block">Status</label>
            <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
            <SelectTrigger className="bg-zinc-900 border-white/10 text-white">
            <SelectValue placeholder="Ingen ändring" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-white/10 text-white">
            <SelectItem value={null}>Ingen ändring</SelectItem>
            <SelectItem value="active">Aktiv</SelectItem>
            <SelectItem value="low_stock">Lågt lager</SelectItem>
            <SelectItem value="out_of_stock">Slut i lager</SelectItem>
            <SelectItem value="discontinued">Utgått</SelectItem>
            </SelectContent>
            </Select>
            </div>

            <div>
            <label className="text-sm font-medium mb-2 block">Lagertyp</label>
            <Select value={formData.storage_type} onValueChange={(value) => setFormData(prev => ({ ...prev, storage_type: value }))}>
            <SelectTrigger className="bg-zinc-900 border-white/10 text-white">
            <SelectValue placeholder="Ingen ändring" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-white/10 text-white">
            <SelectItem value={null}>Ingen ändring</SelectItem>
            <SelectItem value="company_owned">Företagsägt</SelectItem>
            <SelectItem value="customer_owned">Kundägt</SelectItem>
            <SelectItem value="rental_stock">Hyrlager</SelectItem>
            <SelectItem value="installation_register">Anläggsningsregister</SelectItem>
            <SelectItem value="tillöko_ekonomi">Tillöko Ekonomi</SelectItem>
            </SelectContent>
            </Select>
            </div>

            <div className="flex gap-3 pt-4">
            <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSaving}
            className="flex-1 bg-white/5 border-white/10 text-white hover:bg-white/10"
            >
            Avbryt
            </Button>
            <Button
            type="submit"
            disabled={isSaving}
            className="flex-1"
            >
            {isSaving ? (
            <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
            Sparar...
            </>
            ) : (
            'Spara ändringar'
            )}
            </Button>
            </div>
            </form>
            );
            }