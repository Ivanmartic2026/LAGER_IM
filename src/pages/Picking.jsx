import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, Package, MapPin, Camera, CheckCircle2, 
  Clock, AlertCircle, Warehouse, Grid3X3, List
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import BarcodeScanner from "@/components/scanner/BarcodeScanner";
import WarehouseMap from "@/components/picking/WarehouseMap";
import PickingStats from "@/components/picking/PickingStats";

export default function PickingPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("list"); // list, map
  const [scanMode, setScanMode] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [warehouseFilter, setWarehouseFilter] = useState("all");

  const { data: orders = [] } = useQuery({
    queryKey: ['activeOrders'],
    queryFn: () => base44.entities.Order.filter({ 
      status: { $in: ['ready_to_pick', 'picking'] } 
    }),
  });

  const { data: orderItems = [] } = useQuery({
    queryKey: ['pendingOrderItems'],
    queryFn: async () => {
      const items = await base44.entities.OrderItem.list();
      return items.filter(item => item.status !== 'picked');
    },
  });

  const { data: articles = [] } = useQuery({
    queryKey: ['articles'],
    queryFn: () => base44.entities.Article.list(),
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => base44.entities.Warehouse.list(),
  });

  // Gruppera orderitems efter artikel
  const pickingTasks = orderItems.reduce((acc, item) => {
    const article = articles.find(a => a.id === item.article_id);
    if (!article) return acc;

    const order = orders.find(o => o.id === item.order_id);
    if (!order) return acc;

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

  const handleBarcodeDetected = (code) => {
    setSearchQuery(code);
    setScanMode(false);
  };

  const filteredTasks = pickingTasks.filter(task => {
    const matchesSearch = !searchQuery || 
      task.article_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.article_batch?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.shelf_address?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesPriority = priorityFilter === "all" || 
      task.orders.some(o => o.priority === priorityFilter);
    
    const matchesWarehouse = warehouseFilter === "all" || 
      task.warehouse === warehouseFilter;
    
    return matchesSearch && matchesPriority && matchesWarehouse;
  });

  const stats = {
    totalTasks: pickingTasks.length,
    urgentTasks: pickingTasks.filter(t => t.orders.some(o => o.priority === 'urgent')).length,
    totalOrders: orders.length,
    totalItems: orderItems.reduce((sum, item) => sum + (item.quantity_ordered - (item.quantity_picked || 0)), 0)
  };

  return (
    <div className="min-h-screen bg-black p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight mb-2">Plockning</h1>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
                {stats.totalTasks} artiklar att plocka
              </Badge>
              <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30">
                {stats.totalOrders} aktiva ordrar
              </Badge>
              {stats.urgentTasks > 0 && (
                <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30">
                  {stats.urgentTasks} brådskande
                </Badge>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => setScanMode(!scanMode)}
              variant="outline"
              className="bg-blue-600/20 border-blue-500/30 text-blue-400 hover:bg-blue-600/30"
            >
              <Camera className="w-4 h-4 mr-2" />
              {scanMode ? 'Stäng skanner' : 'Skanna'}
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <PickingStats 
          totalTasks={stats.totalTasks}
          urgentTasks={stats.urgentTasks}
          totalOrders={stats.totalOrders}
          totalItems={stats.totalItems}
        />

        {/* Scanner */}
        <AnimatePresence>
          {scanMode && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 overflow-hidden"
            >
              <BarcodeScanner
                onBarcodeDetected={handleBarcodeDetected}
                onClose={() => setScanMode(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search & Filters */}
        <div className="space-y-3 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Sök artikel, batch eller hyllplats..."
              className="pl-11 h-11 bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-white placeholder:text-white/40 backdrop-blur-xl transition-all duration-300"
            />
          </div>

          <div className="flex gap-3 flex-wrap items-center">
            <Tabs value={priorityFilter} onValueChange={setPriorityFilter}>
              <TabsList className="h-10 bg-white/5 border border-white/10 backdrop-blur-xl">
                <TabsTrigger value="all" className="text-sm h-8 px-4 text-white/70 data-[state=active]:text-white data-[state=active]:bg-white/10">
                  Alla
                </TabsTrigger>
                <TabsTrigger value="urgent" className="text-sm h-8 px-4 text-white/70 data-[state=active]:text-white data-[state=active]:bg-white/10">
                  Brådskande
                </TabsTrigger>
                <TabsTrigger value="high" className="text-sm h-8 px-4 text-white/70 data-[state=active]:text-white data-[state=active]:bg-white/10">
                  Hög prioritet
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <Tabs value={warehouseFilter} onValueChange={setWarehouseFilter}>
              <TabsList className="h-10 bg-white/5 border border-white/10 backdrop-blur-xl">
                <TabsTrigger value="all" className="text-sm h-8 px-4 text-white/70 data-[state=active]:text-white data-[state=active]:bg-white/10">
                  Alla lager
                </TabsTrigger>
                {warehouses.map(wh => (
                  <TabsTrigger 
                    key={wh.id} 
                    value={wh.name}
                    className="text-sm h-8 px-4 text-white/70 data-[state=active]:text-white data-[state=active]:bg-white/10"
                  >
                    {wh.code || wh.name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <div className="ml-auto">
              <Tabs value={viewMode} onValueChange={setViewMode}>
                <TabsList className="h-10 bg-white/5 border border-white/10 backdrop-blur-xl">
                  <TabsTrigger value="list" className="text-sm h-8 px-4 text-white/70 data-[state=active]:text-white data-[state=active]:bg-white/10">
                    <List className="w-4 h-4 mr-2" />
                    Lista
                  </TabsTrigger>
                  <TabsTrigger value="map" className="text-sm h-8 px-4 text-white/70 data-[state=active]:text-white data-[state=active]:bg-white/10">
                    <Grid3X3 className="w-4 h-4 mr-2" />
                    Karta
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </div>

        {/* Content */}
        {viewMode === "list" ? (
          <div className="space-y-3">
            {filteredTasks.length === 0 ? (
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
                {filteredTasks.map((task) => {
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
                                  <span className="flex items-center gap-1">
                                    <Warehouse className="w-3 h-3" />
                                    {task.warehouse}
                                  </span>
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
                          <div className="flex items-center gap-2 mb-3">
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
                                  Endast {task.stock_qty} st i lager
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
                                <Clock className="w-3 h-3" />
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
                              <Package className="w-4 h-4 mr-2" />
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
        ) : (
          <WarehouseMap tasks={filteredTasks} warehouses={warehouses} />
        )}
      </div>
    </div>
  );
}