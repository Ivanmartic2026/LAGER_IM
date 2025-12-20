import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ShoppingCart, Sparkles, Package, TrendingUp, 
  CheckCircle2, XCircle, Clock, Loader2, AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { toast } from "sonner";
import PurchaseOrderCard from "@/components/orders/PurchaseOrderCard";

export default function PurchaseOrdersPage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: () => base44.entities.PurchaseOrder.list('-created_date'),
  });

  const { data: articles = [] } = useQuery({
    queryKey: ['articles'],
    queryFn: () => base44.entities.Article.list(),
  });

  const updateOrderMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PurchaseOrder.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast.success('Inköpsorder uppdaterad');
    }
  });

  const deleteOrderMutation = useMutation({
    mutationFn: (id) => base44.entities.PurchaseOrder.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast.success('Inköpsorder raderad');
    }
  });

  const handleGenerateOrders = async () => {
    setIsGenerating(true);
    try {
      const response = await base44.functions.invoke('generatePurchaseOrders');
      const data = response.data;
      
      if (data.orders && data.orders.length > 0) {
        toast.success(`${data.orders.length} nya inköpsorder skapade`);
      } else {
        toast.info('Inga artiklar behöver påfyllning just nu');
      }
      
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    } catch (error) {
      console.error('Failed to generate orders:', error);
      toast.error('Kunde inte generera inköpsorder');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApprove = async (order) => {
    await updateOrderMutation.mutateAsync({
      id: order.id,
      data: { 
        status: 'approved',
        order_date: new Date().toISOString().split('T')[0]
      }
    });
  };

  const handleMarkOrdered = async (order) => {
    await updateOrderMutation.mutateAsync({
      id: order.id,
      data: { status: 'ordered' }
    });
  };

  const handleReceive = async (order) => {
    // Update article stock
    const article = articles.find(a => a.id === order.article_id);
    if (article) {
      const newQty = (article.stock_qty || 0) + order.suggested_quantity;
      await base44.entities.Article.update(article.id, {
        stock_qty: newQty,
        status: newQty > (article.min_stock_level || 5) ? 'active' : 'low_stock'
      });

      // Create stock movement
      await base44.entities.StockMovement.create({
        article_id: article.id,
        movement_type: 'inbound',
        quantity: order.suggested_quantity,
        previous_qty: article.stock_qty || 0,
        new_qty: newQty,
        reason: `Inköpsorder mottagen (Order #${order.id.slice(0, 8)})`
      });
    }

    // Update order status
    await updateOrderMutation.mutateAsync({
      id: order.id,
      data: { status: 'received' }
    });
  };

  const handleCancel = async (order) => {
    await updateOrderMutation.mutateAsync({
      id: order.id,
      data: { status: 'cancelled' }
    });
  };

  const filteredOrders = orders.filter(order => {
    if (selectedStatus === 'all') return true;
    return order.status === selectedStatus;
  });

  const stats = {
    pending: orders.filter(o => o.status === 'pending').length,
    approved: orders.filter(o => o.status === 'approved').length,
    ordered: orders.filter(o => o.status === 'ordered').length,
    urgent: orders.filter(o => o.priority === 'urgent').length
  };

  // Check how many articles need orders
  const lowStockArticles = articles.filter(a => {
    const stock = a.stock_qty || 0;
    const minLevel = a.min_stock_level || 5;
    return stock < minLevel;
  });

  const needsOrders = lowStockArticles.length - stats.pending;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Inköpsorder</h1>
            <p className="text-slate-400">AI-optimerade påfyllningsförslag</p>
          </div>

          <Button
            onClick={handleGenerateOrders}
            disabled={isGenerating}
            className="bg-blue-600 hover:bg-blue-500 relative"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Genererar...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generera nya order
                {needsOrders > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center">
                    {needsOrders}
                  </span>
                )}
              </>
            )}
          </Button>
        </div>

        {/* Alert for low stock items */}
        {needsOrders > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-amber-200 font-medium">
                  {needsOrders} artikel{needsOrders > 1 ? 'ar' : ''} under lagernivå
                </p>
                <p className="text-amber-300/70 text-sm mt-1">
                  Klicka på "Generera nya order" för att skapa AI-optimerade inköpsförslag
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <button
            onClick={() => setSelectedStatus('pending')}
            className={cn(
              "p-4 rounded-xl border transition-all text-left",
              selectedStatus === 'pending'
                ? "bg-amber-500/20 border-amber-500/50 ring-2 ring-amber-500/30"
                : "bg-slate-800/50 border-slate-700/50 hover:bg-slate-800 hover:border-slate-600"
            )}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.pending}</p>
                <p className="text-xs text-slate-400">Väntande</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setSelectedStatus('approved')}
            className={cn(
              "p-4 rounded-xl border transition-all text-left",
              selectedStatus === 'approved'
                ? "bg-blue-500/20 border-blue-500/50 ring-2 ring-blue-500/30"
                : "bg-slate-800/50 border-slate-700/50 hover:bg-slate-800 hover:border-slate-600"
            )}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.approved}</p>
                <p className="text-xs text-slate-400">Godkända</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setSelectedStatus('ordered')}
            className={cn(
              "p-4 rounded-xl border transition-all text-left",
              selectedStatus === 'ordered'
                ? "bg-emerald-500/20 border-emerald-500/50 ring-2 ring-emerald-500/30"
                : "bg-slate-800/50 border-slate-700/50 hover:bg-slate-800 hover:border-slate-600"
            )}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.ordered}</p>
                <p className="text-xs text-slate-400">Beställda</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setSelectedStatus('all')}
            className={cn(
              "p-4 rounded-xl border transition-all text-left",
              selectedStatus === 'all'
                ? "bg-red-500/20 border-red-500/50 ring-2 ring-red-500/30"
                : "bg-slate-800/50 border-slate-700/50 hover:bg-slate-800 hover:border-slate-600"
            )}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.urgent}</p>
                <p className="text-xs text-slate-400">Brådskande</p>
              </div>
            </div>
          </button>
        </div>

        {/* Orders List */}
        {isLoading ? (
          <div className="grid gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-48 rounded-2xl bg-slate-800/50 animate-pulse" />
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
              <ShoppingCart className="w-8 h-8 text-slate-600" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Inga inköpsorder
            </h3>
            <p className="text-slate-400 mb-6">
              {selectedStatus === 'all' 
                ? 'Klicka på "Generera nya order" för att skapa förslag'
                : `Inga order med status "${selectedStatus}"`
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {filteredOrders.map((order) => (
                <PurchaseOrderCard
                  key={order.id}
                  order={order}
                  onApprove={handleApprove}
                  onMarkOrdered={handleMarkOrdered}
                  onReceive={handleReceive}
                  onCancel={handleCancel}
                  onDelete={() => deleteOrderMutation.mutate(order.id)}
                  isUpdating={updateOrderMutation.isPending}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}