import React, { useState } from 'react';
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, ShoppingCart, ClipboardList, X, Check, Link } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";

export default function LinkToOrderModal({ article, onLink, onSkip }) {
  const [tab, setTab] = useState('orders'); // orders | workorders
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  const { data: orders = [] } = useQuery({
    queryKey: ['orders'],
    queryFn: () => base44.entities.Order.list('-created_date'),
  });

  const { data: workOrders = [] } = useQuery({
    queryKey: ['workOrders'],
    queryFn: () => base44.entities.WorkOrder.list('-created_date'),
  });

  const filteredOrders = orders.filter(o =>
    !search ||
    o.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
    o.order_number?.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 20);

  const filteredWorkOrders = workOrders.filter(wo =>
    !search ||
    wo.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
    wo.order_number?.toLowerCase().includes(search.toLowerCase()) ||
    wo.name?.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 20);

  const handleLink = async () => {
    if (!selectedId) return;
    onLink({ type: tab === 'orders' ? 'order' : 'workorder', id: selectedId });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4"
      onClick={onSkip}
    >
      <motion.div
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-zinc-900 border border-white/10 rounded-t-3xl md:rounded-2xl p-6 max-w-md w-full max-h-[85vh] flex flex-col"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-white">Koppla till order</h3>
            <p className="text-xs text-white/50 mt-0.5">
              Batch: <span className="font-mono text-white/80">{article?.batch_number}</span>
            </p>
          </div>
          <button onClick={onSkip} className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex gap-1 mb-4 p-1 bg-white/5 rounded-xl">
          <button
            onClick={() => { setTab('orders'); setSelectedId(null); }}
            className={cn("flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all", tab === 'orders' ? "bg-blue-600 text-white" : "text-white/50 hover:text-white")}
          >
            <ShoppingCart className="w-4 h-4" />
            Ordrar
          </button>
          <button
            onClick={() => { setTab('workorders'); setSelectedId(null); }}
            className={cn("flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all", tab === 'workorders' ? "bg-purple-600 text-white" : "text-white/50 hover:text-white")}
          >
            <ClipboardList className="w-4 h-4" />
            Arbetsordrar
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Sök kund eller ordernummer..."
            className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/30"
          />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
          {tab === 'orders' ? (
            filteredOrders.length === 0 ? (
              <p className="text-center text-white/30 py-8 text-sm">Inga ordrar hittades</p>
            ) : filteredOrders.map(order => (
              <button
                key={order.id}
                onClick={() => setSelectedId(selectedId === order.id ? null : order.id)}
                className={cn(
                  "w-full p-3 rounded-xl border text-left transition-all",
                  selectedId === order.id
                    ? "bg-blue-600/20 border-blue-500/50"
                    : "bg-white/5 border-white/10 hover:bg-white/10"
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">{order.customer_name}</p>
                    {order.order_number && <p className="text-xs text-white/40 font-mono">{order.order_number}</p>}
                  </div>
                  <Badge className={cn("text-xs", order.status === 'LAGER' ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-white/10 text-white/50 border-white/10")}>
                    {order.status}
                  </Badge>
                </div>
              </button>
            ))
          ) : (
            filteredWorkOrders.length === 0 ? (
              <p className="text-center text-white/30 py-8 text-sm">Inga arbetsordrar hittades</p>
            ) : filteredWorkOrders.map(wo => (
              <button
                key={wo.id}
                onClick={() => setSelectedId(selectedId === wo.id ? null : wo.id)}
                className={cn(
                  "w-full p-3 rounded-xl border text-left transition-all",
                  selectedId === wo.id
                    ? "bg-purple-600/20 border-purple-500/50"
                    : "bg-white/5 border-white/10 hover:bg-white/10"
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">{wo.name || wo.customer_name}</p>
                    {wo.order_number && <p className="text-xs text-white/40 font-mono">{wo.order_number}</p>}
                  </div>
                  <Badge className="text-xs bg-white/10 text-white/50 border-white/10">{wo.current_stage}</Badge>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="flex gap-3 pt-4 border-t border-white/10 mt-4">
          <Button
            variant="outline"
            onClick={onSkip}
            className="flex-1 bg-white/5 border-white/10 text-white hover:bg-white/10"
          >
            Hoppa över
          </Button>
          <Button
            onClick={handleLink}
            disabled={!selectedId}
            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-40"
          >
            <Link className="w-4 h-4 mr-2" />
            Koppla
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}