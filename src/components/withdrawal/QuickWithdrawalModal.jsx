import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { X, Package, Camera, CheckCircle2, AlertCircle, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import BarcodeScanner from "@/components/scanner/BarcodeScanner";

export default function QuickWithdrawalModal({ onClose }) {
  const [step, setStep] = useState('scan'); // scan, confirm
  const [scanMode, setScanMode] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [customerReference, setCustomerReference] = useState('');
  const [notes, setNotes] = useState('');

  const queryClient = useQueryClient();

  const { data: articles = [] } = useQuery({
    queryKey: ['articles'],
    queryFn: () => base44.entities.Article.list(),
  });

  const createWithdrawalMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      const article = articles.find(a => a.id === data.article_id);
      
      // Create Order
      const order = await base44.entities.Order.create({
        order_number: `SNABB-${Date.now()}`,
        customer_name: data.customer_reference,
        customer_reference: data.customer_reference,
        status: 'picked',
        picked_by: user.email,
        picked_date: new Date().toISOString(),
        notes: data.notes || 'Snabb utplockning',
        is_incomplete: true
      });

      // Create OrderItem
      await base44.entities.OrderItem.create({
        order_id: order.id,
        article_id: article.id,
        article_name: data.article_name,
        article_batch_number: data.article_batch_number,
        quantity_ordered: data.quantity,
        quantity_picked: data.quantity,
        status: 'picked'
      });

      // Update article stock
      const newQty = (article.stock_qty || 0) - data.quantity;
      await base44.entities.Article.update(article.id, {
        stock_qty: newQty,
        status: newQty <= 0 ? "out_of_stock" : 
                newQty <= (article.min_stock_level || 5) ? "low_stock" : "active"
      });

      // Create stock movement
      await base44.entities.StockMovement.create({
        article_id: article.id,
        movement_type: 'outbound',
        quantity: -data.quantity,
        previous_qty: article.stock_qty,
        new_qty: newQty,
        reason: `Snabb utplockning: ${data.customer_reference}`,
        reference: order.id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Artikel utplockad och order skapad!');
      onClose();
    },
    onError: (error) => {
      toast.error('Kunde inte plocka ut: ' + error.message);
    }
  });

  const handleBarcodeDetected = (code) => {
    const article = articles.find(a => a.batch_number === code);
    if (!article) {
      toast.error("Artikel ej funnen med denna kod");
      return;
    }

    if (article.stock_qty <= 0) {
      toast.error("Artikeln är slut i lager");
      return;
    }

    setSelectedArticle(article);
    setQuantity(1);
    setScanMode(false);
    setStep('confirm');
  };

  const handleManualSearch = (searchTerm) => {
    const article = articles.find(a => 
      a.batch_number?.toLowerCase() === searchTerm.toLowerCase() ||
      a.sku?.toLowerCase() === searchTerm.toLowerCase() ||
      a.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    if (!article) {
      toast.error("Artikel ej funnen");
      return;
    }

    if (article.stock_qty <= 0) {
      toast.error("Artikeln är slut i lager");
      return;
    }

    setSelectedArticle(article);
    setQuantity(1);
    setStep('confirm');
  };

  const handleSubmit = () => {
    if (!selectedArticle) {
      toast.error("Ingen artikel vald");
      return;
    }

    if (!customerReference.trim()) {
      toast.error("Fyll i kund/kommentar");
      return;
    }

    if (quantity > selectedArticle.stock_qty) {
      toast.error(`Endast ${selectedArticle.stock_qty} st tillgängligt`);
      return;
    }

    createWithdrawalMutation.mutate({
      article_id: selectedArticle.id,
      article_name: selectedArticle.customer_name || selectedArticle.name,
      article_batch_number: selectedArticle.batch_number,
      quantity: quantity,
      customer_reference: customerReference.trim(),
      notes: notes.trim()
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div>
            <h2 className="text-xl font-bold text-white">Snabb utplockning</h2>
            <p className="text-sm text-slate-400 mt-1">
              {step === 'scan' ? 'Skanna eller sök artikel' : 'Bekräfta utplockning'}
            </p>
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

        {/* Content */}
        <div className="p-6">
          {step === 'scan' ? (
            <div className="space-y-4">
              {scanMode ? (
                <BarcodeScanner
                  onBarcodeDetected={handleBarcodeDetected}
                  onClose={() => setScanMode(false)}
                />
              ) : (
                <>
                  <Button
                    onClick={() => setScanMode(true)}
                    className="w-full bg-blue-600 hover:bg-blue-500 h-16"
                  >
                    <Camera className="w-6 h-6 mr-2" />
                    Skanna streckkod
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-700" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-slate-900 px-2 text-slate-400">eller</span>
                    </div>
                  </div>

                  <div>
                    <Input
                      placeholder="Sök artikelnummer, batch eller namn..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.target.value) {
                          handleManualSearch(e.target.value);
                        }
                      }}
                      className="bg-slate-800 border-slate-700 text-white h-12"
                    />
                    <p className="text-xs text-slate-500 mt-2">
                      Tryck Enter för att söka
                    </p>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Selected Article */}
              <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-12 h-12 rounded-lg bg-slate-700 flex items-center justify-center">
                    <Package className="w-6 h-6 text-slate-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white mb-1">
                      {selectedArticle?.customer_name || selectedArticle?.name}
                    </h3>
                    {selectedArticle?.batch_number && (
                      <p className="text-sm text-slate-400 font-mono">
                        #{selectedArticle.batch_number}
                      </p>
                    )}
                    <p className="text-sm text-slate-500 mt-1">
                      I lager: {selectedArticle?.stock_qty || 0} st
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setStep('scan');
                      setSelectedArticle(null);
                    }}
                    className="text-slate-400"
                  >
                    Ändra
                  </Button>
                </div>

                {/* Quantity Selector */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Antal att plocka:</span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="bg-slate-700 border-slate-600 h-8 w-8"
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <Input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-16 text-center bg-slate-700 border-slate-600 h-8"
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => setQuantity(Math.min(selectedArticle?.stock_qty || 1, quantity + 1))}
                      className="bg-slate-700 border-slate-600 h-8 w-8"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Customer Reference */}
              <div>
                <label className="text-sm font-medium text-white mb-2 block">
                  Kund/Kommentar <span className="text-red-400">*</span>
                </label>
                <Input
                  value={customerReference}
                  onChange={(e) => setCustomerReference(e.target.value)}
                  placeholder="Till vilken kund eller vad ska det användas till?"
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="text-sm font-medium text-white mb-2 block">
                  Anteckningar (valfritt)
                </label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Eventuella ytterligare anteckningar..."
                  className="bg-slate-800 border-slate-700 text-white h-20"
                />
              </div>

              {/* Warning */}
              {quantity > selectedArticle?.stock_qty && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-red-400 font-medium">
                      Inte tillräckligt i lager
                    </p>
                    <p className="text-xs text-red-400/70 mt-1">
                      Endast {selectedArticle?.stock_qty || 0} st tillgängligt
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'confirm' && (
          <div className="flex gap-3 p-6 border-t border-slate-700">
            <Button
              variant="outline"
              onClick={() => {
                setStep('scan');
                setSelectedArticle(null);
              }}
              className="flex-1 bg-slate-800 border-slate-700 hover:bg-slate-700"
            >
              Avbryt
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createWithdrawalMutation.isPending || !customerReference.trim() || quantity > selectedArticle?.stock_qty}
              className="flex-1 bg-green-600 hover:bg-green-500"
            >
              {createWithdrawalMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Plockar ut...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Bekräfta utplockning
                </>
              )}
            </Button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}