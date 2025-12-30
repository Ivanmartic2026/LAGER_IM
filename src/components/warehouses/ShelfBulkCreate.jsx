import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { X, Plus } from "lucide-react";
import { motion } from "framer-motion";

export default function ShelfBulkCreate({ warehouseId, onClose }) {
  const [aisles, setAisles] = useState('A,B,C');
  const [racks, setRacks] = useState('1,2,3,4');
  const [levels, setLevels] = useState('1,2,3');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [depth, setDepth] = useState('');
  const queryClient = useQueryClient();

  const createShelvesMutation = useMutation({
    mutationFn: async (shelves) => {
      return Promise.all(shelves.map(shelf => 
        base44.entities.Shelf.create(shelf)
      ));
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['shelves'] });
      toast.success(`${data.length} hyllor skapade!`);
      onClose();
    }
  });

  const handleCreate = () => {
    const aisleList = aisles.split(',').map(s => s.trim()).filter(Boolean);
    const rackList = racks.split(',').map(s => s.trim()).filter(Boolean);
    const levelList = levels.split(',').map(s => s.trim()).filter(Boolean);

    if (!aisleList.length || !rackList.length || !levelList.length) {
      toast.error("Fyll i alla fält");
      return;
    }

    const shelves = [];
    aisleList.forEach(aisle => {
      rackList.forEach(rack => {
        levelList.forEach(level => {
          const shelfData = {
            warehouse_id: warehouseId,
            shelf_code: `${aisle}${rack}-${level}`,
            aisle,
            rack,
            level,
            is_active: true
          };
          
          // Add dimensions if provided
          if (width) shelfData.width_cm = parseFloat(width);
          if (height) shelfData.height_cm = parseFloat(height);
          if (depth) shelfData.depth_cm = parseFloat(depth);
          
          shelves.push(shelfData);
        });
      });
    });

    if (shelves.length > 100) {
      toast.error("Max 100 hyllor per gång");
      return;
    }

    createShelvesMutation.mutate(shelves);
  };

  const aisleList = aisles.split(',').map(s => s.trim()).filter(Boolean);
  const rackList = racks.split(',').map(s => s.trim()).filter(Boolean);
  const levelList = levels.split(',').map(s => s.trim()).filter(Boolean);
  const totalShelves = aisleList.length * rackList.length * levelList.length;

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
          <h2 className="text-xl font-bold text-white">Skapa flera hyllor</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">
          <div>
            <Label className="text-slate-300">Gångar (kommaseparerat)</Label>
            <Input
              value={aisles}
              onChange={(e) => setAisles(e.target.value)}
              className="bg-slate-800 border-slate-700 text-white"
              placeholder="t.ex. A,B,C,D"
            />
            <p className="text-xs text-slate-500 mt-1">
              {aisleList.length} gångar: {aisleList.join(', ') || '—'}
            </p>
          </div>

          <div>
            <Label className="text-slate-300">Ställningar (kommaseparerat)</Label>
            <Input
              value={racks}
              onChange={(e) => setRacks(e.target.value)}
              className="bg-slate-800 border-slate-700 text-white"
              placeholder="t.ex. 1,2,3,4,5"
            />
            <p className="text-xs text-slate-500 mt-1">
              {rackList.length} ställningar: {rackList.join(', ') || '—'}
            </p>
          </div>

          <div>
            <Label className="text-slate-300">Nivåer (kommaseparerat)</Label>
            <Input
              value={levels}
              onChange={(e) => setLevels(e.target.value)}
              className="bg-slate-800 border-slate-700 text-white"
              placeholder="t.ex. 1,2,3"
            />
            <p className="text-xs text-slate-500 mt-1">
              {levelList.length} nivåer: {levelList.join(', ') || '—'}
            </p>
          </div>

          <div className="border-t border-slate-700 pt-4">
            <Label className="text-slate-300 mb-3 block">Storlek (valfritt)</Label>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-slate-400 text-xs">Bredd (cm)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white"
                  placeholder="cm"
                />
              </div>
              <div>
                <Label className="text-slate-400 text-xs">Höjd (cm)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white"
                  placeholder="cm"
                />
              </div>
              <div>
                <Label className="text-slate-400 text-xs">Djup (cm)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={depth}
                  onChange={(e) => setDepth(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white"
                  placeholder="cm"
                />
              </div>
            </div>
          </div>

          {totalShelves > 0 && (
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
              <p className="text-blue-300 text-sm">
                <strong className="text-white">{totalShelves} hyllor</strong> kommer att skapas med format: <span className="font-mono">Gång-Ställning-Nivå</span>
              </p>
              <p className="text-xs text-blue-400 mt-2">
                Exempel: {aisleList[0] || 'A'}{rackList[0] || '1'}-{levelList[0] || '1'}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={createShelvesMutation.isPending}
              className="flex-1 bg-slate-800 border-slate-700 hover:bg-slate-700 text-white"
            >
              Avbryt
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createShelvesMutation.isPending || totalShelves === 0 || totalShelves > 100}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white"
            >
              {createShelvesMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Skapar...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Skapa {totalShelves} hyllor
                </>
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}