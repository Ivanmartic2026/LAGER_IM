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
  Truck, Package, User, Printer
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
      a.download = `inköpsorder_${Date.now()}.pdf`;
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
    onSuccess: (data) => {
      const blob = new Blob([data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bestallning_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success('Beställning nedladdad!');
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-white">Inköpsordrar</h1>
            <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
              {filteredPOs.length} ordrar
            </Badge>
          </div>

          <Button
            onClick={() => {
              setEditingPO(null);
              setShowForm(true);
            }}
            className="bg-blue-600 hover:bg-blue-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            Ny inköpsorder
          </Button>
        </div>

        {/* Search & Filters */}
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Sök ordernummer eller leverantör..."
              className="pl-10 h-9 bg-slate-800/50 border-slate-700 text-white"
            />
          </div>
          
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList className="h-9 bg-slate-800/50 border border-slate-700">
              <TabsTrigger value="all" className="text-xs h-7">Alla</TabsTrigger>
              <TabsTrigger value="ordered" className="text-xs h-7">Beställd</TabsTrigger>
              <TabsTrigger value="partially_received" className="text-xs h-7">Delvis</TabsTrigger>
              <TabsTrigger value="received" className="text-xs h-7">Mottagen</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Purchase Orders List */}
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 rounded-xl bg-slate-800/50 animate-pulse" />
            ))}
          </div>
        ) : filteredPOs.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
              <ShoppingCart className="w-8 h-8 text-slate-600" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Inga inköpsordrar ännu
            </h3>
            <p className="text-slate-400 mb-6">
              Skapa din första inköpsorder för att komma igång
            </p>
            <Button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-500"
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
                    className="group p-5 rounded-xl bg-slate-800/30 border border-slate-700/50 hover:border-slate-600 hover:bg-slate-800/50 transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-white">
                            {po.po_number || `PO #${po.id.slice(0, 8)}`}
                          </h3>
                          <Badge className={cn("text-xs", statusColors[po.status])}>
                            {statusLabels[po.status]}
                          </Badge>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-400">
                          <div className="flex items-center gap-1.5">
                            <Truck className="w-4 h-4" />
                            <span>{po.supplier_name}</span>
                          </div>
                          {po.expected_delivery_date && (
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-4 h-4" />
                              <span>{format(new Date(po.expected_delivery_date), "d MMM yyyy", { locale: sv })}</span>
                            </div>
                          )}
                          {itemsCount > 0 && (
                            <div className="flex items-center gap-1.5">
                              <Package className="w-4 h-4" />
                              <span>{itemsCount} artiklar</span>
                            </div>
                          )}
                          {po.total_cost && (
                            <span className="font-semibold text-white">
                              {po.total_cost.toLocaleString('sv-SE')} kr
                            </span>
                          )}
                        </div>

                        {po.notes && (
                          <p className="text-sm text-slate-500 mt-2 line-clamp-1">
                            {po.notes}
                          </p>
                        )}
                      </div>

                      <div className="flex gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-slate-700 border-slate-600 hover:bg-slate-600"
                          onClick={() => printPOMutation.mutate(po.id)}
                          disabled={printPOMutation.isPending}
                        >
                          <Printer className="w-4 h-4 mr-2" />
                          Skriv ut
                        </Button>

                        {(po.status === 'ordered' || po.status === 'partially_received') && (
                          <Link to={`${createPageUrl("ReceivePurchaseOrder")}?poId=${po.id}`}>
                            <Button
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-500"
                            >
                              <Package className="w-4 h-4 mr-2" />
                              Ta emot
                            </Button>
                          </Link>
                        )}
                        
                        {po.status === 'received' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-slate-700 border-slate-600 hover:bg-slate-600"
                            onClick={() => exportPOMutation.mutate(po.id)}
                            disabled={exportPOMutation.isPending}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Kvitto
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