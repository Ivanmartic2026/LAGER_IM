import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ClipboardList, AlertTriangle, Clock, CheckCircle2, ArrowRight, Camera, Plus, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format, isAfter, isBefore, addDays, startOfDay } from 'date-fns';
import { sv } from 'date-fns/locale';
import { createPageUrl } from '@/utils';

const STAGE_LABELS = {
  konstruktion: 'Konstruktion',
  produktion: 'Produktion',
  lager: 'Lager',
  montering: 'Montering',
  leverans: 'Leverans',
};

const STAGE_COLORS = {
  konstruktion: 'bg-blue-500/20 text-blue-400',
  produktion: 'bg-orange-500/20 text-orange-400',
  lager: 'bg-yellow-500/20 text-yellow-400',
  montering: 'bg-green-500/20 text-green-400',
  leverans: 'bg-purple-500/20 text-purple-400',
};

export default function MyTasksDashboard({ userEmail }) {
  const navigate = useNavigate();
  const today = startOfDay(new Date());
  const in3Days = addDays(today, 3);

  const { data: workOrders = [], isLoading } = useQuery({
    queryKey: ['myWorkOrders', userEmail],
    queryFn: () => base44.entities.WorkOrder.filter({ status: 'pågår' }, '-updated_date', 100),
    enabled: !!userEmail,
    staleTime: 60000,
  });

  const myWOs = workOrders.filter(wo =>
    wo.assigned_to_konstruktion === userEmail ||
    wo.assigned_to_produktion === userEmail ||
    wo.assigned_to_lager === userEmail ||
    wo.assigned_to_montering === userEmail ||
    wo.assigned_to_leverans === userEmail
  );

  const overdue = myWOs.filter(wo => wo.delivery_date && isBefore(new Date(wo.delivery_date), today));
  const upcoming = myWOs.filter(wo => {
    if (!wo.delivery_date) return false;
    const d = new Date(wo.delivery_date);
    return !isBefore(d, today) && isBefore(d, in3Days);
  });
  const rest = myWOs.filter(wo => {
    if (!wo.delivery_date) return true;
    return !isBefore(new Date(wo.delivery_date), today) && !isBefore(new Date(wo.delivery_date), in3Days);
  });

  const renderWOCard = (wo, variant = 'normal') => (
    <motion.div
      key={wo.id}
      whileTap={{ scale: 0.98 }}
      onClick={() => navigate(`/WorkOrders/${wo.id}`)}
      className={cn(
        'flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all',
        variant === 'overdue' && 'bg-red-500/10 border-red-500/30 hover:bg-red-500/15',
        variant === 'upcoming' && 'bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/15',
        variant === 'normal' && 'bg-white/5 border-white/10 hover:bg-white/10'
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-white truncate">{wo.name || wo.order_number || `WO-${wo.id.slice(0, 6)}`}</span>
          {wo.current_stage && (
            <Badge className={cn('text-xs', STAGE_COLORS[wo.current_stage] || 'bg-slate-500/20 text-slate-400')}>
              {STAGE_LABELS[wo.current_stage] || wo.current_stage}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1">
          {wo.customer_name && <span className="text-xs text-white/50 truncate">{wo.customer_name}</span>}
          {wo.delivery_date && (
            <span className={cn('text-xs font-medium', variant === 'overdue' ? 'text-red-400' : variant === 'upcoming' ? 'text-yellow-400' : 'text-white/40')}>
              {format(new Date(wo.delivery_date), 'd MMM', { locale: sv })}
            </span>
          )}
        </div>
      </div>
      <ArrowRight className="w-4 h-4 text-white/30 flex-shrink-0 ml-2" />
    </motion.div>
  );

  return (
    <div className="space-y-4 mb-6">
      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => navigate(createPageUrl('Scan'))}
          className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
        >
          <Camera className="w-5 h-5 text-blue-400" />
          <span className="text-xs text-white/70">Skanna</span>
        </button>
        <button
          onClick={() => navigate('/OrderEdit')}
          className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
        >
          <Plus className="w-5 h-5 text-green-400" />
          <span className="text-xs text-white/70">Ny order</span>
        </button>
        <button
          onClick={() => navigate(createPageUrl('Inventory'))}
          className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
        >
          <Search className="w-5 h-5 text-purple-400" />
          <span className="text-xs text-white/70">Sök</span>
        </button>
      </div>

      {/* My Tasks Section */}
      <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
          <ClipboardList className="w-4 h-4 text-blue-400" />
          <h2 className="text-sm font-semibold text-white">📋 Mina uppgifter idag</h2>
          {myWOs.length > 0 && (
            <Badge className="ml-auto bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">{myWOs.length}</Badge>
          )}
        </div>

        <div className="p-3 space-y-3">
          {isLoading && (
            <div className="text-center py-6 text-white/30 text-sm">Laddar...</div>
          )}

          {!isLoading && myWOs.length === 0 && (
            <div className="flex items-center gap-2 py-5 justify-center text-white/40">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <span className="text-sm">Inga uppgifter tilldelade just nu</span>
            </div>
          )}

          {overdue.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                <span className="text-xs font-semibold text-red-400 uppercase tracking-wider">Försenade ({overdue.length})</span>
              </div>
              <div className="space-y-2">{overdue.map(wo => renderWOCard(wo, 'overdue'))}</div>
            </div>
          )}

          {upcoming.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Clock className="w-3.5 h-3.5 text-yellow-400" />
                <span className="text-xs font-semibold text-yellow-400 uppercase tracking-wider">Deadline snart ({upcoming.length})</span>
              </div>
              <div className="space-y-2">{upcoming.map(wo => renderWOCard(wo, 'upcoming'))}</div>
            </div>
          )}

          {rest.length > 0 && (
            <div className="space-y-2">{rest.map(wo => renderWOCard(wo, 'normal'))}</div>
          )}
        </div>
      </div>
    </div>
  );
}