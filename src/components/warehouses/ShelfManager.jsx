import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, Plus, Search, Edit, Trash2, MapPin, Package, Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import ShelfForm from "./ShelfForm";
import ShelfBulkCreate from "./ShelfBulkCreate";
import PlacementAssistant from "./PlacementAssistant";

export default function ShelfManager({ warehouse, onBack }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showBulkCreate, setShowBulkCreate] = useState(false);
  const [showPlacementAssistant, setShowPlacementAssistant] = useState(false);
  const [editingShelf, setEditingShelf] = useState(null);
  
  const queryClient = useQueryClient();

  const { data: shelves = [], isLoading } = useQuery({
    queryKey: ['shelves', warehouse.id],
    queryFn: async () => {
      const allShelves = await base44.entities.Shelf.list();
      return allShelves.filter(s => s.warehouse_id === warehouse.id);
    }
  });

  const { data: articles = [] } = useQuery({
    queryKey: ['articles'],
    queryFn: () => base44.entities.Article.list(),
  });

  const createShelfMutation = useMutation({
    mutationFn: (data) => base44.entities.Shelf.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shelves'] });
      setShowForm(false);
      toast.success("Hylla skapad");
    }
  });

  const updateShelfMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Shelf.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shelves'] });
      setEditingShelf(null);
      setShowForm(false);
      toast.success("Hylla uppdaterad");
    }
  });

  const deleteShelfMutation = useMutation({
    mutationFn: (id) => base44.entities.Shelf.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shelves'] });
      toast.success("Hylla borttagen");
    }
  });

  const handleSave = (data) => {
    const shelfData = { ...data, warehouse_id: warehouse.id };
    if (editingShelf) {
      updateShelfMutation.mutate({ id: editingShelf.id, data: shelfData });
    } else {
      createShelfMutation.mutate(shelfData);
    }
  };

  const handleEdit = (shelf) => {
    setEditingShelf(shelf);
    setShowForm(true);
  };

  const handleDelete = (shelf) => {
    const shelfArticles = articles.filter(a => a.shelf_address === shelf.shelf_code);
    
    if (shelfArticles.length > 0) {
      toast.error("Kan inte ta bort hylla som har artiklar");
      return;
    }
    
    if (confirm(`Är du säker på att du vill ta bort ${shelf.shelf_code}?`)) {
      deleteShelfMutation.mutate(shelf.id);
    }
  };

  const filteredShelves = shelves.filter(s =>
    !searchQuery || 
    s.shelf_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={onBack}
            className="text-slate-400 hover:text-white hover:bg-slate-800 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Tillbaka till lagerställen
          </Button>

          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-white">{warehouse.name}</h1>
              <p className="text-sm text-slate-400">{shelves.length} hyllor</p>
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={() => setShowPlacementAssistant(true)}
                variant="outline"
                className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 border-purple-500/30 hover:from-purple-600/30 hover:to-blue-600/30 text-purple-300"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Placeringsassistent
              </Button>
              <Button
                onClick={() => setShowBulkCreate(true)}
                variant="outline"
                className="bg-slate-800 border-slate-600 hover:bg-slate-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Skapa flera
              </Button>
              <Button
                onClick={() => {
                  setEditingShelf(null);
                  setShowForm(true);
                }}
                className="bg-blue-600 hover:bg-blue-500"
              >
                <Plus className="w-4 h-4 mr-2" />
                Ny hylla
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Sök hylla..."
              className="pl-10 bg-slate-800/50 border-slate-700 text-white"
            />
          </div>
        </div>

        {/* Shelves List */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 rounded-xl bg-slate-800/50 animate-pulse" />
            ))}
          </div>
        ) : filteredShelves.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-8 h-8 text-slate-600" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              {searchQuery ? "Inga hyllor hittades" : "Inga hyllor ännu"}
            </h3>
            <p className="text-slate-400 mb-6">
              {searchQuery 
                ? "Prova ett annat sökord" 
                : "Börja med att skapa din första hylla"}
            </p>
            {!searchQuery && (
              <div className="flex gap-3 justify-center">
                <Button
                  onClick={() => setShowBulkCreate(true)}
                  variant="outline"
                  className="bg-slate-800 border-slate-600 hover:bg-slate-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Skapa flera hyllor
                </Button>
                <Button
                  onClick={() => setShowForm(true)}
                  className="bg-blue-600 hover:bg-blue-500"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Skapa hylla
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <AnimatePresence>
              {filteredShelves.map((shelf) => {
                const shelfArticles = articles.filter(a => a.shelf_address === shelf.shelf_code);
                const totalStock = shelfArticles.reduce((sum, a) => sum + (a.stock_qty || 0), 0);
                
                return (
                  <motion.div
                    key={shelf.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-slate-600 transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-bold text-white mb-1">
                          {shelf.shelf_code}
                        </h3>
                        {shelf.description && (
                          <p className="text-sm text-slate-400">{shelf.description}</p>
                        )}
                      </div>
                      {!shelf.is_active && (
                        <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
                          Inaktiv
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-2 mb-3">
                      <div className="flex items-center gap-4 text-sm text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Package className="w-4 h-4" />
                          <span>{shelfArticles.length} artiklar</span>
                        </div>
                        <div>
                          <span className="text-white font-medium">{totalStock}</span> st
                        </div>
                      </div>
                      {(shelf.width_cm || shelf.height_cm || shelf.depth_cm) && (
                        <div className="text-xs text-slate-500">
                          Storlek: {shelf.width_cm || '-'} × {shelf.height_cm || '-'} × {shelf.depth_cm || '-'} cm
                        </div>
                      )}
                    </div>

                    {(shelf.aisle || shelf.rack || shelf.level) && (
                      <div className="text-xs text-slate-500 mb-3 space-y-1">
                        {shelf.aisle && <div>Gång: {shelf.aisle}</div>}
                        {shelf.rack && <div>Ställ: {shelf.rack}</div>}
                        {shelf.level && <div>Plan: {shelf.level}</div>}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleEdit(shelf)}
                        variant="outline"
                        size="sm"
                        className="flex-1 bg-slate-700/50 border-slate-600 hover:bg-slate-700 text-white"
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Ändra
                      </Button>
                      <Button
                        onClick={() => handleDelete(shelf)}
                        variant="outline"
                        size="icon"
                        className="bg-slate-700/50 border-slate-600 hover:bg-red-900/50 hover:border-red-500/50"
                      >
                        <Trash2 className="w-4 h-4 text-slate-300" />
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Form Modal */}
        {showForm && (
          <ShelfForm
            shelf={editingShelf}
            onSave={handleSave}
            onCancel={() => {
              setShowForm(false);
              setEditingShelf(null);
            }}
            isSaving={createShelfMutation.isPending || updateShelfMutation.isPending}
          />
        )}

        {/* Bulk Create Modal */}
        {showBulkCreate && (
          <ShelfBulkCreate
            warehouseId={warehouse.id}
            onClose={() => setShowBulkCreate(false)}
          />
        )}

        {/* Placement Assistant Modal */}
        {showPlacementAssistant && (
          <PlacementAssistant
            warehouseId={warehouse.id}
            onClose={() => setShowPlacementAssistant(false)}
          />
        )}
        </div>
        </div>
        );
        }