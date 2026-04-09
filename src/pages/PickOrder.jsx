import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { 
  ArrowLeft, Package, CheckCircle2, Camera, MapPin,
  AlertCircle, Loader2, Download, Edit2, Trash2, Pencil
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import BarcodeScanner from "@/components/scanner/BarcodeScanner";
import OrderForm from "@/components/orders/OrderForm";
import PickingItemCard from "@/components/orders/PickingItemCard";
import OrderRoutingModal from "@/components/orders/OrderRoutingModal";
import OrderPickingHeader from "@/components/orders/OrderPickingHeader";

export default function PickOrderPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get('orderId');
  const navigate = useNavigate();

  const [scanMode, setScanMode] = useState(false);
  const [currentItemId, setCurrentItemId] = useState(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [expandedItemId, setExpandedItemId] = useState(null);
  const [pickingItemId, setPickingItemId] = useState(null);

  const queryClient = useQueryClient();

  const { data: order } = useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      const orders = await base44.entities.Order.filter({ id: orderId });
      return orders[0];
    },
    enabled: !!orderId
  });

  const { data: orderItems = [] } = useQuery({
    queryKey: ['orderItems', orderId],
    queryFn: () => base44.entities.OrderItem.filter({ order_id: orderId }),
    enabled: !!orderId
  });

  const { data: articles = [] } = useQuery({
    queryKey: ['articles'],
    queryFn: () => base44.entities.Article.list(),
  });

  const updateOrderMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Order.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
    }
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.OrderItem.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orderItems', orderId] });
    }
  });

  const createMovementMutation = useMutation({
    mutationFn: (data) => base44.entities.StockMovement.create(data),
  });

  const updateArticleMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Article.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
    }
  });

  const deleteOrderMutation = useMutation({
    mutationFn: async (orderId) => {
      // Delete order items first
      const items = await base44.entities.OrderItem.filter({ order_id: orderId });
      await Promise.all(items.map(item => base44.entities.OrderItem.delete(item.id)));
      // Then delete order
      await base44.entities.Order.delete(orderId);
    },
    onSuccess: () => {
      toast.success("Order borttagen");
      navigate(createPageUrl("Orders"));
    }
  });

  // Set order status to picking on mount
  useEffect(() => {
    if (order && order.status === 'ready_to_pick') {
      updateOrderMutation.mutate({
        id: order.id,
        data: { status: 'picking' }
      });
    }
  }, [order?.id]);

  const handleBarcodeDetected = async (code) => {
    // Find article by batch number
    const article = articles.find(a => a.batch_number === code);
    if (!article) {
      toast.error("Artikel ej funnen med denna kod");
      return;
    }

    // Find matching order item
    const item = orderItems.find(i => i.article_id === article.id && i.status !== 'picked');
    if (!item) {
      toast.error("Denna artikel finns inte i ordern eller är redan plockad");
      return;
    }

    await handlePickQuantity(item, item.quantity_ordered);
    setScanMode(false);
  };

  const handlePickQuantity = async (item, pickedQty, isEdit = false) => {
    setPickingItemId(item.id);
    // Fetch fresh article data to ensure we have the latest stock quantity
    const freshArticles = await base44.entities.Article.filter({ id: item.article_id });
    const article = freshArticles[0];
    
    if (!article) {
      toast.error("Artikel ej funnen");
      return;
    }

    const newQty = pickedQty;
    const previousQty = isEdit ? 0 : (item.quantity_picked || 0);
    const totalPicked = isEdit ? newQty : (previousQty + newQty);

    // Check stock with fresh data
    const stockNeeded = isEdit ? newQty - (item.quantity_picked || 0) : newQty;
    
    if (stockNeeded > article.stock_qty) {
      toast.error(`Inte tillräckligt i lager. Tillgängligt: ${article.stock_qty} st`);
      return;
    }

    // Prevent negative stock
    const newStockQty = article.stock_qty - stockNeeded;
    if (newStockQty < 0) {
      toast.error(`Kan inte plocka mer än vad som finns i lager (${article.stock_qty} st)`);
      return;
    }

    // Update article stock and reserved stock
    const newReserved = Math.max(0, (article.reserved_stock_qty || 0) - stockNeeded);
    await updateArticleMutation.mutateAsync({
      id: article.id,
      data: { 
        stock_qty: newStockQty,
        reserved_stock_qty: newReserved,
        status: newStockQty <= 0 ? "out_of_stock" : 
                newStockQty <= (article.min_stock_level || 5) ? "low_stock" : "active"
      }
    });

    // Create stock movement
    await createMovementMutation.mutateAsync({
      article_id: article.id,
      movement_type: 'outbound',
      quantity: -stockNeeded,
      previous_qty: article.stock_qty,
      new_qty: newStockQty,
      reason: `${isEdit ? 'Justerad' : 'Plockad'} för order ${order.order_number || order.id.slice(0, 8)}`,
      reference: order.id
    });

    // Update order item
    const itemStatus = totalPicked >= item.quantity_ordered ? 'picked' : 'partial';
    await updateItemMutation.mutateAsync({
      id: item.id,
      data: {
        quantity_picked: totalPicked,
        status: itemStatus
      }
    });

    toast.success(`${newQty} st plockad`);

    // Check if all items are picked
    const allItems = await base44.entities.OrderItem.filter({ order_id: orderId });
    const allPicked = allItems.every(i => i.status === 'picked');
    
    if (allPicked) {
      const user = await base44.auth.me();
      await updateOrderMutation.mutateAsync({
        id: order.id,
        data: { 
          status: 'picked',
          picked_by: user.email,
          picked_date: new Date().toISOString()
        }
      });
      
      toast.success("Alla artiklar plockade! Välj nästa steg.");
    }

    setPickingItemId(null);
    setExpandedItemId(null);
  };

  const handleManualPick = async (item) => {
    const input = prompt(`Ange antal att plocka (max ${item.quantity_ordered - (item.quantity_picked || 0)}):`);
    if (!input) return;

    const qty = parseInt(input);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Ogiltigt antal");
      return;
    }

    if (qty > (item.quantity_ordered - (item.quantity_picked || 0))) {
      toast.error("Kan inte plocka mer än beställt");
      return;
    }

    await handlePickQuantity(item, qty);
  };

  const handleEditPicked = async (item) => {
    const input = prompt(`Redigera plockad mängd (nuvarande: ${item.quantity_picked}, max: ${item.quantity_ordered}):`);
    if (!input) return;

    const qty = parseInt(input);
    if (isNaN(qty) || qty < 0) {
      toast.error("Ogiltigt antal");
      return;
    }

    if (qty > item.quantity_ordered) {
      toast.error("Kan inte plocka mer än beställt");
      return;
    }

    await handlePickQuantity(item, qty, true);
  };

  const exportOrderMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('exportOrder', { orderId });
      return response.data;
    },
    onSuccess: (data) => {
      const blob = new Blob([data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `order_${order.order_number || orderId}_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success('Plockkvitto nedladdat!');
    }
  });

  if (!order || !orderId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Order ej funnen</h2>
          <Link to={createPageUrl("Orders")}>
            <Button className="bg-blue-600 hover:bg-blue-500">
              Tillbaka till ordrar
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const pendingItems = orderItems.filter(item => item.status !== 'picked');
  const pickedItems = orderItems.filter(item => item.status === 'picked');
  const progress = orderItems.length > 0 ? (pickedItems.length / orderItems.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link to={createPageUrl("Orders")}>
            <Button
              variant="ghost"
              className="text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Tillbaka
            </Button>
          </Link>

          <div className="flex gap-2">
            <Button
              onClick={() => exportOrderMutation.mutate()}
              disabled={exportOrderMutation.isPending}
              variant="outline"
              className={cn(
                order.status === 'picked' 
                  ? "bg-green-600 hover:bg-green-500 text-white border-green-500" 
                  : "bg-slate-700 border-slate-600 hover:bg-slate-600"
              )}
            >
              <Download className="w-4 h-4 mr-2" />
              {order.status === 'picked' ? 'Plockkvitto' : 'Skriv ut'}
            </Button>

            <Button
              variant="outline"
              onClick={() => setShowEditForm(true)}
              className="bg-slate-700 border-slate-600 hover:bg-slate-600"
            >
              <Pencil className="w-4 h-4 mr-2" />
              Redigera
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                if (confirm('Är du säker på att du vill ta bort denna order? Alla orderrader kommer också tas bort.')) {
                  deleteOrderMutation.mutate(order.id);
                }
              }}
              disabled={deleteOrderMutation.isPending}
              className="bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Ta bort
            </Button>
          </div>
        </div>

        {/* Delivery Address & Notes Header */}
         <OrderPickingHeader order={order} />

        {/* Order Info */}
         <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 mb-6">
           <h1 className="text-2xl font-bold text-white mb-4">
             {order.order_number || `Order #${order.id.slice(0, 8)}`}
           </h1>
           <div className="grid grid-cols-2 gap-4 text-sm">
             <div>
               <span className="text-slate-400">Kund:</span>
               <span className="text-white ml-2 font-medium">{order.customer_name}</span>
             </div>
             {order.delivery_date && (
               <div>
                 <span className="text-slate-400">Leverans:</span>
                 <span className="text-white ml-2 font-medium">{order.delivery_date}</span>
               </div>
             )}
           </div>

           {/* Progress */}
           <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-slate-400">Plockningsframsteg</span>
              <span className="text-white font-semibold">{pickedItems.length} / {orderItems.length}</span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full bg-gradient-to-r from-blue-500 to-blue-400"
              />
            </div>
          </div>
        </div>

        {/* Scanner */}
        <AnimatePresence>
          {scanMode && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 overflow-hidden"
            >
              <BarcodeScanner
                onBarcodeDetected={handleBarcodeDetected}
                onClose={() => setScanMode(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Actions */}
        {pendingItems.length > 0 && (
          <div className="grid grid-cols-2 gap-3 mb-6">
            <Button
              onClick={() => setScanMode(!scanMode)}
              variant="outline"
              className="h-12 bg-blue-600/10 border-blue-500/30 text-blue-400 hover:bg-blue-600/20"
            >
              <Camera className="w-5 h-5 mr-2" />
              {scanMode ? 'Stäng skanner' : 'Skanna artikel'}
            </Button>
            
            <Button
              onClick={() => {
                if (expandedItemId) {
                  setExpandedItemId(null);
                } else if (pendingItems.length > 0) {
                  setExpandedItemId(pendingItems[0].id);
                }
              }}
              variant="outline"
              className="h-12 bg-slate-700 border-slate-600 hover:bg-slate-600"
            >
              <Package className="w-5 h-5 mr-2" />
              {expandedItemId ? 'Minimera alla' : 'Visa detaljer'}
            </Button>
          </div>
        )}

        {/* Items to Pick */}
        {pendingItems.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                <Package className="w-6 h-6 text-blue-400" />
                Att plocka ({pendingItems.length})
              </h2>
              <span className="text-sm text-slate-400">
                Klicka på artikel för mer alternativ
              </span>
            </div>
            <div className="space-y-3">
              {pendingItems.map((item) => {
                const article = articles.find(a => a.id === item.article_id);

                return (
                  <PickingItemCard
                    key={item.id}
                    item={item}
                    article={article}
                    onPick={(qty) => handlePickQuantity(item, qty)}
                    onScan={() => {
                      setCurrentItemId(item.id);
                      setScanMode(true);
                    }}
                    isPicking={pickingItemId === item.id}
                    isExpanded={expandedItemId === item.id}
                    onToggleExpand={() => setExpandedItemId(expandedItemId === item.id ? null : item.id)}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Picked Items */}
        {pickedItems.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-green-400" />
              Plockade ({pickedItems.length})
            </h2>
            <div className="space-y-3">
              {pickedItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-green-500/10 border border-green-500/30 rounded-xl p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-white text-base mb-1">
                        {item.article_name}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-slate-300">
                        {item.article_batch_number && (
                          <span className="font-mono text-white/70">{item.article_batch_number}</span>
                        )}
                        <span className="font-semibold text-green-400 text-base">
                          {item.quantity_ordered} st beställt, {item.quantity_picked} st plockat
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {order.status !== 'picked' && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleEditPicked(item)}
                          className="text-slate-400 hover:text-white hover:bg-slate-700 h-8 w-8"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      )}
                      <CheckCircle2 className="w-7 h-7 text-green-400" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Routing Modal when picking is complete */}
        {order.status === 'picked' && (
          <OrderRoutingModal
            order={order}
            onDownload={() => exportOrderMutation.mutate()}
            isDownloading={exportOrderMutation.isPending}
            onRoute={async (route) => {
              const user = await base44.auth.me();
              if (route === 'delivered') {
                await updateOrderMutation.mutateAsync({
                  id: order.id,
                  data: { status: 'delivered' }
                });
                toast.success('Order markerad som levererad!');
                navigate(createPageUrl('Orders'));
              } else if (route === 'in_production') {
                await updateOrderMutation.mutateAsync({
                  id: order.id,
                  data: {
                    status: 'in_production',
                    production_started_date: new Date().toISOString(),
                    production_started_by: user.email
                  }
                });
                toast.success('Order skickad till produktion!');
                navigate(createPageUrl('Production'));
              } else if (route === 'parallel') {
                await updateOrderMutation.mutateAsync({
                  id: order.id,
                  data: {
                    status: 'in_production',
                    production_started_date: new Date().toISOString(),
                    production_started_by: user.email,
                    notes: (order.notes ? order.notes + '\n' : '') + '[Parallell: plockning & produktion]'
                  }
                });
                toast.success('Produktion startad parallellt!');
                navigate(createPageUrl('Production'));
              }
            }}
          />
        )}

        {/* Edit Order Form */}
        {showEditForm && (
          <OrderForm
            order={order}
            onClose={() => {
              setShowEditForm(false);
              queryClient.invalidateQueries({ queryKey: ['order', orderId] });
              queryClient.invalidateQueries({ queryKey: ['orderItems', orderId] });
            }}
          />
        )}
      </div>
    </div>
  );
}