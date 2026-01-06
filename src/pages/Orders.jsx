import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { 
  Search, Plus, Package, ClipboardList, Download,
  Calendar, User, MapPin, FileText, Truck, Eye, ArrowUpDown, Printer,
  CheckSquare, X, CheckCircle2, AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import OrderForm from "@/components/orders/OrderForm";
import OrderDetailModal from "@/components/orders/OrderDetailModal";
import InvoiceModal from "@/components/orders/InvoiceModal";

export default function OrdersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [invoiceFilter, setInvoiceFilter] = useState("all"); // all, invoiced, not_invoiced
  const [sortBy, setSortBy] = useState("date_desc"); // date_desc, date_asc, customer_asc
  const [showForm, setShowForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [invoiceModalOrder, setInvoiceModalOrder] = useState(null);
  
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: () => base44.entities.Order.list('-created_date'),
  });

  const { data: orderItems = [] } = useQuery({
    queryKey: ['orderItems'],
    queryFn: () => base44.entities.OrderItem.list(),
  });

  const deleteOrderMutation = useMutation({
    mutationFn: async (orderId) => {
      console.log('Deleting order:', orderId);
      // Delete order items first
      const items = orderItems.filter(item => item.order_id === orderId);
      console.log('Found items to delete:', items.length);
      await Promise.all(items.map(item => base44.entities.OrderItem.delete(item.id)));
      // Then delete order
      await base44.entities.Order.delete(orderId);
      console.log('Order deleted successfully');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orderItems'] });
      toast.success("Order borttagen");
    },
    onError: (error) => {
      console.error('Delete order error:', error);
      toast.error('Kunde inte ta bort order: ' + error.message);
    }
  });

  const exportOrderMutation = useMutation({
    mutationFn: async (orderId) => {
      const response = await base44.functions.invoke('exportOrder', { orderId });
      return response.data;
    },
    onSuccess: (data) => {
      const blob = new Blob([data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `order_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success('PDF nedladdad!');
    }
  });

  const printOrderMutation = useMutation({
    mutationFn: async (orderId) => {
      const response = await base44.functions.invoke('printOrder', { orderId });
      return response.data;
    },
    onSuccess: async (htmlContent) => {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlContent;
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.width = '800px';
      document.body.appendChild(tempDiv);

      try {
        const html2canvas = (await import('html2canvas')).default;
        
        const canvas = await html2canvas(tempDiv, {
          backgroundColor: '#ffffff',
          scale: 2,
          logging: false
        });

        canvas.toBlob((blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `order_${Date.now()}.png`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          a.remove();
          toast.success('Order nedladdad som bild!');
        });
      } finally {
        document.body.removeChild(tempDiv);
      }
    }
  });

  const exportMultipleOrdersMutation = useMutation({
    mutationFn: async (orderIds) => {
      const response = await base44.functions.invoke('exportMultipleOrders', { orderIds });
      return response.data;
    },
    onSuccess: (data) => {
      const blob = new Blob([data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orders_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success('PDF nedladdad!');
      setSelectedOrderIds([]);
    }
  });

  const markAsInvoicedMutation = useMutation({
    mutationFn: async ({ orderId, invoiceNumber }) => {
      const user = await base44.auth.me();
      await base44.entities.Order.update(orderId, {
        fortnox_invoiced: true,
        fortnox_invoice_number: invoiceNumber,
        invoiced_date: new Date().toISOString(),
        invoiced_by: user.email
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setInvoiceModalOrder(null);
      toast.success('Order markerad som fakturerad!');
    }
  });

  const filteredAndSortedOrders = orders
    .filter(order => {
      const matchesSearch = !searchQuery || 
        order.order_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customer_name?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || order.status === statusFilter;
      
      const matchesInvoice = 
        invoiceFilter === "all" ? true :
        invoiceFilter === "invoiced" ? order.fortnox_invoiced === true :
        invoiceFilter === "not_invoiced" ? (order.status === "picked" && !order.fortnox_invoiced) :
        true;
      
      return matchesSearch && matchesStatus && matchesInvoice;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'date_desc':
          return new Date(b.created_date) - new Date(a.created_date);
        case 'date_asc':
          return new Date(a.created_date) - new Date(b.created_date);
        case 'customer_asc':
          return (a.customer_name || '').localeCompare(b.customer_name || '');
        case 'delivery_date':
          if (!a.delivery_date) return 1;
          if (!b.delivery_date) return -1;
          return new Date(a.delivery_date) - new Date(b.delivery_date);
        default:
          return 0;
      }
    });

  const getOrderItemsCount = (orderId) => {
    return orderItems.filter(item => item.order_id === orderId).length;
  };

  const statusColors = {
    draft: "bg-slate-500/20 text-slate-400 border-slate-500/30",
    ready_to_pick: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    picking: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    picked: "bg-green-500/20 text-green-400 border-green-500/30",
    delivered: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    cancelled: "bg-red-500/20 text-red-400 border-red-500/30"
  };

  const statusLabels = {
    draft: "Utkast",
    ready_to_pick: "Redo att plocka",
    picking: "Plockar",
    picked: "Plockad",
    delivered: "Levererad",
    cancelled: "Avbruten"
  };

  return (
    <div className="min-h-screen bg-black p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6 relative z-[60]">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-white tracking-tight">Ordrar</h1>
            <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
              {filteredAndSortedOrders.length} ordrar
            </Badge>
          </div>

          <div className="flex gap-2">
            {selectedOrderIds.length > 0 && (
              <Button
                onClick={() => exportMultipleOrdersMutation.mutate(selectedOrderIds)}
                disabled={exportMultipleOrdersMutation.isPending}
                variant="outline"
                className="bg-green-600/20 border-green-500/30 text-green-400 hover:bg-green-600/30"
              >
                <Download className="w-4 h-4 mr-2" />
                Ladda ner {selectedOrderIds.length} ordrar
              </Button>
            )}
            <Button
              onClick={() => {
                console.log('Ny order clicked');
                setEditingOrder(null);
                setShowForm(true);
              }}
              className="bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/50 hover:shadow-blue-500/70 transition-all duration-300"
            >
              <Plus className="w-4 h-4 mr-2" />
              Ny order
            </Button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="space-y-3 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Sök ordernummer eller kund..."
              className="pl-11 h-11 bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-white placeholder:text-white/40 backdrop-blur-xl transition-all duration-300 text-base"
            />
          </div>

          <div className="flex gap-3 flex-wrap">

            <Tabs value={statusFilter} onValueChange={setStatusFilter}>
              <TabsList className="h-10 bg-white/5 border border-white/10 backdrop-blur-xl">
                <TabsTrigger value="all" className="text-sm h-8 px-4 text-white/70 data-[state=active]:text-white data-[state=active]:bg-white/10">Alla</TabsTrigger>
                <TabsTrigger value="ready_to_pick" className="text-sm h-8 px-4 text-white/70 data-[state=active]:text-white data-[state=active]:bg-white/10">Redo</TabsTrigger>
                <TabsTrigger value="picking" className="text-sm h-8 px-4 text-white/70 data-[state=active]:text-white data-[state=active]:bg-white/10">Plockar</TabsTrigger>
                <TabsTrigger value="picked" className="text-sm h-8 px-4 text-white/70 data-[state=active]:text-white data-[state=active]:bg-white/10">Plockad</TabsTrigger>
              </TabsList>
            </Tabs>

            <Tabs value={invoiceFilter} onValueChange={setInvoiceFilter}>
              <TabsList className="h-10 bg-white/5 border border-white/10 backdrop-blur-xl">
                <TabsTrigger value="all" className="text-sm h-8 px-4 text-white/70 data-[state=active]:text-white data-[state=active]:bg-white/10">Alla</TabsTrigger>
                <TabsTrigger value="not_invoiced" className="text-sm h-8 px-4 text-white/70 data-[state=active]:text-white data-[state=active]:bg-white/10">Ej fakturerad</TabsTrigger>
                <TabsTrigger value="invoiced" className="text-sm h-8 px-4 text-white/70 data-[state=active]:text-white data-[state=active]:bg-white/10">Fakturerad</TabsTrigger>
              </TabsList>
            </Tabs>

            <Tabs value={sortBy} onValueChange={setSortBy}>
              <TabsList className="h-10 bg-white/5 border border-white/10 backdrop-blur-xl">
                <TabsTrigger value="date_desc" className="text-sm h-8 px-4 text-white/70 data-[state=active]:text-white data-[state=active]:bg-white/10">
                  <ArrowUpDown className="w-4 h-4 mr-2" />
                  Senaste
                </TabsTrigger>
                <TabsTrigger value="date_asc" className="text-sm h-8 px-4 text-white/70 data-[state=active]:text-white data-[state=active]:bg-white/10">Äldsta</TabsTrigger>
                <TabsTrigger value="customer_asc" className="text-sm h-8 px-4 text-white/70 data-[state=active]:text-white data-[state=active]:bg-white/10">Kund A-Ö</TabsTrigger>
                <TabsTrigger value="delivery_date" className="text-sm h-8 px-4 text-white/70 data-[state=active]:text-white data-[state=active]:bg-white/10">Leveransdatum</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex items-center justify-end">

            {selectedOrderIds.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedOrderIds([])}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4 mr-2" />
                Avmarkera alla
              </Button>
            )}
          </div>
        </div>

        {/* Orders List */}
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 rounded-2xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : filteredAndSortedOrders.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
              <ClipboardList className="w-8 h-8 text-white/30" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2 tracking-tight">
              Inga ordrar ännu
            </h3>
            <p className="text-white/50 mb-6">
              Skapa din första order för att komma igång
            </p>
            <Button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/50 hover:shadow-blue-500/70 transition-all duration-300"
            >
              <Plus className="w-4 h-4 mr-2" />
              Skapa order
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {filteredAndSortedOrders.map((order) => {
                const itemsCount = getOrderItemsCount(order.id);
                
                return (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={cn(
                      "group p-5 rounded-2xl backdrop-blur-xl transition-all duration-300",
                      order.fortnox_invoiced 
                        ? "bg-purple-500/10 border-2 border-purple-500/40 hover:border-purple-500/60 hover:bg-purple-500/15 hover:shadow-2xl hover:shadow-purple-500/20"
                        : "bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 hover:shadow-2xl hover:shadow-white/5"
                    )}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3 flex-1">
                        <Checkbox
                          checked={selectedOrderIds.includes(order.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedOrderIds(prev => [...prev, order.id]);
                            } else {
                              setSelectedOrderIds(prev => prev.filter(id => id !== order.id));
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1"
                        />
                        <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-white">
                            {order.order_number || `Order #${order.id.slice(0, 8)}`}
                          </h3>
                          <Badge className={cn("text-xs", statusColors[order.status])}>
                            {statusLabels[order.status]}
                          </Badge>
                          {order.priority === 'urgent' && (
                            <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
                              Brådskande
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-400">
                          <div className="flex items-center gap-1.5">
                            <User className="w-4 h-4" />
                            <span>{order.customer_name}</span>
                          </div>
                          {order.delivery_date && (
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-4 h-4" />
                              <span>{format(new Date(order.delivery_date), "d MMM yyyy", { locale: sv })}</span>
                            </div>
                          )}
                          {itemsCount > 0 && (
                            <div className="flex items-center gap-1.5">
                              <Package className="w-4 h-4" />
                              <span>{itemsCount} artiklar</span>
                            </div>
                          )}
                        </div>

                        {order.notes && (
                          <p className="text-sm text-slate-500 mt-2 line-clamp-1">
                            {order.notes}
                          </p>
                        )}
                        </div>
                      </div>

                      <div className="flex gap-2 ml-4 flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-slate-700 border-slate-600 hover:bg-slate-600"
                          onClick={() => setSelectedOrder(order)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Detaljer
                        </Button>

                        {(order.status === 'ready_to_pick' || order.status === 'picking') && (
                          <Link to={`${createPageUrl("PickOrder")}?orderId=${order.id}`}>
                            <Button
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-500"
                            >
                              <ClipboardList className="w-4 h-4 mr-2" />
                              Plocka
                            </Button>
                          </Link>
                        )}

                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-slate-700 border-slate-600 hover:bg-slate-600"
                          onClick={() => printOrderMutation.mutate(order.id)}
                          disabled={printOrderMutation.isPending}
                        >
                          <Printer className="w-4 h-4 md:mr-2" />
                          <span className="hidden md:inline">Skriv ut</span>
                        </Button>

                        {order.status === 'picked' && !order.fortnox_invoiced && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-green-600/20 border-green-500/30 text-green-400 hover:bg-green-600/30"
                            onClick={() => setInvoiceModalOrder(order)}
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            Fakturera
                          </Button>
                        )}

                        {order.status === 'picked' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-green-600/20 border-green-500/30 text-green-400 hover:bg-green-600/30"
                            onClick={() => exportOrderMutation.mutate(order.id)}
                            disabled={exportOrderMutation.isPending}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            PDF
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-slate-700 border-slate-600 hover:bg-slate-600"
                          onClick={() => {
                            setEditingOrder(order);
                            setShowForm(true);
                          }}
                        >
                          Redigera
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log('Ta bort clicked for order:', order.id);
                            if (window.confirm('Är du säker på att du vill ta bort denna order?')) {
                              console.log('User confirmed deletion');
                              deleteOrderMutation.mutate(order.id);
                            } else {
                              console.log('User cancelled deletion');
                            }
                          }}
                          disabled={deleteOrderMutation.isPending}
                        >
                          {deleteOrderMutation.isPending ? 'Tar bort...' : 'Ta bort'}
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Order Form Modal */}
        <AnimatePresence>
          {showForm && (
            <OrderForm
              order={editingOrder}
              onClose={() => {
                setShowForm(false);
                setEditingOrder(null);
              }}
            />
          )}
        </AnimatePresence>

        {/* Order Detail Modal */}
        {selectedOrder && (
          <OrderDetailModal
            order={selectedOrder}
            onClose={() => setSelectedOrder(null)}
          />
        )}

        {/* Invoice Modal */}
        <AnimatePresence>
          {invoiceModalOrder && (
            <InvoiceModal
              order={invoiceModalOrder}
              onConfirm={(invoiceNumber) => {
                markAsInvoicedMutation.mutate({
                  orderId: invoiceModalOrder.id,
                  invoiceNumber
                });
              }}
              onCancel={() => setInvoiceModalOrder(null)}
              isSubmitting={markAsInvoicedMutation.isPending}
            />
          )}
        </AnimatePresence>
        </div>
        </div>
        );
        }