import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { 
  Package, CheckCircle2, AlertTriangle, Upload, X, 
  Calendar, User, FileText, Camera, CloudUpload, Loader2
} from "lucide-react";
import { useState as useLocalState } from 'react';
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { cn } from "@/lib/utils";

function ExistingDocuments({ purchaseOrderId }) {
  const { data: receivingRecords = [] } = useQuery({
    queryKey: ['receivingRecords', purchaseOrderId],
    queryFn: async () => {
      const records = await base44.entities.ReceivingRecord.filter({ 
        purchase_order_id: purchaseOrderId 
      });
      return records;
    }
  });

  const allDocuments = receivingRecords
    .flatMap(record => record.image_urls || [])
    .filter((url, index, self) => url && self.indexOf(url) === index);

  if (allDocuments.length === 0) return null;

  return (
    <div className="mt-4 p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
      <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
        <FileText className="w-5 h-5" />
        Tidigare uppladdade dokument ({allDocuments.length})
      </h3>
      <div className="grid grid-cols-4 gap-2">
        {allDocuments.map((url, idx) => {
          const fileName = url.split('/').pop().split('?')[0];
          const isPdf = fileName.toLowerCase().endsWith('.pdf');
          
          return (
            <a
              key={idx}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative aspect-square rounded-lg overflow-hidden bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
            >
              {isPdf ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <FileText className="w-8 h-8 text-blue-400" />
                </div>
              ) : (
                <img 
                  src={url} 
                  alt={`Dokument ${idx + 1}`} 
                  className="w-full h-full object-cover"
                />
              )}
              <div className="absolute bottom-0 left-0 right-0 p-1 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-xs text-white truncate">{fileName}</p>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}

export default function SimplifiedReceivingForm({ purchaseOrder, onClose, onComplete }) {
  const queryClient = useQueryClient();
  const [receivingData, setReceivingData] = useState({});
  const [syncingIncoming, setSyncingIncoming] = useLocalState(false);
  const [globalNotes, setGlobalNotes] = useState("");
  const [uploadingImages, setUploadingImages] = useState(false);
  const [globalImages, setGlobalImages] = useState([]);
  const [shippingDocuments, setShippingDocuments] = useState([]);
  const [fortnoxPoId, setFortnoxPoId] = useState(purchaseOrder?.fortnox_po_id || "");
  const [showPoMissingWarning, setShowPoMissingWarning] = useState(false);

  const { data: items = [] } = useQuery({
    queryKey: ['purchaseOrderItems', purchaseOrder.id],
    queryFn: async () => {
      const allItems = await base44.entities.PurchaseOrderItem.list();
      return allItems.filter(item => item.purchase_order_id === purchaseOrder.id);
    }
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  // Initialize receiving data with full quantities and check PO sync status
  useEffect(() => {
    const initialData = {};
    items.forEach(item => {
      const remaining = item.quantity_ordered - (item.quantity_received || 0);
      initialData[item.id] = {
        quantity_received: remaining > 0 ? remaining : 0,
        has_discrepancy: false,
        discrepancy_reason: "",
        quality_check_passed: true,
        image_urls: []
      };
    });
    setReceivingData(initialData);

    // Auto-fill fortnoxPoId and show warning if not synced
    if (purchaseOrder?.fortnox_po_id) {
      setFortnoxPoId(purchaseOrder.fortnox_po_id);
      setShowPoMissingWarning(false);
    } else {
      setFortnoxPoId("");
      setShowPoMissingWarning(true);
    }
  }, [items, purchaseOrder]);

  const receiveMutation = useMutation({
    mutationFn: async (data) => {
      const results = {
        receivingRecords: [],
        updatedItems: [],
        updatedArticles: [],
        movements: []
      };

      for (const item of items) {
        const itemData = data.receivingData[item.id];
        if (!itemData || itemData.quantity_received <= 0) continue;

        // Create receiving record
        const receivingRecord = await base44.entities.ReceivingRecord.create({
          purchase_order_id: purchaseOrder.id,
          purchase_order_item_id: item.id,
          article_id: item.article_id,
          article_name: item.article_name,
          quantity_received: itemData.quantity_received,
          quality_check_passed: itemData.quality_check_passed,
          has_discrepancy: itemData.has_discrepancy,
          discrepancy_reason: itemData.discrepancy_reason || data.globalNotes,
          image_urls: [...itemData.image_urls, ...data.globalImages, ...data.shippingDocuments],
          received_by: user?.email || "unknown"
        });
        results.receivingRecords.push(receivingRecord);

        // Update purchase order item
        const newQuantityReceived = (item.quantity_received || 0) + itemData.quantity_received;
        const updatedItem = await base44.entities.PurchaseOrderItem.update(item.id, {
          quantity_received: newQuantityReceived,
          status: newQuantityReceived >= item.quantity_ordered ? "received" : "partial"
        });
        results.updatedItems.push(updatedItem);

        // Update article stock
        const article = await base44.entities.Article.list();
        const foundArticle = article.find(a => a.id === item.article_id);
        if (foundArticle) {
          const previousQty = foundArticle.stock_qty || 0;
          const newQty = previousQty + itemData.quantity_received;
          
          const updatedArticle = await base44.entities.Article.update(item.article_id, {
            stock_qty: newQty,
            status: newQty <= 0 ? "out_of_stock" : 
                    newQty <= (foundArticle.min_stock_level || 5) ? "low_stock" : "active",
            transit_expected_date: null  // Clear transit date on receipt
          });
          results.updatedArticles.push(updatedArticle);

          // Create stock movement
          const movement = await base44.entities.StockMovement.create({
            article_id: item.article_id,
            movement_type: "inbound",
            quantity: itemData.quantity_received,
            previous_qty: previousQty,
            new_qty: newQty,
            reason: `Mottagning från IO ${purchaseOrder.po_number || purchaseOrder.id.slice(0, 8)}`,
            reference: purchaseOrder.po_number || purchaseOrder.id
          });
          results.movements.push(movement);
        }
      }

      // Update purchase order status
      const allItemsReceived = items.every(item => {
        const itemData = data.receivingData[item.id];
        const totalReceived = (item.quantity_received || 0) + (itemData?.quantity_received || 0);
        return totalReceived >= item.quantity_ordered;
      });

      await base44.entities.PurchaseOrder.update(purchaseOrder.id, {
        status: allItemsReceived ? "received" : "partially_received",
        received_date: new Date().toISOString(),
        received_by: user?.email || "unknown",
        expected_delivery_date: null,
        confirmed_delivery_date: null
      });

      return results;
    },
    onSuccess: async (results) => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      queryClient.invalidateQueries({ queryKey: ['purchaseOrderItems'] });
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      queryClient.invalidateQueries({ queryKey: ['movements'] });
      // Show per-article stock update confirmation
      results.updatedArticles.forEach((updatedArticle) => {
        const movement = results.movements.find(m => m.article_id === updatedArticle.id);
        if (movement) {
          toast.success(`✅ Lagersaldo uppdaterat: ${updatedArticle.name} +${movement.quantity} st → nytt saldo: ${updatedArticle.stock_qty}`);
        }
      });
      onComplete?.(results.receivingRecords);

      // Fire-and-forget Fortnox sync for each receiving record
      for (const record of results.receivingRecords) {
        base44.functions.invoke('createFortnoxInboundDelivery', {
          receiving_record_id: record.id
        }).then((res) => {
          if (res?.data?.success) {
            toast.success(`Fortnox: Inleverans skapad (ID: ${res.data.deliveryId})`);
          } else {
            toast.warning(`Fortnox-synk misslyckades för ${record.article_name || record.id}: ${res?.data?.error || 'Okänt fel'}`);
          }
        }).catch((err) => {
          toast.warning(`Fortnox-synk misslyckades för ${record.article_name || record.id}: ${err.message}`);
        });
      }
    },
    onError: (error) => {
      toast.error("Kunde inte registrera mottagning: " + error.message);
    }
  });

  const handleImageUpload = async (e, itemId = null) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadingImages(true);
    try {
      const uploadPromises = files.map(file => 
        base44.integrations.Core.UploadFile({ file })
      );
      const results = await Promise.all(uploadPromises);
      const newUrls = results.map(r => r.file_url);
      
      if (itemId) {
        setReceivingData(prev => ({
          ...prev,
          [itemId]: {
            ...prev[itemId],
            image_urls: [...(prev[itemId]?.image_urls || []), ...newUrls]
          }
        }));
      } else {
        setGlobalImages(prev => [...prev, ...newUrls]);
      }
      
      toast.success(`${files.length} fil${files.length > 1 ? 'er' : ''} uppladdad${files.length > 1 ? 'e' : ''}`);
    } catch (error) {
      toast.error('Kunde inte ladda upp filer');
    } finally {
      setUploadingImages(false);
    }
  };

  const handleDocumentUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadingImages(true);
    try {
      const uploadPromises = files.map(file => 
        base44.integrations.Core.UploadFile({ file })
      );
      const results = await Promise.all(uploadPromises);
      const newUrls = results.map(r => r.file_url);
      
      setShippingDocuments(prev => [...prev, ...newUrls]);
      
      toast.success(`${files.length} dokument uppladdad${files.length > 1 ? 'e' : ''}`);
    } catch (error) {
      toast.error('Kunde inte ladda upp dokument');
    } finally {
      setUploadingImages(false);
    }
  };

  const handleSubmit = () => {
    const hasAnyReceiving = Object.values(receivingData).some(
      data => data.quantity_received > 0
    );

    if (!hasAnyReceiving) {
      toast.error("Ange minst en mottagen kvantitet");
      return;
    }

    receiveMutation.mutate({ receivingData, globalNotes, globalImages, shippingDocuments });
  };

  const totalOrdered = items.reduce((sum, item) => sum + item.quantity_ordered, 0);
  const totalReceiving = Object.values(receivingData).reduce(
    (sum, data) => sum + (data?.quantity_received || 0), 0
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                <Package className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  Ta emot leverans
                </h2>
                <p className="text-sm text-slate-400">
                  IO: {purchaseOrder.po_number || `#${purchaseOrder.id.slice(0, 8)}`}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="p-3 rounded-lg bg-white/5">
              <div className="text-xs text-slate-400 mb-1">Leverantör</div>
              <div className="text-sm font-medium text-white">{purchaseOrder.supplier_name}</div>
            </div>
            <div className="p-3 rounded-lg bg-white/5">
              <div className="text-xs text-slate-400 mb-1">Beställningsdatum</div>
              <div className="text-sm font-medium text-white">
                {format(new Date(purchaseOrder.order_date || purchaseOrder.created_date), 'd MMM yyyy', { locale: sv })}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-white/5">
              <div className="text-xs text-slate-400 mb-1">Totalt att ta emot</div>
              <div className="text-sm font-medium text-white">{totalOrdered} st</div>
            </div>
          </div>

          {/* Existing Documents */}
          <ExistingDocuments purchaseOrderId={purchaseOrder.id} />
        </div>

        {/* Fortnox PO Reference */}
        <div className="p-6 border-b border-white/10">
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-white mb-2 block">
                Fortnox leverantörsorder-nr (deliveryNoteId)
              </label>
              <Input
                type="text"
                value={fortnoxPoId}
                onChange={(e) => setFortnoxPoId(e.target.value)}
                placeholder="Auto-fylld från kopplat inköp..."
                className={cn(
                  "bg-zinc-900 border-white/10 text-white",
                  purchaseOrder?.fortnox_po_id ? "opacity-60" : ""
                )}
                disabled={!!purchaseOrder?.fortnox_po_id}
              />
              <p className="text-xs text-slate-400 mt-2">
                Hämtas automatiskt från kopplat inköps Fortnox PO-nummer. Inköpet måste vara synkat till Fortnox (Steg 1 – Skicka till Fortnox) innan inleverans kan registreras i Fortnox.
              </p>
            </div>

            {showPoMissingWarning && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-200">
                  <strong>⚠️ Inköpet är inte skickat till Fortnox ännu.</strong> Kör "Skicka till Fortnox" (Steg 1) på inköpsordern först.
                </div>
              </div>
            )}

            {fortnoxPoId && (
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <p className="text-sm text-blue-300">
                  → Kopplad till Fortnox leverantörsorder <strong>#{fortnoxPoId}</strong>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {items.map((item) => {
            const remaining = item.quantity_ordered - (item.quantity_received || 0);
            const data = receivingData[item.id] || {};
            
            return (
              <div
                key={item.id}
                className="p-4 rounded-xl bg-white/5 border border-white/10"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-white mb-1">{item.article_name}</h3>
                    <div className="flex items-center gap-3 text-sm text-slate-400">
                      <span>Beställt: {item.quantity_ordered} st</span>
                      {item.quantity_received > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-400">
                            Tidigare mottaget: {item.quantity_received} st
                          </span>
                        </>
                      )}
                      <span>•</span>
                      <span className="text-amber-400">Kvar: {remaining} st</span>
                    </div>
                  </div>
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                    {item.article_batch_number || "Ingen batch"}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-white mb-2 block">
                      Mottagen kvantitet
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max={remaining}
                      value={data.quantity_received || 0}
                      onChange={(e) => setReceivingData(prev => ({
                        ...prev,
                        [item.id]: {
                          ...prev[item.id],
                          quantity_received: parseInt(e.target.value) || 0
                        }
                      }))}
                      className="bg-zinc-900 border-white/10 text-white"
                    />
                  </div>

                  <div className="flex items-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setReceivingData(prev => ({
                        ...prev,
                        [item.id]: {
                          ...prev[item.id],
                          quantity_received: remaining
                        }
                      }))}
                      className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                    >
                      Fyll i allt ({remaining} st)
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-6 mt-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={data.has_discrepancy}
                      onCheckedChange={(checked) => setReceivingData(prev => ({
                        ...prev,
                        [item.id]: {
                          ...prev[item.id],
                          has_discrepancy: checked
                        }
                      }))}
                    />
                    <span className="text-sm text-white">Avvikelse/skada</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={data.quality_check_passed}
                      onCheckedChange={(checked) => setReceivingData(prev => ({
                        ...prev,
                        [item.id]: {
                          ...prev[item.id],
                          quality_check_passed: checked
                        }
                      }))}
                    />
                    <span className="text-sm text-white">Kvalitetskontroll OK</span>
                  </label>
                </div>

                {data.has_discrepancy && (
                  <div className="mt-4 space-y-3">
                    <Textarea
                      placeholder="Beskriv avvikelsen..."
                      value={data.discrepancy_reason || ""}
                      onChange={(e) => setReceivingData(prev => ({
                        ...prev,
                        [item.id]: {
                          ...prev[item.id],
                          discrepancy_reason: e.target.value
                        }
                      }))}
                      className="bg-zinc-900 border-white/10 text-white"
                      rows={3}
                    />
                    
                    <div>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, item.id)}
                        className="hidden"
                        id={`upload-${item.id}`}
                      />
                      <label
                        htmlFor={`upload-${item.id}`}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 cursor-pointer text-sm text-white transition-colors"
                      >
                        <Camera className="w-4 h-4" />
                        Lägg till bilder
                      </label>
                      
                      {data.image_urls?.length > 0 && (
                        <div className="flex gap-2 mt-2">
                          {data.image_urls.map((url, idx) => (
                            <img
                              key={idx}
                              src={url}
                              alt={`Avvikelse ${idx + 1}`}
                              className="w-16 h-16 rounded object-cover"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Shipping Documents */}
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Följesedel / Fraktdokumentation
            </h3>
            <p className="text-sm text-emerald-200 mb-3">
              Ladda upp följesedel, fraktsedel eller andra leveransdokument
            </p>
            
            <div>
              <input
                type="file"
                multiple
                accept="image/*,.pdf"
                onChange={handleDocumentUpload}
                className="hidden"
                id="document-upload"
              />
              <label
                htmlFor="document-upload"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-emerald-500/30 bg-emerald-500/20 hover:bg-emerald-500/30 cursor-pointer text-sm text-white transition-colors"
              >
                <Upload className="w-4 h-4" />
                Ladda upp dokument
              </label>
              
              {shippingDocuments.length > 0 && (
                <div className="mt-3 space-y-2">
                  {shippingDocuments.map((url, idx) => {
                    const fileName = url.split('/').pop().split('?')[0];
                    const isPdf = fileName.toLowerCase().endsWith('.pdf');
                    
                    return (
                      <a
                        key={idx}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2 rounded bg-emerald-500/20 hover:bg-emerald-500/30 transition-colors"
                      >
                        {isPdf ? (
                          <FileText className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <img src={url} alt={`Dokument ${idx + 1}`} className="w-10 h-10 rounded object-cover" />
                        )}
                        <span className="text-sm text-white truncate flex-1">{fileName}</span>
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Global Notes and Images */}
          <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Allmänna anteckningar för hela leveransen
            </h3>
            <Textarea
              placeholder="T.ex. följesedelsnummer, allmänna kommentarer om leveransen..."
              value={globalNotes}
              onChange={(e) => setGlobalNotes(e.target.value)}
              className="bg-zinc-900 border-white/10 text-white mb-3"
              rows={3}
            />
            
            <div>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => handleImageUpload(e)}
                className="hidden"
                id="global-upload"
              />
              <label
                htmlFor="global-upload"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 cursor-pointer text-sm text-white transition-colors"
              >
                <Camera className="w-4 h-4" />
                Lägg till bilder (följesedel, överblick)
              </label>
              
              {globalImages.length > 0 && (
                <div className="flex gap-2 mt-2">
                  {globalImages.map((url, idx) => (
                    <img
                      key={idx}
                      src={url}
                      alt={`Bild ${idx + 1}`}
                      className="w-16 h-16 rounded object-cover"
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 bg-zinc-900/50">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-slate-400">
              Mottas nu: <span className="text-white font-semibold">{totalReceiving} av {totalOrdered} st</span>
            </div>
            {totalReceiving < totalOrdered && (
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                Delvis mottagning
              </Badge>
            )}
          </div>
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={receiveMutation.isPending}
              className="flex-1 bg-white/5 border-white/10 text-white hover:bg-white/10"
            >
              Avbryt
            </Button>
            {purchaseOrder.fortnox_po_id && (
              <Button
                onClick={async () => {
                  setSyncingIncoming(true);
                  try {
                    const res = await base44.functions.invoke('syncIncomingGoodsToFortnox', {
                      purchaseOrderId: purchaseOrder.id
                    });
                    const data = res.data;
                    if (data?.success) {
                      toast.success(`✅ Inleverans #${data.incomingGoodsNumber} registrerad i Fortnox!`);
                      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
                    } else {
                      toast.error(`❌ Misslyckades: ${data?.error || 'Okänt fel'}`, { duration: 8000 });
                    }
                  } catch (e) {
                    toast.error('Misslyckades: ' + e.message);
                  } finally {
                    setSyncingIncoming(false);
                  }
                }}
                disabled={syncingIncoming}
                className="bg-teal-600 hover:bg-teal-500 text-white"
              >
                {syncingIncoming ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CloudUpload className="w-4 h-4 mr-2" />
                )}
                {syncingIncoming ? 'Registrerar...' : 'Inleverans i Fortnox'}
              </Button>
            )}
            <Button
              onClick={handleSubmit}
              disabled={receiveMutation.isPending || totalReceiving === 0}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500"
            >
              {receiveMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Registrerar...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Bekräfta mottagning
                </>
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}