import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  Search, Camera, Package, AlertTriangle, Filter,
  Grid3X3, List, Plus, SlidersHorizontal, Sparkles,
  ClipboardList, Download, Upload, ArrowUpDown, MapPin
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import ArticleDetail from "@/components/articles/ArticleDetail";
import StockAdjustmentModal from "@/components/articles/StockAdjustmentModal";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import QuickInventory from "@/components/inventory/QuickInventory";
import PickListGenerator from "@/components/inventory/PickListGenerator";
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
  const [adjustmentModal, setAdjustmentModal] = useState({ open: false, type: null });
  const [quickInventoryOpen, setQuickInventoryOpen] = useState(false);
  const [pickListOpen, setPickListOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [sortBy, setSortBy] = useState('name');
  const fileInputRef = React.useRef(null);
  
  const queryClient = useQueryClient();

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ['articles'],
    queryFn: () => base44.entities.Article.list('-updated_date'),
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list(),
  });

  const updateArticleMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Article.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
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
      const token = await base44.auth.getToken();
      
      console.log('Starting export...');
      const response = await fetch(`${import.meta.env.VITE_BASE44_API_URL || ''}/api/functions/exportArticles`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('Export response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Export error response:', errorText);
        throw new Error('Export misslyckades');
      }

      toast.loading('Laddar ner fil...', { id: loadingToast });

      const blob = await response.blob();
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
      const formData = new FormData();
      formData.append('file', file);

      const token = await base44.auth.getToken();

      toast.loading('Skickar fil till server...', { id: loadingToast });

      console.log('Sending request to import endpoint...');
      const response = await fetch(`${import.meta.env.VITE_BASE44_API_URL || ''}/api/functions/importArticles`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('Import response status:', response.status);

      toast.loading('Bearbetar artiklar...', { id: loadingToast });

      const result = await response.json();
      console.log('Import result:', result);

      if (result.success) {
        toast.success(result.message || 'Import slutförd!', { id: loadingToast, duration: 5000 });
        queryClient.invalidateQueries({ queryKey: ['articles'] });
      } else {
        toast.error(result.error || 'Import misslyckades', { id: loadingToast, duration: 5000 });
      }

      if (result.results?.errors?.length > 0) {
        console.error('Import errors:', result.results.errors);
        toast.error(`${result.results.errors.length} fel uppstod vid import`, { duration: 5000 });
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Kunde inte importera: ' + error.message, { id: loadingToast });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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
      
      return matchesSearch && matchesStatus;
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
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          <ArticleDetail
            article={selectedArticle}
            onBack={() => setSelectedArticle(null)}
            onEdit={() => {
              // Navigate to scan page with edit mode
              window.location.href = createPageUrl("Scan") + `?edit=${selectedArticle.id}`;
            }}
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
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Compact Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-white">Lager</h1>
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
                className="bg-slate-800/50 border-slate-700 hover:bg-slate-700"
              >
                {isExporting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-400 border-t-blue-400 rounded-full animate-spin mr-2" />
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
                className="bg-slate-800/50 border-slate-700 hover:bg-slate-700"
              >
                {isImporting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-400 border-t-blue-400 rounded-full animate-spin mr-2" />
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
                className="bg-slate-800/50 border-slate-700 hover:bg-slate-700"
              >
                <ClipboardList className="w-4 h-4 mr-2" />
                Inventering
              </Button>
              <Button
                onClick={() => setPickListOpen(true)}
                variant="outline"
                size="sm"
                className="bg-slate-800/50 border-slate-700 hover:bg-slate-700"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                AI Plocklista
              </Button>
              <Link to={createPageUrl("Scan")}>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-500">
                  <Camera className="w-4 h-4 mr-2" />
                  Skanna
                </Button>
              </Link>
            </div>
          </div>

          {/* Compact Search & Filters */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Sök artikel, batch, tillverkare eller hyllplats..."
                className="pl-10 h-9 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>
            
            <Tabs value={sortBy} onValueChange={setSortBy}>
              <TabsList className="h-9 bg-slate-800/50 border border-slate-700">
                <TabsTrigger value="name" className="text-xs h-7">
                  <ArrowUpDown className="w-3 h-3 mr-1" />
                  Namn
                </TabsTrigger>
                <TabsTrigger value="batch" className="text-xs h-7">Batch</TabsTrigger>
                <TabsTrigger value="shelf" className="text-xs h-7">Hylla</TabsTrigger>
                <TabsTrigger value="supplier" className="text-xs h-7">Leverantör</TabsTrigger>
                <TabsTrigger value="stock" className="text-xs h-7">Saldo</TabsTrigger>
              </TabsList>
            </Tabs>

            <Tabs value={statusFilter} onValueChange={setStatusFilter}>
              <TabsList className="h-9 bg-slate-800/50 border border-slate-700">
                <TabsTrigger value="all" className="text-xs h-7">Alla</TabsTrigger>
                <TabsTrigger value="active" className="text-xs h-7">I lager</TabsTrigger>
                <TabsTrigger value="low_stock" className="text-xs h-7">Lågt</TabsTrigger>
                <TabsTrigger value="out_of_stock" className="text-xs h-7">Slut</TabsTrigger>
                <TabsTrigger value="on_repair" className="text-xs h-7">Reparation</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Articles List */}
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-slate-800/50 animate-pulse" />
            ))}
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-slate-600" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              {searchQuery ? "Inga artiklar hittades" : "Inga artiklar ännu"}
            </h3>
            <p className="text-slate-400 mb-6">
              {searchQuery 
                ? "Prova ett annat sökord" 
                : "Börja med att skanna din första artikel"}
            </p>
            {!searchQuery && (
              <Link to={createPageUrl("Scan")}>
                <Button className="bg-blue-600 hover:bg-blue-500">
                  <Camera className="w-4 h-4 mr-2" />
                  Skanna artikel
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {/* Header Row */}
            <div className="px-4 py-2 grid grid-cols-1 md:grid-cols-[80px_80px_minmax(200px,1fr)_minmax(150px,200px)_minmax(150px,200px)_150px] gap-4 text-xs font-medium text-slate-500 uppercase tracking-wider border-b border-slate-700/50">
              <div></div> {/* Image */}
              <div>Saldo</div>
              <div>Artikel</div>
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
                    className="group p-4 rounded-xl cursor-pointer transition-all bg-slate-800/30 border border-slate-700/50 hover:border-slate-600 hover:bg-slate-800/50"
                  >
                    <div className="flex items-center gap-4">
                      {/* Image */}
                      {imageUrl ? (
                        <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-slate-900/50">
                          <img 
                            src={imageUrl} 
                            alt={article.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex-shrink-0 w-16 h-16 rounded-lg bg-slate-900/50 flex items-center justify-center">
                          <Package className="w-6 h-6 text-slate-600" />
                        </div>
                      )}

                      {/* Stock Quantity */}
                      <div className="w-20 text-center flex-shrink-0">
                        <div className={cn(
                          "text-2xl font-bold leading-none mb-1",
                          article.stock_qty <= 0 ? "text-red-400" : 
                          hasLowStock ? "text-amber-400" : "text-white"
                        )}>
                          {article.stock_qty || 0}
                        </div>
                        <div className="text-xs text-slate-500">st</div>
                      </div>

                      {/* Article Info */}
                      <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-[minmax(200px,1fr)_minmax(150px,200px)_minmax(150px,200px)_150px] gap-4">
                        {/* Name & SKU */}
                        <div className="min-w-0">
                          <div className="font-semibold text-white text-sm mb-1 truncate">
                            {article.customer_name || article.name}
                          </div>
                          {article.sku && (
                            <div className="text-xs font-mono text-blue-400 truncate">
                              {article.sku}
                            </div>
                          )}
                          {!article.sku && article.batch_number && (
                            <div className="text-xs font-mono text-slate-500 truncate">
                              #{article.batch_number}
                            </div>
                          )}
                          {article.manufacturer && (
                            <div className="text-xs text-slate-500 truncate mt-0.5">
                              {article.manufacturer}
                              {article.series && ` • ${article.series}`}
                              {article.pitch_value && ` • ${article.pitch_value}`}
                            </div>
                          )}
                        </div>

                        {/* Shelf Address */}
                        <div className="min-w-0 flex items-center">
                          {article.shelf_address ? (
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-4 h-4 text-slate-500 flex-shrink-0" />
                              <span className="text-sm font-medium text-white truncate">
                                {article.shelf_address}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-600">—</span>
                          )}
                        </div>

                        {/* Warehouse */}
                        <div className="min-w-0 flex items-center">
                          {article.warehouse ? (
                            <div className="flex items-center gap-1.5">
                              <Package className="w-4 h-4 text-slate-500 flex-shrink-0" />
                              <span className="text-sm font-medium text-white truncate">
                                {article.warehouse}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-600">—</span>
                          )}
                        </div>

                        {/* Status & Date */}
                        <div className="flex items-center justify-end gap-2 min-w-0">
                          {article.status !== 'active' && (
                            <Badge className={cn(
                              "text-xs border px-2 py-0.5 flex-shrink-0",
                              article.status === 'low_stock' ? "bg-amber-500/20 text-amber-400 border-amber-500/30" :
                              article.status === 'out_of_stock' ? "bg-red-500/20 text-red-400 border-red-500/30" :
                              article.status === 'on_repair' ? "bg-orange-500/20 text-orange-400 border-orange-500/30" :
                              "bg-slate-500/20 text-slate-400 border-slate-500/30"
                            )}>
                              {article.status === 'low_stock' ? 'Lågt' :
                               article.status === 'out_of_stock' ? 'Slut' :
                               article.status === 'on_repair' ? 'Reparation' : 
                               article.status === 'discontinued' ? 'Utgått' : article.status}
                            </Badge>
                          )}
                          {article.updated_date && (
                            <div className="text-xs text-slate-500 whitespace-nowrap">
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

            {/* Modals */}
            <Dialog open={quickInventoryOpen} onOpenChange={setQuickInventoryOpen}>
            <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5" />
                Snabbinventering
              </DialogTitle>
            </DialogHeader>
            <QuickInventory articles={articles} />
            </DialogContent>
            </Dialog>

            <Dialog open={pickListOpen} onOpenChange={setPickListOpen}>
            <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-400" />
                AI Plocklistegenerator
              </DialogTitle>
            </DialogHeader>
            <PickListGenerator articles={articles} />
            </DialogContent>
            </Dialog>
            </div>
            </div>
            );
            }