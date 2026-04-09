import React, { useState, useRef } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search, Package, Factory, CheckCircle2, Truck,
  Clock, ArrowRight, AlertCircle, Zap, ClipboardList, Plus, Trash2, Edit2, Download
} from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import CreateProductionWorkOrderModal from "@/components/workorders/CreateProductionWorkOrderModal";
import ProcessFlow, { ProcessFlowCompact, ORDER_STAGES, resolveStage } from "@/components/workorders/ProcessFlow";


const STAGE_CONFIG = {
  konstruktion: { label: 'Konstruktion', color: 'bg-sky-500/20 text-sky-400 border-sky-500/30', icon: Factory },
  produktion:   { label: 'Produktion',   color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Factory },
  lager:        { label: 'Lager',        color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: Package },
  montering:    { label: 'Montering',    color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: Zap },
  leverans:     { label: 'Leverans',     color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: Truck },
};

const STATUS_CONFIG = {
  pending: { label: 'Väntar', color: 'bg-white/10 text-white/50 border-white/20' },
  in_progress: { label: 'Pågår', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  completed: { label: 'Klar', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  cancelled: { label: 'Avbruten', color: 'bg-red-500/20 text-red-400 border-red-500/30' }
};

const PRIORITY_CONFIG = {
  low: { label: 'Låg', color: 'text-white/40' },
  normal: { label: 'Normal', color: 'text-white/60' },
  high: { label: 'Hög', color: 'text-orange-400' },
  urgent: { label: 'Brådskande', color: 'text-red-400' }
};

export default function WorkOrdersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: workOrders = [], isLoading } = useQuery({
    queryKey: ['workOrders'],
    queryFn: () => base44.entities.WorkOrder.list('-created_date'),
    staleTime: 30000,
    refetchOnWindowFocus: true
  });

  const activeOrders = workOrders.filter(wo => wo.status !== 'klar' && wo.status !== 'completed' && wo.status !== 'avbruten' && wo.status !== 'cancelled');
  const completedOrders = workOrders.filter(wo => wo.status === 'klar' || wo.status === 'completed');

  const deleteMutation = useMutation({
    mutationFn: (workOrderId) => base44.entities.WorkOrder.delete(workOrderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workOrders'] });
    }
  });



  const filtered = workOrders.filter(wo => {
    let matchStage;
    if (stageFilter === 'all') matchStage = true;
    else if (stageFilter === 'completed') matchStage = wo.status === 'klar' || wo.status === 'completed';
    else matchStage = resolveStage(wo) === stageFilter;
    const matchSearch = !searchQuery ||
      wo.order_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wo.customer_name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStage && matchSearch;
  });

  const stats = {
    konstruktion: activeOrders.filter(wo => resolveStage(wo) === 'konstruktion').length,
    produktion:   activeOrders.filter(wo => resolveStage(wo) === 'produktion').length,
    lager:        activeOrders.filter(wo => resolveStage(wo) === 'lager').length,
    montering:    activeOrders.filter(wo => resolveStage(wo) === 'montering').length,
    leverans:     activeOrders.filter(wo => resolveStage(wo) === 'leverans').length,
    completed:    completedOrders.length
  };

  return (
    <div className="min-h-screen bg-black p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
         <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <ClipboardList className="w-6 h-6 text-blue-400" />
              Work Orders
            </h1>
            <Button
              onClick={() => setCreateModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white gap-2"
            >
              <Plus className="w-4 h-4" />
              Ny produktion
            </Button>
          </div>

          {/* Stage Stats */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
            {[
              { key: 'all',          label: 'Alla aktiva',   count: activeOrders.length,    bgColor: 'bg-white/5 border-white/10',           textColor: 'text-white/70' },
              { key: 'konstruktion', label: 'Konstruktion',  count: stats.konstruktion,      bgColor: 'bg-sky-500/10 border-sky-500/20',       textColor: 'text-sky-400' },
              { key: 'produktion',   label: 'Produktion',    count: stats.produktion,        bgColor: 'bg-blue-500/10 border-blue-500/20',     textColor: 'text-blue-400' },
              { key: 'lager',        label: 'Lager',         count: stats.lager,             bgColor: 'bg-amber-500/10 border-amber-500/20',   textColor: 'text-amber-400' },
              { key: 'montering',    label: 'Montering',     count: stats.montering,         bgColor: 'bg-purple-500/10 border-purple-500/20', textColor: 'text-purple-400' },
              { key: 'completed',    label: 'Klara',         count: stats.completed,         bgColor: 'bg-green-500/10 border-green-500/20',   textColor: 'text-green-400' }
            ].map(({ key, label, count, bgColor, textColor }) => (
              <motion.button
                key={key}
                whileHover={{ y: -2 }}
                onClick={() => setStageFilter(key)}
                className={cn(
                  "p-4 rounded-2xl border transition-all duration-200 text-left",
                  stageFilter === key
                    ? "bg-white/10 border-white/30"
                    : bgColor + " hover:bg-white/8 hover:border-white/20"
                )}
              >
                <p className={cn("text-2xl font-bold tracking-tight mb-1", textColor)}>{count}</p>
                <p className="text-xs text-white/50">{label}</p>
              </motion.button>
            ))}
          </div>

          {/* Stage Overview Flow */}
          <div className="mb-4">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <p className="text-[10px] font-bold tracking-widest text-white/30 uppercase mb-3">Ordersteg — aktiva ordrar</p>
              <div className="flex items-center">
                {ORDER_STAGES.map((s, idx) => {
                  const count = workOrders.filter(wo => wo.status !== 'completed' && wo.status !== 'cancelled' && resolveStage(wo) === s.key).length;
                  return (
                    <React.Fragment key={s.key}>
                      <button
                        onClick={() => setStageFilter(stageFilter === s.key ? 'all' : s.key)}
                        className="flex flex-col items-center gap-2 flex-shrink-0 group"
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-bold transition-all",
                          stageFilter === s.key
                            ? "bg-blue-500/30 border-blue-400/60 text-blue-200 shadow-lg shadow-blue-500/20"
                            : count > 0
                              ? "bg-white/10 border-white/30 text-white group-hover:border-white/50"
                              : "bg-white/5 border-white/10 text-white/20"
                        )}>
                          {s.step}
                        </div>
                        <div className="flex flex-col items-center gap-0.5">
                          <span className={cn(
                            "text-[9px] font-bold tracking-wider",
                            stageFilter === s.key ? "text-blue-300" : count > 0 ? "text-white/60" : "text-white/20"
                          )}>
                            {s.label}
                          </span>
                          {count > 0 && (
                            <span className="text-[9px] text-white/40">{count} st</span>
                          )}
                        </div>
                      </button>
                      {idx < ORDER_STAGES.length - 1 && (
                        <div className="flex-1 h-px mx-1 mb-6 bg-white/10" />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Sök order eller kund..."
              className="pl-10 h-10 bg-white/5 border-white/10 text-white placeholder:text-white/40"
            />
          </div>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => <div key={i} className="h-20 rounded-2xl bg-white/5 animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
              <ClipboardList className="w-8 h-8 text-white/30" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">Inga arbetsordrar</h3>
            <p className="text-white/50 text-sm">Arbetsordrar skapas automatiskt när ordrar läggs</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(wo => {
              const resolvedStageKey = resolveStage(wo);
              const stage = STAGE_CONFIG[resolvedStageKey] || STAGE_CONFIG.konstruktion;
              const StageIcon = stage.icon;
              const priority = PRIORITY_CONFIG[wo.priority] || PRIORITY_CONFIG.normal;
              const status = STATUS_CONFIG[wo.status] || STATUS_CONFIG.pending;
              const responsibleName = wo[`assigned_to_${resolvedStageKey}_name`] || wo[`assigned_to_${resolvedStageKey}`];
              const isUrgent = wo.priority === 'urgent' || wo.priority === 'high';

              return (
                <motion.div
                  key={wo.id}
                  whileHover={{ scale: 1.005 }}
                  onClick={() => navigate(`/WorkOrders/${wo.id}`)}
                  className={cn(
                    "p-5 rounded-2xl border transition-all cursor-pointer",
                    isUrgent && wo.status !== 'completed'
                      ? "bg-white/10 border-orange-500/30 shadow-lg shadow-orange-500/5"
                      : "bg-white/8 border-white/15 hover:border-white/25 hover:bg-white/10"
                  )}
                >
                    <div className="flex flex-col gap-4">
                      {/* Header Row: Stage + Title + Status */}
                      <div className="flex items-baseline justify-between gap-4">
                        <div className="flex items-baseline gap-3 flex-wrap min-w-0 flex-1">
                          <input
                            type="text"
                            defaultValue={wo.name || wo.order_number || `AO-${wo.id.slice(0, 6)}`}
                            onBlur={e => {
                              if (e.target.value !== (wo.name || wo.order_number || `AO-${wo.id.slice(0, 6)}`)) {
                                queryClient.invalidateQueries({ queryKey: ['workOrders'] });
                                base44.entities.WorkOrder.update(wo.id, { name: e.target.value });
                              }
                            }}
                            onClick={e => e.stopPropagation()}
                            className="font-bold text-lg text-white bg-transparent border-b border-white/20 hover:border-white/40 focus:border-white/60 focus:outline-none px-1 py-0 transition-colors flex-1 min-w-0"
                          />
                          <span className={cn("text-xs font-bold px-2 py-1 rounded-lg", stage.color)}>
                             {stage.label}
                           </span>
                          {responsibleName && (
                            <span className="text-xs text-white/40">→ {responsibleName}</span>
                          )}
                        </div>
                        {wo.priority && wo.priority !== 'normal' && (
                          <span className={cn("text-xs font-bold", priority.color)}>
                            {priority.label.toUpperCase()}
                          </span>
                        )}
                      </div>

                      {/* Compact Process Flow */}
                      <div className="flex items-center gap-3">
                        <ProcessFlowCompact workOrder={wo} />
                        <span className="text-[10px] text-white/30 font-medium">{resolveStage(wo)}</span>
                      </div>

                      {/* Details Row: Customer, Delivery, Status, Delete */}
                      <div className="flex items-end justify-between gap-4">
                        <div className="grid grid-cols-3 gap-6 text-sm flex-1">
                          <div className="flex flex-col gap-1">
                            <span className="text-white/40 text-xs">Kund</span>
                            <span className="text-white font-medium">{wo.customer_name}</span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-white/40 text-xs">Leverans</span>
                            <span className={cn(
                              "text-white font-medium",
                              wo.delivery_date && new Date(wo.delivery_date) < new Date() && wo.status !== 'completed'
                                ? 'text-red-400' : ''
                            )}>
                              {wo.delivery_date ? format(new Date(wo.delivery_date), 'd MMM', { locale: sv }) : '—'}
                            </span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-white/40 text-xs">Status</span>
                            <span className={cn("text-xs font-bold px-2 py-1 rounded-lg border w-fit", status.color)}>
                              {status.label}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                           <Button
                             variant="ghost"
                             size="sm"
                             onClick={(e) => {
                               e.preventDefault();
                               navigate(createPageUrl(`PickOrder?id=${wo.id}`));
                             }}
                             className="text-white/50 hover:text-green-400 hover:bg-green-500/10 gap-1"
                           >
                             <Package className="w-4 h-4" />
                             <span className="hidden sm:inline text-xs">Ta ut från lager</span>
                           </Button>
                           <Button
                             variant="ghost"
                             size="sm"
                             onClick={(e) => {
                               e.preventDefault();
                               base44.functions.invoke('printWorkOrder', { work_order_id: wo.id }).then(res => {
                                 const html = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
                                 const tab = window.open('', '_blank');
                                 tab.document.write(html);
                                 tab.document.close();
                               });
                             }}
                             className="text-white/50 hover:text-purple-400 hover:bg-purple-500/10 gap-1"
                           >
                             <Download className="w-4 h-4" />
                             <span className="hidden sm:inline text-xs">Plocklista</span>
                           </Button>
                           <Button
                             variant="ghost"
                             size="icon"
                             onClick={(e) => {
                               e.preventDefault();
                               navigate(createPageUrl(`WorkOrderView?id=${wo.id}&edit=true`));
                             }}
                             className="text-white/50 hover:text-blue-400 hover:bg-blue-500/10"
                           >
                             <Edit2 className="w-4 h-4" />
                           </Button>
                           <Button
                             variant="ghost"
                             size="icon"
                             onClick={(e) => {
                               e.preventDefault();
                               if (confirm('Vill du ta bort denna arbetsorder?')) {
                                 deleteMutation.mutate(wo.id);
                               }
                             }}
                             className="text-white/50 hover:text-red-400 hover:bg-red-500/10"
                           >
                             <Trash2 className="w-4 h-4" />
                           </Button>
                         </div>
                      </div>
                      </div>
                      </motion.div>
              );
            })}
          </div>
        )}


      </div>

      <CreateProductionWorkOrderModal open={createModalOpen} onOpenChange={setCreateModalOpen} />
    </div>
  );
}