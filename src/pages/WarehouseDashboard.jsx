
import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Package, TrendingUp, TrendingDown, AlertTriangle, 
  ShoppingCart, Wrench, Clock, CheckCircle2, Monitor, BarChart3, Filter
} from "lucide-react";
import { format, subDays, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { sv } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default function WarehouseDashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [movementsPeriod, setMovementsPeriod] = useState('today'); // today, week, month
  const [orderStatus, setOrderStatus] = useState('all'); // all, ready_to_pick, picking
  const [salesPeriod, setSalesPeriod] = useState('week'); // week, month, quarter

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-refresh data every 30 seconds
  const { data: articles = [] } = useQuery({
    queryKey: ['articles'],
    queryFn: () => base44.entities.Article.list('-updated_date'),
    refetchInterval: 30000,
  });

  const { data: movements = [] } = useQuery({
    queryKey: ['movements'],
    queryFn: () => base44.entities.StockMovement.list('-created_date', 100),
    refetchInterval: 30000,
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['orders'],
    queryFn: () => base44.entities.Order.list('-created_date', 50),
    refetchInterval: 30000,
  });

  const { data: orderItems = [] } = useQuery({
    queryKey: ['orderItems'],
    queryFn: () => base44.entities.OrderItem.list('-created_date', 200),
    refetchInterval: 30000,
  });

  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ['purchaseOrders'],
    queryFn: () => base44.entities.PurchaseOrder.list('-created_date', 10),
    refetchInterval: 30000,
  });

  // Filter movements by period
  const getDateRange = (period) => {
    const now = new Date();
    switch(period) {
      case 'today':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'week':
        return { start: startOfDay(subDays(now, 7)), end: endOfDay(now) };
      case 'month':
        return { start: startOfDay(subDays(now, 30)), end: endOfDay(now) };
      default:
        return { start: startOfDay(now), end: endOfDay(now) };
    }
  };

  const movementsDateRange = getDateRange(movementsPeriod);
  const filteredMovements = movements.filter(m => {
    const createdDate = new Date(m.created_date);
    return isWithinInterval(createdDate, movementsDateRange);
  });

  // Filter orders by status
  const filteredOrders = orderStatus === 'all' 
    ? orders.filter(o => o.status === 'ready_to_pick' || o.status === 'picking')
    : orders.filter(o => o.status === orderStatus);

  // Calculate stats
  const lowStockArticles = articles.filter(a => a.status === 'low_stock');
  const outOfStockArticles = articles.filter(a => a.status === 'out_of_stock');
  const onRepairArticles = articles.filter(a => a.status === 'on_repair');
  const activeOrders = orders.filter(o => o.status === 'ready_to_pick' || o.status === 'picking');
  const incomingPOs = purchaseOrders.filter(po => po.status === 'ordered' || po.status === 'partially_received');

  const totalStockValue = articles.reduce((sum, a) => sum + (a.stock_qty || 0), 0);

  // Sales statistics
  const salesDateRange = getDateRange(salesPeriod);
  const salesData = orderItems
    .filter(item => {
      const order = orders.find(o => o.id === item.order_id);
      if (!order || !order.picked_date) return false;
      const pickedDate = new Date(order.picked_date);
      return isWithinInterval(pickedDate, salesDateRange);
    })
    .reduce((acc, item) => {
      const article = articles.find(a => a.id === item.article_id);
      const category = article?.category || 'Other';
      
      if (!acc[category]) {
        acc[category] = { count: 0, items: 0 };
      }
      acc[category].count += 1;
      acc[category].items += item.quantity_picked || 0;
      return acc;
    }, {});

  const topArticles = orderItems
    .filter(item => {
      const order = orders.find(o => o.id === item.order_id);
      if (!order || !order.picked_date) return false;
      const pickedDate = new Date(order.picked_date);
      return isWithinInterval(pickedDate, salesDateRange);
    })
    .reduce((acc, item) => {
      const key = item.article_id;
      if (!acc[key]) {
        acc[key] = {
          article_id: item.article_id,
          article_name: item.article_name,
          total_picked: 0
        };
      }
      acc[key].total_picked += item.quantity_picked || 0;
      return acc;
    }, {});

  const topArticlesList = Object.values(topArticles)
    .sort((a, b) => b.total_picked - a.total_picked)
    .slice(0, 5);

  const getMovementIcon = (type) => {
    switch(type) {
      case 'inbound': return { icon: TrendingUp, color: 'text-emerald-400' };
      case 'outbound': return { icon: TrendingDown, color: 'text-red-400' };
      default: return { icon: Package, color: 'text-blue-400' };
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="max-w-[1920px] mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
              <Monitor className="w-7 h-7 text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">
                Lager Dashboard
              </h1>
              <p className="text-slate-400 text-sm">Realtidsöversikt</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold text-white tabular-nums">
              {format(currentTime, 'HH:mm:ss')}
            </div>
            <div className="text-slate-400">
              {format(currentTime, 'EEEE d MMMM yyyy', { locale: sv })}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-6 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-2xl bg-blue-500/10 border border-blue-500/30"
          >
            <div className="flex items-center gap-3 mb-2">
              <Package className="w-6 h-6 text-blue-400" />
              <span className="text-sm text-blue-300">Totalt artiklar</span>
            </div>
            <div className="text-4xl font-bold text-white">{articles.length}</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30"
          >
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-6 h-6 text-emerald-400" />
              <span className="text-sm text-emerald-300">Totalt lager</span>
            </div>
            <div className="text-4xl font-bold text-white">{totalStockValue}</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30"
          >
            <div className="flex items-center gap-3 mb-2">
              <AlertTriangle className="w-6 h-6 text-amber-400" />
              <span className="text-sm text-amber-300">Lågt lager</span>
            </div>
            <div className="text-4xl font-bold text-white">{lowStockArticles.length}</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-6 rounded-2xl bg-red-500/10 border border-red-500/30"
          >
            <div className="flex items-center gap-3 mb-2">
              <Package className="w-6 h-6 text-red-400" />
              <span className="text-sm text-red-300">Slut i lager</span>
            </div>
            <div className="text-4xl font-bold text-white">{outOfStockArticles.length}</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="p-6 rounded-2xl bg-orange-500/10 border border-orange-500/30"
          >
            <div className="flex items-center gap-3 mb-2">
              <Wrench className="w-6 h-6 text-orange-400" />
              <span className="text-sm text-orange-300">Reparation</span>
            </div>
            <div className="text-4xl font-bold text-white">{onRepairArticles.length}</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="p-6 rounded-2xl bg-purple-500/10 border border-purple-500/30"
          >
            <div className="flex items-center gap-3 mb-2">
              <ShoppingCart className="w-6 h-6 text-purple-400" />
              <span className="text-sm text-purple-300">Aktiva ordrar</span>
            </div>
            <div className="text-4xl font-bold text-white">{activeOrders.length}</div>
          </motion.div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Recent Movements */}
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Clock className="w-6 h-6 text-blue-400" />
                <h2 className="text-xl font-bold text-white">Lagerrörelser</h2>
              </div>
              <Tabs value={movementsPeriod} onValueChange={setMovementsPeriod}>
                <TabsList className="bg-white/5 border border-white/10">
                  <TabsTrigger value="today" className="text-xs">Idag</TabsTrigger>
                  <TabsTrigger value="week" className="text-xs">7 dagar</TabsTrigger>
                  <TabsTrigger value="month" className="text-xs">30 dagar</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {filteredMovements.slice(0, 15).map((movement) => {
                const { icon: Icon, color } = getMovementIcon(movement.movement_type);
                return (
                  <motion.div
                    key={movement.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <Icon className={cn("w-5 h-5 mt-0.5", color)} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white mb-1 truncate">
                            {movement.reason || 'Lagerjustering'}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-slate-400">
                            <span>{format(new Date(movement.created_date), 'HH:mm', { locale: sv })}</span>
                            <Badge variant="outline" className="text-xs">
                              {movement.quantity > 0 ? '+' : ''}{movement.quantity} st
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-500">{movement.previous_qty} →</div>
                        <div className="text-sm font-semibold text-white">{movement.new_qty}</div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Alerts & Status */}
          <div className="space-y-6">
            {/* Active Orders */}
            {activeOrders.length > 0 && (
              <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <ShoppingCart className="w-6 h-6 text-purple-400" />
                    <h2 className="text-xl font-bold text-white">ORDRAR TILL ATT PLOCKA</h2>
                  </div>
                  <Tabs value={orderStatus} onValueChange={setOrderStatus}>
                    <TabsList className="bg-white/5 border border-white/10">
                      <TabsTrigger value="all" className="text-xs">Alla</TabsTrigger>
                      <TabsTrigger value="ready_to_pick" className="text-xs">Redo</TabsTrigger>
                      <TabsTrigger value="picking" className="text-xs">Plockar</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
                <div className="space-y-3">
                  {filteredOrders.slice(0, 5).map((order) => (
                    <div
                      key={order.id}
                      className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-white">{order.customer_name}</p>
                          <p className="text-xs text-purple-300">
                            {order.order_number || `#${order.id.slice(0, 8)}`}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            Inkom: {format(new Date(order.created_date), 'd MMM HH:mm', { locale: sv })}
                          </p>
                        </div>
                        <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                          {order.status === 'picking' ? 'Plockar' : 'Redo'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Low Stock Alert */}
            {lowStockArticles.length > 0 && (
              <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30">
                <div className="flex items-center gap-3 mb-4">
                  <AlertTriangle className="w-6 h-6 text-amber-400" />
                  <h2 className="text-xl font-bold text-white">Lågt lagersaldo</h2>
                </div>
                <div className="space-y-2">
                  {lowStockArticles.slice(0, 5).map((article) => (
                    <div
                      key={article.id}
                      className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-white truncate flex-1">
                          {article.name}
                        </p>
                        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 ml-2">
                          {article.stock_qty || 0} st
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Incoming POs */}
            {incomingPOs.length > 0 && (
              <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
                <div className="flex items-center gap-3 mb-4">
                  <TrendingUp className="w-6 h-6 text-emerald-400" />
                  <h2 className="text-xl font-bold text-white">Inkommande</h2>
                </div>
                <div className="space-y-2">
                  {incomingPOs.slice(0, 3).map((po) => (
                    <div
                      key={po.id}
                      className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm text-white">{po.supplier_name}</p>
                          {po.expected_delivery_date && (
                            <p className="text-xs text-emerald-300">
                              Förväntas: {format(new Date(po.expected_delivery_date), 'd MMM', { locale: sv })}
                            </p>
                          )}
                        </div>
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                          {po.po_number || `#${po.id.slice(0, 8)}`}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Repairs */}
            {onRepairArticles.length > 0 && (
              <div className="p-6 rounded-2xl bg-orange-500/10 border border-orange-500/30">
                <div className="flex items-center gap-3 mb-4">
                  <Wrench className="w-6 h-6 text-orange-400" />
                  <h2 className="text-xl font-bold text-white">På reparation</h2>
                </div>
                <div className="space-y-2">
                  {onRepairArticles.slice(0, 3).map((article) => (
                    <div
                      key={article.id}
                      className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20"
                    >
                      <p className="text-sm text-white truncate">{article.name}</p>
                      {article.repair_date && (
                        <p className="text-xs text-orange-300">
                          Skickad: {format(new Date(article.repair_date), 'd MMM', { locale: sv })}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sales Statistics */}
        <div className="grid grid-cols-2 gap-6 mt-6">
          {/* Sales by Category */}
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <BarChart3 className="w-6 h-6 text-cyan-400" />
                <h2 className="text-xl font-bold text-white">Försäljning per kategori</h2>
              </div>
              <Tabs value={salesPeriod} onValueChange={setSalesPeriod}>
                <TabsList className="bg-white/5 border border-white/10">
                  <TabsTrigger value="week" className="text-xs">7 dagar</TabsTrigger>
                  <TabsTrigger value="month" className="text-xs">30 dagar</TabsTrigger>
                  <TabsTrigger value="quarter" className="text-xs">90 dagar</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <div className="space-y-3">
              {Object.keys(salesData).length > 0 ? (
                Object.entries(salesData)
                  .sort(([, a], [, b]) => b.items - a.items)
                  .map(([category, data]) => {
                    const maxItems = Math.max(...Object.values(salesData).map(d => d.items));
                    const percentage = (data.items / maxItems) * 100;
                    
                    return (
                      <motion.div
                        key={category}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-2"
                      >
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-white font-medium">{category}</span>
                          <span className="text-cyan-400 font-semibold">{data.items} st</span>
                        </div>
                        <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                            className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full"
                          />
                        </div>
                        <div className="text-xs text-slate-400">
                          {data.count} order{data.count !== 1 ? 's' : ''}
                        </div>
                      </motion.div>
                    );
                  })
              ) : (
                <div className="text-center py-8 text-slate-400">
                  Ingen försäljningsdata för vald period
                </div>
              )}
            </div>
          </div>

          {/* Top Articles */}
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp className="w-6 h-6 text-emerald-400" />
              <h2 className="text-xl font-bold text-white">Mest sålda artiklar</h2>
            </div>
            <div className="space-y-3">
              {topArticlesList.length > 0 ? (
                topArticlesList.map((item, index) => (
                  <motion.div
                    key={item.article_id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 rounded-xl bg-white/5 border border-white/10"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                          <span className="text-emerald-400 font-bold text-sm">#{index + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium truncate">{item.article_name}</p>
                        </div>
                      </div>
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 ml-2">
                        {item.total_picked} st
                      </Badge>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-400">
                  Ingen försäljningsdata för vald period
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
