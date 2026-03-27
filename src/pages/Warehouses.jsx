import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Warehouse, Plus, Search, Edit, Trash2, MapPin,
  Building2, ChevronRight, Map
} from "lucide-react";
import { cn } from "@/lib/utils";
import WarehouseForm from "@/components/warehouses/WarehouseForm";
import ShelfManager from "@/components/warehouses/ShelfManager";
import WarehouseLayout from "@/components/warehouses/WarehouseLayout";

export default function WarehousesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [layoutWarehouse, setLayoutWarehouse] = useState(null);
  
  const queryClient = useQueryClient();

  const { data: warehouses = [], isLoading } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => base44.entities.Warehouse.list('-created_date'),
  });

  const { data: shelves = [] } = useQuery({
    queryKey: ['shelves'],
    queryFn: () => base44.entities.Shelf.list(),
  });

  const { data: articles = [] } = useQuery({
    queryKey: ['articles'],
    queryFn: () => base44.entities.Article.list(),
  });

  const createWarehouseMutation = useMutation({
    mutationFn: (data) => base44.entities.Warehouse.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      setShowForm(false);
      toast.success("Warehouse created");
    }
  });

  const updateWarehouseMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Warehouse.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      setEditingWarehouse(null);
      setShowForm(false);
      toast.success("Warehouse updated");
    }
  });

  const deleteWarehouseMutation = useMutation({
    mutationFn: (id) => base44.entities.Warehouse.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      toast.success("Warehouse deleted");
    }
  });

  const handleSave = (data) => {
    if (editingWarehouse) {
      updateWarehouseMutation.mutate({ id: editingWarehouse.id, data });
    } else {
      createWarehouseMutation.mutate(data);
    }
  };

  const handleEdit = (warehouse) => {
    setEditingWarehouse(warehouse);
    setShowForm(true);
  };

  const handleDelete = (warehouse) => {
    const warehouseShelves = shelves.filter(s => s.warehouse_id === warehouse.id);
    const warehouseArticles = articles.filter(a => a.warehouse === warehouse.name);
    
    if (warehouseShelves.length > 0 || warehouseArticles.length > 0) {
      toast.error("Cannot delete a warehouse that has shelves or articles");
      return;
    }
    
    if (confirm(`Are you sure you want to delete ${warehouse.name}?`)) {
      deleteWarehouseMutation.mutate(warehouse.id);
    }
  };

  const filteredWarehouses = warehouses.filter(w =>
    !searchQuery || 
    w.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    w.code?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (layoutWarehouse) {
    return (
      <WarehouseLayout 
        warehouseId={layoutWarehouse.id}
        onBack={() => setLayoutWarehouse(null)} 
      />
    );
  }

  if (selectedWarehouse) {
    return (
      <ShelfManager
        warehouse={selectedWarehouse}
        onBack={() => setSelectedWarehouse(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-black p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <Warehouse className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Warehouses</h1>
                <p className="text-sm text-white/50">{warehouses.length} warehouses</p>
              </div>
            </div>
            
            <Button
              onClick={() => {
                setEditingWarehouse(null);
                setShowForm(true);
              }}
              className="bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/50 hover:shadow-blue-500/70 transition-all duration-300"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Warehouse
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search warehouse..."
              className="pl-10 bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-white placeholder:text-white/40 backdrop-blur-xl transition-all duration-300"
            />
          </div>
        </div>

        {/* Warehouses List */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 rounded-2xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : filteredWarehouses.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
              <Warehouse className="w-8 h-8 text-white/30" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2 tracking-tight">
              {searchQuery ? "No warehouses found" : "No warehouses yet"}
            </h3>
            <p className="text-white/50 mb-6">
              {searchQuery 
                ? "Try a different search term" 
                : "Start by creating your first warehouse"}
            </p>
            {!searchQuery && (
              <Button
                onClick={() => setShowForm(true)}
                className="bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/50 hover:shadow-blue-500/70 transition-all duration-300"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Warehouse
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {filteredWarehouses.map((warehouse) => {
                const warehouseShelves = shelves.filter(s => s.warehouse_id === warehouse.id);
                const warehouseArticles = articles.filter(a => a.warehouse === warehouse.name);
                
                return (
                  <motion.div
                    key={warehouse.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-5 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 hover:border-white/20 hover:bg-white/10 hover:shadow-2xl hover:shadow-white/5 transition-all duration-300"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-14 h-14 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-6 h-6 text-blue-400" />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-white">
                              {warehouse.name}
                            </h3>
                            {warehouse.code && (
                              <Badge variant="outline" className="bg-slate-700/50 text-slate-300">
                                {warehouse.code}
                              </Badge>
                            )}
                            {!warehouse.is_active && (
                              <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/30">
                                Inactive
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-4 h-4" />
                              <span>{warehouseShelves.length} shelves</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Warehouse className="w-4 h-4" />
                              <span>{warehouseArticles.length} articles</span>
                            </div>
                            {warehouse.address && (
                              <span>{warehouse.address}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => setLayoutWarehouse(warehouse)}
                          variant="outline"
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-500 text-white border-0"
                        >
                          <Map className="w-4 h-4 mr-2" />
                          Layout
                        </Button>
                        <Button
                          onClick={() => setSelectedWarehouse(warehouse)}
                          variant="outline"
                          size="sm"
                          className="bg-slate-700/50 border-slate-600 hover:bg-slate-700 text-white"
                        >
                          <MapPin className="w-4 h-4 mr-2" />
                          Shelves
                        </Button>
                        <Button
                          onClick={() => handleEdit(warehouse)}
                          variant="outline"
                          size="icon"
                          className="bg-slate-700/50 border-slate-600 hover:bg-slate-700"
                        >
                          <Edit className="w-4 h-4 text-slate-300" />
                        </Button>
                        <Button
                          onClick={() => handleDelete(warehouse)}
                          variant="outline"
                          size="icon"
                          className="bg-slate-700/50 border-slate-600 hover:bg-red-900/50 hover:border-red-500/50"
                        >
                          <Trash2 className="w-4 h-4 text-slate-300" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Form Modal */}
        {showForm && (
          <WarehouseForm
            warehouse={editingWarehouse}
            onSave={handleSave}
            onCancel={() => {
              setShowForm(false);
              setEditingWarehouse(null);
            }}
            isSaving={createWarehouseMutation.isPending || updateWarehouseMutation.isPending}
          />
        )}
      </div>
    </div>
  );
}