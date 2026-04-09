import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { 
  ArrowLeft, Package, CheckCircle2, Camera,
  AlertCircle, Download, Truck, FileText, Eye, X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import BarcodeScanner from "@/components/scanner/BarcodeScanner";
import ReceivingItemCard from "@/components/receiving/ReceivingItemCard";
import ReceivingRecordDetailModal from "@/components/receiving/ReceivingRecordDetailModal";
import ReceivingCamera from "@/components/receiving/ReceivingCamera";
import AIReviewForm from "@/components/receiving/AIReviewForm";

export default function ReceivePurchaseOrderPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const poId = urlParams.get('poId');

  const [scanMode, setScanMode] = useState(false);
  const [receivingItemId, setReceivingItemId] = useState(null);
  const [selectedReceivingRecords, setSelectedReceivingRecords] = useState([]);
  const [showReceivingModal, setShowReceivingModal] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [aiExtractedData, setAiExtractedData] = useState(null);
  const [showAIReview, setShowAIReview] = useState(false);

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

  const { data: receivingRecords = [] } = useQuery({
    queryKey: ['receivingRecords', poId],
    queryFn: () => base44.entities.ReceivingRecord.filter({ purchase_order_id: poId }),
    enabled: !!poId
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

    // Check for existing batches of same article
    const existingBatches = articles.filter(a => 
      a.id === article.id && 
      a.batch_number && 
      a.batch_number !== code &&
      a.stock_qty > 0
    );

    if (existingBatches.length > 0) {
      const batchList = existingBatches.map(b => `${b.batch_number} (${b.stock_qty} st)`).join(', ');
      toast.warning(`⚠️ Befintliga batcher i lager: ${batchList}`);
    }

    // Check for duplicate batch
    const duplicateBatch = articles.find(a => 
      a.id === article.id && 
      a.batch_number === code && 
      a.stock_qty > 0
    );

    if (duplicateBatch) {
      toast.error(`Batch ${code} finns redan i lager (${duplicateBatch.stock_qty} st)`);
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
                  newStockQty <= (article.min_stock_level || 5) ? "low_stock" : "active",
          source_purchase_order_id: purchaseOrder.id,
          source_invoice_number: purchaseOrder.invoice_number || purchaseOrder.po_number || '',
          ...(purchaseOrder.invoice_file_url && { source_invoice_url: purchaseOrder.invoice_file_url }),
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

  const sendToFortnoxMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('createFortnoxInboundDelivery', {
        purchase_order_id: poId,
        complete: true
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrder', poId] });
      toast.success(`Skickat till Fortnox! ID: ${data.fortnoxId || 'OK'}`);
    },
    onError: (error) => {
      toast.error('Kunde inte skicka till Fortnox: ' + error.message);
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

          <div className="flex gap-2 flex-wrap">
            {(purchaseOrder.status === 'received' || purchaseOrder.status === 'partially_received') && receivingRecords.length > 0 && (
              <Button
                onClick={() => {
                  setSelectedReceivingRecords(receivingRecords);
                  setShowReceivingModal(true);
                }}
                variant="outline"
                className="bg-slate-800 border-slate-600 hover:bg-slate-700"
              >
                <Eye className="w-4 h-4 mr-2" />
                Visa följesedel
              </Button>
            )}
            {(purchaseOrder.status === 'received' || purchaseOrder.status === 'partially_received') && (
              purchaseOrder.fortnox_incoming_goods_id ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  Fortnox #{purchaseOrder.fortnox_incoming_goods_id}
                </div>
              ) : (
                <Button
                  onClick={() => sendToFortnoxMutation.mutate()}
                  disabled={sendToFortnoxMutation.isPending}
                  className="bg-purple-600 hover:bg-purple-500"
                >
                  {sendToFortnoxMutation.isPending ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />Skickar...</>
                  ) : (
                    <><FileText className="w-4 h-4 mr-2" />Skicka till Fortnox</>
                  )}
                </Button>
              )
            )}
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

        {/* Scan/Camera Buttons */}
         {pendingItems.length > 0 && (
          <div className="flex gap-4 mb-6">
            <Button
              onClick={() => setScanMode(!scanMode)}
              className="flex-1 bg-blue-600 hover:bg-blue-500 h-14 text-base"
            >
              <Camera className="w-5 h-5 mr-2" />
              {scanMode ? 'Stäng skanner' : 'Skanna streckkod'}
            </Button>
            <Button
              onClick={() => setShowCamera(true)}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 h-14 text-base"
            >
              <Camera className="w-5 h-5 mr-2" />
              Fotografera
            </Button>
          </div>
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

        {/* Receiving Camera */}
        <AnimatePresence>
          {showCamera && (
            <ReceivingCamera
              onCapture={async (file) => {
                try {
                  // Upload image
                  toast.info('Laddar upp bild...');
                  const { file_url } = await base44.integrations.Core.UploadFile({ file });
                  
                  // Parse document with AI
                  toast.info('Analyserar dokument med AI...');
                  const analysis = await base44.functions.invoke('parseReceivingDocument', {
                    fileUrls: [file_url]
                  });

                  if (analysis.data.success && analysis.data.extracted) {
                    const extracted = analysis.data.extracted;
                    setAiExtractedData(extracted);
                    setShowCamera(false);
                    setShowAIReview(true);
                    toast.success('Dokument analyserat! Granska resultatet.');
                  } else {
                    toast.error('Kunde inte extrahera data från dokumentet');
                    setShowCamera(false);
                  }
                } catch (error) {
                  console.error('Error:', error);
                  toast.error('Kunde inte analysera dokument: ' + error.message);
                  setShowCamera(false);
                }
              }}
              onClose={() => setShowCamera(false)}
            />
          )}
        </AnimatePresence>

        {/* AI Review Form */}
        {showAIReview && aiExtractedData && (
          <AIReviewForm
            extractedData={aiExtractedData}
            poItems={pendingItems}
            articles={articles}
            onConfirm={async (selectedItems, notes) => {
              try {
                for (const item of selectedItems) {
                  await handleReceiveQuantity(item.poItem, {
                    quantity: item.quantity,
                    shelfAddress: item.article.shelf_address?.[0] || '',
                    notes: notes || `AI-scannad från dokument`,
                    qualityCheck: false,
                    hasDiscrepancy: false,
                    discrepancyReason: null,
                    images: []
                  });
                }
                setShowAIReview(false);
                setAiExtractedData(null);
                toast.success('Artiklar mottagna!');
              } catch (error) {
                toast.error('Kunde inte ta emot artiklar: ' + error.message);
              }
            }}
            onCancel={() => {
              setShowAIReview(false);
              setAiExtractedData(null);
            }}
          />
        )}

        {/* Receiving Records Modal */}
         {showReceivingModal && selectedReceivingRecords.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowReceivingModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-700">
                <div>
                  <h2 className="text-xl font-bold text-white">Följesedel & Mottagningsdetaljer</h2>
                  <p className="text-sm text-slate-400 mt-1">
                    {purchaseOrder.po_number || `PO #${purchaseOrder.id.slice(0, 8)}`} · {purchaseOrder.supplier_name}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowReceivingModal(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-4">
                  {selectedReceivingRecords.map((record, index) => (
                    <div key={record.id} className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-white mb-1">{record.article_name}</h3>
                          <div className="flex items-center gap-4 text-sm text-slate-400">
                            <span>Kvantitet: <span className="text-white font-medium">{record.quantity_received} st</span></span>
                            {record.shelf_address && (
                              <span>Hyllplats: <span className="text-white font-medium">{record.shelf_address}</span></span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {record.quality_check_passed ? (
                            <CheckCircle2 className="w-5 h-5 text-green-400" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-red-400" />
                          )}
                        </div>
                      </div>

                      {record.has_discrepancy && (
                        <div className="mb-3 p-2 rounded bg-red-500/10 border border-red-500/30">
                          <p className="text-sm text-red-400">
                            <AlertCircle className="w-4 h-4 inline mr-1" />
                            Avvikelse: {record.discrepancy_reason || 'Ingen anledning angiven'}
                          </p>
                        </div>
                      )}

                      {record.notes && (
                        <div className="mb-3">
                          <p className="text-sm text-slate-400 mb-1">Anteckningar:</p>
                          <p className="text-sm text-slate-300">{record.notes}</p>
                        </div>
                      )}

                      {record.image_urls && record.image_urls.length > 0 && (
                        <div className="grid grid-cols-3 gap-2">
                          {record.image_urls.map((url, imgIndex) => (
                            <img 
                              key={imgIndex} 
                              src={url} 
                              alt={`Bild ${imgIndex + 1}`}
                              className="w-full h-24 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => window.open(url, '_blank')}
                            />
                          ))}
                        </div>
                      )}

                      <div className="mt-3 pt-3 border-t border-slate-700/50 text-xs text-slate-500">
                        Mottagen av {record.received_by} · {format(new Date(record.created_date), "d MMM yyyy HH:mm", { locale: sv })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end p-6 border-t border-slate-700 bg-slate-900/50">
                <Button
                  onClick={() => setShowReceivingModal(false)}
                  variant="outline"
                  className="bg-slate-800 border-slate-600 hover:bg-slate-700"
                >
                  Stäng
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
}