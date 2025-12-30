import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { 
  ArrowLeft, Package, CheckCircle2, Camera, MapPin,
  AlertCircle, Loader2, Download, Edit2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import BarcodeScanner from "@/components/scanner/BarcodeScanner";

export default function PickOrderPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get('orderId');

  const [scanMode, setScanMode] = useState(false);
  const [currentItemId, setCurrentItemId] = useState(null);

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

    // Update article stock
    await updateArticleMutation.mutateAsync({
      id: article.id,
      data: { 
        stock_qty: newStockQty,
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
      
      // Send email notification
      try {
        await base44.integrations.Core.SendEmail({
          to: 'service@imvision.se',
          subject: `Order ${order.order_number || order.id.slice(0, 8)} färdigplockad`,
          body: `Order ${order.order_number || order.id.slice(0, 8)} för ${order.customer_name} har plockats och är klar för leverans.\n\nPlockad av: ${user.email}\nPlockad: ${new Date().toLocaleString('sv-SE')}\nAntal artiklar: ${allItems.length}`
        });
      } catch (emailError) {
        console.error('Failed to send email:', emailError);
      }
      
      toast.success("Alla artiklar plockade! Order komplett.");
    }
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

          {order.status === 'picked' && (
            <Button
              onClick={() => exportOrderMutation.mutate()}
              disabled={exportOrderMutation.isPending}
              className="bg-green-600 hover:bg-green-500"
            >
              <Download className="w-4 h-4 mr-2" />
              Ladda ner PDF
            </Button>
          )}
        </div>

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

        {/* Scan Button */}
        {pendingItems.length > 0 && (
          <Button
            onClick={() => setScanMode(!scanMode)}
            className="w-full mb-6 bg-blue-600 hover:bg-blue-500 h-14 text-lg"
          >
            <Camera className="w-5 h-5 mr-2" />
            {scanMode ? 'Stäng skanner' : 'Skanna streckkod'}
          </Button>
        )}

        {/* Scanner */}
        {scanMode && (
          <div className="mb-6">
            <BarcodeScanner
              onBarcodeDetected={handleBarcodeDetected}
              onClose={() => setScanMode(false)}
            />
          </div>
        )}

        {/* Items to Pick */}
        {pendingItems.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <Package className="w-5 h-5" />
              Att plocka
            </h2>
            <div className="space-y-2">
              {pendingItems.map((item) => {
                const article = articles.find(a => a.id === item.article_id);
                const remaining = item.quantity_ordered - (item.quantity_picked || 0);

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-slate-800/50 border border-slate-700 rounded-xl p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-white mb-1">
                          {item.article_name}
                        </h3>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
                          {item.article_batch_number && (
                            <span className="font-mono">{item.article_batch_number}</span>
                          )}
                          {item.shelf_address && (
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {item.shelf_address}
                            </div>
                          )}
                          <span className="font-semibold text-white">
                            {remaining} st
                          </span>
                        </div>
                        {article && article.stock_qty < remaining && (
                          <div className="flex items-center gap-1 text-amber-400 text-xs mt-2">
                            <AlertCircle className="w-3 h-3" />
                            Endast {article.stock_qty} st i lager
                          </div>
                        )}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleManualPick(item)}
                        className="bg-blue-600 hover:bg-blue-500"
                      >
                        Plocka
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Picked Items */}
        {pickedItems.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              Plockade
            </h2>
            <div className="space-y-2">
              {pickedItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-green-500/10 border border-green-500/30 rounded-xl p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-white mb-1">
                        {item.article_name}
                      </h3>
                      <div className="flex items-center gap-3 text-sm text-slate-400">
                        {item.article_batch_number && (
                          <span className="font-mono">{item.article_batch_number}</span>
                        )}
                        <span className="font-semibold text-green-400">
                          {item.quantity_picked} st
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
                      <CheckCircle2 className="w-6 h-6 text-green-400" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Complete Message */}
        {order.status === 'picked' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-6 bg-green-500/10 border border-green-500/30 rounded-xl p-6 text-center"
          >
            <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
            <h3 className="text-xl font-bold text-white mb-2">
              Order komplett!
            </h3>
            <p className="text-slate-400 mb-4">
              Alla artiklar har plockats från lagret
            </p>
            <Button
              onClick={() => exportOrderMutation.mutate()}
              disabled={exportOrderMutation.isPending}
              className="bg-green-600 hover:bg-green-500"
            >
              <Download className="w-4 h-4 mr-2" />
              Ladda ner plockkvitto
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}