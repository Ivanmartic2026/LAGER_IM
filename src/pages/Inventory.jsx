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
  Search, Camera, Package, AlertTriangle, Filter,
  Grid3X3, List, Plus, SlidersHorizontal, Sparkles,
  ClipboardList, Download, Upload, ArrowUpDown, MapPin,
  CheckSquare, Trash2, Edit2, X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function InventoryPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const initialStatus = urlParams.get('status') || 'all';
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [viewMode, setViewMode] = useState("grid");
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [warehouseFilter, setWarehouseFilter] = useState("all");
  const [storageTypeFilter, setStorageTypeFilter] = useState("all");
  const [adjustmentModal, setAdjustmentModal] = useState({ open: false, type: null });
  const [editingArticle, setEditingArticle] = useState(null);
  const [quickInventoryOpen, setQuickInventoryOpen] = useState(false);
  const [pickListOpen, setPickListOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [sortBy, setSortBy] = useState('name');
  const [selectedArticleIds, setSelectedArticleIds] = useState([]);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const fileInputRef = React.useRef(null);
  
  const queryClient = useQueryClient();

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ['articles'],
    queryFn: () => base44.entities.Article.list('-updated_date', 100),
    staleTime: 30000, // Cache for 30 seconds
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list(),
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => base44.entities.Warehouse.list(),
  });

  const updateArticleMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Article.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
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

  const handleExport = async () => {
    setIsExporting(true);
    const loadingToast = toast.loading('Förbereder export...');
    
    try {
      console.log('Starting export...');
      
      toast.loading('Skapar Excel-fil...', { id: loadingToast });
      
      const response = await base44.functions.invoke('exportArticles', {});
      
      console.log('Export complete, downloading...');
      
      toast.loading('Laddar ner fil...', { id: loadingToast });

      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `artiklar_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      
      toast.success('Excel-fil nedladdad!', { id: loadingToast });
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Kunde inte exportera: ' + error.message, { id: loadingToast });
    } finally {
      setIsExporting(false);
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

  const filteredArticles = articles
    .filter(article => {
      const matchesSearch = !searchQuery || 
        article.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.batch_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.manufacturer?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || article.status === statusFilter;
      const matchesWarehouse = warehouseFilter === "all" || article.warehouse === warehouseFilter;
      const matchesStorageType = storageTypeFilter === "all" || article.storage_type === storageTypeFilter;
      
      return matchesSearch && matchesStatus && matchesWarehouse && matchesStorageType;
    })
    .sort((a, b) => {
      switch(sortBy) {
        case 'name':
          return (a.name || '').localeCompare(b.name || '');
        case 'shelf':
          return (a.shelf_address || '').localeCompare(b.shelf_address || '');
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
    onRepair: articles.filter(a => a.status === "on_repair").length
  };

  if (selectedArticle) {
    return (
      <div className="min-h-screen bg-black p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          <ArticleDetail
            article={selectedArticle}
            onBack={() => setSelectedArticle(null)}
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
    <div className="min-h-screen bg-black p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Compact Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-white tracking-tight">Lager</h1>
              <div className="flex items-center gap-3 text-sm">
                <Badge 
                  variant="outline" 
                  className="bg-blue-500/10 text-blue-400 border-blue-500/30 cursor-pointer hover:bg-blue-500/20 transition-colors"
                  onClick={() => setStatusFilter('all')}
                >
                  {stats.total} totalt
                </Badge>
                {stats.lowStock > 0 && (
                  <Badge 
                    variant="outline" 
                    className="bg-amber-500/10 text-amber-400 border-amber-500/30 cursor-pointer hover:bg-amber-500/20 transition-colors"
                    onClick={() => setStatusFilter('low_stock')}
                  >
                    {stats.lowStock} lågt
                  </Badge>
                )}
                {stats.outOfStock > 0 && (
                  <Badge 
                    variant="outline" 
                    className="bg-red-500/10 text-red-400 border-red-500/30 cursor-pointer hover:bg-red-500/20 transition-colors"
                    onClick={() => setStatusFilter('out_of_stock')}
                  >
                    {stats.outOfStock} slut
                  </Badge>
                )}
                {stats.onRepair > 0 && (
                  <Badge 
                    variant="outline" 
                    className="bg-orange-500/10 text-orange-400 border-orange-500/30 cursor-pointer hover:bg-orange-500/20 transition-colors"
                    onClick={() => setStatusFilter('on_repair')}
                  >
                    {stats.onRepair} reparation
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImport}
                className="hidden"
              />
              <Button
                onClick={handleExport}
                disabled={isExporting}
                variant="outline"
                size="sm"
                className="bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-white backdrop-blur-xl transition-all duration-300"
              >
                {isExporting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Exporterar...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Exportera
                  </>
                )}
              </Button>
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                variant="outline"
                size="sm"
                className="bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-white backdrop-blur-xl transition-all duration-300"
              >
                {isImporting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Importerar...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Importera
                  </>
                )}
              </Button>
              <Button
                onClick={() => setQuickInventoryOpen(true)}
                variant="outline"
                size="sm"
                className="bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-white backdrop-blur-xl transition-all duration-300"
              >
                <ClipboardList className="w-4 h-4 mr-2" />
                Inventering
              </Button>
              <Button
                onClick={() => setPickListOpen(true)}
                variant="outline"
                size="sm"
                className="bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-white backdrop-blur-xl transition-all duration-300"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                AI Plocklista
              </Button>
              <Link to={createPageUrl("Scan")}>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/50 hover:shadow-blue-500/70 transition-all duration-300">
                  <Camera className="w-4 h-4 mr-2" />
                  Skanna
                </Button>
              </Link>
            </div>
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

          {/* Compact Search & Filters */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Sök artikel, batch, tillverkare eller hyllplats..."
                className="pl-10 h-9 bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-white placeholder:text-white/40 backdrop-blur-xl transition-all duration-300"
              />
            </div>
            
            <Tabs value={sortBy} onValueChange={setSortBy}>
              <TabsList className="h-9 bg-white/5 border border-white/10 backdrop-blur-xl">
                <TabsTrigger value="name" className="text-xs h-7 text-white/70 data-[state=active]:text-white data-[state=active]:bg-white/10">
                  <ArrowUpDown className="w-3 h-3 mr-1" />
                  Namn
                </TabsTrigger>
                <TabsTrigger value="batch" className="text-xs h-7 text-white/70 data-[state=active]:text-white data-[state=active]:bg-white/10">Batch</TabsTrigger>
                <TabsTrigger value="shelf" className="text-xs h-7 text-white/70 data-[state=active]:text-white data-[state=active]:bg-white/10">Hylla</TabsTrigger>
                <TabsTrigger value="supplier" className="text-xs h-7 text-white/70 data-[state=active]:text-white data-[state=active]:bg-white/10">Leverantör</TabsTrigger>
                <TabsTrigger value="stock" className="text-xs h-7 text-white/70 data-[state=active]:text-white data-[state=active]:bg-white/10">Saldo</TabsTrigger>
              </TabsList>
            </Tabs>

            <Tabs value={statusFilter} onValueChange={setStatusFilter}>
              <TabsList className="h-9 bg-white/5 border border-white/10 backdrop-blur-xl">
                <TabsTrigger value="all" className="text-xs h-7 text-white/70 data-[state=active]:text-white data-[state=active]:bg-white/10">Alla</TabsTrigger>
                <TabsTrigger value="active" className="text-xs h-7 text-white/70 data-[state=active]:text-white data-[state=active]:bg-white/10">I lager</TabsTrigger>
                <TabsTrigger value="low_stock" className="text-xs h-7 text-white/70 data-[state=active]:text-white data-[state=active]:bg-white/10">Lågt</TabsTrigger>
                <TabsTrigger value="out_of_stock" className="text-xs h-7 text-white/70 data-[state=active]:text-white data-[state=active]:bg-white/10">Slut</TabsTrigger>
                <TabsTrigger value="on_repair" className="text-xs h-7 text-white/70 data-[state=active]:text-white data-[state=active]:bg-white/10">Reparation</TabsTrigger>
              </TabsList>
            </Tabs>

            <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
              <SelectTrigger className="w-48 h-9 bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-white backdrop-blur-xl transition-all duration-300">
                <SelectValue placeholder="Lager" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-white/10 text-white">
                <SelectItem value="all">Alla lager</SelectItem>
                {warehouses.map(warehouse => (
                  <SelectItem key={warehouse.id} value={warehouse.name}>
                    {warehouse.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={storageTypeFilter} onValueChange={setStorageTypeFilter}>
              <SelectTrigger className="w-48 h-9 bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-white backdrop-blur-xl transition-all duration-300">
                <SelectValue placeholder="Lagertyp" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-white/10 text-white">
                <SelectItem value="all">Alla typer</SelectItem>
                <SelectItem value="company_owned">Företagsägt</SelectItem>
                <SelectItem value="customer_owned">Kundägt</SelectItem>
              </SelectContent>
            </Select>
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
            {/* Header Row - Desktop Only */}
            <div className="hidden md:grid px-4 py-2 grid-cols-[40px_80px_80px_minmax(120px,150px)_minmax(200px,1fr)_minmax(120px,150px)_minmax(120px,150px)_120px] gap-4 text-xs font-medium text-white/40 uppercase tracking-wider border-b border-white/10">
              <div className="flex items-center">
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
              <div></div>
              <div>Saldo</div>
              <div>Artikelnummer</div>
              <div>Benämning</div>
              <div>Hyllplats</div>
              <div>Lager</div>
              <div className="text-right">Status</div>
            </div>

            <AnimatePresence>
              {filteredArticles.map((article) => {
                const hasLowStock = article.stock_qty <= (article.min_stock_level || 5);
                const imageUrl = article.image_urls?.[0] || article.image_url;

                return (
                  <motion.div
                    key={article.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    onClick={() => setSelectedArticle(article)}
                    className="group p-3 md:p-4 rounded-2xl cursor-pointer transition-all bg-white/5 backdrop-blur-xl border border-white/10 hover:border-white/20 hover:bg-white/10 hover:shadow-2xl hover:shadow-white/5 active:scale-[0.98] duration-300"
                  >
                    {/* Mobile Layout */}
                    <div className="md:hidden">
                      <div className="flex items-start gap-3 mb-2">
                        <Checkbox
                          checked={selectedArticleIds.includes(article.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedArticleIds(prev => [...prev, article.id]);
                            } else {
                              setSelectedArticleIds(prev => prev.filter(id => id !== article.id));
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1"
                        />
                        {imageUrl ? (
                          <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-slate-900/50">
                            <img 
                              src={imageUrl} 
                              alt={article.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>
                        ) : (
                          <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center">
                            <Package className="w-5 h-5 text-white/30" />
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h3 className="font-semibold text-white text-sm leading-tight line-clamp-2 tracking-tight">
                              {article.customer_name || article.name}
                            </h3>
                            <div className={cn(
                              "text-lg font-bold leading-none flex-shrink-0",
                              article.stock_qty <= 0 ? "text-red-400" : 
                              hasLowStock ? "text-amber-400" : "text-white"
                            )}>
                              {article.stock_qty || 0}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-white/50 mb-1">
                            {article.batch_number && (
                              <span className="font-mono">#{article.batch_number}</span>
                            )}
                            {article.manufacturer && (
                              <>
                                <span>•</span>
                                <span className="truncate">{article.manufacturer}</span>
                              </>
                            )}
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            {article.shelf_address && (
                              <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/30 text-xs">
                                <MapPin className="w-3 h-3 mr-1" />
                                {article.shelf_address}
                              </Badge>
                            )}
                            {article.status !== 'active' && (
                              <Badge className={cn(
                                "text-xs border",
                                article.status === 'low_stock' ? "bg-amber-500/20 text-amber-400 border-amber-500/30" :
                                article.status === 'out_of_stock' ? "bg-red-500/20 text-red-400 border-red-500/30" :
                                article.status === 'on_repair' ? "bg-orange-500/20 text-orange-400 border-orange-500/30" :
                                "bg-slate-500/20 text-slate-400 border-slate-500/30"
                              )}>
                                {article.status === 'low_stock' ? 'Lågt' :
                                 article.status === 'out_of_stock' ? 'Slut' :
                                 article.status === 'on_repair' ? 'Rep.' : 
                                 article.status === 'discontinued' ? 'Utgått' : article.status}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Desktop Layout */}
                    <div className="hidden md:flex items-center gap-4">
                      <Checkbox
                        checked={selectedArticleIds.includes(article.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedArticleIds(prev => [...prev, article.id]);
                          } else {
                            setSelectedArticleIds(prev => prev.filter(id => id !== article.id));
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      {imageUrl ? (
                        <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-slate-900/50">
                          <img 
                            src={imageUrl} 
                            alt={article.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      ) : (
                        <div className="flex-shrink-0 w-16 h-16 rounded-lg bg-white/5 flex items-center justify-center">
                          <Package className="w-6 h-6 text-white/30" />
                        </div>
                      )}

                      <div className="w-20 text-center flex-shrink-0">
                        <div className={cn(
                          "text-2xl font-bold leading-none mb-1 tracking-tight",
                          article.stock_qty <= 0 ? "text-red-400" : 
                          hasLowStock ? "text-amber-400" : "text-white"
                        )}>
                          {article.stock_qty || 0}
                        </div>
                        <div className="text-xs text-white/40">st</div>
                      </div>

                      <div className="flex-1 min-w-0 grid grid-cols-[minmax(100px,130px)_minmax(180px,1fr)_minmax(100px,130px)_minmax(100px,130px)_100px] gap-4">
                        <div className="min-w-0">
                          {article.sku ? (
                            <div className="text-sm font-mono text-blue-400 truncate">
                              {article.sku}
                            </div>
                          ) : article.batch_number ? (
                            <div className="text-sm font-mono text-white/50 truncate">
                              #{article.batch_number}
                            </div>
                          ) : (
                            <span className="text-xs text-white/20">—</span>
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="font-semibold text-white text-sm mb-1 truncate tracking-tight">
                            {article.customer_name || article.name}
                          </div>
                          {article.manufacturer && (
                            <div className="text-xs text-white/50 truncate">
                              {article.manufacturer}
                              {article.series && ` • ${article.series}`}
                              {article.pitch_value && ` • ${article.pitch_value}`}
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex items-center">
                          {article.shelf_address ? (
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-4 h-4 text-white/40 flex-shrink-0" />
                              <span className="text-sm font-medium text-white truncate">
                                {article.shelf_address}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-white/20">—</span>
                          )}
                        </div>

                        <div className="min-w-0 flex items-center">
                          {article.warehouse ? (
                            <div className="flex items-center gap-1.5">
                              <Package className="w-4 h-4 text-white/40 flex-shrink-0" />
                              <span className="text-sm font-medium text-white truncate">
                                {article.warehouse}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-white/20">—</span>
                          )}
                        </div>

                        <div className="flex items-center justify-end gap-2 min-w-0">
                          {article.status !== 'active' && (
                            <Badge className={cn(
                              "text-xs border px-2 py-0.5 flex-shrink-0",
                              article.status === 'low_stock' ? "bg-amber-500/20 text-amber-400 border-amber-500/30" :
                              article.status === 'out_of_stock' ? "bg-red-500/20 text-red-400 border-red-500/30" :
                              article.status === 'on_repair' ? "bg-orange-500/20 text-orange-400 border-orange-500/30" :
                              "bg-white/10 text-white/60 border-white/20"
                            )}>
                              {article.status === 'low_stock' ? 'Lågt' :
                               article.status === 'out_of_stock' ? 'Slut' :
                               article.status === 'on_repair' ? 'Reparation' : 
                               article.status === 'discontinued' ? 'Utgått' : article.status}
                            </Badge>
                          )}
                          {article.updated_date && (
                            <div className="text-xs text-white/40 whitespace-nowrap">
                              {format(new Date(article.updated_date), "d MMM", { locale: sv })}
                            </div>
                          )}
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