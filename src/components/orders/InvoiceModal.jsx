import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, FileText } from "lucide-react";
import { motion } from "framer-motion";

export default function InvoiceModal({ order, onConfirm, onCancel, isSubmitting }) {
  const [invoiceNumber, setInvoiceNumber] = useState(order.fortnox_invoice_number || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!invoiceNumber.trim()) return;
    onConfirm(invoiceNumber.trim());
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-600/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Markera som fakturerad</h2>
              <p className="text-sm text-slate-400">{order.order_number || `Order #${order.id.slice(0, 8)}`}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onCancel}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <Label className="text-slate-300 mb-2 block">Fakturanummer från Fortnox *</Label>
            <Input
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="t.ex. 12345"
              className="bg-slate-800 border-slate-700 text-white"
              required
              autoFocus
              disabled={isSubmitting}
            />
            <p className="text-xs text-slate-500 mt-2">
              Ange fakturanumret från Fortnox för att markera ordern som fakturerad
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
              className="flex-1 bg-slate-800 border-slate-700 hover:bg-slate-700 text-white"
            >
              Avbryt
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !invoiceNumber.trim()}
              className="flex-1 bg-green-600 hover:bg-green-500 text-white"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Sparar...
                </>
              ) : (
                'Bekräfta fakturering'
              )}
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}