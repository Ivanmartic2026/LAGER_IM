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
  ClipboardList
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import ArticleCard from "@/components/articles/ArticleCard";
import ArticleDetail from "@/components/articles/ArticleDetail";
import StockAdjustmentModal from "@/components/articles/StockAdjustmentModal";
import QuickInventory from "@/components/inventory/QuickInventory";
import PickListGenerator from "@/components/inventory/PickListGenerator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function InventoryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [viewMode, setViewMode] = useState("grid");
  const [statusFilter, setStatusFilter] = useState("all");
  const [adjustmentModal, setAdjustmentModal] = useState({ open: false, type: null });
  const [quickInventoryOpen, setQuickInventoryOpen] = useState(false);
  const [pickListOpen, setPickListOpen] = useState(false);
  
  const queryClient = useQueryClient();

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ['articles'],
    queryFn: () => base44.entities.Article.list('-updated_date'),
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

  const filteredArticles = articles.filter(article => {
    const matchesSearch = !searchQuery || 
      article.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.batch_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.manufacturer?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || article.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: articles.length,
    lowStock: articles.filter(a => a.status === "low_stock").length,
    outOfStock: articles.filter(a => a.status === "out_of_stock").length
  };

  if (selectedArticle) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          <ArticleDetail
            article={selectedArticle}
            onBack={() => setSelectedArticle(null)}
            onEdit={() => {}}
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
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Lager</h1>
            <p className="text-slate-400">{articles.length} artiklar registrerade</p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => setQuickInventoryOpen(true)}
              variant="outline"
              className="bg-slate-800 border-slate-600 hover:bg-slate-700 text-white"
            >
              <ClipboardList className="w-4 h-4 mr-2" />
              Snabbinventering
            </Button>
            <Button
              onClick={() => setPickListOpen(true)}
              variant="outline"
              className="bg-slate-800 border-slate-600 hover:bg-slate-700 text-white"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              AI Plocklista
            </Button>
            <Link to={createPageUrl("Scan")}>
              <Button className="bg-blue-600 hover:bg-blue-500">
                <Camera className="w-4 h-4 mr-2" />
                Skanna
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Package className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
                <p className="text-xs text-slate-400">Totalt</p>
              </div>
            </div>
          </div>
          
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.lowStock}</p>
                <p className="text-xs text-slate-400">Lågt lager</p>
              </div>
            </div>
          </div>
          
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                <Package className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.outOfStock}</p>
                <p className="text-xs text-slate-400">Slut</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Sök artikel, batchnummer, tillverkare eller hyllplats..."
              className="pl-10 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500"
            />
          </div>
          
          <div className="flex gap-2">
            <Tabs value={statusFilter} onValueChange={setStatusFilter}>
              <TabsList className="bg-slate-800/50 border border-slate-700">
                <TabsTrigger value="all" className="text-xs">Alla</TabsTrigger>
                <TabsTrigger value="active" className="text-xs">I lager</TabsTrigger>
                <TabsTrigger value="low_stock" className="text-xs">Lågt</TabsTrigger>
                <TabsTrigger value="out_of_stock" className="text-xs">Slut</TabsTrigger>
                <TabsTrigger value="on_repair" className="text-xs">Reparation</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Articles Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 rounded-2xl bg-slate-800/50 animate-pulse" />
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence>
              {filteredArticles.map((article) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  onClick={() => setSelectedArticle(article)}
                />
              ))}
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