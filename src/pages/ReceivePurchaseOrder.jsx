import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { 
  ArrowLeft, Package, CheckCircle2, Camera,
  AlertCircle, Download, Truck, FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import BarcodeScanner from "@/components/scanner/BarcodeScanner";
import ReceivingItemCard from "@/components/receiving/ReceivingItemCard";

export default function ReceivePurchaseOrderPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const poId = urlParams.get('poId');

  const [scanMode, setScanMode] = useState(false);
  const [receivingItemId, setReceivingItemId] = useState(null);

  const queryClient = useQueryClient();

  const { data: purchaseOrder } = useQuery({
    queryKey: ['purchaseOrder', poId],
    queryFn: async () => {
      const pos = await base44.entities.PurchaseOrder.filter({ id: poId });
      return pos[0];
    },
    enabled: !!poId
  });

  const { data: poItems = [] } = useQuery({
    queryKey: ['purchaseOrderItems', poId],
    queryFn: () => base44.entities.PurchaseOrderItem.filter({ purchase_order_id: poId }),
    enabled: !!poId
  });

  const { data: articles = [] } = useQuery({
    queryKey: ['articles'],
    queryFn: () => base44.entities.Article.list(),
  });

  const updatePOMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PurchaseOrder.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrder', poId] });
    }
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PurchaseOrderItem.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrderItems', poId] });
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

  // Set PO status to partially_received on mount if ordered
  useEffect(() => {
    if (purchaseOrder && purchaseOrder.status === 'ordered') {
      updatePOMutation.mutate({
        id: purchaseOrder.id,
        data: { status: 'partially_received' }
      });
    }
  }, [purchaseOrder?.id]);

  const handleBarcodeDetected = async (code) => {
    const article = articles.find(a => a.batch_number === code);
    if (!article) {
      toast.error("Artikel ej funnen med denna kod");
      return;
    }

    const item = poItems.find(i => i.article_id === article.id && i.status !== 'received');
    if (!item) {
      toast.error("Denna artikel finns inte i inköpsordern eller är redan mottagen");
      return;
    }

    const remaining = item.quantity_ordered - (item.quantity_received || 0);
    await handleReceiveQuantity(item, {
      quantity: remaining,
      shelfAddress: article.shelf_address || '',
      notes: 'Skannad',
      qualityCheck: false,
      hasDiscrepancy: false,
      discrepancyReason: null,
      images: []
    });
    setScanMode(false);
  };

  const handleReceiveQuantity = async (item, receivingData) => {
    setReceivingItemId(item.id);
    
    try {
      const user = await base44.auth.me();
      const { quantity, shelfAddress, notes, qualityCheck, hasDiscrepancy, discrepancyReason, images } = receivingData;

      // Find or skip article for custom items
      const article = item.article_id ? articles.find(a => a.id === item.article_id) : null;
      
      const previousQty = item.quantity_received || 0;
      const totalReceived = previousQty + quantity;

      // Update article stock (only for non-custom items)
      if (article) {
        const newStockQty = article.stock_qty + quantity;
        const updateData = { 
          stock_qty: newStockQty,
          status: newStockQty <= 0 ? "out_of_stock" : 
                  newStockQty <= (article.min_stock_level || 5) ? "low_stock" : "active"
        };

        if (shelfAddress) {
          updateData.shelf_address = shelfAddress;
        }

        await updateArticleMutation.mutateAsync({
          id: article.id,
          data: updateData
        });

        // Create stock movement
        await createMovementMutation.mutateAsync({
          article_id: article.id,
          movement_type: 'inbound',
          quantity: quantity,
          previous_qty: article.stock_qty,
          new_qty: newStockQty,
          reason: `Mottagen från inköpsorder ${purchaseOrder.po_number || purchaseOrder.id.slice(0, 8)}${hasDiscrepancy ? ' (avvikelse rapporterad)' : ''}`,
          reference: purchaseOrder.id
        });
      }

      // Create receiving record
      await base44.entities.ReceivingRecord.create({
        purchase_order_id: purchaseOrder.id,
        purchase_order_item_id: item.id,
        article_id: item.article_id,
        article_name: item.article_name,
        quantity_received: quantity,
        shelf_address: shelfAddress || null,
        quality_check_passed: qualityCheck,
        has_discrepancy: hasDiscrepancy,
        discrepancy_reason: discrepancyReason || null,
        image_urls: images || [],
        notes: notes || null,
        received_by: user.email
      });

      // Update PO item
      const itemStatus = totalReceived >= item.quantity_ordered ? 'received' : 'partial';
      await updateItemMutation.mutateAsync({
        id: item.id,
        data: {
          quantity_received: totalReceived,
          status: itemStatus
        }
      });

      toast.success(`${quantity} st mottagen${hasDiscrepancy ? ' (avvikelse registrerad)' : ''}`);

      // Open article page for shelf selection if article exists
      if (article) {
        setTimeout(() => {
          window.location.href = `${createPageUrl("Inventory")}?articleId=${article.id}`;
        }, 1500);
      }

      // Check if all items are received
      const allItems = await base44.entities.PurchaseOrderItem.filter({ purchase_order_id: poId });
      const allReceived = allItems.every(i => i.status === 'received');
      
      if (allReceived) {
        await updatePOMutation.mutateAsync({
          id: purchaseOrder.id,
          data: { 
            status: 'received',
            received_by: user.email,
            received_date: new Date().toISOString()
          }
        });
        toast.success("Alla artiklar mottagna! Inköpsorder komplett.");
      }
    } catch (error) {
      toast.error('Kunde inte ta emot: ' + error.message);
    } finally {
      setReceivingItemId(null);
    }
  };



  const exportPOMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('exportPurchaseOrderReceipt', { purchaseOrderId: poId });
      return response.data;
    },
    onSuccess: (data) => {
      const blob = new Blob([data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inköpsorder_${purchaseOrder.po_number || poId}_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success('Mottagningskvitto nedladdat!');
    }
  });

  if (!purchaseOrder || !poId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Inköpsorder ej funnen</h2>
          <Link to={createPageUrl("PurchaseOrders")}>
            <Button className="bg-blue-600 hover:bg-blue-500">
              Tillbaka till inköpsordrar
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const pendingItems = poItems.filter(item => item.status !== 'received');
  const receivedItems = poItems.filter(item => item.status === 'received');
  const progress = poItems.length > 0 ? (receivedItems.length / poItems.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link to={createPageUrl("PurchaseOrders")}>
            <Button
              variant="ghost"
              className="text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Tillbaka
            </Button>
          </Link>

          {purchaseOrder.status === 'received' && (
            <Button
              onClick={() => exportPOMutation.mutate()}
              disabled={exportPOMutation.isPending}
              className="bg-green-600 hover:bg-green-500"
            >
              <Download className="w-4 h-4 mr-2" />
              Ladda ner PDF
            </Button>
          )}
        </div>

        {/* PO Info */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 mb-6">
          <h1 className="text-2xl font-bold text-white mb-4">
            {purchaseOrder.po_number || `PO #${purchaseOrder.id.slice(0, 8)}`}
          </h1>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-400">Leverantör:</span>
              <span className="text-white ml-2 font-medium">{purchaseOrder.supplier_name}</span>
            </div>
            {purchaseOrder.expected_delivery_date && (
              <div>
                <span className="text-slate-400">Förväntat:</span>
                <span className="text-white ml-2 font-medium">{purchaseOrder.expected_delivery_date}</span>
              </div>
            )}
          </div>

          {/* Progress */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-slate-400">Mottagningsframsteg</span>
              <span className="text-white font-semibold">{receivedItems.length} / {poItems.length}</span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full bg-gradient-to-r from-green-500 to-green-400"
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

        {/* Items to Receive */}
        {pendingItems.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <Truck className="w-6 h-6 text-blue-400" />
              Att ta emot ({pendingItems.length})
            </h2>
            <div className="space-y-4">
              {pendingItems.map((item) => {
                const article = item.article_id ? articles.find(a => a.id === item.article_id) : null;
                
                return (
                  <ReceivingItemCard
                    key={item.id}
                    item={item}
                    article={article}
                    onReceive={(data) => handleReceiveQuantity(item, data)}
                    isReceiving={receivingItemId === item.id}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Received Items */}
        {receivedItems.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-green-400" />
              Mottagna ({receivedItems.length})
            </h2>
            <div className="space-y-4">
              {receivedItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-green-500/10 border border-green-500/30 rounded-xl p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-white text-base mb-1">
                        {item.article_name}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-slate-300">
                        {item.article_batch_number && (
                          <span className="font-mono text-white/70">{item.article_batch_number}</span>
                        )}
                        <span className="font-semibold text-green-400">
                          Beställt: {item.quantity_ordered} st · Mottaget: {item.quantity_received} st
                        </span>
                      </div>
                    </div>
                    <CheckCircle2 className="w-7 h-7 text-green-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Complete Message */}
        {purchaseOrder.status === 'received' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-6 bg-green-500/10 border border-green-500/30 rounded-xl p-6 text-center"
          >
            <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
            <h3 className="text-xl font-bold text-white mb-2">
              Inköpsorder komplett!
            </h3>
            <p className="text-slate-400 mb-4">
              Alla artiklar har tagits emot till lagret
            </p>
            <Button
              onClick={() => exportPOMutation.mutate()}
              disabled={exportPOMutation.isPending}
              className="bg-green-600 hover:bg-green-500"
            >
              <Download className="w-4 h-4 mr-2" />
              Ladda ner mottagningskvitto
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}