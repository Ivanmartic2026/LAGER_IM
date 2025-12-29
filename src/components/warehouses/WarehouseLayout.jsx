import React, { useState, useMemo } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Search, Package, MapPin, Grid3X3, ArrowLeft,
  Maximize2, ZoomIn, ZoomOut
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function WarehouseLayout({ warehouseId, onBack }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAisle, setSelectedAisle] = useState("all");
  const [zoom, setZoom] = useState(1);
  const [hoveredShelf, setHoveredShelf] = useState(null);

  const { data: warehouse } = useQuery({
    queryKey: ['warehouse', warehouseId],
    queryFn: async () => {
      const warehouses = await base44.entities.Warehouse.list();
      return warehouses.find(w => w.id === warehouseId);
    },
  });

  const { data: shelves = [] } = useQuery({
    queryKey: ['shelves', warehouseId],
    queryFn: async () => {
      const allShelves = await base44.entities.Shelf.list();
      return allShelves.filter(s => s.warehouse_id === warehouseId);
    },
  });

  const { data: articles = [] } = useQuery({
    queryKey: ['articles'],
    queryFn: () => base44.entities.Article.list(),
  });

  // Calculate shelf occupancy
  const shelfData = useMemo(() => {
    return shelves.map(shelf => {
      const shelfArticles = articles.filter(a => 
        a.warehouse === warehouse?.name && a.shelf_address === shelf.shelf_code
      );
      
      const totalQty = shelfArticles.reduce((sum, a) => sum + (a.stock_qty || 0), 0);
      const maxCapacity = shelf.max_capacity || 100;
      const occupancy = maxCapacity > 0 ? (totalQty / maxCapacity) * 100 : 0;
      
      return {
        ...shelf,
        articleCount: shelfArticles.length,
        totalQty,
        occupancy,
        articles: shelfArticles
      };
    });
  }, [shelves, articles, warehouse]);

  // Get unique aisles
  const aisles = useMemo(() => {
    const uniqueAisles = [...new Set(shelves.map(s => s.aisle).filter(Boolean))];
    return uniqueAisles.sort();
  }, [shelves]);

  // Filter shelves
  const filteredShelves = useMemo(() => {
    return shelfData.filter(shelf => {
      const matchesSearch = !searchQuery || 
        shelf.shelf_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        shelf.articles.some(a => a.name?.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesAisle = selectedAisle === "all" || shelf.aisle === selectedAisle;
      
      return matchesSearch && matchesAisle;
    });
  }, [shelfData, searchQuery, selectedAisle]);

  // Group shelves by aisle and rack
  const shelfGrid = useMemo(() => {
    const grid = {};
    
    filteredShelves.forEach(shelf => {
      const aisle = shelf.aisle || 'Ingen gång';
      const rack = shelf.rack || 'Ingen ställning';
      
      if (!grid[aisle]) grid[aisle] = {};
      if (!grid[aisle][rack]) grid[aisle][rack] = [];
      
      grid[aisle][rack].push(shelf);
    });
    
    // Sort levels within each rack
    Object.keys(grid).forEach(aisle => {
      Object.keys(grid[aisle]).forEach(rack => {
        grid[aisle][rack].sort((a, b) => {
          const levelA = parseInt(a.level) || 0;
          const levelB = parseInt(b.level) || 0;
          return levelB - levelA; // Highest level first
        });
      });
    });
    
    return grid;
  }, [filteredShelves]);

  const getShelfColor = (occupancy, isActive) => {
    if (!isActive) return "bg-slate-700/50 border-slate-600";
    if (occupancy >= 90) return "bg-red-500/20 border-red-500/50 hover:bg-red-500/30";
    if (occupancy >= 70) return "bg-amber-500/20 border-amber-500/50 hover:bg-amber-500/30";
    if (occupancy >= 40) return "bg-blue-500/20 border-blue-500/50 hover:bg-blue-500/30";
    return "bg-emerald-500/20 border-emerald-500/50 hover:bg-emerald-500/30";
  };

  const stats = useMemo(() => {
    const total = shelfData.length;
    const active = shelfData.filter(s => s.is_active !== false).length;
    const highOccupancy = shelfData.filter(s => s.occupancy >= 70).length;
    const avgOccupancy = shelfData.reduce((sum, s) => sum + s.occupancy, 0) / (total || 1);
    
    return { total, active, highOccupancy, avgOccupancy: avgOccupancy.toFixed(0) };
  }, [shelfData]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={onBack}
              className="text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Tillbaka
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-white">{warehouse?.name}</h1>
              <p className="text-sm text-slate-400">Lagerplats Schema</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
              className="bg-slate-800 border-slate-700 hover:bg-slate-700"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setZoom(Math.min(2, zoom + 0.1))}
              className="bg-slate-800 border-slate-700 hover:bg-slate-700"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <p className="text-sm text-slate-400 mb-1">Totalt hyllor</p>
            <p className="text-2xl font-bold text-white">{stats.total}</p>
          </div>
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
            <p className="text-sm text-emerald-300 mb-1">Aktiva</p>
            <p className="text-2xl font-bold text-white">{stats.active}</p>
          </div>
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <p className="text-sm text-amber-300 mb-1">Nästan fulla</p>
            <p className="text-2xl font-bold text-white">{stats.highOccupancy}</p>
          </div>
          <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
            <p className="text-sm text-blue-300 mb-1">Snitt beläggning</p>
            <p className="text-2xl font-bold text-white">{stats.avgOccupancy}%</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Sök hylla eller artikel..."
              className="pl-10 bg-slate-800/50 border-slate-700 text-white"
            />
          </div>
          
          <Select value={selectedAisle} onValueChange={setSelectedAisle}>
            <SelectTrigger className="w-full sm:w-48 bg-slate-800/50 border-slate-700 text-white">
              <SelectValue placeholder="Välj gång" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alla gångar</SelectItem>
              {aisles.map(aisle => (
                <SelectItem key={aisle} value={aisle}>Gång {aisle}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mb-6 p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-emerald-500/30 border border-emerald-500/50" />
            <span className="text-sm text-slate-300">0-40% full</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-500/30 border border-blue-500/50" />
            <span className="text-sm text-slate-300">40-70% full</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-amber-500/30 border border-amber-500/50" />
            <span className="text-sm text-slate-300">70-90% full</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-500/30 border border-red-500/50" />
            <span className="text-sm text-slate-300">90-100% full</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-slate-700/50 border border-slate-600" />
            <span className="text-sm text-slate-300">Inaktiv</span>
          </div>
        </div>

        {/* Warehouse Grid */}
        <div className="overflow-auto pb-4">
          <div 
            style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
            className="inline-block min-w-full"
          >
            {Object.keys(shelfGrid).length === 0 ? (
              <div className="text-center py-16">
                <Grid3X3 className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">Inga hyllor att visa</p>
              </div>
            ) : (
              <div className="space-y-8">
                {Object.entries(shelfGrid).map(([aisle, racks]) => (
                  <div key={aisle} className="space-y-4">
                    {/* Aisle Header */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-1 h-8 bg-blue-500 rounded-full" />
                      <h3 className="text-lg font-bold text-white">Gång {aisle}</h3>
                      <Badge variant="outline" className="bg-slate-800 text-slate-300">
                        {Object.values(racks).flat().length} hyllor
                      </Badge>
                    </div>

                    {/* Racks */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                      {Object.entries(racks).map(([rack, levels]) => (
                        <div key={rack} className="space-y-2">
                          {/* Rack Label */}
                          <div className="text-center">
                            <p className="text-xs font-medium text-slate-400 mb-2">
                              Ställning {rack}
                            </p>
                          </div>

                          {/* Levels (shelves) */}
                          <div className="space-y-2">
                            {levels.map((shelf) => (
                              <motion.div
                                key={shelf.id}
                                whileHover={{ scale: 1.05 }}
                                onHoverStart={() => setHoveredShelf(shelf)}
                                onHoverEnd={() => setHoveredShelf(null)}
                                className={cn(
                                  "relative p-3 rounded-lg border-2 transition-all cursor-pointer",
                                  getShelfColor(shelf.occupancy, shelf.is_active)
                                )}
                              >
                                {/* Shelf Code */}
                                <div className="flex items-center justify-between mb-1">
                                  <p className="text-xs font-bold text-white truncate">
                                    {shelf.shelf_code}
                                  </p>
                                  {shelf.level && (
                                    <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 bg-slate-900/50 border-slate-600">
                                      N{shelf.level}
                                    </Badge>
                                  )}
                                </div>

                                {/* Stats */}
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-slate-300">{shelf.articleCount} art.</span>
                                  <span className="text-slate-300">{shelf.occupancy.toFixed(0)}%</span>
                                </div>

                                {/* Occupancy Bar */}
                                <div className="w-full h-1 bg-slate-700/50 rounded-full mt-2 overflow-hidden">
                                  <div 
                                    className={cn(
                                      "h-full transition-all",
                                      shelf.occupancy >= 90 ? "bg-red-500" :
                                      shelf.occupancy >= 70 ? "bg-amber-500" :
                                      shelf.occupancy >= 40 ? "bg-blue-500" : "bg-emerald-500"
                                    )}
                                    style={{ width: `${Math.min(100, shelf.occupancy)}%` }}
                                  />
                                </div>

                                {/* Hover Tooltip */}
                                {hoveredShelf?.id === shelf.id && (
                                  <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="absolute z-10 left-0 top-full mt-2 p-3 rounded-lg bg-slate-900 border border-slate-700 shadow-xl min-w-[200px]"
                                  >
                                    <div className="space-y-2">
                                      <div>
                                        <p className="text-xs text-slate-400">Hyllkod</p>
                                        <p className="text-sm font-semibold text-white">{shelf.shelf_code}</p>
                                      </div>
                                      {shelf.description && (
                                        <div>
                                          <p className="text-xs text-slate-400">Beskrivning</p>
                                          <p className="text-sm text-slate-300">{shelf.description}</p>
                                        </div>
                                      )}
                                      <div className="flex justify-between gap-4">
                                        <div>
                                          <p className="text-xs text-slate-400">Artiklar</p>
                                          <p className="text-sm font-semibold text-white">{shelf.articleCount}</p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-slate-400">Antal</p>
                                          <p className="text-sm font-semibold text-white">{shelf.totalQty}</p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-slate-400">Max</p>
                                          <p className="text-sm font-semibold text-white">{shelf.max_capacity || '—'}</p>
                                        </div>
                                      </div>
                                      {shelf.articles.length > 0 && (
                                        <div>
                                          <p className="text-xs text-slate-400 mb-1">Artiklar:</p>
                                          <div className="space-y-1 max-h-32 overflow-y-auto">
                                            {shelf.articles.map((article, idx) => (
                                              <div key={idx} className="text-xs text-slate-300 flex justify-between">
                                                <span className="truncate mr-2">{article.name}</span>
                                                <span className="text-slate-400">{article.stock_qty}</span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </motion.div>
                                )}
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}