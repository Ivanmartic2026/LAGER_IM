import React, { useState, useEffect, useRef } from 'react';
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
  Search, Plus, Package, ClipboardList, Download, Upload,
  Calendar, User, MapPin, FileText, Truck, Eye, ArrowUpDown, Printer,
  CheckSquare, X, CheckCircle2, AlertCircle, Mail, ChevronDown,
  TrendingUp, Clock, AlertTriangle, Factory
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import OrderForm from "@/components/orders/OrderForm";
import OrderDetailModal from "@/components/orders/OrderDetailModal";
import InvoiceModal from "@/components/orders/InvoiceModal";
import FortnoxCustomerSelect from "@/components/orders/FortnoxCustomerSelect";
import FortnoxSyncButton from "@/components/orders/FortnoxSyncButton";
import PullToRefresh from "@/components/utils/PullToRefresh";

export default function OrdersPage() {
  const navigate = useNavigate();
  // Restore state from localStorage
  const getStoredState = () => {
    try {
      const stored = localStorage.getItem('orders_state');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  };

  const storedState = getStoredState();

  const [viewMode, setViewMode] = useState(storedState.viewMode || "orders");
  const [searchQuery, setSearchQuery] = useState(storedState.searchQuery || "");
  const [statusFilter, setStatusFilter] = useState(storedState.statusFilter || "ready_to_pick");
  const [invoiceFilter, setInvoiceFilter] = useState(storedState.invoiceFilter || "all");
  const [sortBy, setSortBy] = useState(storedState.sortBy || "date_desc");
  const [showForm, setShowForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [invoiceModalOrder, setInvoiceModalOrder] = useState(null);
  const [warehouseFilter, setWarehouseFilter] = useState("all");
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const fileInputRef = React.useRef(null);
  
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ['orders'],
    queryFn: () => base44.entities.Order.list('-created_date'),
  });

  const { data: orderItems = [] } = useQuery({
    queryKey: ['orderItems'],
    queryFn: () => base44.entities.OrderItem.list(),
  });

  const { data: articles = [] } = useQuery({
    queryKey: ['articles'],
    queryFn: () => base44.entities.Article.list(),
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => base44.entities.Warehouse.list(),
  });

  const { data: workOrders = [] } = useQuery({
    queryKey: ['workOrders'],
    queryFn: () => base44.entities.WorkOrder.list(),
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
      const response = await base44.functions.invoke('exportOrder', { orderId }, { responseType: 'arraybuffer' });
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
    },
    onError: (error) => {
      toast.error('Kunde inte generera PDF: ' + (error.message || 'Okänt fel'));
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

  const sendToProductionMutation = useMutation({
    mutationFn: async (order) => {
      const user = await base44.auth.me();
      await base44.entities.Order.update(order.id, {
        status: 'in_production',
        production_started_date: new Date().toISOString(),
        production_started_by: user.email
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Order skickad till produktion!');
      navigate(createPageUrl('WorkOrders'));
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

  const exportOrdersToExcelMutation = useMutation({
    mutationFn: async (filter) => {
      const response = await base44.functions.invoke('exportOrders', { filterInvoiced: filter });
      return response.data;
    },
    onSuccess: (data) => {
      const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ordrar_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success('Excel-fil nedladdad!');
    }
  });

  const handleDocumentUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingDocument(true);
    const uploadToastId = toast.loading("Laddar upp orderdokument...");

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      toast.loading("Analyserar orderdokument med AI...", { id: uploadToastId });
      
      const response = await base44.functions.invoke('processOrderDocument', { file_url });
      const data = response.data;

      if (data.success) {
        toast.success(data.message || "Order skapad framgångsrikt!", { id: uploadToastId, duration: 6000 });
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        queryClient.invalidateQueries({ queryKey: ['orderItems'] });
      } else {
        toast.error(`Fel: ${data.error || data.details || "Kunde inte bearbeta orderdokumentet."}`, { id: uploadToastId, duration: 8000 });
      }
    } catch (error) {
      console.error("Error:", error);
      const errMsg = error.response?.data?.error || error.response?.data?.details || error.message || "Okänt fel";
      toast.error(`Misslyckades: ${errMsg}`, { id: uploadToastId, duration: 8000 });
    } finally {
      setIsUploadingDocument(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

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
      
      // On main view (invoiceFilter "all"), exclude invoiced orders
      const excludeInvoiced = invoiceFilter === "all" && order.status === "picked" && order.fortnox_invoiced;
      
      return matchesSearch && matchesStatus && matchesInvoice && !excludeInvoiced;
    })
    .sort((a, b) => {
       switch (sortBy) {
         case 'date_desc':
           return new Date(b.created_date) - new Date(a.created_date);
         case 'oldest':
           return new Date(a.created_date) - new Date(b.created_date);
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

  const getDaysOld = (createdDate) => {
    const now = new Date();
    const created = new Date(createdDate);
    const diffTime = Math.abs(now - created);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
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

  // Plockningsvy - gruppera orderitems efter artikel
  const pickingTasks = orderItems
    .filter(item => item.status !== 'picked')
    .reduce((acc, item) => {
      const article = articles.find(a => a.id === item.article_id);
      if (!article) return acc;

      const order = orders.find(o => o.id === item.order_id);
      if (!order || !['ready_to_pick', 'picking'].includes(order.status)) return acc;

      const existingTask = acc.find(t => t.article_id === item.article_id);
      
      if (existingTask) {
        existingTask.orders.push({
          orderId: order.id,
          orderNumber: order.order_number || `#${order.id.slice(0, 8)}`,
          customerName: order.customer_name,
          quantityNeeded: item.quantity_ordered - (item.quantity_picked || 0),
          priority: order.priority,
          itemId: item.id
        });
        existingTask.totalQuantity += item.quantity_ordered - (item.quantity_picked || 0);
      } else {
        acc.push({
          article_id: article.id,
          article_name: article.customer_name || article.name,
          article_batch: article.batch_number,
          shelf_address: article.shelf_address,
          warehouse: article.warehouse,
          stock_qty: article.stock_qty,
          totalQuantity: item.quantity_ordered - (item.quantity_picked || 0),
          orders: [{
            orderId: order.id,
            orderNumber: order.order_number || `#${order.id.slice(0, 8)}`,
            customerName: order.customer_name,
            quantityNeeded: item.quantity_ordered - (item.quantity_picked || 0),
            priority: order.priority,
            itemId: item.id
          }]
        });
      }
      
      return acc;
    }, []);

  const filteredPickingTasks = pickingTasks.filter(task => {
    const shelfAddressString = Array.isArray(task.shelf_address) 
      ? task.shelf_address.join(', ') 
      : (task.shelf_address || '');
    
    const matchesSearch = !searchQuery || 
      task.article_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.article_batch?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shelfAddressString.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesWarehouse = warehouseFilter === "all" || task.warehouse === warehouseFilter;
    
    return matchesSearch && matchesWarehouse;
  });

  // Save state to localStorage when filters change
  React.useEffect(() => {
    const state = {
      viewMode,
      searchQuery,
      statusFilter,
      invoiceFilter,
      sortBy,
      warehouseFilter
    };
    localStorage.setItem('orders_state', JSON.stringify(state));
  }, [viewMode, searchQuery, statusFilter, invoiceFilter, sortBy, warehouseFilter]);

  return (
    <PullToRefresh onRefresh={async () => {
      await refetch();
      toast.success('Uppdaterad!');
    }}>
      <div className="min-h-screen bg-black p-4 md:p-6">
        <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="mb-6 relative z-[60]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-white tracking-tight">Ordrar & Plockning</h1>
              {viewMode === "orders" ? (
                <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
                  {filteredAndSortedOrders.length} ordrar
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
                  {filteredPickingTasks.length} artiklar att plocka
                </Badge>
              )}
            </div>

            <div className="flex gap-2">
              {viewMode === "orders" && selectedOrderIds.length > 0 && (
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
              {viewMode === "orders" && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg"
                    onChange={handleDocumentUpload}
                    className="hidden"
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingDocument}
                    variant="outline"
                    size="sm"
                    className="bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-white backdrop-blur-xl transition-all duration-300"
                  >
                    {isUploadingDocument ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                        Laddar upp...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Ladda upp
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => exportOrdersToExcelMutation.mutate(invoiceFilter)}
                    disabled={exportOrdersToExcelMutation.isPending}
                    variant="outline"
                    className="bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-white backdrop-blur-xl transition-all duration-300"
                  >
                    {exportOrdersToExcelMutation.isPending ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                        Exporterar...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Excel
                      </>
                    )}
                  </Button>
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
                </>
              )}
            </div>
          </div>

          {/* View Mode Tabs */}
          {/* <Tabs value={viewMode} onValueChange={setViewMode}>
            <TabsList className="h-10 bg-white/5 border border-white/10 backdrop-blur-xl">
              <TabsTrigger value="orders" className="text-sm h-8 px-4 text-white/70 data-[state=active]:text-white data-[state=active]:bg-white/10">
                <ClipboardList className="w-4 h-4 mr-2" />
                Ordrar
              </TabsTrigger>
              <TabsTrigger value="picking" className="text-sm h-8 px-4 text-white/70 data-[state=active]:text-white data-[state=active]:bg-white/10">
                <Package className="w-4 h-4 mr-2" />
                Plockningslista
              </TabsTrigger>
            </TabsList>
          </Tabs> */}
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <motion.button
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            onClick={() => setStatusFilter('all')}
            className={cn(
              "p-5 rounded-2xl backdrop-blur-xl border transition-all duration-300 cursor-pointer group text-left",
              statusFilter === 'all'
                ? "bg-white/10 border-white/30 shadow-lg shadow-white/10"
                : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 hover:shadow-2xl hover:shadow-white/5"
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/30 to-blue-600/30 flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-blue-400" />
              </div>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-3xl font-bold text-white mb-1 tracking-tight">{orders.length}</p>
            <p className="text-sm text-white/50">Totalt ordrar</p>
          </motion.button>

          <motion.button
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            onClick={() => setStatusFilter('ready_to_pick')}
            className={cn(
              "p-5 rounded-2xl backdrop-blur-sm border transition-all duration-300 cursor-pointer group text-left",
              statusFilter === 'ready_to_pick'
                ? "bg-emerald-500/20 border-emerald-500/40 shadow-lg shadow-emerald-500/10"
                : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 hover:shadow-xl hover:shadow-emerald-500/10"
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/30 to-emerald-600/30 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-white mb-1 tracking-tight">
              {orders.filter(o => o.status === 'ready_to_pick').length}
            </p>
            <p className="text-sm text-white/50">Redo att plocka</p>
          </motion.button>

          <motion.button
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            onClick={() => setStatusFilter('picking')}
            className={cn(
              "p-5 rounded-2xl backdrop-blur-sm border transition-all duration-300 cursor-pointer group text-left",
              statusFilter === 'picking'
                ? "bg-amber-500/20 border-amber-500/40 shadow-lg shadow-amber-500/10"
                : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 hover:shadow-xl hover:shadow-amber-500/10"
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/30 to-amber-600/30 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-white mb-1 tracking-tight">
              {orders.filter(o => o.status === 'picking').length}
            </p>
            <p className="text-sm text-white/50">Plockar</p>
          </motion.button>

          {(() => {
            const pendingInvoiceCount = orders.filter(o => o.status === 'picked' && !o.fortnox_invoiced).length;
            return (
              <motion.button
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                onClick={() => setStatusFilter('picked')}
                className={cn(
                  "p-5 rounded-2xl backdrop-blur-sm border transition-all duration-300 cursor-pointer group text-left relative overflow-hidden",
                  statusFilter === 'picked'
                    ? "bg-red-500/20 border-red-500/40 shadow-lg shadow-red-500/10"
                    : pendingInvoiceCount > 0
                    ? "bg-red-500/10 border-red-500/30 hover:bg-red-500/20 hover:border-red-500/50 hover:shadow-xl hover:shadow-red-500/10"
                    : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 hover:shadow-xl hover:shadow-orange-500/10"
                )}
                animate={pendingInvoiceCount > 0 ? {
                  boxShadow: ['0 0 0px rgba(239,68,68,0)', '0 0 20px rgba(239,68,68,0.4)', '0 0 0px rgba(239,68,68,0)']
                } : {}}
                transition={pendingInvoiceCount > 0 ? { repeat: Infinity, duration: 1.5, ease: "easeInOut" } : {}}
              >
                {pendingInvoiceCount > 0 && (
                  <motion.div
                    className="absolute inset-0 bg-red-500/10 rounded-2xl"
                    animate={{ opacity: [0, 0.5, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                  />
                )}
                <div className="flex items-center justify-between mb-3 relative z-10">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    pendingInvoiceCount > 0
                      ? "bg-gradient-to-br from-red-500/40 to-red-600/40"
                      : "bg-gradient-to-br from-orange-500/30 to-orange-600/30"
                  )}>
                    <AlertTriangle className={cn("w-5 h-5", pendingInvoiceCount > 0 ? "text-red-400" : "text-orange-400")} />
                  </div>
                </div>
                <p className={cn("text-3xl font-bold mb-1 tracking-tight relative z-10", pendingInvoiceCount > 0 ? "text-red-300" : "text-white")}>
                  {pendingInvoiceCount}
                </p>
                <p className={cn("text-sm relative z-10", pendingInvoiceCount > 0 ? "text-red-400/70" : "text-white/50")}>Väntar fakturering</p>
              </motion.button>
            );
          })()}
        </div>

        {/* Search & Filters */}
         <div className="space-y-3 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={viewMode === "orders" ? "Sök ordernummer eller kund..." : "Sök artikel, batch eller hyllplats..."}
              className="pl-11 h-11 bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-white placeholder:text-white/40 backdrop-blur-xl transition-all duration-300 text-base"
            />
          </div>



          {/* Desktop Filters - Hidden */}



          {/* Status Filter Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {[
              { value: "all", label: "Alla" },
              { value: "draft", label: "Utkast" },
              { value: "ready_to_pick", label: "Redo att plocka" },
              { value: "picking", label: "Plockar" },
              { value: "picked", label: "Plockad" },
              { value: "delivered", label: "Levererad" },
              { value: "cancelled", label: "Avbruten" },
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setStatusFilter(value)}
                className={cn(
                  "whitespace-nowrap px-3 py-1.5 rounded-lg text-sm font-medium transition-all border",
                  statusFilter === value
                    ? "bg-blue-600 text-white border-blue-500"
                    : "bg-white/5 text-white/50 border-white/10 hover:bg-white/10 hover:text-white"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {selectedOrderIds.length > 0 && (
            <div className="flex items-center justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedOrderIds([])}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4 mr-2" />
                Avmarkera alla
              </Button>
            </div>
          )}
        </div>

        {/* Content */}
        {viewMode === "orders" ? (
          <>
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
                     order.is_incomplete
                       ? "bg-red-500/10 border-2 border-red-500/40 hover:border-red-500/60 hover:bg-red-500/15 hover:shadow-2xl hover:shadow-red-500/20"
                       : order.fortnox_invoiced 
                       ? "bg-green-500/10 border-2 border-green-500/40 hover:border-green-500/60 hover:bg-green-500/15 hover:shadow-2xl hover:shadow-green-500/20"
                       : getDaysOld(order.created_date) > 5
                       ? "bg-orange-500/10 border-2 border-orange-500/40 hover:border-orange-500/60 hover:bg-orange-500/15 hover:shadow-2xl hover:shadow-orange-500/20"
                       : order.status === 'picked'
                       ? "bg-blue-500/10 border-2 border-blue-500/40 hover:border-blue-500/60 hover:bg-blue-500/15 hover:shadow-2xl hover:shadow-blue-500/20"
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
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
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
                          {order.is_incomplete && (
                            <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs flex items-center gap-1 font-semibold">
                              <AlertCircle className="w-3 h-3" />
                              Ofullständig
                            </Badge>
                          )}
                          {order.status === 'picked' && !order.fortnox_invoiced && !order.is_incomplete && (
                            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              Väntar fakturering
                            </Badge>
                          )}
                          {order.fortnox_project_number && (
                            <Badge className="bg-purple-500/30 text-purple-300 border-purple-500/50 text-xs flex items-center gap-1 font-semibold">
                              Projekt #{order.fortnox_project_number}
                            </Badge>
                          )}
                          {order.fortnox_invoiced && order.fortnox_invoice_number && (
                            <Badge className="bg-green-500/30 text-green-300 border-green-500/50 text-xs flex items-center gap-1 font-semibold">
                              <FileText className="w-3 h-3" />
                              #{order.fortnox_invoice_number}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-400">
                           <div className="flex items-center gap-1.5">
                             <User className="w-4 h-4" />
                             <span>{order.customer_name}</span>
                           </div>
                           <div className={cn(
                             "flex items-center gap-1.5 px-2 py-1 rounded-lg",
                             getDaysOld(order.created_date) > 5 
                               ? "bg-orange-500/20 text-orange-400" 
                               : "bg-slate-700/50 text-slate-300"
                           )}>
                             <Calendar className="w-4 h-4" />
                             <span className="font-medium">{getDaysOld(order.created_date)} dagar</span>
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
                           {order.rm_system_url && (
                             <a 
                               href={order.rm_system_url} 
                               target="_blank" 
                               rel="noopener noreferrer"
                               className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 hover:underline"
                               onClick={(e) => e.stopPropagation()}
                             >
                               <Truck className="w-4 h-4" />
                               <span>RM System</span>
                             </a>
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

                        {(() => {
                          const wo = workOrders.find(w => w.order_id === order.id);
                          if (!wo) return null;
                          return (
                            <Link to={createPageUrl(`WorkOrderView?id=${wo.id}`)}>
                              <Button size="sm" className="bg-blue-700 hover:bg-blue-600">
                                <ClipboardList className="w-4 h-4 mr-2" />
                                Arbetsorder
                              </Button>
                            </Link>
                          );
                        })()}

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

                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-blue-600 border-blue-500 hover:bg-blue-500 text-white"
                          onClick={async () => {
                            const email = prompt("Ange mottagarens e-postadress:");
                            if (!email) return;
                            const loadingToast = toast.loading('Skickar email...');
                            try {
                              await base44.functions.invoke('exportOrder', { orderId: order.id, email });
                              toast.success('Email skickad!', { id: loadingToast });
                            } catch (error) {
                              toast.error('Kunde inte skicka email', { id: loadingToast });
                            }
                          }}
                        >
                          <Mail className="w-4 h-4 md:mr-2" />
                          <span className="hidden md:inline">Skicka</span>
                        </Button>

                        <FortnoxSyncButton 
                          order={order} 
                          orderItems={orderItems.filter(item => item.order_id === order.id)}
                          onSyncSuccess={() => refetch()}
                        />

                        {order.status === 'picked' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-blue-600/20 border-blue-500/30 text-blue-400 hover:bg-blue-600/30"
                            onClick={() => sendToProductionMutation.mutate(order)}
                            disabled={sendToProductionMutation.isPending}
                          >
                            <Factory className="w-4 h-4 mr-2" />
                            Till produktion
                          </Button>
                        )}

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
          </>
        ) : (
          /* Plockningslista */
          <div className="space-y-3">
            {filteredPickingTasks.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Inga plockningsuppgifter
                </h3>
                <p className="text-white/50">
                  Allt är plockat eller så finns inga aktiva ordrar
                </p>
              </div>
            ) : (
              <AnimatePresence>
                {filteredPickingTasks.map((task) => {
                  const hasUrgent = task.orders.some(o => o.priority === 'urgent');
                  const hasHighPriority = task.orders.some(o => o.priority === 'high');
                  const hasEnoughStock = task.stock_qty >= task.totalQuantity;

                  return (
                    <motion.div
                      key={task.article_id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className={cn(
                        "p-5 rounded-2xl backdrop-blur-xl border transition-all duration-300",
                        hasUrgent 
                          ? "bg-red-500/10 border-red-500/40 hover:border-red-500/60"
                          : hasHighPriority
                          ? "bg-amber-500/10 border-amber-500/30 hover:border-amber-500/50"
                          : "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/10"
                      )}
                    >
                      <div className="flex items-start gap-4">
                        {/* Location */}
                        <div className="flex-shrink-0">
                          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 flex flex-col items-center justify-center">
                            <MapPin className="w-6 h-6 text-purple-400 mb-1" />
                            <span className="text-xs font-bold text-purple-300">
                              {task.shelf_address || '—'}
                            </span>
                          </div>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div>
                              <h3 className="text-lg font-semibold text-white mb-1">
                                {task.article_name}
                              </h3>
                              <div className="flex items-center gap-3 text-sm text-white/50">
                                {task.article_batch && (
                                  <span className="font-mono">#{task.article_batch}</span>
                                )}
                                {task.warehouse && (
                                  <span>{task.warehouse}</span>
                                )}
                              </div>
                            </div>

                            <div className="text-right flex-shrink-0">
                              <div className={cn(
                                "text-2xl font-bold",
                                hasEnoughStock ? "text-green-400" : "text-red-400"
                              )}>
                                {task.totalQuantity}
                              </div>
                              <div className="text-xs text-white/40">
                                att plocka
                              </div>
                            </div>
                          </div>

                          {/* Stock Status */}
                          <div className="flex items-center gap-2 mb-3 flex-wrap">
                            <div className={cn(
                              "text-sm px-2 py-1 rounded-lg",
                              hasEnoughStock 
                                ? "bg-green-500/20 text-green-400"
                                : "bg-red-500/20 text-red-400"
                            )}>
                              {hasEnoughStock ? (
                                <span className="flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  {task.stock_qty} st i lager
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" />
                                  Endast {task.stock_qty} st
                                </span>
                              )}
                            </div>
                            {hasUrgent && (
                              <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                                Brådskande
                              </Badge>
                            )}
                            {hasHighPriority && (
                              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                                Hög prioritet
                              </Badge>
                            )}
                          </div>

                          {/* Orders */}
                          <div className="space-y-1 mb-3">
                            {task.orders.map((order, idx) => (
                              <div 
                                key={idx}
                                className="text-sm text-white/70 flex items-center gap-2"
                              >
                                <span className="font-medium">{order.orderNumber}</span>
                                <span>•</span>
                                <span>{order.customerName}</span>
                                <span>•</span>
                                <span className="font-semibold text-white">{order.quantityNeeded} st</span>
                              </div>
                            ))}
                          </div>

                          {/* Action */}
                          <Link to={`${createPageUrl("PickOrder")}?orderId=${task.orders[0].orderId}`}>
                            <Button 
                              size="sm"
                              className={cn(
                                "w-full",
                                hasUrgent 
                                  ? "bg-red-600 hover:bg-red-500"
                                  : "bg-blue-600 hover:bg-blue-500"
                              )}
                            >
                              <ClipboardList className="w-4 h-4 mr-2" />
                              Börja plocka
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
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
            order={orders.find(o => o.id === selectedOrder.id) || selectedOrder}
            onClose={() => setSelectedOrder(null)}
            onSyncSuccess={() => refetch()}
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
    </PullToRefresh>
  );
}