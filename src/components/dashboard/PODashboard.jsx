import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ShoppingCart, Truck, PackageCheck, Clock, ChevronRight,
  AlertCircle, TrendingUp, Calendar, ArrowRight, Package2
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { format, differenceInDays, isPast, isToday } from "date-fns";
import { sv } from "date-fns/locale";
import { cn } from "@/lib/utils";

const STATUS_CONFIG = {
  draft:                        { label: "Utkast",        color: "bg-slate-500/20 text-slate-300 border-slate-500/30", dot: "bg-slate-400" },
  sent:                         { label: "Skickad",       color: "bg-blue-500/20 text-blue-300 border-blue-500/30",   dot: "bg-blue-400" },
  confirmed:                    { label: "Bekräftad",     color: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",   dot: "bg-cyan-400" },
  waiting_for_supplier_documentation: { label: "Väntar docs", color: "bg-amber-500/20 text-amber-300 border-amber-500/30", dot: "bg-amber-400" },
  in_production:                { label: "I produktion",  color: "bg-purple-500/20 text-purple-300 border-purple-500/30", dot: "bg-purple-400" },
  shipped:                      { label: "Skickad",       color: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30", dot: "bg-indigo-400" },
  ready_for_reception:          { label: "Redo mottagn.", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30", dot: "bg-emerald-400" },
  received:                     { label: "Mottagen",      color: "bg-green-500/20 text-green-300 border-green-500/30",  dot: "bg-green-400" },
  cancelled:                    { label: "Avbruten",      color: "bg-red-500/20 text-red-300 border-red-500/30",       dot: "bg-red-400" },
};

const ACTIVE_STATUSES = ["sent", "confirmed", "waiting_for_supplier_documentation", "in_production", "shipped", "ready_for_reception"];

function ETABadge({ date }) {
  if (!date) return <span className="text-slate-500 text-xs">–</span>;
  const d = new Date(date);
  const days = differenceInDays(d, new Date());
  if (isPast(d) && !isToday(d)) {
    return <span className="text-xs font-medium text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{Math.abs(days)}d försenad</span>;
  }
  if (isToday(d)) {
    return <span className="text-xs font-medium text-emerald-400">Idag!</span>;
  }
  if (days <= 3) {
    return <span className="text-xs font-medium text-amber-400">{days}d kvar</span>;
  }
  return <span className="text-xs text-slate-400">{format(d, "d MMM", { locale: sv })}</span>;
}

export default function PODashboard() {
  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ['purchaseOrders-dashboard'],
    queryFn: () => base44.entities.PurchaseOrder.list('-created_date', 100),
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const { data: poItems = [] } = useQuery({
    queryKey: ['poItems-dashboard'],
    queryFn: () => base44.entities.PurchaseOrderItem.list('-created_date', 200),
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  // Stats
  const activePOs = purchaseOrders.filter(po => ACTIVE_STATUSES.includes(po.status));
  const upcomingDeliveries = purchaseOrders
    .filter(po => ["shipped", "ready_for_reception", "confirmed", "in_production"].includes(po.status) && po.confirmed_delivery_date)
    .sort((a, b) => new Date(a.confirmed_delivery_date) - new Date(b.confirmed_delivery_date))
    .slice(0, 5);

  const statusCounts = ACTIVE_STATUSES.map(status => ({
    label: STATUS_CONFIG[status]?.label || status,
    count: purchaseOrders.filter(po => po.status === status).length,
    status,
  })).filter(s => s.count > 0);

  // Recently received items (PO items with received qty > 0)
  const recentlyReceived = poItems
    .filter(item => (item.quantity_received || 0) > 0)
    .sort((a, b) => new Date(b.updated_date) - new Date(a.updated_date))
    .slice(0, 5);

  // Overdue deliveries
  const overdueDeliveries = purchaseOrders.filter(po =>
    ACTIVE_STATUSES.includes(po.status) &&
    po.confirmed_delivery_date &&
    isPast(new Date(po.confirmed_delivery_date)) &&
    !isToday(new Date(po.confirmed_delivery_date))
  );

  const totalOrdered = poItems.reduce((sum, i) => sum + (i.quantity_ordered || 0), 0);
  const totalReceived = poItems.reduce((sum, i) => sum + (i.quantity_received || 0), 0);
  const receivePercent = totalOrdered > 0 ? Math.round((totalReceived / totalOrdered) * 100) : 0;

  if (purchaseOrders.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.5 }}
      className="mb-6 space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-white font-semibold text-base flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-blue-400" />
          Inköpsöversikt
        </h2>
        <Link to={createPageUrl("PurchaseOrders")}>
          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white text-xs h-7">
            Alla PO <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </Link>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20">
          <ShoppingCart className="w-5 h-5 text-blue-400 mb-2" />
          <p className="text-2xl font-bold text-white">{activePOs.length}</p>
          <p className="text-xs text-slate-400 mt-0.5">Aktiva PO</p>
        </div>
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
          <Truck className="w-5 h-5 text-amber-400 mb-2" />
          <p className="text-2xl font-bold text-white">{upcomingDeliveries.length}</p>
          <p className="text-xs text-slate-400 mt-0.5">Kommande lev.</p>
        </div>
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
          <AlertCircle className="w-5 h-5 text-red-400 mb-2" />
          <p className="text-2xl font-bold text-white">{overdueDeliveries.length}</p>
          <p className="text-xs text-slate-400 mt-0.5">Försenade</p>
        </div>
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
          <PackageCheck className="w-5 h-5 text-emerald-400 mb-2" />
          <p className="text-2xl font-bold text-white">{receivePercent}%</p>
          <p className="text-xs text-slate-400 mt-0.5">Mottaget totalt</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Status bar chart */}
        {statusCounts.length > 0 && (
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              PO per status
            </h3>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={statusCounts} barSize={20}>
                <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} width={20} />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#e2e8f0' }}
                  itemStyle={{ color: '#94a3b8' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {statusCounts.map((entry, idx) => (
                    <Cell key={idx} fill={
                      entry.status === 'shipped' || entry.status === 'ready_for_reception' ? '#10b981' :
                      entry.status === 'in_production' ? '#a855f7' :
                      entry.status === 'waiting_for_supplier_documentation' ? '#f59e0b' :
                      '#3b82f6'
                    } />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Upcoming deliveries */}
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-400" />
            Kommande leveranser
          </h3>
          {upcomingDeliveries.length > 0 ? (
            <div className="space-y-2">
              {upcomingDeliveries.map(po => {
                const cfg = STATUS_CONFIG[po.status] || STATUS_CONFIG.draft;
                return (
                  <Link key={po.id} to={createPageUrl("PurchaseOrders")}>
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/50 hover:bg-slate-800/60 transition-all cursor-pointer">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className={cn("w-2 h-2 rounded-full flex-shrink-0", cfg.dot)} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{po.supplier_name}</p>
                          <p className="text-xs text-slate-500 truncate">{po.po_number || po.id.slice(0,8)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <ETABadge date={po.confirmed_delivery_date} />
                        <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-slate-500">
              <Truck className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-xs">Inga kommande leveranser</p>
            </div>
          )}
        </div>
      </div>

      {/* Recently received items */}
      {recentlyReceived.length > 0 && (
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <PackageCheck className="w-4 h-4 text-emerald-400" />
            Senast inlevererade artiklar
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {recentlyReceived.map(item => {
              const pct = item.quantity_ordered > 0 ? Math.round((item.quantity_received / item.quantity_ordered) * 100) : 0;
              return (
                <Link key={item.id} to={createPageUrl("PurchaseOrders")}>
                  <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-900/50 hover:bg-slate-800/60 transition-all cursor-pointer">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                      <Package2 className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{item.article_name || "Artikel"}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 rounded-full bg-slate-700">
                          <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-slate-400 flex-shrink-0">{item.quantity_received}/{item.quantity_ordered}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}