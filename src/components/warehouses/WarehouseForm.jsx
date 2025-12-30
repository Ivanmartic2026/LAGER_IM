import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Save } from "lucide-react";
import { motion } from "framer-motion";

export default function WarehouseForm({ warehouse, onSave, onCancel, isSaving }) {
  const [formData, setFormData] = useState({
    name: warehouse?.name || '',
    code: warehouse?.code || '',
    address: warehouse?.address || '',
    contact_person: warehouse?.contact_person || '',
    is_active: warehouse?.is_active !== false,
    notes: warehouse?.notes || ''
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-700 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">
            {warehouse ? 'Redigera lagerställe' : 'Nytt lagerställe'}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onCancel}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <Label className="text-slate-300">Namn *</Label>
            <Input
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="bg-slate-800 border-slate-700 text-white"
              placeholder="t.ex. Huvudlager"
              required
            />
          </div>

          <div>
            <Label className="text-slate-300">Kod</Label>
            <Input
              value={formData.code}
              onChange={(e) => handleChange('code', e.target.value)}
              className="bg-slate-800 border-slate-700 text-white"
              placeholder="t.ex. HL"
            />
          </div>

          <div>
            <Label className="text-slate-300">Adress</Label>
            <Input
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              className="bg-slate-800 border-slate-700 text-white"
              placeholder="Fysisk adress"
            />
          </div>

          <div>
            <Label className="text-slate-300">Kontaktperson</Label>
            <Input
              value={formData.contact_person}
              onChange={(e) => handleChange('contact_person', e.target.value)}
              className="bg-slate-800 border-slate-700 text-white"
              placeholder="Namn på kontaktperson"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => handleChange('is_active', checked)}
            />
            <Label htmlFor="is_active" className="text-slate-300 cursor-pointer">
              Aktivt lagerställe
            </Label>
          </div>

          <div>
            <Label className="text-slate-300">Anteckningar</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              className="bg-slate-800 border-slate-700 text-white"
              placeholder="Eventuella anteckningar..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSaving}
              className="flex-1 bg-slate-800 border-slate-700 hover:bg-slate-700 text-white"
            >
              Avbryt
            </Button>
            <Button
              type="submit"
              disabled={isSaving || !formData.name}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Sparar...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Spara
                </>
              )}
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}