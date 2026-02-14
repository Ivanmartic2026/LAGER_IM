import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  Upload, Package, Calendar, AlertCircle, CheckCircle2, 
  Download, Eye, Search, File, Truck, Clock, AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

export default function SupplierPortalDashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedPO, setSelectedPO] = useState(null);

  const queryClient = useQueryClient();

  const { data: purchaseOrders = [], isLoading } = useQuery({
    queryKey: ['purchaseOrders'],
    queryFn: () => base44.entities.PurchaseOrder.list('-created_date'),
  });

  const { data: purchaseOrderItems = [] } = useQuery({
    queryKey: ['purchaseOrderItems'],
    queryFn: () => base44.entities.PurchaseOrderItem.list(),
  });

  const { data: supplierDocuments = [] } = useQuery({
    queryKey: ['supplierDocuments'],
    queryFn: () => base44.entities.SupplierDocument.list(),
  });

  const filteredPOs = purchaseOrders
    .filter(po => {
      const matchesSearch = !searchQuery || 
        po.po_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        po.supplier_name?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || po.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });

  const getDocumentationProgress = (poId) => {
    const items = purchaseOrderItems.filter(item => item.purchase_order_id === poId);
    if (items.length === 0) return { current: 0, total: 0, percentage: 0 };

    let completed = 0;
    const total = items.length;

    items.forEach(item => {
      const docs = supplierDocuments.filter(doc => doc.purchase_order_id === poId);
      const hasPackingList = docs.some(d => d.document_type === 'packing_list');
      const hasQC = docs.some(d => d.document_type === 'qc_document');
      const hasBatchInfo = item.supplier_batch_numbers && item.supplier_batch_numbers.length > 0;

      if (hasPackingList && hasQC && hasBatchInfo) {
        completed++;
      }
    });

    return {
      current: completed,
      total: total,
      percentage: Math.round((completed / total) * 100)
    };
  };

  const statusColors = {
    draft: "bg-slate-500/20 text-slate-400 border-slate-500/30",
    sent: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    confirmed: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    waiting_for_supplier_documentation: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    in_production: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    shipped: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    ready_for_reception: "bg-green-500/20 text-green-400 border-green-500/30",
    received: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    cancelled: "bg-red-500/20 text-red-400 border-red-500/30"
  };

  const statusLabels = {
    draft: "Utkast",
    sent: "Skickat",
    confirmed: "Bekräftat",
    waiting_for_supplier_documentation: "Väntar på dokument",
    in_production: "I produktion",
    shipped: "Skickat",
    ready_for_reception: "Redo för mottagning",
    received: "Mottaget",
    cancelled: "Avbruten"
  };

  return (
    <div className="min-h-screen bg-black p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Leverantörsportal</h1>
              <p className="text-white/50 text-sm mt-1">Hantera inköpsordrar och dokumentation</p>
            </div>
            <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
              {filteredPOs.length} ordrar
            </Badge>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Sök PO-nummer eller leverantör..."
              className="pl-11 h-11 bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-white placeholder:text-white/40 backdrop-blur-xl"
            />
          </div>

          {/* Status Filter */}
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList className="h-10 bg-white/5 border border-white/10 backdrop-blur-xl overflow-x-auto">
              <TabsTrigger value="all" className="text-sm h-8 px-4 text-white/70 data-[state=active]:text-white data-[state=active]:bg-white/10">
                Alla
              </TabsTrigger>
              <TabsTrigger value="waiting_for_supplier_documentation" className="text-sm h-8 px-4 text-white/70 data-[state=active]:text-white data-[state=active]:bg-white/10 whitespace-nowrap">
                Väntar på dokument
              </TabsTrigger>
              <TabsTrigger value="ready_for_reception" className="text-sm h-8 px-4 text-white/70 data-[state=active]:text-white data-[state=active]:bg-white/10 whitespace-nowrap">
                Redo för mottagning
              </TabsTrigger>
              <TabsTrigger value="received" className="text-sm h-8 px-4 text-white/70 data-[state=active]:text-white data-[state=active]:bg-white/10">
                Mottaget
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* PO List */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 rounded-2xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : filteredPOs.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-white/30" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Inga inköpsordrar
            </h3>
            <p className="text-white/50">
              Det finns inga inköpsordrar att visa för närvarande
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {filteredPOs.map((po) => {
                const progress = getDocumentationProgress(po.id);
                const items = purchaseOrderItems.filter(item => item.purchase_order_id === po.id);
                const isComplete = progress.percentage === 100;

                return (
                  <motion.div
                    key={po.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={cn(
                      "p-5 rounded-2xl backdrop-blur-xl transition-all duration-300 border cursor-pointer hover:shadow-2xl",
                      po.status === "waiting_for_supplier_documentation"
                        ? "bg-amber-500/10 border-amber-500/40 hover:border-amber-500/60 hover:bg-amber-500/15 hover:shadow-amber-500/20"
                        : po.status === "ready_for_reception"
                        ? "bg-green-500/10 border-green-500/40 hover:border-green-500/60 hover:bg-green-500/15 hover:shadow-green-500/20"
                        : "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10 hover:shadow-white/5"
                    )}
                    onClick={() => setSelectedPO(po)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Header */}
                        <div className="flex items-center gap-3 mb-3 flex-wrap">
                          <h3 className="text-lg font-semibold text-white">
                            {po.po_number || `PO-${po.id.slice(0, 8)}`}
                          </h3>
                          <Badge className={cn("text-xs", statusColors[po.status])}>
                            {statusLabels[po.status]}
                          </Badge>
                          {isComplete && (
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Allt klart
                            </Badge>
                          )}
                        </div>

                        {/* Details */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div>
                            <p className="text-xs text-white/40 mb-1">Leverantör</p>
                            <p className="text-sm text-white font-medium">{po.supplier_name}</p>
                          </div>
                          {po.expected_delivery_date && (
                            <div>
                              <p className="text-xs text-white/40 mb-1">Förväntat leveransdatum</p>
                              <p className="text-sm text-white font-medium flex items-center gap-1.5">
                                <Calendar className="w-4 h-4 text-blue-400" />
                                {format(new Date(po.expected_delivery_date), "d MMM yyyy", { locale: sv })}
                              </p>
                            </div>
                          )}
                          {po.invoice_number && (
                            <div>
                              <p className="text-xs text-white/40 mb-1">Fakturanummer</p>
                              <p className="text-sm text-white font-medium">{po.invoice_number}</p>
                            </div>
                          )}
                        </div>

                        {/* Documentation Progress */}
                        {po.status === "waiting_for_supplier_documentation" && (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs text-white/40">Dokumentationsstatus</p>
                              <span className="text-xs font-semibold text-white">
                                {progress.current}/{progress.total} artiklar
                              </span>
                            </div>
                            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  "h-full transition-all duration-500",
                                  progress.percentage === 100 ? "bg-green-500" : "bg-amber-500"
                                )}
                                style={{ width: `${progress.percentage}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-blue-600 border-blue-500 hover:bg-blue-500 text-white flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPO(po);
                        }}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        <span className="hidden sm:inline">Detaljer</span>
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Detail Modal */}
        {selectedPO && (
          <PODetailModal
            po={selectedPO}
            items={purchaseOrderItems.filter(item => item.purchase_order_id === selectedPO.id)}
            documents={supplierDocuments.filter(doc => doc.purchase_order_id === selectedPO.id)}
            onClose={() => setSelectedPO(null)}
          />
        )}
      </div>
    </div>
  );
}

function PODetailModal({ po, items, documents, onClose }) {
  const [activeTab, setActiveTab] = React.useState("items");

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-slate-950 rounded-2xl border border-white/10 max-w-4xl w-full max-h-[90vh] overflow-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-slate-950 border-b border-white/10 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">
              {po.po_number || `PO-${po.id.slice(0, 8)}`}
            </h2>
            <p className="text-sm text-white/50 mt-1">{po.supplier_name}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white/70 hover:text-white"
          >
            ✕
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="h-10 bg-white/5 border border-white/10 backdrop-blur-xl">
              <TabsTrigger value="items" className="text-sm h-8 px-4 text-white/70 data-[state=active]:text-white data-[state=active]:bg-white/10">
                <Package className="w-4 h-4 mr-2" />
                Artiklar
              </TabsTrigger>
              <TabsTrigger value="documents" className="text-sm h-8 px-4 text-white/70 data-[state=active]:text-white data-[state=active]:bg-white/10">
                <File className="w-4 h-4 mr-2" />
                Dokument
              </TabsTrigger>
              <TabsTrigger value="info" className="text-sm h-8 px-4 text-white/70 data-[state=active]:text-white data-[state=active]:bg-white/10">
                Info
              </TabsTrigger>
            </TabsList>

            {/* Items Tab */}
            <div className="mt-6">
              {activeTab === "items" && (
                <div className="space-y-4">
                  {items.length === 0 ? (
                    <p className="text-white/50 text-center py-8">Inga artiklar</p>
                  ) : (
                    items.map((item) => (
                      <Card key={item.id} className="bg-white/5 border-white/10 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h4 className="text-white font-semibold">{item.article_name}</h4>
                            <p className="text-sm text-white/50 mt-1">Beställd: {item.quantity_ordered} st</p>
                            {item.supplier_batch_numbers && item.supplier_batch_numbers.length > 0 && (
                              <div className="mt-2 space-y-1">
                                <p className="text-xs text-white/40">Batch</p>
                                {item.supplier_batch_numbers.map((batch, idx) => (
                                  <div key={idx} className="text-sm text-white bg-white/5 p-2 rounded">
                                    {batch.batch_no} ({batch.quantity} st)
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex-shrink-0 text-right">
                            {item.status === "received" ? (
                              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Mottagen
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                                Väntar
                              </Badge>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              )}

              {/* Documents Tab */}
              {activeTab === "documents" && (
                <div className="space-y-4">
                  {documents.length === 0 ? (
                    <p className="text-white/50 text-center py-8">Inga dokument uppladdade</p>
                  ) : (
                    documents.map((doc) => (
                      <Card key={doc.id} className="bg-white/5 border-white/10 p-4 flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-white font-semibold">{doc.file_name}</p>
                          <p className="text-xs text-white/50 mt-1">{doc.document_type}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-white/5 border-white/10 hover:bg-white/10"
                          onClick={() => window.open(doc.file_url, '_blank')}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </Card>
                    ))
                  )}
                </div>
              )}

              {/* Info Tab */}
              {activeTab === "info" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {po.invoice_number && (
                    <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <p className="text-xs text-white/40 mb-1">Fakturanummer</p>
                      <p className="text-white font-semibold">{po.invoice_number}</p>
                    </div>
                  )}
                  {po.invoice_amount && (
                    <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <p className="text-xs text-white/40 mb-1">Belopp</p>
                      <p className="text-white font-semibold">
                        {po.invoice_amount} {po.invoice_currency}
                      </p>
                    </div>
                  )}
                  {po.expected_delivery_date && (
                    <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <p className="text-xs text-white/40 mb-1">Förväntat leveransdatum</p>
                      <p className="text-white font-semibold">
                        {format(new Date(po.expected_delivery_date), "d MMM yyyy", { locale: sv })}
                      </p>
                    </div>
                  )}
                  {po.notes && (
                    <div className="bg-white/5 rounded-lg p-4 border border-white/10 md:col-span-2">
                      <p className="text-xs text-white/40 mb-1">Anteckningar</p>
                      <p className="text-white text-sm">{po.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Tabs>
        </div>
      </motion.div>
    </div>
  );
}