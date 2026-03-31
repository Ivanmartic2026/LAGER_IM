import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search, Package, Factory, CheckCircle2, Truck,
  Clock, ArrowRight, AlertCircle, Zap, ClipboardList
} from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const STAGE_CONFIG = {
  picking: { label: 'Plockning', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: Package },
  production: { label: 'Produktion', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Factory },
  delivery: { label: 'Leverans', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: Truck },
  completed: { label: 'Klar', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle2 }
};

const STATUS_CONFIG = {
  pending: { label: 'Väntar', dot: 'bg-white/40' },
  in_progress: { label: 'Pågår', dot: 'bg-blue-400' },
  completed: { label: 'Klar', dot: 'bg-green-400' },
  cancelled: { label: 'Avbruten', dot: 'bg-red-400' }
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
  const navigate = useNavigate();

  const { data: workOrders = [], isLoading } = useQuery({
    queryKey: ['workOrders'],
    queryFn: () => base44.entities.WorkOrder.list('-created_date'),
    staleTime: 30000,
    refetchOnWindowFocus: true
  });

  const activeOrders = workOrders.filter(wo => wo.status !== 'completed' && wo.status !== 'cancelled');
  const completedOrders = workOrders.filter(wo => wo.status === 'completed');

  const filtered = workOrders.filter(wo => {
    const matchStage = stageFilter === 'all' || wo.current_stage === stageFilter;
    const matchSearch = !searchQuery ||
      wo.order_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wo.customer_name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStage && matchSearch;
  });

  const stats = {
    picking: workOrders.filter(wo => wo.current_stage === 'picking' && wo.status !== 'completed').length,
    production: workOrders.filter(wo => wo.current_stage === 'production' && wo.status !== 'completed').length,
    delivery: workOrders.filter(wo => wo.current_stage === 'delivery' && wo.status !== 'completed').length,
    completed: completedOrders.length
  };

  return (
    <div className="min-h-screen bg-black p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white tracking-tight mb-4 flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-blue-400" />
            Arbetsordrar
          </h1>

          {/* Stage Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            {[
              { key: 'all', label: 'Alla aktiva', count: activeOrders.length, icon: ClipboardList, colorClass: 'from-white/20 to-white/10', textColor: 'text-white/70' },
              { key: 'picking', label: 'Plockning', count: stats.picking, icon: Package, colorClass: 'from-amber-500/30 to-amber-600/30', textColor: 'text-amber-400' },
              { key: 'production', label: 'Produktion', count: stats.production, icon: Factory, colorClass: 'from-blue-500/30 to-blue-600/30', textColor: 'text-blue-400' },
              { key: 'completed', label: 'Klara', count: stats.completed, icon: CheckCircle2, colorClass: 'from-green-500/30 to-green-600/30', textColor: 'text-green-400' }
            ].map(({ key, label, count, icon: Icon, colorClass, textColor }) => (
              <motion.button
                key={key}
                whileHover={{ y: -3 }}
                onClick={() => setStageFilter(key === 'completed' ? 'completed' : key)}
                className={cn(
                  "p-4 rounded-2xl border transition-all duration-200 text-left",
                  (stageFilter === key || (key === 'completed' && stageFilter === 'completed'))
                    ? "bg-white/10 border-white/30"
                    : "bg-white/5 border-white/10 hover:bg-white/8 hover:border-white/20"
                )}
              >
                <div className={cn("w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center mb-2", colorClass)}>
                  <Icon className={cn("w-4 h-4", textColor)} />
                </div>
                <p className="text-2xl font-bold text-white tracking-tight">{count}</p>
                <p className="text-xs text-white/50">{label}</p>
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
                    <div className="flex items-center gap-4">
                      <div className={cn("w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0", stage.color)}>
                        <StageIcon className="w-5 h-5" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-semibold text-white text-sm">
                            {wo.order_number || `AO-${wo.id.slice(0, 6)}`}
                          </span>
                          <Badge className={cn("text-xs px-2 py-0 border", stage.color)}>
                            {stage.label}
                          </Badge>
                          {wo.priority && wo.priority !== 'normal' && (
                            <span className={cn("text-xs font-medium", priority.color)}>
                              {priority.label}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-white/50">
                          <span>{wo.customer_name}</span>
                          {wo.delivery_date && (
                            <>
                              <span>•</span>
                              <span className={cn(
                                new Date(wo.delivery_date) < new Date() && wo.status !== 'completed'
                                  ? 'text-red-400' : ''
                              )}>
                                Lev: {format(new Date(wo.delivery_date), 'd MMM', { locale: sv })}
                              </span>
                            </>
                          )}
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <span className={cn("w-1.5 h-1.5 rounded-full", status.dot)} />
                            {status.label}
                          </span>
                        </div>
                      </div>

                      <ArrowRight className="w-4 h-4 text-white/30 flex-shrink-0" />
                    </div>
                  </motion.div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}