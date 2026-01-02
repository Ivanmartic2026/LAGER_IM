import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { 
  Package, TrendingUp, TrendingDown, AlertTriangle, 
  ShoppingCart, Wrench, Clock, CheckCircle2, Monitor
} from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default function WarehouseDashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());

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
    queryFn: () => base44.entities.StockMovement.list('-created_date', 20),
    refetchInterval: 30000,
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['orders'],
    queryFn: () => base44.entities.Order.list('-created_date', 10),
    refetchInterval: 30000,
  });

  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ['purchaseOrders'],
    queryFn: () => base44.entities.PurchaseOrder.list('-created_date', 10),
    refetchInterval: 30000,
  });

  // Calculate stats
  const lowStockArticles = articles.filter(a => a.status === 'low_stock');
  const outOfStockArticles = articles.filter(a => a.status === 'out_of_stock');
  const onRepairArticles = articles.filter(a => a.status === 'on_repair');
  const activeOrders = orders.filter(o => o.status === 'ready_to_pick' || o.status === 'picking');
  const incomingPOs = purchaseOrders.filter(po => po.status === 'ordered' || po.status === 'partially_received');

  const totalStockValue = articles.reduce((sum, a) => sum + (a.stock_qty || 0), 0);

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
            <div className="flex items-center gap-3 mb-6">
              <Clock className="w-6 h-6 text-blue-400" />
              <h2 className="text-xl font-bold text-white">Senaste lagerrörelser</h2>
            </div>
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {movements.slice(0, 10).map((movement) => {
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
                <div className="flex items-center gap-3 mb-4">
                  <ShoppingCart className="w-6 h-6 text-purple-400" />
                  <h2 className="text-xl font-bold text-white">Aktiva plockar</h2>
                </div>
                <div className="space-y-3">
                  {activeOrders.slice(0, 5).map((order) => (
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
      </div>
    </div>
  );
}