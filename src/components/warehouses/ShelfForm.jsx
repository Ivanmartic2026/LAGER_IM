import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Save } from "lucide-react";
import { motion } from "framer-motion";

export default function ShelfForm({ shelf, onSave, onCancel, isSaving }) {
  const [formData, setFormData] = useState({
    shelf_code: shelf?.shelf_code || '',
    description: shelf?.description || '',
    aisle: shelf?.aisle || '',
    rack: shelf?.rack || '',
    level: shelf?.level || '',
    width_cm: shelf?.width_cm || '',
    height_cm: shelf?.height_cm || '',
    depth_cm: shelf?.depth_cm || '',
    is_active: shelf?.is_active !== false,
    notes: shelf?.notes || ''
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const dataToSave = {
      ...formData,
      width_cm: formData.width_cm ? parseFloat(formData.width_cm) : undefined,
      height_cm: formData.height_cm ? parseFloat(formData.height_cm) : undefined,
      depth_cm: formData.depth_cm ? parseFloat(formData.depth_cm) : undefined
    };
    
    onSave(dataToSave);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-700 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">
            {shelf ? 'Redigera hylla' : 'Ny hylla'}
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
            <Label className="text-slate-300">Hyllkod *</Label>
            <Input
              value={formData.shelf_code}
              onChange={(e) => handleChange('shelf_code', e.target.value)}
              className="bg-slate-800 border-slate-700 text-white"
              placeholder="t.ex. A1-B2 eller G-04-03"
              required
            />
          </div>

          <div>
            <Label className="text-slate-300">Beskrivning</Label>
            <Input
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              className="bg-slate-800 border-slate-700 text-white"
              placeholder="Beskrivning av hyllan"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-slate-300">Gång</Label>
              <Input
                value={formData.aisle}
                onChange={(e) => handleChange('aisle', e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
                placeholder="A"
              />
            </div>
            <div>
              <Label className="text-slate-300">Ställning</Label>
              <Input
                value={formData.rack}
                onChange={(e) => handleChange('rack', e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
                placeholder="1"
              />
            </div>
            <div>
              <Label className="text-slate-300">Nivå</Label>
              <Input
                value={formData.level}
                onChange={(e) => handleChange('level', e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
                placeholder="B"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-slate-300">Bredd (cm)</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.width_cm}
                onChange={(e) => handleChange('width_cm', e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
                placeholder="cm"
              />
            </div>
            <div>
              <Label className="text-slate-300">Höjd (cm)</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.height_cm}
                onChange={(e) => handleChange('height_cm', e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
                placeholder="cm"
              />
            </div>
            <div>
              <Label className="text-slate-300">Djup (cm)</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.depth_cm}
                onChange={(e) => handleChange('depth_cm', e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
                placeholder="cm"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => handleChange('is_active', checked)}
            />
            <Label htmlFor="is_active" className="text-slate-300 cursor-pointer">
              Aktiv hylla
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
              disabled={isSaving || !formData.shelf_code}
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