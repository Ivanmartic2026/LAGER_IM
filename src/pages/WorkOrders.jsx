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
  Clock, ArrowRight, AlertCircle, Zap, ClipboardList, Plus, Trash2, Edit2
} from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import CreateProductionWorkOrderModal from "@/components/workorders/CreateProductionWorkOrderModal";

const STAGE_CONFIG = {
  picking: { label: 'Plockning', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: Package },
  production: { label: 'Produktion', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Factory },
  delivery: { label: 'Leverans', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: Truck },
  completed: { label: 'Klar', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle2 }
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

  const activeOrders = workOrders.filter(wo => wo.status !== 'completed' && wo.status !== 'cancelled');
  const completedOrders = workOrders.filter(wo => wo.status === 'completed');

  const deleteMutation = useMutation({
    mutationFn: (workOrderId) => base44.entities.WorkOrder.delete(workOrderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workOrders'] });
    }
  });



  const filtered = workOrders.filter(wo => {
    const matchStage = stageFilter === 'all' || wo.current_stage === stageFilter;
    const matchSearch = !searchQuery ||
      wo.order_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wo.customer_name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStage && matchSearch;
  });

  const stats = {
    picking: workOrders.filter(wo => wo.current_stage === 'picking' && wo.status !== 'completed').length,
    production: workOrders.filter(wo => (wo.current_stage === 'production' || wo.current_stage === 'picked') && wo.status !== 'completed').length,
    delivery: workOrders.filter(wo => wo.current_stage === 'delivery' && wo.status !== 'completed').length,
    completed: completedOrders.length
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { key: 'all', label: 'Alla aktiva', count: activeOrders.length, bgColor: 'bg-white/5 border-white/10', textColor: 'text-white/70' },
              { key: 'picking', label: 'Plockning', count: stats.picking, bgColor: 'bg-amber-500/10 border-amber-500/20', textColor: 'text-amber-400' },
              { key: 'production', label: 'Produktion', count: stats.production, bgColor: 'bg-blue-500/10 border-blue-500/20', textColor: 'text-blue-400' },
              { key: 'completed', label: 'Klara', count: stats.completed, bgColor: 'bg-green-500/10 border-green-500/20', textColor: 'text-green-400' }
            ].map(({ key, label, count, bgColor, textColor }) => (
              <motion.button
                key={key}
                whileHover={{ y: -2 }}
                onClick={() => setStageFilter(key === 'completed' ? 'completed' : key)}
                className={cn(
                  "p-5 rounded-2xl border transition-all duration-200 text-left",
                  (stageFilter === key || (key === 'completed' && stageFilter === 'completed'))
                    ? "bg-white/10 border-white/30"
                    : bgColor + " hover:bg-white/8 hover:border-white/20"
                )}
              >
                <p className={cn("text-3xl font-bold tracking-tight mb-1", textColor)}>{count}</p>
                <p className="text-sm text-white/50">{label}</p>
              </motion.button>
            ))}
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
          <div className="space-y-3">
            {filtered.map(wo => {
              const stage = STAGE_CONFIG[wo.current_stage] || STAGE_CONFIG.picking;
              const StageIcon = stage.icon;
              const priority = PRIORITY_CONFIG[wo.priority] || PRIORITY_CONFIG.normal;
              const status = STATUS_CONFIG[wo.status] || STATUS_CONFIG.pending;
              const isUrgent = wo.priority === 'urgent' || wo.priority === 'high';

              return (
                <Link key={wo.id} to={createPageUrl(`WorkOrderView?id=${wo.id}`)}>
                  <motion.div
                    whileHover={{ scale: 1.005 }}
                    className={cn(
                      "p-4 rounded-2xl border transition-all cursor-pointer",
                      isUrgent && wo.status !== 'completed'
                        ? "bg-white/8 border-orange-500/20"
                        : "bg-white/5 border-white/10 hover:border-white/20"
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
                        </div>
                        {wo.priority && wo.priority !== 'normal' && (
                          <span className={cn("text-xs font-bold", priority.color)}>
                            {priority.label.toUpperCase()}
                          </span>
                        )}
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
                      </Link>
              );
            })}
          </div>
        )}


      </div>

      <CreateProductionWorkOrderModal open={createModalOpen} onOpenChange={setCreateModalOpen} />
    </div>
  );
}