import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { X } from "lucide-react";

export default function SupplierForm({ supplier, onSave, onCancel, isSaving }) {
  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    website: '',
    standard_delivery_days: 7,
    notes: '',
    is_active: true
  });

  useEffect(() => {
    if (supplier) {
      setFormData(supplier);
    }
  }, [supplier]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
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
        className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">
            {supplier ? 'Redigera leverantör' : 'Ny leverantör'}
          </h2>
          <Button
            size="icon"
            variant="ghost"
            onClick={onCancel}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-slate-300">Namn *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="bg-slate-800 border-slate-700 text-white"
              placeholder="Företagsnamn"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-300">Kontaktperson</Label>
              <Input
                value={formData.contact_person || ''}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white"
                placeholder="Namn"
              />
            </div>

            <div>
              <Label className="text-slate-300">E-post</Label>
              <Input
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white"
                placeholder="email@exempel.se"
              />
            </div>

            <div>
              <Label className="text-slate-300">Telefon</Label>
              <Input
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white"
                placeholder="+46 123 456 789"
              />
            </div>

            <div>
              <Label className="text-slate-300">Webbsida</Label>
              <Input
                value={formData.website || ''}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="bg-slate-800 border-slate-700 text-white"
                placeholder="https://exempel.se"
              />
            </div>
          </div>

          <div>
            <Label className="text-slate-300">Adress</Label>
            <Input
              value={formData.address || ''}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="bg-slate-800 border-slate-700 text-white"
              placeholder="Gatuadress, Stad"
            />
          </div>

          <div>
            <Label className="text-slate-300">Standard leveranstid (dagar)</Label>
            <Input
              type="number"
              value={formData.standard_delivery_days}
              onChange={(e) => setFormData({ ...formData, standard_delivery_days: parseInt(e.target.value) || 7 })}
              className="bg-slate-800 border-slate-700 text-white"
              min="1"
            />
          </div>

          <div>
            <Label className="text-slate-300">Anteckningar</Label>
            <Textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="bg-slate-800 border-slate-700 text-white h-24"
              placeholder="T.ex. öppettider, specialvillkor..."
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 rounded bg-slate-800 border-slate-700"
            />
            <Label htmlFor="is_active" className="text-slate-300 cursor-pointer">
              Aktiv leverantör
            </Label>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1 bg-slate-800 border-slate-600 hover:bg-slate-700 text-white"
            >
              Avbryt
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="flex-1 bg-blue-600 hover:bg-blue-500"
            >
              {isSaving ? 'Sparar...' : 'Spara'}
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}