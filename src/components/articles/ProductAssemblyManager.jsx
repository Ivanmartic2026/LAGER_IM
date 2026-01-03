import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, Trash2, Package, AlertCircle, Search, X, 
  CheckCircle2, MapPin, Warehouse, Grid3X3
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

export default function ProductAssemblyManager({ article, assemblyParts, usedInProducts }) {
  const [addPartOpen, setAddPartOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPart, setSelectedPart] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [position, setPosition] = useState("");
  const [isCritical, setIsCritical] = useState(false);

  const queryClient = useQueryClient();

  // Fetch all articles for selection
  const { data: allArticles = [] } = useQuery({
    queryKey: ['articles'],
    queryFn: () => base44.entities.Article.list('-updated_date'),
  });

  const addPartMutation = useMutation({
    mutationFn: (data) => base44.entities.ProductAssembly.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assemblyParts'] });
      setAddPartOpen(false);
      setSelectedPart(null);
      setQuantity(1);
      setNotes("");
      setPosition("");
      setIsCritical(false);
      setSearchQuery("");
      toast.success("Del tillagd till produkten");
    }
  });

  const removePartMutation = useMutation({
    mutationFn: (id) => base44.entities.ProductAssembly.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assemblyParts'] });
      toast.success("Del borttagen från produkten");
    }
  });

  const handleAddPart = () => {
    if (!selectedPart) {
      toast.error("Välj en artikel att lägga till");
      return;
    }

    if (selectedPart.id === article.id) {
      toast.error("En produkt kan inte innehålla sig själv");
      return;
    }

    // Check if already exists
    const exists = assemblyParts.find(p => p.part_article_id === selectedPart.id);
    if (exists) {
      toast.error("Denna del finns redan i produkten");
      return;
    }

    addPartMutation.mutate({
      parent_article_id: article.id,
      parent_article_name: article.name,
      part_article_id: selectedPart.id,
      part_article_name: selectedPart.name,
      quantity_needed: parseInt(quantity) || 1,
      notes,
      position,
      is_critical: isCritical
    });
  };

  const filteredArticles = allArticles.filter(a => 
    a.id !== article.id && // Don't show current article
    (a.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
     a.batch_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
     a.sku?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Calculate if we can build this product based on stock
  const canBuildProduct = assemblyParts.every(part => {
    const partArticle = allArticles.find(a => a.id === part.part_article_id);
    if (!partArticle) return false;
    return (partArticle.stock_qty || 0) >= part.quantity_needed;
  });

  const totalParts = assemblyParts.reduce((sum, p) => sum + p.quantity_needed, 0);

  return (
    <div className="space-y-6">
      
      {/* Components Section */}
      <div className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700/50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-400" />
              Produktens delar ({assemblyParts.length})
            </h3>
            {assemblyParts.length > 0 && (
              <p className="text-sm text-slate-400 mt-1">
                Totalt {totalParts} komponenter • {canBuildProduct ? (
                  <span className="text-emerald-400">Kan byggas nu</span>
                ) : (
                  <span className="text-amber-400">Saknas delar i lager</span>
                )}
              </p>
            )}
          </div>
          <Button
            onClick={() => setAddPartOpen(true)}
            size="sm"
            className="bg-blue-600 hover:bg-blue-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            Lägg till del
          </Button>
        </div>

        {assemblyParts.length === 0 ? (
          <div className="text-center py-8">
            <Grid3X3 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 mb-2">Inga delar har lagts till ännu</p>
            <p className="text-sm text-slate-500">
              Lägg till komponenter som ingår i denna produkt
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {assemblyParts.map((part) => {
              const partArticle = allArticles.find(a => a.id === part.part_article_id);
              const hasEnoughStock = partArticle && (partArticle.stock_qty || 0) >= part.quantity_needed;

              return (
                <motion.div
                  key={part.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-4 rounded-xl bg-slate-900/50 border border-slate-700/30"
                >
                  <div className="flex items-start gap-3">
                    {partArticle?.image_urls?.[0] && (
                      <img 
                        src={partArticle.image_urls[0]} 
                        alt={part.part_article_name}
                        className="w-12 h-12 rounded-lg object-cover bg-slate-800"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <Link 
                            to={`${createPageUrl("Inventory")}?articleId=${part.part_article_id}`}
                            className="font-medium text-white hover:text-blue-400 transition-colors truncate block"
                          >
                            {part.part_article_name}
                          </Link>
                          {partArticle && (
                            <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                              {partArticle.batch_number && (
                                <span className="font-mono">#{partArticle.batch_number}</span>
                              )}
                              {partArticle.shelf_address && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {partArticle.shelf_address}
                                </span>
                              )}
                              {partArticle.warehouse && (
                                <span className="flex items-center gap-1">
                                  <Warehouse className="w-3 h-3" />
                                  {partArticle.warehouse}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removePartMutation.mutate(part.id)}
                          className="text-slate-400 hover:text-red-400 h-8 w-8"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="flex items-center gap-3 flex-wrap">
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
                          {part.quantity_needed} st behövs
                        </Badge>
                        {partArticle && (
                          <Badge 
                            variant="outline" 
                            className={cn(
                              hasEnoughStock 
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                            )}
                          >
                            {hasEnoughStock ? (
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                            ) : (
                              <AlertCircle className="w-3 h-3 mr-1" />
                            )}
                            {partArticle.stock_qty || 0} i lager
                          </Badge>
                        )}
                        {part.is_critical && (
                          <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30">
                            Kritisk
                          </Badge>
                        )}
                        {part.position && (
                          <span className="text-xs text-slate-500">
                            Position: {part.position}
                          </span>
                        )}
                      </div>

                      {part.notes && (
                        <p className="text-sm text-slate-400 mt-2 italic">
                          {part.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Used In Products Section */}
      {usedInProducts.length > 0 && (
        <div className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700/50">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Grid3X3 className="w-5 h-5 text-purple-400" />
            Används i produkter ({usedInProducts.length})
          </h3>
          
          <div className="space-y-2">
            {usedInProducts.map((usage) => {
              const parentArticle = allArticles.find(a => a.id === usage.parent_article_id);

              return (
                <motion.div
                  key={usage.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-xl bg-slate-900/50 border border-slate-700/30"
                >
                  <div className="flex items-start gap-3">
                    {parentArticle?.image_urls?.[0] && (
                      <img 
                        src={parentArticle.image_urls[0]} 
                        alt={usage.parent_article_name}
                        className="w-12 h-12 rounded-lg object-cover bg-slate-800"
                      />
                    )}
                    <div className="flex-1">
                      <Link 
                        to={`${createPageUrl("Inventory")}?articleId=${usage.parent_article_id}`}
                        className="font-medium text-white hover:text-purple-400 transition-colors block mb-2"
                      >
                        {usage.parent_article_name}
                      </Link>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/30">
                          {usage.quantity_needed} st per enhet
                        </Badge>
                        {usage.is_critical && (
                          <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30">
                            Kritisk komponent
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Part Dialog */}
      <Dialog open={addPartOpen} onOpenChange={setAddPartOpen}>
        <DialogContent className="bg-slate-950 border-slate-800 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Lägg till del till {article.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Sök efter artikel att lägga till..."
                className="pl-10 bg-slate-900 border-slate-700 text-white"
              />
            </div>

            {/* Article Selection */}
            <div className="max-h-60 overflow-y-auto space-y-2 border border-slate-700 rounded-lg p-2">
              {filteredArticles.length === 0 ? (
                <p className="text-center text-slate-500 py-8">
                  {searchQuery ? "Inga artiklar hittades" : "Börja söka efter en artikel"}
                </p>
              ) : (
                filteredArticles.map((art) => (
                  <button
                    key={art.id}
                    onClick={() => setSelectedPart(art)}
                    className={cn(
                      "w-full p-3 rounded-lg text-left transition-all",
                      selectedPart?.id === art.id
                        ? "bg-blue-600 border-blue-500"
                        : "bg-slate-900 border-slate-700 hover:bg-slate-800",
                      "border"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {art.image_urls?.[0] && (
                        <img 
                          src={art.image_urls[0]} 
                          alt={art.name}
                          className="w-10 h-10 rounded object-cover bg-slate-800"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white truncate">{art.name}</p>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          {art.batch_number && <span>#{art.batch_number}</span>}
                          <span>•</span>
                          <span>{art.stock_qty || 0} i lager</span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>

            {selectedPart && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4 p-4 rounded-lg bg-slate-900 border border-slate-700"
              >
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Antal som behövs per enhet av {article.name}
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Position/plats (valfritt)
                  </label>
                  <Input
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    placeholder="T.ex. 'Övre vänstra hörnet', 'Baksida'"
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Anteckningar (valfritt)
                  </label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ev. monteringsinstruktioner eller kommentarer..."
                    className="bg-slate-800 border-slate-700 text-white"
                    rows={3}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={isCritical}
                    onCheckedChange={setIsCritical}
                    id="critical"
                  />
                  <label htmlFor="critical" className="text-sm cursor-pointer">
                    Markera som kritisk komponent
                  </label>
                </div>
              </motion.div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setAddPartOpen(false)}
                className="flex-1 bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
              >
                Avbryt
              </Button>
              <Button
                onClick={handleAddPart}
                disabled={!selectedPart || addPartMutation.isPending}
                className="flex-1 bg-blue-600 hover:bg-blue-500"
              >
                {addPartMutation.isPending ? "Lägger till..." : "Lägg till del"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}