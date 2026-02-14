import React, { useState, useRef } from 'react';
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Upload, X, Mail, Copy, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function InvoiceUploadModal({ po, onClose }) {
  const [step, setStep] = useState("form"); // form, uploading, success
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [invoiceCurrency, setInvoiceCurrency] = useState("SEK");
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [supplierEmail, setSupplierEmail] = useState("");
  const [portalLink, setPortalLink] = useState("");
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  const updatePOMutation = useMutation({
    mutationFn: async (data) => {
      // Generate unique token for supplier
      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      // Update PO with invoice info and token
      await base44.entities.PurchaseOrder.update(po.id, {
        invoice_number: data.invoiceNumber,
        invoice_amount: parseFloat(data.invoiceAmount),
        invoice_currency: data.invoiceCurrency,
        expected_delivery_date: data.expectedDeliveryDate,
        status: "waiting_for_supplier_documentation",
        supplier_portal_token: token,
        ...data.fileUpload
      });

      return { token, url: `${window.location.origin}/supplier-upload?token=${token}` };
    },
    onSuccess: (result) => {
      setPortalLink(result.url);
      setStep("success");
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
    },
    onError: (error) => {
      toast.error("Kunde inte spara fakturan: " + error.message);
    }
  });

  const uploadInvoiceMutation = useMutation({
    mutationFn: async (file) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      return file_url;
    }
  });

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setInvoiceFile(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!invoiceNumber || !invoiceAmount || !expectedDeliveryDate) {
      toast.error("Fyll i alla obligatoriska fält");
      return;
    }

    setStep("uploading");

    try {
      let fileUploadData = {};

      if (invoiceFile) {
        const uploadToastId = toast.loading("Laddar upp faktura...");
        const fileUrl = await uploadInvoiceMutation.mutateAsync(invoiceFile);
        toast.dismiss(uploadToastId);
        fileUploadData.invoice_file_url = fileUrl;
      }

      await updatePOMutation.mutateAsync({
        invoiceNumber,
        invoiceAmount,
        invoiceCurrency,
        expectedDeliveryDate,
        fileUpload: fileUploadData
      });
    } catch (error) {
      setStep("form");
    }
  };

  const sendEmailToSupplier = async () => {
    if (!supplierEmail) {
      toast.error("Ange leverantörens e-postadress");
      return;
    }

    const loadingToastId = toast.loading("Skickar länk till leverantör...");

    try {
      await base44.integrations.Core.SendEmail({
        to: supplierEmail,
        subject: `Inköpsorder ${po.po_number || po.id.slice(0, 8)} - Ladda upp dokument`,
        body: `Hej,\n\nInköpsorder ${po.po_number || po.id.slice(0, 8)} är registrerad.\n\nVänligen ladda upp följande dokument via denna länk:\n\n${portalLink}\n\nDocumenten som behövs:\n- Packlista\n- QC/testprotokoll\n- Certifikat (om applicerbar)\n- Batchnummer för varje artikel\n\nMvh`
      });

      toast.success("Länk skickad till leverantören!", { id: loadingToastId });
      setSupplierEmail("");
    } catch (error) {
      toast.error("Kunde inte skicka e-post", { id: loadingToastId });
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(portalLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Länk kopierad!");
  };

  if (step === "success") {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-slate-950 rounded-2xl border border-green-500/30 max-w-md w-full p-6"
        >
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-6 h-6 text-green-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Faktura sparad!</h2>
            <p className="text-white/50">Inköpsorder är redo för leverantörsuppladdning</p>
          </div>

          <div className="space-y-4">
            {/* Portal Link */}
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <p className="text-xs text-white/40 mb-2">Leverantörslänk</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={portalLink}
                  readOnly
                  className="flex-1 bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white/70 truncate"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copyToClipboard}
                  className="bg-blue-600 border-blue-500 hover:bg-blue-500 text-white flex-shrink-0"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              {copied && (
                <p className="text-xs text-green-400 mt-2 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Kopierad!
                </p>
              )}
            </div>

            {/* Send Email */}
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <p className="text-xs text-white/40 mb-2">Eller skicka via e-post</p>
              <div className="flex gap-2">
                <Input
                  type="email"
                  value={supplierEmail}
                  onChange={(e) => setSupplierEmail(e.target.value)}
                  placeholder="Leverantörs e-post"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/40 h-9"
                />
                <Button
                  size="sm"
                  onClick={sendEmailToSupplier}
                  className="bg-green-600 hover:bg-green-500 text-white flex-shrink-0"
                >
                  <Mail className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <Button
              onClick={onClose}
              className="w-full bg-blue-600 hover:bg-blue-500"
            >
              Stäng
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-slate-950 rounded-2xl border border-white/10 max-w-md w-full"
      >
        {/* Header */}
        <div className="border-b border-white/10 p-6 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Ladda upp faktura</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white/70 hover:text-white"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Fakturanummer *
            </label>
            <Input
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="t.ex. INV-2024-001"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Belopp *
              </label>
              <Input
                type="number"
                step="0.01"
                value={invoiceAmount}
                onChange={(e) => setInvoiceAmount(e.target.value)}
                placeholder="0.00"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Valuta
              </label>
              <Select value={invoiceCurrency} onValueChange={setInvoiceCurrency}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-950 border-white/10">
                  <SelectItem value="SEK">SEK</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                  <SelectItem value="NOK">NOK</SelectItem>
                  <SelectItem value="DKK">DKK</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Förväntat leveransdatum *
            </label>
            <Input
              type="date"
              value={expectedDeliveryDate}
              onChange={(e) => setExpectedDeliveryDate(e.target.value)}
              className="bg-white/5 border-white/10 text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Fakturafil (PDF/JPG)
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-white/20 rounded-lg p-4 text-center cursor-pointer hover:border-white/40 transition-colors"
            >
              <Upload className="w-5 h-5 text-white/50 mx-auto mb-2" />
              <p className="text-sm text-white/70">
                {invoiceFile ? invoiceFile.name : "Klicka för att välja fil"}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 bg-white/5 border-white/10 hover:bg-white/10"
            >
              Avbryt
            </Button>
            <Button
              type="submit"
              disabled={updatePOMutation.isPending || uploadInvoiceMutation.isPending}
              className="flex-1 bg-blue-600 hover:bg-blue-500"
            >
              {updatePOMutation.isPending ? "Sparar..." : "Spara faktura"}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}