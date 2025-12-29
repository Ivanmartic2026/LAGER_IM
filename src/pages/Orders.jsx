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
  Search, Plus, Package, ClipboardList, Download,
  Calendar, User, MapPin, FileText, Truck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import OrderForm from "@/components/orders/OrderForm";

export default function OrdersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  
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
      // Delete order items first
      const items = orderItems.filter(item => item.order_id === orderId);
      await Promise.all(items.map(item => base44.entities.OrderItem.delete(item.id)));
      // Then delete order
      await base44.entities.Order.delete(orderId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orderItems'] });
      toast.success("Order borttagen");
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

  const filteredOrders = orders.filter(order => {
    const matchesSearch = !searchQuery || 
      order.order_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-white">Ordrar</h1>
            <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
              {filteredOrders.length} ordrar
            </Badge>
          </div>

          <Button
            onClick={() => {
              setEditingOrder(null);
              setShowForm(true);
            }}
            className="bg-blue-600 hover:bg-blue-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            Ny order
          </Button>
        </div>

        {/* Search & Filters */}
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Sök ordernummer eller kund..."
              className="pl-10 h-9 bg-slate-800/50 border-slate-700 text-white"
            />
          </div>
          
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList className="h-9 bg-slate-800/50 border border-slate-700">
              <TabsTrigger value="all" className="text-xs h-7">Alla</TabsTrigger>
              <TabsTrigger value="ready_to_pick" className="text-xs h-7">Redo</TabsTrigger>
              <TabsTrigger value="picking" className="text-xs h-7">Plockar</TabsTrigger>
              <TabsTrigger value="picked" className="text-xs h-7">Plockad</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Orders List */}
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 rounded-xl bg-slate-800/50 animate-pulse" />
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
              <ClipboardList className="w-8 h-8 text-slate-600" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              Inga ordrar ännu
            </h3>
            <p className="text-slate-400 mb-6">
              Skapa din första order för att komma igång
            </p>
            <Button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-500"
            >
              <Plus className="w-4 h-4 mr-2" />
              Skapa order
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {filteredOrders.map((order) => {
                const itemsCount = getOrderItemsCount(order.id);
                
                return (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="group p-5 rounded-xl bg-slate-800/30 border border-slate-700/50 hover:border-slate-600 hover:bg-slate-800/50 transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
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

                      <div className="flex gap-2 ml-4">
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
                        
                        {order.status === 'picked' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-slate-700 border-slate-600 hover:bg-slate-600"
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
                          onClick={() => {
                            if (confirm('Är du säker på att du vill ta bort denna order?')) {
                              deleteOrderMutation.mutate(order.id);
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

        {/* Order Form Modal */}
        {showForm && (
          <OrderForm
            order={editingOrder}
            onClose={() => {
              setShowForm(false);
              setEditingOrder(null);
            }}
          />
        )}
      </div>
    </div>
  );
}