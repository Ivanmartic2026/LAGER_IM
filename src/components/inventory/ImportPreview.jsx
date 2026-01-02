import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { 
  CheckCircle2, XCircle, Package, AlertTriangle, 
  Search, CheckSquare, Square, Warehouse
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function ImportPreview({ articles, onConfirm, onCancel, isSubmitting }) {
  const [selectedArticles, setSelectedArticles] = useState(
    articles.map((_, i) => i)
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState("");

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => base44.entities.Warehouse.list(),
  });

  const filteredArticles = articles.filter((article, index) => {
    const matchesSearch = !searchQuery || 
      article.data.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.data.batch_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.data.manufacturer?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  });

  const toggleArticle = (index) => {
    setSelectedArticles(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const toggleAll = () => {
    if (selectedArticles.length === articles.length) {
      setSelectedArticles([]);
    } else {
      setSelectedArticles(articles.map((_, i) => i));
    }
  };

  const handleConfirm = () => {
    const articlesToImport = selectedArticles.map(i => {
      const article = articles[i];
      return {
        ...article,
        data: {
          ...article.data,
          warehouse: selectedWarehouse || article.data.warehouse
        }
      };
    });
    onConfirm(articlesToImport);
  };

  const stats = {
    total: articles.length,
    selected: selectedArticles.length,
    create: articles.filter((a, i) => selectedArticles.includes(i) && a.action === 'create').length,
    update: articles.filter((a, i) => selectedArticles.includes(i) && a.action === 'update').length
  };

  return (
    <div className="flex flex-col h-full max-h-[80vh]">
      {/* Header */}
      <div className="p-6 border-b border-slate-700">
        <h2 className="text-xl font-bold text-white mb-4">
          Granska import
        </h2>

        {/* Stats */}
        <div className="flex gap-3 mb-4">
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
            {stats.selected} av {stats.total} valda
          </Badge>
          {stats.create > 0 && (
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
              {stats.create} nya
            </Badge>
          )}
          {stats.update > 0 && (
            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
              {stats.update} uppdateringar
            </Badge>
          )}
        </div>

        {/* Warehouse Selection */}
        <div className="mb-4">
          <label className="text-sm font-medium text-slate-300 mb-2 block">
            Lagerställe för alla artiklar (valfritt)
          </label>
          <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
            <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
              <SelectValue placeholder="Välj lagerställe eller lämna tomt..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>Ingen ändring</SelectItem>
              {warehouses.map((warehouse) => (
                <SelectItem key={warehouse.id} value={warehouse.name}>
                  {warehouse.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Search & Select All */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Sök artikel..."
              className="pl-10 bg-slate-800 border-slate-700 text-white"
            />
          </div>
          <Button
            variant="outline"
            onClick={toggleAll}
            className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-white"
          >
            {selectedArticles.length === articles.length ? (
              <>
                <CheckSquare className="w-4 h-4 mr-2" />
                Avmarkera alla
              </>
            ) : (
              <>
                <Square className="w-4 h-4 mr-2" />
                Markera alla
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Articles List */}
      <ScrollArea className="flex-1 p-6">
        <div className="space-y-3">
          {filteredArticles.map((article, idx) => {
            const originalIndex = articles.indexOf(article);
            const isSelected = selectedArticles.includes(originalIndex);

            return (
              <div
                key={originalIndex}
                onClick={() => toggleArticle(originalIndex)}
                className={cn(
                  "p-4 rounded-xl border cursor-pointer transition-all",
                  isSelected 
                    ? "bg-slate-800/50 border-blue-500/50" 
                    : "bg-slate-800/30 border-slate-700/50 hover:border-slate-600"
                )}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={isSelected}
                    className="mt-1"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-white truncate">
                        {article.data.name}
                      </h3>
                      {article.action === 'create' ? (
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">
                          Ny
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">
                          Uppdatering
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm text-slate-400">
                      {article.data.batch_number && (
                        <div>
                          <span className="text-slate-500">Batch:</span> {article.data.batch_number}
                        </div>
                      )}
                      {article.data.sku && (
                        <div>
                          <span className="text-slate-500">SKU:</span> {article.data.sku}
                        </div>
                      )}
                      {article.data.manufacturer && (
                        <div>
                          <span className="text-slate-500">Tillverkare:</span> {article.data.manufacturer}
                        </div>
                      )}
                      {article.data.stock_qty !== undefined && (
                        <div>
                          <span className="text-slate-500">Lagersaldo:</span> {article.data.stock_qty} st
                        </div>
                      )}
                    </div>

                    {article.existingArticle && (
                      <div className="mt-2 p-2 rounded bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300">
                        <AlertTriangle className="w-3 h-3 inline mr-1" />
                        Finns redan: {article.existingArticle.name} ({article.existingArticle.stock_qty} st)
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-6 border-t border-slate-700 flex gap-3">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1 bg-slate-800 border-slate-700 hover:bg-slate-700 text-white"
        >
          Avbryt
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={isSubmitting || selectedArticles.length === 0}
          className="flex-1 bg-blue-600 hover:bg-blue-500 text-white"
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
              Importerar...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Importera {selectedArticles.length} artiklar
            </>
          )}
        </Button>
      </div>
    </div>
  );
}