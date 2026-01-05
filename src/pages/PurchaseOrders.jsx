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
  Truck, Package, User, Printer, Mail
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import PurchaseOrderForm from "@/components/orders/PurchaseOrderForm";

export default function PurchaseOrdersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingPO, setEditingPO] = useState(null);
  
  const queryClient = useQueryClient();

  const { data: purchaseOrders = [], isLoading } = useQuery({
    queryKey: ['purchaseOrders'],
    queryFn: () => base44.entities.PurchaseOrder.list('-created_date'),
  });

  const { data: poItems = [] } = useQuery({
    queryKey: ['purchaseOrderItems'],
    queryFn: () => base44.entities.PurchaseOrderItem.list(),
  });

  const deletePOMutation = useMutation({
    mutationFn: async (poId) => {
      const items = poItems.filter(item => item.purchase_order_id === poId);
      await Promise.all(items.map(item => base44.entities.PurchaseOrderItem.delete(item.id)));
      await base44.entities.PurchaseOrder.delete(poId);
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
    mutationFn: async (poId) => {
      const response = await base44.functions.invoke('sendPurchaseOrderEmail', { purchaseOrderId: poId });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Email skickat till leverantör!');
    },
    onError: (error) => {
      toast.error('Kunde inte skicka email: ' + error.message);
    }
  });

  const filteredPOs = purchaseOrders.filter(po => {
    const matchesSearch = !searchQuery || 
      po.po_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      po.supplier_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || po.status === statusFilter;
    
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
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-1 tracking-tight">Inköpsordrar</h1>
              <p className="text-white/50">Hantera och spåra dina inköpsordrar</p>
            </div>
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
                          <Link to={`${createPageUrl("ReceivePurchaseOrder")}?poId=${po.id}`} className="flex-1 md:flex-none">
                            <Button
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-500 w-full"
                            >
                              <Package className="w-4 h-4 mr-2" />
                              Ta emot
                            </Button>
                          </Link>
                        )}
                        
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-emerald-600/20 border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/30"
                          onClick={() => sendEmailMutation.mutate(po.id)}
                          disabled={sendEmailMutation.isPending}
                        >
                          {sendEmailMutation.isPending ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin md:mr-2" />
                          ) : (
                            <Mail className="w-4 h-4 md:mr-2" />
                          )}
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
      </div>
    </div>
  );
}