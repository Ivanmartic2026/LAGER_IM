import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, FileText, Package, CheckCircle2, AlertCircle, 
  Download, Eye, Image, Calendar, User, TrendingUp, Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";

const documentTypeLabels = {
  packing_list: 'Packlista',
  commercial_invoice: 'Faktura',
  test_protocol: 'Testprotokoll',
  qc_document: 'QC-dokument',
  certificate_ce: 'CE-certifikat',
  certificate_rohs: 'RoHS-certifikat',
  certificate_ip: 'IP-klassning',
  certificate_other: 'Annat certifikat',
  manual: 'Manual',
  datasheet: 'Produktblad',
  batch_image: 'Batchbild',
  label_image: 'Etikettbild',
  other: 'Övrigt'
};

export default function SupplierDocumentationOverview() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPO, setFilterPO] = useState("all");
  const [selectedDoc, setSelectedDoc] = useState(null);

  const { data: documents = [], isLoading: docsLoading } = useQuery({
    queryKey: ['supplier-documents'],
    queryFn: () => base44.entities.SupplierDocument.list('-upload_date')
  });

  const { data: purchaseOrders = [], isLoading: poLoading } = useQuery({
    queryKey: ['purchaseOrders'],
    queryFn: () => base44.entities.PurchaseOrder.list('-created_date')
  });

  const { data: poItems = [] } = useQuery({
    queryKey: ['purchaseOrderItems'],
    queryFn: () => base44.entities.PurchaseOrderItem.list()
  });

  const isLoading = docsLoading || poLoading;

  // Group documents by PO
  const documentsByPO = purchaseOrders.map(po => {
    const poDocs = documents.filter(doc => doc.purchase_order_id === po.id);
    const items = poItems.filter(item => item.purchase_order_id === po.id);
    
    return {
      po,
      documents: poDocs,
      items,
      documentCount: poDocs.length,
      lastUpload: poDocs.length > 0 ? poDocs[0].upload_date : null,
      hasConfirmation: items.some(item => item.status === 'confirmed'),
      documentationStatus: poDocs.length === 0 ? 'incomplete' : 
                          poDocs.length < 3 ? 'partial' : 'complete'
    };
  }).filter(group => {
    if (filterPO === "all") return group.documentCount > 0;
    if (filterPO === "complete") return group.documentationStatus === 'complete';
    if (filterPO === "partial") return group.documentationStatus === 'partial';
    if (filterPO === "incomplete") return group.documentationStatus === 'incomplete';
    return true;
  }).filter(group => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return group.po.po_number?.toLowerCase().includes(query) ||
           group.po.supplier_name?.toLowerCase().includes(query);
  });

  const stats = {
    totalDocs: documents.length,
    posWithDocs: new Set(documents.map(d => d.purchase_order_id)).size,
    recentUploads: documents.filter(d => {
      const uploadDate = new Date(d.upload_date);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return uploadDate > weekAgo;
    }).length,
    completeStatus: documentsByPO.filter(g => g.documentationStatus === 'complete').length
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 tracking-tight">
            Leverantörsdokumentation
          </h1>
          <p className="text-white/50">
            Översikt av alla dokument som laddats upp av leverantörer
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="p-4 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10">
            <div className="text-2xl font-bold text-white mb-1">{stats.totalDocs}</div>
            <div className="text-xs text-white/50">Totalt dokument</div>
          </div>
          <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
            <div className="text-2xl font-bold text-blue-400 mb-1">{stats.posWithDocs}</div>
            <div className="text-xs text-blue-300">Ordrar med dok.</div>
          </div>
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
            <div className="text-2xl font-bold text-emerald-400 mb-1">{stats.completeStatus}</div>
            <div className="text-xs text-emerald-300">Kompletta</div>
          </div>
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <div className="text-2xl font-bold text-amber-400 mb-1">{stats.recentUploads}</div>
            <div className="text-xs text-amber-300">Senaste veckan</div>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Sök på ordernummer eller leverantör..."
              className="pl-10 bg-white/5 border-white/10 text-white"
            />
          </div>
          
          <Tabs value={filterPO} onValueChange={setFilterPO}>
            <TabsList className="bg-white/5 border border-white/10 w-full md:w-auto">
              <TabsTrigger value="all" className="text-xs">Alla</TabsTrigger>
              <TabsTrigger value="complete" className="text-xs">Kompletta</TabsTrigger>
              <TabsTrigger value="partial" className="text-xs">Ofullständiga</TabsTrigger>
              <TabsTrigger value="incomplete" className="text-xs">Inga dok.</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* PO Groups */}
        {documentsByPO.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-white/30" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Inga dokument ännu</h3>
            <p className="text-white/50">
              Leverantörer kan ladda upp dokument via sina leverantörslänkar
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {documentsByPO.map((group) => (
                <motion.div
                  key={group.po.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 overflow-hidden hover:border-white/20 transition-all"
                >
                  {/* PO Header */}
                  <div className="p-5 border-b border-white/10">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-white">
                            {group.po.po_number || `PO #${group.po.id.slice(0, 8)}`}
                          </h3>
                          <Badge className={cn(
                            "text-xs",
                            group.documentationStatus === 'complete' && "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
                            group.documentationStatus === 'partial' && "bg-amber-500/20 text-amber-400 border-amber-500/30",
                            group.documentationStatus === 'incomplete' && "bg-red-500/20 text-red-400 border-red-500/30"
                          )}>
                            {group.documentationStatus === 'complete' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                            {group.documentationStatus === 'partial' && <AlertCircle className="w-3 h-3 mr-1" />}
                            {group.documentationStatus === 'complete' ? 'Komplett' :
                             group.documentationStatus === 'partial' ? 'Ofullständig' : 'Inga dokument'}
                          </Badge>
                        </div>
                        <div className="text-sm text-white/60">
                          {group.po.supplier_name}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-white">{group.documentCount}</div>
                        <div className="text-xs text-white/50">dokument</div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3 text-sm">
                      {group.lastUpload && (
                        <div className="flex items-center gap-2 text-white/60">
                          <Calendar className="w-4 h-4" />
                          <span>Senast: {format(new Date(group.lastUpload), "d MMM HH:mm", { locale: sv })}</span>
                        </div>
                      )}
                      {group.hasConfirmation && (
                        <div className="flex items-center gap-2 text-emerald-400">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Bekräftad</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-white/60">
                        <Package className="w-4 h-4" />
                        <span>{group.items.length} artiklar</span>
                      </div>
                    </div>
                  </div>

                  {/* Documents */}
                  <div className="p-5">
                    {group.documents.length === 0 ? (
                      <div className="text-center py-8 text-white/40">
                        <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Inga dokument uppladdade ännu</p>
                      </div>
                    ) : (
                      <div className="grid gap-3">
                        {group.documents.map((doc) => (
                          <div
                            key={doc.id}
                            className="p-4 rounded-xl bg-slate-900/50 hover:bg-slate-900/70 border border-slate-700/50 transition-all group/doc"
                          >
                            <div className="flex items-start gap-4">
                              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                                {doc.file_url.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                                  <Image className="w-5 h-5 text-blue-400" />
                                ) : (
                                  <FileText className="w-5 h-5 text-blue-400" />
                                )}
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-3 mb-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-white mb-1">
                                      {documentTypeLabels[doc.document_type] || doc.document_type}
                                    </div>
                                    <div className="text-sm text-white/60 truncate">
                                      {doc.file_name}
                                    </div>
                                  </div>
                                  <Badge variant="outline" className="flex-shrink-0">
                                    {doc.version}
                                  </Badge>
                                </div>

                                <div className="flex flex-wrap gap-3 text-xs text-white/50 mb-2">
                                  <div className="flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    {doc.uploaded_by_name || doc.uploaded_by}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {format(new Date(doc.upload_date), "d MMM yyyy HH:mm", { locale: sv })}
                                  </div>
                                </div>

                                {doc.notes && (
                                  <div className="text-sm text-white/40 italic mb-3">
                                    "{doc.notes}"
                                  </div>
                                )}

                                <div className="flex gap-2">
                                  <a
                                    href={doc.file_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex"
                                  >
                                    <Button size="sm" variant="outline" className="bg-slate-800 border-slate-600 hover:bg-slate-700">
                                      <Download className="w-3 h-3 mr-2" />
                                      Ladda ner
                                    </Button>
                                  </a>
                                  {doc.file_url.match(/\.(jpg|jpeg|png|gif|pdf)$/i) && (
                                    <a
                                      href={doc.file_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex"
                                    >
                                      <Button size="sm" variant="outline" className="bg-slate-800 border-slate-600 hover:bg-slate-700">
                                        <Eye className="w-3 h-3 mr-2" />
                                        Visa
                                      </Button>
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}