import React, { useState } from 'react';
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  Package, MapPin, Calendar, Hash, Factory, Ruler, 
  Scale, Grid3X3, ArrowLeft, Edit, Trash2, Plus, Minus, Printer, Wrench, CheckCircle2, History
} from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { cn } from "@/lib/utils";
import LabelDownloader from "../labels/LabelDownloader";
import RepairModal from "./RepairModal";
import ReturnFromRepairModal from "./ReturnFromRepairModal";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";

export default function ArticleDetail({ 
  article, 
  onBack, 
  onEdit, 
  onDelete,
  onAdjustStock 
}) {
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [repairModalOpen, setRepairModalOpen] = useState(false);
  const [returnFromRepairModalOpen, setReturnFromRepairModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const queryClient = useQueryClient();

  // Fetch stock movements for this article
  const { data: movements = [] } = useQuery({
    queryKey: ['article-movements', article.id],
    queryFn: async () => {
      const allMovements = await base44.entities.StockMovement.list('-created_date', 100);
      return allMovements.filter(m => m.article_id === article.id);
    },
  });

  const { data: allArticles = [] } = useQuery({
    queryKey: ['articles'],
    queryFn: () => base44.entities.Article.list('-updated_date'),
  });

  const articlesOnRepair = allArticles.filter(a => a.status === 'on_repair');
  
  const updateArticleMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Article.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
    }
  });

  const createMovementMutation = useMutation({
    mutationFn: (data) => base44.entities.StockMovement.create(data),
  });
  
  const getStatusConfig = (status) => {
    switch (status) {
      case "low_stock":
        return { label: "Lågt lager", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" };
      case "out_of_stock":
        return { label: "Slut i lager", color: "bg-red-500/20 text-red-400 border-red-500/30" };
      case "discontinued":
        return { label: "Utgått", color: "bg-slate-500/20 text-slate-400 border-slate-500/30" };
      case "on_repair":
        return { label: "På reparation", color: "bg-orange-500/20 text-orange-400 border-orange-500/30" };
      default:
        return { label: "I lager", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" };
    }
  };

  const handleSendToRepair = async (repairNotes, quantity) => {
    try {
      const newQty = (article.stock_qty || 0) - quantity;
      
      await updateArticleMutation.mutateAsync({
        id: article.id,
        data: {
          status: "on_repair",
          repair_notes: `${quantity} st - ${repairNotes}`,
          repair_date: new Date().toISOString().split('T')[0],
          stock_qty: newQty
        }
      });

      await createMovementMutation.mutateAsync({
        article_id: article.id,
        movement_type: "adjustment",
        quantity: -quantity,
        previous_qty: article.stock_qty,
        new_qty: newQty,
        reason: `Skickad på reparation (${quantity} st): ${repairNotes}`
      });

      toast.success(`${quantity} st skickad på reparation`);
      setRepairModalOpen(false);
    } catch (error) {
      toast.error("Kunde inte uppdatera artikel");
    }
  };

  const handleReturnFromRepair = async (returnedQuantity, discardedQuantity, returnNotes) => {
    try {
      const previousQty = article.stock_qty || 0;
      const newQty = previousQty + returnedQuantity;
      
      await updateArticleMutation.mutateAsync({
        id: article.id,
        data: {
          status: newQty <= 0 ? "out_of_stock" : 
                 newQty <= (article.min_stock_level || 5) ? "low_stock" : "active",
          repair_notes: null,
          repair_date: null,
          stock_qty: newQty
        }
      });

      // Create movement for returned items
      if (returnedQuantity > 0) {
        await createMovementMutation.mutateAsync({
          article_id: article.id,
          movement_type: "inbound",
          quantity: returnedQuantity,
          previous_qty: previousQty,
          new_qty: newQty,
          reason: `Återkommen från reparation${returnNotes ? ': ' + returnNotes : ''}`
        });
      }

      // Create movement for discarded items
      if (discardedQuantity > 0) {
        await createMovementMutation.mutateAsync({
          article_id: article.id,
          movement_type: "adjustment",
          quantity: -discardedQuantity,
          previous_qty: newQty,
          new_qty: newQty,
          reason: `Kasserad efter reparation (${discardedQuantity} st)${returnNotes ? ': ' + returnNotes : ''}`
        });
      }

      toast.success(`${returnedQuantity} st återförda till lager${discardedQuantity > 0 ? `, ${discardedQuantity} st kasserade` : ''}`);
      setReturnFromRepairModalOpen(false);
    } catch (error) {
      toast.error("Kunde inte uppdatera artikel");
    }
  };

  const statusConfig = getStatusConfig(article.status);

  const InfoRow = ({ icon: Icon, label, value }) => (
    <div className="flex items-center justify-between py-3 border-b border-slate-700/50 last:border-0">
      <div className="flex items-center gap-3 text-slate-400">
        <Icon className="w-4 h-4" />
        <span className="text-sm">{label}</span>
      </div>
      <span className="font-medium text-white">{value || "—"}</span>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={onBack}
          className="text-slate-400 hover:text-white hover:bg-slate-800"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Tillbaka
        </Button>
        <div className="flex flex-wrap gap-2">
          {article.status === "on_repair" ? (
            <Button
              onClick={() => setReturnFromRepairModalOpen(true)}
              disabled={updateArticleMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-6"
            >
              <CheckCircle2 className="w-5 h-5 mr-2" />
              Återför från reparation
            </Button>
          ) : (
            <Button
              onClick={() => setRepairModalOpen(true)}
              className="bg-orange-600 hover:bg-orange-500 text-white font-semibold"
            >
              <Wrench className="w-4 h-4 mr-2" />
              Skicka på reparation
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => setShowPrintModal(true)}
            className="bg-slate-800 border-slate-600 hover:bg-slate-700 text-white"
          >
            <Printer className="w-4 h-4 mr-2" />
            Etikett
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={onEdit}
            className="bg-slate-800 border-slate-600 hover:bg-slate-700 text-white"
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={onDelete}
            className="bg-slate-800 border-slate-600 hover:bg-red-900/50 hover:border-red-500/50 text-white"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {article.image_url ? (
          <div className="w-full md:w-48 h-48 rounded-2xl overflow-hidden bg-slate-800 flex-shrink-0">
            <img 
              src={article.image_url} 
              alt={article.name}
              className="w-full h-full object-contain"
            />
          </div>
        ) : (
          <div className="w-full md:w-48 h-48 rounded-2xl bg-slate-800/50 flex items-center justify-center flex-shrink-0">
            <Package className="w-16 h-16 text-slate-600" />
          </div>
        )}

        <div className="flex-1">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">{article.name}</h1>
              <p className="text-slate-400 flex items-center gap-2">
                <Hash className="w-4 h-4" />
                <span className="text-slate-500">Batch:</span> {article.batch_number}
              </p>
            </div>
            <Badge className={cn("border text-sm", statusConfig.color)}>
              {statusConfig.label}
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
              <p className="text-sm text-blue-300 mb-1">I lager</p>
              <p className="text-3xl font-bold text-white">{article.stock_qty || 0}</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
              <p className="text-sm text-slate-400 mb-1">Min. lagernivå</p>
              <p className="text-3xl font-bold text-white">{article.min_stock_level || "—"}</p>
            </div>
            {article.status === 'on_repair' && article.repair_notes && (
              <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/30">
                <p className="text-sm text-orange-300 mb-1">På reparation</p>
                <p className="text-3xl font-bold text-white">
                  {article.repair_notes.match(/^(\d+)\s*st/) ? article.repair_notes.match(/^(\d+)\s*st/)[1] : "—"}
                </p>
              </div>
            )}
          </div>
          </div>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Button
                onClick={() => onAdjustStock("add")}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold h-14 text-base"
              >
                <Plus className="w-5 h-5 mr-2" />
                Lägg till lager
              </Button>
              <Button
                onClick={() => onAdjustStock("remove")}
                className="bg-red-600 hover:bg-red-500 text-white font-semibold h-14 text-base"
              >
                <Minus className="w-5 h-5 mr-2" />
                Ta ut från lager
              </Button>
            </div>

            {article.status === "on_repair" ? (
              <Button
                onClick={() => setReturnFromRepairModalOpen(true)}
                disabled={updateArticleMutation.isPending}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium h-10"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Återför från reparation
              </Button>
            ) : (
              <Button
                onClick={() => setRepairModalOpen(true)}
                className="w-full bg-orange-600 hover:bg-orange-500 text-white font-medium h-10"
              >
                <Wrench className="w-4 h-4 mr-2" />
                Rapportera för reparation
              </Button>
            )}
          </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-slate-800/50 border border-slate-700 w-full md:w-auto">
          <TabsTrigger value="details" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Detaljer
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            Historik
          </TabsTrigger>
          <TabsTrigger value="repairs" className="flex items-center gap-2">
            <Wrench className="w-4 h-4" />
            På reparation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700/50">
              <h3 className="font-semibold text-white mb-4">Artikelinformation</h3>
              <div className="space-y-0">
                <InfoRow icon={Factory} label="Tillverkare" value={article.manufacturer} />
                <InfoRow icon={Calendar} label="Tillverkningsdatum" value={
                  article.manufacturing_date && !isNaN(new Date(article.manufacturing_date).getTime())
                    ? format(new Date(article.manufacturing_date), "d MMM yyyy", { locale: sv })
                    : null
                } />
                <InfoRow icon={Grid3X3} label="Pixel Pitch" value={
                  article.pixel_pitch_mm ? `${article.pixel_pitch_mm} mm` : null
                } />
                <InfoRow icon={Package} label="Kategori" value={article.category} />
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700/50">
              <h3 className="font-semibold text-white mb-4">Lagerplats & Mått</h3>
              <div className="space-y-0">
                <InfoRow icon={MapPin} label="Hyllplats" value={article.shelf_address} />
                <InfoRow icon={MapPin} label="Lager" value={article.warehouse} />
                <InfoRow icon={Ruler} label="Dimensioner" value={
                  article.dimensions_width_mm || article.dimensions_height_mm || article.dimensions_depth_mm
                    ? `${article.dimensions_width_mm || "—"} × ${article.dimensions_height_mm || "—"} × ${article.dimensions_depth_mm || "—"} mm`
                    : null
                } />
                <InfoRow icon={Scale} label="Vikt" value={
                  article.weight_kg ? `${article.weight_kg} kg` : null
                } />
              </div>
            </div>
          </div>

          {article.notes && (
            <div className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700/50">
              <h3 className="font-semibold text-white mb-3">Anteckningar</h3>
              <p className="text-slate-300">{article.notes}</p>
            </div>
          )}

          {article.status === "on_repair" && article.repair_notes && (
            <div className="p-5 rounded-2xl bg-orange-500/10 border border-orange-500/30">
              <div className="flex items-center gap-2 mb-3">
                <Wrench className="w-4 h-4 text-orange-400" />
                <h3 className="font-semibold text-white">Reparationsinformation</h3>
              </div>
              <p className="text-orange-200 mb-2">{article.repair_notes}</p>
              {article.repair_date && (
                <p className="text-xs text-orange-300">
                  Skickad: {format(new Date(article.repair_date), "d MMM yyyy", { locale: sv })}
                </p>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <div className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700/50">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <History className="w-5 h-5" />
              Lagerrörelser för {article.name}
            </h3>

            {movements.length === 0 ? (
              <div className="text-center py-8">
                <History className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">Ingen historik ännu</p>
              </div>
            ) : (
              <div className="space-y-3">
                {movements.map((movement) => {
                  const typeConfig = {
                    inbound: { label: "Inleverans", icon: "📥", color: "text-emerald-400" },
                    outbound: { label: "Uttag", icon: "📤", color: "text-red-400" },
                    adjustment: { label: "Justering", icon: "⚙️", color: "text-blue-400" },
                    inventory: { label: "Inventering", icon: "📋", color: "text-purple-400" }
                  }[movement.movement_type] || { label: movement.movement_type, icon: "•", color: "text-slate-400" };

                  return (
                    <div
                      key={movement.id}
                      className="p-4 rounded-xl bg-slate-900/50 border border-slate-700/30"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">{typeConfig.icon}</span>
                            <span className={cn("font-medium", typeConfig.color)}>
                              {typeConfig.label}
                            </span>
                            <Badge variant="outline" className="bg-slate-800 text-slate-300 text-xs">
                              {movement.quantity > 0 ? '+' : ''}{movement.quantity} st
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-400 mb-2">
                            {movement.reason || "Ingen anledning angiven"}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span>
                              {format(new Date(movement.created_date), "d MMM yyyy HH:mm", { locale: sv })}
                            </span>
                            <span>•</span>
                            <span>
                              {movement.previous_qty} → {movement.new_qty} st
                            </span>
                            {movement.created_by && (
                              <>
                                <span>•</span>
                                <span>{movement.created_by}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="repairs" className="mt-6">
          <div className="p-5 rounded-2xl bg-slate-800/50 border border-slate-700/50">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Wrench className="w-5 h-5 text-orange-400" />
              Artiklar på reparation
            </h3>

            {articlesOnRepair.length === 0 ? (
              <div className="text-center py-8">
                <Wrench className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">Inga artiklar på reparation</p>
              </div>
            ) : (
              <div className="space-y-3">
                {articlesOnRepair.map((repairArticle) => (
                  <div
                    key={repairArticle.id}
                    className="p-4 rounded-xl bg-slate-900/50 border border-orange-500/30 hover:border-orange-500/50 transition-colors cursor-pointer"
                    onClick={() => {
                      if (repairArticle.id !== article.id) {
                        window.location.href = `#/Inventory?articleId=${repairArticle.id}`;
                      }
                    }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-white">{repairArticle.name}</span>
                          <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs">
                            #{repairArticle.batch_number}
                          </Badge>
                        </div>
                        {repairArticle.repair_notes && (
                          <p className="text-sm text-orange-200 mb-2">
                            {repairArticle.repair_notes}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-slate-400">
                          {repairArticle.repair_date && (
                            <span>
                              Skickad: {format(new Date(repairArticle.repair_date), "d MMM yyyy", { locale: sv })}
                            </span>
                          )}
                          {repairArticle.shelf_address && (
                            <>
                              <span>•</span>
                              <span>{repairArticle.shelf_address}</span>
                            </>
                          )}
                          {repairArticle.manufacturer && (
                            <>
                              <span>•</span>
                              <span>{repairArticle.manufacturer}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
        </Tabs>

      {/* Modals */}
      {showPrintModal && (
        <LabelDownloader
          articles={[article]}
          onClose={() => setShowPrintModal(false)}
        />
      )}

      <RepairModal
        isOpen={repairModalOpen}
        onClose={() => setRepairModalOpen(false)}
        article={article}
        onSubmit={handleSendToRepair}
        isSubmitting={updateArticleMutation.isPending}
      />

      <ReturnFromRepairModal
        isOpen={returnFromRepairModalOpen}
        onClose={() => setReturnFromRepairModalOpen(false)}
        article={article}
        onSubmit={handleReturnFromRepair}
        isSubmitting={updateArticleMutation.isPending}
      />
      </motion.div>
      );
      }