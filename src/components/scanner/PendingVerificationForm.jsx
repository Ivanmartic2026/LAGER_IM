import React, { useState, useEffect } from 'react';
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

const STORAGE_TYPE_OPTIONS = [
  { value: "company_owned", label: "Företagsägt lager" },
  { value: "customer_owned", label: "Kundägt lager" },
  { value: "rental_stock", label: "Hyrlager" }
];

export default function PendingVerificationForm({ imageUrls = [], extractedBatch = "", onSave, onCancel, isSaving }) {
  const [formData, setFormData] = useState({
    batch_number: extractedBatch || "",
    name: "",
    stock_qty: 1,
    storage_type: "company_owned",
    supplier_name: "",
    notes: "",
  });
  const [aiAnalyzing, setAiAnalyzing] = useState(imageUrls.length > 0 && !extractedBatch);

  // Update batch_number when Kimi background analysis completes
  React.useEffect(() => {
    if (extractedBatch) {
      setFormData(p => ({ ...p, batch_number: extractedBatch }));
      setAiAnalyzing(false);
    }
  }, [extractedBatch]);

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list(),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.batch_number.trim()) return;

    onSave({
      ...formData,
      stock_qty: parseInt(formData.stock_qty) || 0,
      status: "pending_verification",
      image_urls: imageUrls,
      notes: formData.notes || `Registrerad utan inköp – inväntar leverantörsinformation`,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-300">Väntande verifiering</p>
          <p className="text-xs text-amber-200/70">
            Artikeln registreras med status "Väntande verifiering" tills leverantörsinformation är bekräftad.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label className="text-sm text-white/70 mb-1.5 block">
            Batchnummer <span className="text-red-400">*</span>
            {aiAnalyzing && (
              <span className="ml-2 text-xs text-blue-400 inline-flex items-center gap-1">
                <span className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin inline-block" />
                AI analyserar...
              </span>
            )}
          </Label>
          <Input
            value={formData.batch_number}
            onChange={(e) => { setFormData(p => ({ ...p, batch_number: e.target.value })); setAiAnalyzing(false); }}
            placeholder={aiAnalyzing ? "Väntar på AI-analys..." : "T.ex. P2.5250721228"}
            className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
            required
          />
        </div>

        <div>
          <Label className="text-sm text-white/70 mb-1.5 block">Artikelnamn (frivilligt)</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
            placeholder="T.ex. Okänd LED-modul"
            className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
          />
        </div>

        <div>
          <Label className="text-sm text-white/70 mb-1.5 block">Leverantör (frivilligt)</Label>
          <Select value={formData.supplier_name} onValueChange={(v) => setFormData(p => ({ ...p, supplier_name: v }))}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white">
              <SelectValue placeholder="Välj leverantör..." />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-white/10 text-white">
              <SelectItem value={null}>Okänd / Ej bestämd</SelectItem>
              {suppliers.map(s => (
                <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-sm text-white/70 mb-1.5 block">Antal</Label>
            <Input
              type="number"
              min="0"
              value={formData.stock_qty}
              onChange={(e) => setFormData(p => ({ ...p, stock_qty: e.target.value }))}
              className="bg-white/5 border-white/10 text-white"
            />
          </div>
          <div>
            <Label className="text-sm text-white/70 mb-1.5 block">Lagertyp</Label>
            <Select value={formData.storage_type} onValueChange={(v) => setFormData(p => ({ ...p, storage_type: v }))}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-white/10 text-white">
                {STORAGE_TYPE_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label className="text-sm text-white/70 mb-1.5 block">Anteckning</Label>
          <Textarea
            value={formData.notes}
            onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))}
            placeholder="T.ex. Hittad i lager utan följesedel, kontakt leverantör pågår..."
            className="bg-white/5 border-white/10 text-white placeholder:text-white/30 min-h-[80px]"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSaving}
            className="flex-1 bg-white/5 border-white/10 hover:bg-white/10 text-white h-12"
          >
            <X className="w-4 h-4 mr-2" />
            Avbryt
          </Button>
          <Button
            type="submit"
            disabled={isSaving || !formData.batch_number.trim()}
            className="flex-1 bg-amber-600 hover:bg-amber-500 text-white h-12 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Sparar...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Registrera väntande
              </>
            )}
          </Button>
        </div>
      </form>
    </motion.div>
  );
}