import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, Plus, MapPin, Package, Trash2, CheckCircle2, 
  AlertCircle, Sparkles, ArrowRight, Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function PlacementAssistant({ warehouseId, onClose }) {
  const [items, setItems] = useState([]);
  const [selectedArticle, setSelectedArticle] = useState('');
  const [quantity, setQuantity] = useState('');
  const [itemsPerShelf, setItemsPerShelf] = useState('');
  const [suggestions, setSuggestions] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isPlacing, setIsPlacing] = useState(false);

  const { data: articles = [] } = useQuery({
    queryKey: ['articles'],
    queryFn: () => base44.entities.Article.list(),
  });

  const { data: warehouse } = useQuery({
    queryKey: ['warehouse', warehouseId],
    queryFn: async () => {
      if (!warehouseId) return null;
      const warehouses = await base44.entities.Warehouse.list();
      return warehouses.find(w => w.id === warehouseId);
    },
    enabled: !!warehouseId
  });

  const handleAddItem = () => {
    if (!selectedArticle || !quantity || parseInt(quantity) <= 0) {
      toast.error("Välj artikel och ange giltigt antal");
      return;
    }

    const article = articles.find(a => a.id === selectedArticle);
    if (!article) return;

    // Check if article already added
    const existingIndex = items.findIndex(i => i.article_id === selectedArticle);
    if (existingIndex >= 0) {
      const updated = [...items];
      updated[existingIndex].quantity += parseInt(quantity);
      setItems(updated);
    } else {
      setItems([...items, {
        article_id: selectedArticle,
        article_name: article.name,
        article_batch: article.batch_number,
        quantity: parseInt(quantity)
      }]);
    }

    setSelectedArticle('');
    setQuantity('');
  };

  const handleRemoveItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleCalculate = async () => {
    if (items.length === 0) {
      toast.error("Lägg till minst en artikel");
      return;
    }

    setIsCalculating(true);
    try {
      const response = await base44.functions.invoke('suggestPlacements', {
        items,
        warehouseId: warehouseId || null,
        itemsPerShelf: itemsPerShelf ? parseInt(itemsPerShelf) : null
      });

      setSuggestions(response.data);
      
      if (response.data.unplacedItems.length > 0) {
        toast.warning(`${response.data.unplacedItems.length} artiklar kunde inte placeras`);
      } else {
        toast.success("Alla artiklar kunde placeras!");
      }
    } catch (error) {
      console.error('Error calculating placements:', error);
      toast.error("Kunde inte beräkna placeringar");
    } finally {
      setIsCalculating(false);
    }
  };

  const handleReset = () => {
    setSuggestions(null);
    setItems([]);
    setItemsPerShelf('');
  };

  const handleApplyPlacements = async () => {
    if (!suggestions || suggestions.suggestions.length === 0) return;

    setIsPlacing(true);
    try {
      // Update each article with its new shelf address
      const updates = [];
      for (const suggestion of suggestions.suggestions) {
        const article = articles.find(a => a.id === suggestion.article_id);
        if (article) {
          updates.push(
            base44.entities.Article.update(suggestion.article_id, {
              shelf_address: suggestion.shelf_code
            })
          );
        }
      }

      await Promise.all(updates);
      
      toast.success(`${suggestions.suggestions.length} artiklar placerade!`);
      onClose();
    } catch (error) {
      console.error('Error applying placements:', error);
      toast.error("Kunde inte placera artiklar");
    } finally {
      setIsPlacing(false);
    }
  };

  const availableArticles = articles.filter(a => 
    !warehouseId || !warehouse || a.warehouse === warehouse.name
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Placeringsassistent</h2>
              <p className="text-sm text-slate-400">
                {warehouse ? `${warehouse.name}` : 'Alla lagerställen'}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!suggestions ? (
            /* Input Mode */
            <div className="space-y-6">
              {/* Items Per Shelf */}
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-white mb-3">Optimeringsalternativ</h3>
                <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="text-xs text-slate-400 mb-1 block">
                        Önskat antal artiklar per hylla (valfritt)
                      </label>
                      <Input
                        type="number"
                        min="1"
                        value={itemsPerShelf}
                        onChange={(e) => setItemsPerShelf(e.target.value)}
                        placeholder="Lämna tomt för optimal packning"
                        className="bg-slate-900 border-slate-600 text-white"
                      />
                    </div>
                    <div className="text-xs text-slate-500 max-w-xs">
                      Ange antal artiklar per hylla för att fördela jämnt istället för att packa tätt
                    </div>
                  </div>
                </div>
              </div>

              {/* Add Items */}
              <div>
                <h3 className="text-sm font-semibold text-white mb-3">Lägg till artiklar</h3>
                <div className="flex gap-2 mb-4">
                  <Select value={selectedArticle} onValueChange={setSelectedArticle}>
                    <SelectTrigger className="flex-1 bg-slate-800 border-slate-700 text-white">
                      <SelectValue placeholder="Välj artikel..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableArticles.map(article => (
                        <SelectItem key={article.id} value={article.id}>
                          {article.name} {article.batch_number && `(${article.batch_number})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="Antal"
                    className="w-24 bg-slate-800 border-slate-700 text-white"
                  />
                  <Button
                    onClick={handleAddItem}
                    className="bg-blue-600 hover:bg-blue-500"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Lägg till
                  </Button>
                </div>
              </div>

              {/* Items List */}
              {items.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-white mb-3">
                    Artiklar att placera ({items.length})
                  </h3>
                  <div className="space-y-2">
                    <AnimatePresence>
                      {items.map((item, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 flex items-center justify-between"
                        >
                          <div>
                            <p className="font-medium text-white">{item.article_name}</p>
                            {item.article_batch && (
                              <p className="text-xs text-slate-400 font-mono">{item.article_batch}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                              {item.quantity} st
                            </Badge>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleRemoveItem(index)}
                              className="h-8 w-8 text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              )}

              {items.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed border-slate-700 rounded-xl">
                  <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">Lägg till artiklar för att få placeringsförslag</p>
                </div>
              )}
            </div>
          ) : (
            /* Results Mode */
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
                  <p className="text-xs text-blue-300 mb-1">Totalt artiklar</p>
                  <p className="text-2xl font-bold text-white">{suggestions.summary.totalItems}</p>
                </div>
                <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30">
                  <p className="text-xs text-green-300 mb-1">Placerade</p>
                  <p className="text-2xl font-bold text-white">{suggestions.summary.placedItems}</p>
                </div>
                <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30">
                  <p className="text-xs text-purple-300 mb-1">Hyllor använda</p>
                  <p className="text-2xl font-bold text-white">{suggestions.summary.shelvesUsed}</p>
                </div>
              </div>

              {/* Suggestions */}
              {suggestions.suggestions.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    Rekommenderade placeringar
                  </h3>
                  
                  {/* Group by shelf to show articles per shelf */}
                  {(() => {
                    const grouped = {};
                    suggestions.suggestions.forEach(s => {
                      if (!grouped[s.shelf_code]) {
                        grouped[s.shelf_code] = [];
                      }
                      grouped[s.shelf_code].push(s);
                    });
                    
                    return (
                      <div className="space-y-3 mb-4">
                        {Object.entries(grouped).map(([shelfCode, shelfSuggestions]) => (
                          <div key={shelfCode} className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-purple-400" />
                                <span className="font-semibold text-white">{shelfCode}</span>
                              </div>
                              <Badge variant="outline" className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                                {shelfSuggestions.length} artikel{shelfSuggestions.length !== 1 ? 'ar' : ''}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  <div className="space-y-2">
                    {suggestions.suggestions.map((suggestion, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="p-4 rounded-lg bg-green-500/10 border border-green-500/30"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <MapPin className="w-4 h-4 text-green-400" />
                              <p className="font-semibold text-white">{suggestion.shelf_code}</p>
                            </div>
                            <p className="text-sm text-slate-300">{suggestion.article_name}</p>
                            {suggestion.article_batch && (
                              <p className="text-xs text-slate-500 font-mono">{suggestion.article_batch}</p>
                            )}
                          </div>
                          <Badge className="bg-green-600 text-white">
                            {suggestion.quantity} st
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-slate-400">
                          <span>Volym: {(suggestion.volumeUsed / 1000).toFixed(1)} L</span>
                          <ArrowRight className="w-3 h-3" />
                          <span>Beläggning: {suggestion.occupancyAfter.toFixed(0)}%</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Unplaced Items */}
              {suggestions.unplacedItems.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-400" />
                    Kunde inte placeras
                  </h3>
                  <div className="space-y-2">
                    {suggestions.unplacedItems.map((item, index) => (
                      <div
                        key={index}
                        className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold text-white">{item.article?.name || 'Okänd artikel'}</p>
                            <p className="text-xs text-amber-300 mt-1">{item.reason}</p>
                          </div>
                          <Badge variant="outline" className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                            {item.remainingQuantity || item.quantity} st
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-700 flex justify-between">
          {!suggestions ? (
            <>
              <Button
                variant="outline"
                onClick={onClose}
                className="bg-slate-800 border-slate-700 hover:bg-slate-700"
              >
                Avbryt
              </Button>
              <Button
                onClick={handleCalculate}
                disabled={items.length === 0 || isCalculating}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500"
              >
                {isCalculating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Beräknar...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Beräkna placeringar
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={handleReset}
                className="bg-slate-800 border-slate-700 hover:bg-slate-700"
              >
                Ny beräkning
              </Button>
              <div className="flex gap-2">
                {suggestions.suggestions.length > 0 && (
                  <Button
                    onClick={handleApplyPlacements}
                    disabled={isPlacing}
                    className="bg-green-600 hover:bg-green-500"
                  >
                    {isPlacing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Placerar...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Placera artiklar
                      </>
                    )}
                  </Button>
                )}
                <Button
                  onClick={onClose}
                  variant="outline"
                  className="bg-slate-800 border-slate-700 hover:bg-slate-700"
                >
                  Stäng
                </Button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}