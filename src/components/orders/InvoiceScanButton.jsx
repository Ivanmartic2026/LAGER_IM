import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Zap, X, CheckCircle2, FileText, Package, Calendar, Hash } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export default function InvoiceScanButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = React.useRef(null);
  const queryClient = useQueryClient();

  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ['purchaseOrders'],
    queryFn: () => base44.entities.PurchaseOrder.list('-created_date'),
  });

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    const toastId = toast.loading('Analyserar faktura med AI...');

    try {
      // Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Extract invoice data using AI
      const extracted = await base44.integrations.Core.InvokeLLM({
        prompt: `Analysera denna faktura/följesedel noggrant och extrahera all relevant information.
        
        Hitta:
        - Fakturanummer (invoice_number)
        - Leverantörens namn (supplier_name)
        - Datum (invoice_date i format YYYY-MM-DD)
        - Totalt belopp (total_amount som nummer)
        - Valuta (currency, t.ex. SEK, EUR, USD)
        - Ordernummer om det finns (po_number)
        - Lista med artiklar/produkter (items): namn, artikelnummer, antal, enhetspris
        
        Returnera strukturerad JSON.`,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            invoice_number: { type: "string" },
            supplier_name: { type: "string" },
            invoice_date: { type: "string" },
            total_amount: { type: "number" },
            currency: { type: "string" },
            po_number: { type: "string" },
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  article_number: { type: "string" },
                  quantity: { type: "number" },
                  unit_price: { type: "number" }
                }
              }
            }
          }
        }
      });

      toast.success('Faktura analyserad!', { id: toastId });
      setResult({ ...extracted, file_url });
    } catch (error) {
      console.error('Invoice scan error:', error);
      toast.error('Kunde inte analysera fakturan: ' + error.message, { id: toastId });
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleLinkToOrder = async (po) => {
    setIsSaving(true);
    try {
      await base44.entities.PurchaseOrder.update(po.id, {
        invoice_number: result.invoice_number || po.invoice_number,
        invoice_amount: result.total_amount || po.invoice_amount,
        invoice_currency: result.currency || po.invoice_currency || 'SEK',
        invoice_file_url: result.file_url,
      });
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      toast.success(`Faktura kopplad till ${po.po_number || po.supplier_name}!`);
      setResult(null);
    } catch (error) {
      toast.error('Kunde inte koppla faktura: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Find matching POs based on supplier name or po number
  const matchingPOs = purchaseOrders.filter(po => {
    if (result?.po_number && po.po_number?.toLowerCase().includes(result.po_number.toLowerCase())) return true;
    if (result?.supplier_name && po.supplier_name?.toLowerCase().includes(result.supplier_name.toLowerCase())) return true;
    return false;
  });

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={handleFileSelect}
        className="hidden"
      />
      <Button
        onClick={() => fileInputRef.current?.click()}
        disabled={isLoading}
        className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg shadow-purple-500/50 transition-all duration-300"
      >
        <Zap className="w-4 h-4 mr-2" />
        {isLoading ? 'Analyserar...' : 'Skanna faktura'}
      </Button>

      {/* Result Modal */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setResult(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between p-5 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">Faktura analyserad</h3>
                    <p className="text-xs text-white/50">Granska och koppla till inköpsorder</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setResult(null)} className="text-white/50 hover:text-white">
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="p-5 space-y-4">
                {/* Extracted data */}
                <div className="space-y-2">
                  {result.supplier_name && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                      <Package className="w-4 h-4 text-white/40" />
                      <div>
                        <div className="text-xs text-white/40">Leverantör</div>
                        <div className="text-sm font-medium text-white">{result.supplier_name}</div>
                      </div>
                    </div>
                  )}
                  {result.invoice_number && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                      <Hash className="w-4 h-4 text-white/40" />
                      <div>
                        <div className="text-xs text-white/40">Fakturanummer</div>
                        <div className="text-sm font-medium text-white">{result.invoice_number}</div>
                      </div>
                    </div>
                  )}
                  {result.invoice_date && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                      <Calendar className="w-4 h-4 text-white/40" />
                      <div>
                        <div className="text-xs text-white/40">Datum</div>
                        <div className="text-sm font-medium text-white">{result.invoice_date}</div>
                      </div>
                    </div>
                  )}
                  {result.total_amount && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                      <Zap className="w-4 h-4 text-white/40" />
                      <div>
                        <div className="text-xs text-white/40">Belopp</div>
                        <div className="text-sm font-medium text-white">
                          {result.total_amount.toLocaleString('sv-SE')} {result.currency || 'SEK'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Items */}
                {result.items && result.items.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Artiklar ({result.items.length})</p>
                    <div className="space-y-1">
                      {result.items.map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-white/5 text-sm">
                          <div>
                            <span className="text-white">{item.name}</span>
                            {item.article_number && <span className="text-white/40 ml-2 text-xs">#{item.article_number}</span>}
                          </div>
                          <div className="text-white/60 text-xs">
                            {item.quantity} st {item.unit_price ? `· ${item.unit_price} ${result.currency || 'SEK'}` : ''}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Link to PO */}
                <div>
                  <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
                    {matchingPOs.length > 0 ? 'Koppla till inköpsorder' : 'Ingen matchande inköpsorder hittades'}
                  </p>
                  {matchingPOs.length > 0 ? (
                    <div className="space-y-2">
                      {matchingPOs.map(po => (
                        <button
                          key={po.id}
                          onClick={() => handleLinkToOrder(po)}
                          disabled={isSaving}
                          className="w-full flex items-center justify-between p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/20 transition-all text-left"
                        >
                          <div>
                            <div className="text-sm font-medium text-white">{po.po_number || `PO #${po.id.slice(0, 8)}`}</div>
                            <div className="text-xs text-white/50">{po.supplier_name}</div>
                          </div>
                          <CheckCircle2 className="w-5 h-5 text-blue-400" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-white/40 text-center py-3">
                      Fakturan sparad men ingen matchande order hittades baserat på leverantör/ordernummer.
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}