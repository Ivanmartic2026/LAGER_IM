import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import html2canvas from 'html2canvas';
import { 
  Wrench, CheckCircle2, ArrowLeft, Calendar, 
  Package, MapPin, User, AlertTriangle, Search, Eye, Download, Printer
} from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import RepairLabel from "@/components/labels/RepairLabel";

export default function RepairsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRepair, setSelectedRepair] = useState(null);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnData, setReturnData] = useState({ returned: 0, discarded: 0, notes: "" });
  const [printLabelArticle, setPrintLabelArticle] = useState(null);
  
  const queryClient = useQueryClient();

  const { data: user } = useQuery({ queryKey: ["user"], queryFn: () => base44.auth.me() });

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ['articles'],
    queryFn: () => base44.entities.Article.list('-updated_date'),
  });

  const updateArticleMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Article.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
    }
  });

  const createMovementMutation = useMutation({
    mutationFn: (data) => base44.entities.StockMovement.create(data),
  });

  const createRepairLogMutation = useMutation({
    mutationFn: (data) => base44.entities.RepairLog.create(data),
  });

  const repairArticles = articles.filter(a => a.status === 'on_repair');

  const filteredRepairs = repairArticles.filter(article => 
    !searchQuery || 
    article.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.batch_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.manufacturer?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleQuickReturnToStock = async (article) => {
    try {
      const currentQty = article.stock_qty || 0;
      
      await updateArticleMutation.mutateAsync({
        id: article.id,
        data: {
          status: currentQty <= 0 ? "out_of_stock" : 
                 currentQty <= (article.min_stock_level || 5) ? "low_stock" : "active",
          repair_notes: null,
          repair_date: null
        }
      });

      await createMovementMutation.mutateAsync({
        article_id: article.id,
        movement_type: "adjustment",
        quantity: 0,
        previous_qty: currentQty,
        new_qty: currentQty,
        reason: "Återställd från reparation till lager"
      });

      await createRepairLogMutation.mutateAsync({
        article_id: article.id,
        article_name: article.name,
        repair_date_start: article.repair_date,
        repair_date_end: new Date().toISOString(),
        notes: article.repair_notes,
        status: "completed",
        returned_quantity: 1,
        processed_by: user?.email
      });

      toast.success("Artikel återförd till lager");
    } catch (error) {
      toast.error("Kunde inte uppdatera artikel");
    }
  };

  const handleReturnFromRepair = async () => {
    if (!selectedRepair) return;
    
    const returnedQty = parseInt(returnData.returned) || 0;
    const discardedQty = parseInt(returnData.discarded) || 0;
    
    if (returnedQty === 0 && discardedQty === 0) {
      toast.error("Ange antal returnerade eller kasserade");
      return;
    }

    try {
      const previousQty = selectedRepair.stock_qty || 0;
      const newQty = previousQty + returnedQty;
      
      await updateArticleMutation.mutateAsync({
        id: selectedRepair.id,
        data: {
          status: newQty <= 0 ? "out_of_stock" : 
                 newQty <= (selectedRepair.min_stock_level || 5) ? "low_stock" : "active",
          repair_notes: null,
          repair_date: null,
          stock_qty: newQty
        }
      });

      if (returnedQty > 0) {
        await createMovementMutation.mutateAsync({
          article_id: selectedRepair.id,
          movement_type: "inbound",
          quantity: returnedQty,
          previous_qty: previousQty,
          new_qty: newQty,
          reason: `Återkommen från reparation${returnData.notes ? ': ' + returnData.notes : ''}`
        });
      }

      if (discardedQty > 0) {
        await createMovementMutation.mutateAsync({
          article_id: selectedRepair.id,
          movement_type: "adjustment",
          quantity: -discardedQty,
          previous_qty: newQty,
          new_qty: newQty,
          reason: `Kasserad efter reparation (${discardedQty} st)${returnData.notes ? ': ' + returnData.notes : ''}`
        });
      }

      await createRepairLogMutation.mutateAsync({
        article_id: selectedRepair.id,
        article_name: selectedRepair.name,
        repair_date_start: selectedRepair.repair_date,
        repair_date_end: new Date().toISOString(),
        notes: returnData.notes || selectedRepair.repair_notes,
        status: discardedQty > 0 ? "discarded" : "completed",
        returned_quantity: returnedQty,
        discarded_quantity: discardedQty,
        processed_by: user?.email
      });

      toast.success(`${returnedQty} st återförda${discardedQty > 0 ? `, ${discardedQty} st kasserade` : ''}`);
      setReturnModalOpen(false);
      setSelectedRepair(null);
      setReturnData({ returned: 0, discarded: 0, notes: "" });
    } catch (error) {
      toast.error("Kunde inte uppdatera artikel");
    }
  };

  const getRepairQuantity = (notes) => {
    const match = notes?.match(/^(\d+)\s*st/);
    return match ? match[1] : "—";
  };

  const handleExportPdf = async () => {
    try {
      const response = await base44.functions.invoke('exportRepairsPdf');
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'reparationsrapport.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success('PDF exporterad');
    } catch (error) {
      toast.error('Kunde inte exportera PDF');
    }
  };

  const handlePrintLabel = (article) => {
    setPrintLabelArticle(article);
  };

  const handlePrintConfirm = () => {
    window.print();
    setTimeout(() => {
      setPrintLabelArticle(null);
    }, 100);
  };

  const handleDownloadPNG = async () => {
    try {
      const labelElement = document.querySelector('[data-label-container]');
      if (!labelElement) {
        toast.error('Kunde inte hitta etiketten');
        return;
      }

      const canvas = await html2canvas(labelElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `etikett-${printLabelArticle.sku || printLabelArticle.id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('PNG sparad');
    } catch (error) {
      toast.error('Kunde inte spara PNG');
    }
  };

  return (
    <div className="min-h-screen bg-black p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3 tracking-tight">
                <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
                  <Wrench className="w-5 h-5 text-orange-400" />
                </div>
                Reparation & Service
              </h1>
              <p className="text-white/50 text-sm mt-1">
                {repairArticles.length} artikel{repairArticles.length !== 1 ? 'ar' : ''} på reparation
              </p>
            </div>
            {repairArticles.length > 0 && (
              <Button 
                onClick={handleExportPdf}
                className="bg-orange-600 hover:bg-orange-500 text-white gap-2 shadow-lg shadow-orange-500/50"
              >
                <Download className="w-4 h-4" />
                Exportera PDF
              </Button>
            )}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Sök artikel, batch eller tillverkare..."
              className="pl-10 h-10 bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-white placeholder:text-white/40 backdrop-blur-xl transition-all duration-300"
            />
          </div>
        </div>

        {/* Repair Cards */}
        {isLoading ? (
          <div className="grid gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-40 rounded-2xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : filteredRepairs.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center mx-auto mb-4">
              <Wrench className="w-8 h-8 text-orange-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2 tracking-tight">
              {searchQuery ? "Inga artiklar hittades" : "Inga artiklar på reparation"}
            </h3>
            <p className="text-white/50">
              {searchQuery 
                ? "Prova ett annat sökord" 
                : "Alla artiklar är i gott skick!"}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredRepairs.map((article) => (
              <motion.div
                key={article.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 rounded-2xl bg-white/5 backdrop-blur-xl border border-orange-500/30 hover:border-orange-500/50 hover:bg-white/10 hover:shadow-2xl hover:shadow-orange-500/10 transition-all duration-300"
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-white">
                        {article.name}
                      </h3>
                      <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                        #{article.batch_number}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      {article.shelf_address && (
                        <div className="flex items-center gap-2 text-slate-400">
                          <MapPin className="w-4 h-4" />
                          <span>{article.shelf_address}</span>
                        </div>
                      )}
                      {article.manufacturer && (
                        <div className="flex items-center gap-2 text-slate-400">
                          <Package className="w-4 h-4" />
                          <span>{article.manufacturer}</span>
                        </div>
                      )}
                      {article.repair_date && (
                        <div className="flex items-center gap-2 text-slate-400">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {format(new Date(article.repair_date), "d MMM yyyy", { locale: sv })}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-orange-400 font-semibold">
                        <Wrench className="w-4 h-4" />
                        <span>{getRepairQuantity(article.repair_notes)} st</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handlePrintLabel(article)}
                      size="sm"
                      className="bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-500/50"
                    >
                      <Printer className="w-4 h-4 mr-2" />
                      Etikett
                    </Button>
                    <Link to={`${createPageUrl("Inventory")}?articleId=${article.id}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-slate-800 border-slate-600 hover:bg-slate-700 text-white"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Visa
                      </Button>
                    </Link>
                    <Button
                      onClick={() => handleQuickReturnToStock(article)}
                      disabled={updateArticleMutation.isPending}
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/50 hover:shadow-emerald-500/70 transition-all duration-300"
                    >
                      {updateArticleMutation.isPending ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Återställ
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => {
                        setSelectedRepair(article);
                        setReturnModalOpen(true);
                      }}
                      disabled={updateArticleMutation.isPending}
                      size="sm"
                      variant="outline"
                      className="bg-slate-800 border-slate-600 hover:bg-slate-700 text-white"
                    >
                      Med detaljer
                    </Button>
                  </div>
                </div>

                {article.repair_notes && (
                  <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-orange-300 mb-1">Felorsak</p>
                        <p className="text-sm text-orange-200">{article.repair_notes}</p>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}

        {/* Print Label Modal */}
        <Dialog open={!!printLabelArticle} onOpenChange={() => setPrintLabelArticle(null)}>
          <DialogContent className="bg-white border-0 max-w-2xl p-0 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <DialogTitle>Reparationsetikett</DialogTitle>
            </div>
            
            <div className="p-4 bg-gray-50">
              {printLabelArticle && (
                <div className="flex justify-center" data-label-container>
                  <RepairLabel
                    article={printLabelArticle}
                    repairNotes={printLabelArticle.repair_notes || ''}
                    repairDate={printLabelArticle.repair_date || new Date()}
                    quantity={printLabelArticle.repair_notes?.match(/^(\d+)\s*st/)?.[1] || '1'}
                  />
                </div>
              )}
            </div>

            <DialogFooter className="bg-white border-t p-4 gap-2">
              <Button
                variant="outline"
                onClick={() => setPrintLabelArticle(null)}
                className="text-black border-gray-300"
              >
                Avbryt
              </Button>
              <Button
                onClick={handleDownloadPNG}
                className="bg-blue-600 hover:bg-blue-500 text-white"
              >
                <Download className="w-4 h-4 mr-2" />
                Spara PNG
              </Button>
              <Button
                onClick={handlePrintConfirm}
                className="bg-red-600 hover:bg-red-500 text-white"
              >
                <Printer className="w-4 h-4 mr-2" />
                Skriv ut
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Return Modal */}
        <Dialog open={returnModalOpen} onOpenChange={setReturnModalOpen}>
          <DialogContent className="bg-zinc-950 border-white/10 text-white backdrop-blur-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                Återför från reparation
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {selectedRepair && (
                <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                  <p className="text-sm font-medium text-white mb-1">{selectedRepair.name}</p>
                  <p className="text-xs text-slate-400">#{selectedRepair.batch_number}</p>
                </div>
              )}

              <div>
                <label className="text-sm text-slate-300 mb-2 block">
                  Antal som returneras till lager
                </label>
                <Input
                  type="number"
                  min="0"
                  value={returnData.returned}
                  onChange={(e) => setReturnData({ ...returnData, returned: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="text-sm text-slate-300 mb-2 block">
                  Antal som kasseras (inte reparerbara)
                </label>
                <Input
                  type="number"
                  min="0"
                  value={returnData.discarded}
                  onChange={(e) => setReturnData({ ...returnData, discarded: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="text-sm text-slate-300 mb-2 block">
                  Anteckningar (valfritt)
                </label>
                <Textarea
                  value={returnData.notes}
                  onChange={(e) => setReturnData({ ...returnData, notes: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white h-20"
                  placeholder="T.ex. status efter reparation..."
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setReturnModalOpen(false);
                  setReturnData({ returned: 0, discarded: 0, notes: "" });
                }}
                className="bg-slate-800 border-slate-600 hover:bg-slate-700 text-white"
              >
                Avbryt
              </Button>
              <Button
                onClick={handleReturnFromRepair}
                disabled={updateArticleMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Bekräfta återföring
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}