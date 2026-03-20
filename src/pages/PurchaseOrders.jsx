import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
Search, Plus, ShoppingCart, Download, Calendar,
Truck, Package, User, Printer, Mail, Eye, X, CheckCircle2, AlertCircle, Link2, Copy, FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import PurchaseOrderForm from "@/components/orders/PurchaseOrderForm";
import SimplifiedReceivingForm from "@/components/receiving/SimplifiedReceivingForm";
import InvoiceScanButton from "@/components/orders/InvoiceScanButton";

export default function PurchaseOrdersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingPO, setEditingPO] = useState(null);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [selectedPOForEmail, setSelectedPOForEmail] = useState(null);
  const [customEmail, setCustomEmail] = useState("");
  const [receivingPO, setReceivingPO] = useState(null);
  const [viewingPO, setViewingPO] = useState(null);
  
  const queryClient = useQueryClient();

  const { data: purchaseOrders = [], isLoading } = useQuery({
    queryKey: ['purchaseOrders'],
    queryFn: () => base44.entities.PurchaseOrder.list('-created_date'),
  });

  const { data: poItems = [] } = useQuery({
    queryKey: ['purchaseOrderItems'],
    queryFn: () => base44.entities.PurchaseOrderItem.list(),
  });

  const { data: receivingRecords = [] } = useQuery({
    queryKey: ['receivingRecords'],
    queryFn: () => base44.entities.ReceivingRecord.list(),
  });

  const deletePOMutation = useMutation({
    mutationFn: async (poId) => {
      const response = await base44.functions.invoke('deletePurchaseOrder', { purchaseOrderId: poId });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      queryClient.invalidateQueries({ queryKey: ['purchaseOrderItems'] });
      toast.success("Inköpsorder borttagen");
    },
    onError: (error) => {
      console.error('Delete PO error:', error);
      toast.error('Kunde inte ta bort inköpsorder: ' + error.message);
    }
  });

  const exportPOMutation = useMutation({
    mutationFn: async (poId) => {
      const response = await base44.functions.invoke('exportPurchaseOrderReceipt', { purchaseOrderId: poId });
      return response.data;
    },
    onSuccess: (data) => {
      const blob = new Blob([data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inkopsorder_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success('PDF nedladdad!');
    }
  });

  const printPOMutation = useMutation({
    mutationFn: async (poId) => {
      const response = await base44.functions.invoke('printPurchaseOrder', { purchaseOrderId: poId });
      return response.data;
    },
    onSuccess: async (htmlContent) => {
      // Create temporary element
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlContent;
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.width = '800px';
      document.body.appendChild(tempDiv);

      try {
        // Import html2canvas dynamically
        const html2canvas = (await import('html2canvas')).default;
        
        // Capture as image
        const canvas = await html2canvas(tempDiv, {
          backgroundColor: '#ffffff',
          scale: 2,
          logging: false
        });

        // Convert to PNG and download
        canvas.toBlob((blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `inkopsorder_${Date.now()}.png`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          a.remove();
          toast.success('Beställning nedladdad som bild!');
        });
      } finally {
        document.body.removeChild(tempDiv);
      }
    }
  });

  const sendEmailMutation = useMutation({
    mutationFn: async ({ poId, emailTo }) => {
      const response = await base44.functions.invoke('sendPurchaseOrderEmail', { 
        purchaseOrderId: poId,
        emailTo 
      });
      return response.data;
    },
    onSuccess: (data) => {
      // Open email client with pre-filled content
      const mailtoLink = `mailto:${data.recipientEmail}?subject=${encodeURIComponent(data.subject)}&body=${encodeURIComponent('Se bifogad inköpsorder i HTML-format. Öppna detta mail i din email-klient för att se hela ordern.')}`;
      
      // Create a downloadable HTML file
      const blob = new Blob([data.emailBody], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inkopsorder_${Date.now()}.html`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      
      // Open email client
      window.location.href = mailtoLink;
      
      toast.success('Email-mall nedladdad! Din email-klient öppnas nu.');
      setEmailModalOpen(false);
      setCustomEmail("");
      setSelectedPOForEmail(null);
    },
    onError: (error) => {
      toast.error('Kunde inte förbereda email: ' + error.message);
    }
  });

  const filteredPOs = purchaseOrders.filter(po => {
    const matchesSearch = !searchQuery || 
      po.po_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      po.supplier_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // On main view (statusFilter "all"), exclude received orders
    const matchesStatus = statusFilter === "all" 
      ? po.status !== "received"
      : po.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getPOItemsCount = (poId) => {
    return poItems.filter(item => item.purchase_order_id === poId).length;
  };

  const statusColors = {
    draft: "bg-slate-500/20 text-slate-400 border-slate-500/30",
    ordered: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    partially_received: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    received: "bg-green-500/20 text-green-400 border-green-500/30",
    cancelled: "bg-red-500/20 text-red-400 border-red-500/30"
  };

  const statusLabels = {
    draft: "Utkast",
    ordered: "Beställd",
    partially_received: "Delvis mottagen",
    received: "Mottagen",
    cancelled: "Avbruten"
  };

  return (
    <div className="min-h-screen bg-black p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4 gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-1 tracking-tight">Inköpsordrar</h1>
              <p className="text-white/50">Hantera och spåra dina inköpsordrar</p>
            </div>
            <div className="flex gap-3">
              <InvoiceScanButton />
              <Button
                onClick={() => {
                  setEditingPO(null);
                  setShowForm(true);
                }}
                className="bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/50 hover:shadow-blue-500/70 transition-all duration-300"
                >
                <Plus className="w-4 h-4 mr-2" />
                Ny order
                </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 transition-all duration-300">
              <div className="text-2xl font-bold text-white mb-1 tracking-tight">{filteredPOs.length}</div>
              <div className="text-xs text-white/50">Totalt ordrar</div>
            </div>
            <div className="p-4 rounded-xl bg-blue-500/10 backdrop-blur-xl border border-blue-500/30 hover:bg-blue-500/20 transition-all duration-300">
              <div className="text-2xl font-bold text-blue-400 mb-1 tracking-tight">
                {purchaseOrders.filter(po => po.status === 'ordered').length}
              </div>
              <div className="text-xs text-blue-300">Beställda</div>
            </div>
            <div className="p-4 rounded-xl bg-amber-500/10 backdrop-blur-xl border border-amber-500/30 hover:bg-amber-500/20 transition-all duration-300">
              <div className="text-2xl font-bold text-amber-400 mb-1 tracking-tight">
                {purchaseOrders.filter(po => po.status === 'partially_received').length}
              </div>
              <div className="text-xs text-amber-300">Delvis mottagna</div>
            </div>
            <div className="p-4 rounded-xl bg-emerald-500/10 backdrop-blur-xl border border-emerald-500/30 hover:bg-emerald-500/20 transition-all duration-300">
              <div className="text-2xl font-bold text-emerald-400 mb-1 tracking-tight">
                {purchaseOrders.filter(po => po.status === 'received').length}
              </div>
              <div className="text-xs text-emerald-300">Mottagna</div>
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Sök ordernummer eller leverantör..."
              className="pl-10 bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-white placeholder:text-white/40 backdrop-blur-xl transition-all duration-300"
            />
          </div>
          
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList className="bg-white/5 border border-white/10 backdrop-blur-xl w-full md:w-auto">
              <TabsTrigger value="all" className="text-xs flex-1 md:flex-none text-white/70 data-[state=active]:text-white data-[state=active]:bg-white/10">Alla</TabsTrigger>
              <TabsTrigger value="ordered" className="text-xs flex-1 md:flex-none text-white/70 data-[state=active]:text-white data-[state=active]:bg-white/10">Beställd</TabsTrigger>
              <TabsTrigger value="partially_received" className="text-xs flex-1 md:flex-none text-white/70 data-[state=active]:text-white data-[state=active]:bg-white/10">Delvis</TabsTrigger>
              <TabsTrigger value="received" className="text-xs flex-1 md:flex-none text-white/70 data-[state=active]:text-white data-[state=active]:bg-white/10">Mottagen</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Purchase Orders List */}
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 rounded-2xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : filteredPOs.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
              <ShoppingCart className="w-8 h-8 text-white/30" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2 tracking-tight">
              Inga inköpsordrar ännu
            </h3>
            <p className="text-white/50 mb-6">
              Skapa din första inköpsorder för att komma igång
            </p>
            <Button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/50 hover:shadow-blue-500/70 transition-all duration-300"
            >
              <Plus className="w-4 h-4 mr-2" />
              Skapa inköpsorder
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {filteredPOs.map((po) => {
                const itemsCount = getPOItemsCount(po.id);
                
                return (
                  <motion.div
                    key={po.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="group rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 hover:border-white/20 hover:bg-white/10 hover:shadow-2xl hover:shadow-white/5 transition-all duration-300 overflow-hidden"
                    >
                    {/* Header */}
                    <div className="p-5 border-b border-slate-700/50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-bold text-white">
                              {po.po_number || `PO #${po.id.slice(0, 8)}`}
                            </h3>
                            <Badge className={cn("text-xs border", statusColors[po.status])}>
                              {statusLabels[po.status]}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-2 text-slate-400">
                            <Truck className="w-4 h-4" />
                            <span className="font-medium">{po.supplier_name}</span>
                          </div>
                        </div>

                        {po.total_cost && (
                          <div className="text-right">
                            <div className="text-sm text-slate-400 mb-1">Totalt belopp</div>
                            <div className="text-2xl font-bold text-white">
                              {po.total_cost.toLocaleString('sv-SE')} kr
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Details */}
                    <div className="p-5">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        {po.expected_delivery_date && (
                          <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/50">
                            <Calendar className="w-5 h-5 text-blue-400 flex-shrink-0" />
                            <div>
                              <div className="text-xs text-slate-500 mb-0.5">Förväntad leverans</div>
                              <div className="text-sm font-medium text-white">
                                {format(new Date(po.expected_delivery_date), "d MMM yyyy", { locale: sv })}
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {itemsCount > 0 && (
                          <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/50">
                            <Package className="w-5 h-5 text-purple-400 flex-shrink-0" />
                            <div>
                              <div className="text-xs text-slate-500 mb-0.5">Artiklar</div>
                              <div className="text-sm font-medium text-white">
                                {itemsCount} st
                              </div>
                            </div>
                          </div>
                        )}

                        {po.order_date && (
                          <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/50">
                            <Calendar className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                            <div>
                              <div className="text-xs text-slate-500 mb-0.5">Orderdatum</div>
                              <div className="text-sm font-medium text-white">
                                {format(new Date(po.order_date), "d MMM yyyy", { locale: sv })}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {po.notes && (
                        <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-700/30 mb-4">
                          <div className="text-xs text-slate-500 mb-1">Anteckningar</div>
                          <p className="text-sm text-slate-300">{po.notes}</p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2">
                        {(po.status === 'ordered' || po.status === 'partially_received') && (
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-500"
                            onClick={() => setReceivingPO(po)}
                          >
                            <Package className="w-4 h-4 mr-2" />
                            Ta emot
                          </Button>
                        )}

                        {(po.status === 'received' || po.status === 'partially_received') && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-blue-600/20 border-blue-500/30 text-blue-400 hover:bg-blue-600/30"
                            onClick={() => setViewingPO(po)}
                          >
                            <Eye className="w-4 h-4 md:mr-2" />
                            <span className="hidden md:inline">Följesedel</span>
                          </Button>
                        )}
                        
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-purple-600/20 border-purple-500/30 text-purple-400 hover:bg-purple-600/30"
                          onClick={() => {
                            const portalUrl = `${window.location.origin}${createPageUrl('SupplierPOView')}?po=${po.id}&token=${po.supplier_portal_token || 'MISSING_TOKEN'}`;
                            navigator.clipboard.writeText(portalUrl);
                            toast.success('Leverantörslänk kopierad! Dela denna med leverantören.');
                          }}
                        >
                          <Link2 className="w-4 h-4 md:mr-2" />
                          <span className="hidden md:inline">Leverantörslänk</span>
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-emerald-600/20 border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/30"
                          onClick={() => {
                            setSelectedPOForEmail(po);
                            setEmailModalOpen(true);
                          }}
                        >
                          <Mail className="w-4 h-4 md:mr-2" />
                          <span className="hidden md:inline">Skicka email</span>
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-slate-700 border-slate-600 hover:bg-slate-600"
                          onClick={() => printPOMutation.mutate(po.id)}
                          disabled={printPOMutation.isPending}
                        >
                          <Printer className="w-4 h-4 md:mr-2" />
                          <span className="hidden md:inline">Skriv ut</span>
                        </Button>

                        {po.status === 'received' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-slate-700 border-slate-600 hover:bg-slate-600"
                            onClick={() => exportPOMutation.mutate(po.id)}
                            disabled={exportPOMutation.isPending}
                          >
                            <Download className="w-4 h-4 md:mr-2" />
                            <span className="hidden md:inline">Kvitto</span>
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-slate-700 border-slate-600 hover:bg-slate-600"
                          onClick={() => {
                            setEditingPO(po);
                            setShowForm(true);
                          }}
                        >
                          Redigera
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
                          onClick={() => {
                            if (confirm('Är du säker på att du vill ta bort denna inköpsorder?')) {
                              deletePOMutation.mutate(po.id);
                            }
                          }}
                        >
                          Ta bort
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Purchase Order Form Modal */}
        {showForm && (
          <PurchaseOrderForm
            purchaseOrder={editingPO}
            onClose={() => {
              setShowForm(false);
              setEditingPO(null);
            }}
          />
        )}

        {/* Receiving Form */}
        {receivingPO && (
          <SimplifiedReceivingForm
            purchaseOrder={receivingPO}
            onClose={() => setReceivingPO(null)}
            onComplete={() => setReceivingPO(null)}
          />
        )}

        {/* Email Modal */}
        {emailModalOpen && selectedPOForEmail && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => {
              setEmailModalOpen(false);
              setCustomEmail("");
              setSelectedPOForEmail(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6"
            >
              <h3 className="text-xl font-bold text-white mb-4">Skicka inköpsorder via email</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-300 mb-2 block">
                    Email-adress
                  </label>
                  <Input
                    type="email"
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                    placeholder="Ange email eller lämna tomt för leverantörens email"
                    className="bg-slate-800 border-slate-700 text-white"
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    Lämna tomt för att skicka till leverantörens registrerade email
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEmailModalOpen(false);
                      setCustomEmail("");
                      setSelectedPOForEmail(null);
                    }}
                    className="flex-1 bg-slate-800 border-slate-700 hover:bg-slate-700 text-white"
                  >
                    Avbryt
                  </Button>
                  <Button
                    onClick={() => {
                      sendEmailMutation.mutate({
                        poId: selectedPOForEmail.id,
                        emailTo: customEmail || undefined
                      });
                    }}
                    disabled={sendEmailMutation.isPending}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500"
                  >
                    {sendEmailMutation.isPending ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                        Skickar...
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4 mr-2" />
                        Skicka
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Receiving Records Detail Modal */}
        {viewingPO && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setViewingPO(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-700">
                <div>
                  <h2 className="text-xl font-bold text-white">Följesedel & Mottagningsdetaljer</h2>
                  <p className="text-sm text-slate-400 mt-1">
                    {viewingPO.po_number || `PO #${viewingPO.id.slice(0, 8)}`} · {viewingPO.supplier_name}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setViewingPO(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {(() => {
                  const records = receivingRecords.filter(r => r.purchase_order_id === viewingPO.id);
                  
                  if (records.length === 0) {
                    return (
                      <div className="text-center py-16">
                        <Package className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                        <p className="text-slate-400">Inga mottagningar registrerade ännu</p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      {records.map((record) => (
                        <div key={record.id} className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h3 className="font-semibold text-white mb-1">{record.article_name}</h3>
                              <div className="flex items-center gap-4 text-sm text-slate-400">
                                <span>Kvantitet: <span className="text-white font-medium">{record.quantity_received} st</span></span>
                                {record.shelf_address && (
                                  <span>Hyllplats: <span className="text-white font-medium">{record.shelf_address}</span></span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {record.quality_check_passed ? (
                                <CheckCircle2 className="w-5 h-5 text-green-400" />
                              ) : (
                                <AlertCircle className="w-5 h-5 text-red-400" />
                              )}
                            </div>
                          </div>

                          {record.has_discrepancy && (
                            <div className="mb-3 p-2 rounded bg-red-500/10 border border-red-500/30">
                              <p className="text-sm text-red-400">
                                <AlertCircle className="w-4 h-4 inline mr-1" />
                                Avvikelse: {record.discrepancy_reason || 'Ingen anledning angiven'}
                              </p>
                            </div>
                          )}

                          {record.notes && (
                            <div className="mb-3">
                              <p className="text-sm text-slate-400 mb-1">Anteckningar:</p>
                              <p className="text-sm text-slate-300">{record.notes}</p>
                            </div>
                          )}

                          {record.image_urls && record.image_urls.length > 0 && (
                            <div>
                              <p className="text-sm text-slate-400 mb-2">Bilder från mottagning:</p>
                              <div className="grid grid-cols-3 gap-2">
                                {record.image_urls.map((url, imgIndex) => (
                                  <img 
                                    key={imgIndex} 
                                    src={url} 
                                    alt={`Bild ${imgIndex + 1}`}
                                    className="w-full h-24 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={() => window.open(url, '_blank')}
                                  />
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="mt-3 pt-3 border-t border-slate-700/50 text-xs text-slate-500">
                            Mottagen av {record.received_by} · {format(new Date(record.created_date), "d MMM yyyy HH:mm", { locale: sv })}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              <div className="flex justify-end p-6 border-t border-slate-700 bg-slate-900/50">
                <Button
                  onClick={() => setViewingPO(null)}
                  variant="outline"
                  className="bg-slate-800 border-slate-600 hover:bg-slate-700"
                >
                  Stäng
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
}