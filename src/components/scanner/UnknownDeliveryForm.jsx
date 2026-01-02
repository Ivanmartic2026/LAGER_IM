import React, { useState } from 'react';
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, X, PackageSearch } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function UnknownDeliveryForm({ 
  imageUrls = [],
  onSave,
  onCancel,
  isSaving
}) {
  const [formData, setFormData] = useState({
    name: "",
    batch_number: "",
    manufacturer: "",
    stock_qty: 1,
    warehouse: "",
    notes: "",
    unknown_delivery_reference: `UNK-${Date.now().toString().slice(-8)}`,
    delivery_date: new Date().toISOString().split('T')[0],
    status: "unknown_delivery",
    storage_type: "company_owned",
    image_urls: imageUrls
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => base44.entities.Warehouse.list(),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
        <PackageSearch className="w-6 h-6 text-amber-400 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-amber-300">
            Okänd inleverans
          </p>
          <p className="text-xs text-amber-400/70">
            Registrera varan så den kan utredas och matchas senare
          </p>
        </div>
      </div>

      {/* Reference Number (Auto-generated) */}
      <div>
        <Label className="text-sm font-semibold text-white mb-2 block">
          Referensnummer
        </Label>
        <Input
          value={formData.unknown_delivery_reference}
          readOnly
          className="bg-slate-800 border-slate-600 text-slate-300 font-mono"
        />
      </div>

      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-semibold text-white mb-2 block">
            Beskrivning / Namn <span className="text-red-400">*</span>
          </Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="T.ex. LED-panel 250x250mm"
            required
            className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
          />
        </div>

        <div>
          <Label className="text-sm font-semibold text-white mb-2 block">
            Antal <span className="text-red-400">*</span>
          </Label>
          <Input
            type="number"
            value={formData.stock_qty}
            onChange={(e) => setFormData(prev => ({ ...prev, stock_qty: parseInt(e.target.value) || 0 }))}
            required
            min="0"
            className="bg-white/5 border-white/10 text-white"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-semibold text-white mb-2 block">
            Batch/Serienummer
          </Label>
          <Input
            value={formData.batch_number}
            onChange={(e) => setFormData(prev => ({ ...prev, batch_number: e.target.value }))}
            placeholder="T.ex. P2.5250721228"
            className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
          />
        </div>

        <div>
          <Label className="text-sm font-semibold text-white mb-2 block">
            Tillverkare
          </Label>
          <Input
            value={formData.manufacturer}
            onChange={(e) => setFormData(prev => ({ ...prev, manufacturer: e.target.value }))}
            placeholder="T.ex. Nick Everlasting"
            className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
          />
        </div>
      </div>

      {/* Location */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-semibold text-white mb-2 block">
            Lagerställe
          </Label>
          <Select 
            value={formData.warehouse} 
            onValueChange={(value) => setFormData(prev => ({ ...prev, warehouse: value }))}
          >
            <SelectTrigger className="bg-white/5 border-white/10 text-white">
              <SelectValue placeholder="Välj lagerställe..." />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-white/10 text-white">
              {warehouses.map(w => (
                <SelectItem key={w.id} value={w.name}>{w.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-sm font-semibold text-white mb-2 block">
            Inleveransdatum
          </Label>
          <Input
            type="date"
            value={formData.delivery_date}
            onChange={(e) => setFormData(prev => ({ ...prev, delivery_date: e.target.value }))}
            className="bg-white/5 border-white/10 text-white"
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <Label className="text-sm font-semibold text-white mb-2 block">
          Anteckningar
        </Label>
        <Textarea
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="T.ex. hittad i mottagningen, ingen följesedel, okänd avsändare..."
          className="bg-white/5 border-white/10 text-white placeholder:text-white/40 min-h-[100px]"
        />
      </div>

      {/* Images Preview */}
      {imageUrls.length > 0 && (
        <div>
          <Label className="text-sm font-semibold text-white mb-2 block">
            Uppladdade bilder
          </Label>
          <div className="grid grid-cols-3 gap-2">
            {imageUrls.map((url, index) => (
              <img 
                key={index}
                src={url} 
                alt={`Bild ${index + 1}`}
                className="w-full h-24 object-cover rounded-lg bg-slate-900"
              />
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSaving}
          className="flex-1 bg-white/5 border-white/10 hover:bg-white/10 text-white"
        >
          <X className="w-4 h-4 mr-2" />
          Avbryt
        </Button>
        <Button
          type="submit"
          disabled={isSaving || !formData.name}
          className="flex-1 bg-amber-600 hover:bg-amber-500 text-white"
        >
          {isSaving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Registrerar...
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              Registrera okänd leverans
            </>
          )}
        </Button>
      </div>
    </motion.form>
  );
}