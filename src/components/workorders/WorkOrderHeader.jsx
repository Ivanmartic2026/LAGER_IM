import React from 'react';
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Package, Clock, MapPin, FileText, Truck } from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { cn } from "@/lib/utils";

const STAGE_CONFIG = {
  picking: { label: 'Plockning', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  production: { label: 'Produktion', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  delivery: { label: 'Leverans', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  completed: { label: 'Klar', color: 'bg-green-500/20 text-green-400 border-green-500/30' }
};

const STATUS_CONFIG = {
  blocked: { label: 'Blockerad – saknar material', color: 'text-red-400' },
  waiting_material: { label: 'Väntar på material', color: 'text-yellow-400' },
  ready: { label: 'Redo att starta', color: 'text-green-400' },
  in_production: { label: 'Produktion pågår', color: 'text-blue-400' },
  ready_delivery: { label: 'Redo för leverans', color: 'text-purple-400' },
  completed: { label: 'Klar', color: 'text-green-400' }
};

function getOverallStatus(workOrder, materialNeedsPurchase) {
  if (workOrder.status === 'completed') return 'completed';
  if (workOrder.current_stage === 'delivery' && workOrder.checklist?.ready_for_delivery) return 'ready_delivery';
  if (workOrder.production_started_date && !workOrder.production_completed_date) return 'in_production';
  if (materialNeedsPurchase) return 'blocked';
  if (workOrder.needs_procurement) return 'waiting_material';
  return 'ready';
}

export default function WorkOrderHeader({ workOrder, order, onNameChange }) {
  const stageConfig = STAGE_CONFIG[workOrder.current_stage] || STAGE_CONFIG.picking;
  const materialNeedsPurchase = workOrder.materials_needed?.some(m => m.needs_purchase);
  const overallStatus = getOverallStatus(workOrder, materialNeedsPurchase);
  const statusConfig = STATUS_CONFIG[overallStatus];

  const isOverdue = workOrder.delivery_date && 
    new Date(workOrder.delivery_date) < new Date() && 
    workOrder.status !== 'completed';

  return (
    <div className="space-y-4">
      {/* Main Header */}
      <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white mb-2">
              {workOrder.order_number || `AO-${workOrder.id.slice(0, 6)}`}
            </h1>
            <input
              type="text"
              defaultValue={workOrder.name || ''}
              onBlur={e => onNameChange(e.target.value)}
              placeholder="Lägg till namn på denna arbetsorder..."
              className="text-sm bg-white/5 border border-white/10 rounded px-2 py-1 text-white/70 placeholder:text-white/30 w-full mb-3"
            />
            <div className="space-y-2">
               <div className="flex items-center gap-2">
                 <Package className="w-4 h-4 text-white/50 shrink-0" />
                 <p className="text-white/60 text-sm font-medium">{order?.customer_name || workOrder.customer_name}</p>
               </div>
               {(order?.delivery_date || workOrder.delivery_date) && (
                 <div className={cn("flex items-center gap-2 text-sm", isOverdue ? 'text-red-400' : 'text-white/50')}>
                   <Clock className="w-4 h-4 shrink-0" />
                   <span>{format(new Date(order?.delivery_date || workOrder.delivery_date), 'd MMMM yyyy', { locale: sv })}</span>
                 </div>
               )}
               {order?.delivery_address && (
                 <div className="flex items-start gap-2 text-white/50 text-sm">
                   <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                   <span>{order.delivery_address}</span>
                 </div>
               )}
             </div>
          </div>
          <Badge className={cn("px-3 py-1 border whitespace-nowrap", stageConfig.color)}>
            {stageConfig.label}
          </Badge>
        </div>

        {/* Overall Status */}
        <div className={cn(
          "p-3 rounded-lg flex items-center gap-2",
          overallStatus === 'blocked' ? 'bg-red-500/10 text-red-400 border border-red-500/30' :
          overallStatus === 'waiting_material' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30' :
          overallStatus === 'in_production' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30' :
          'bg-green-500/10 text-green-400 border border-green-500/30'
        )}>
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm font-medium">{statusConfig.label}</span>
        </div>
      </div>

      {/* Meta Info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Status', value: workOrder.status, icon: null },
          { label: 'Prioritet', value: workOrder.priority || 'Normal', icon: null },
          { label: 'Projekt', value: order?.fortnox_project_number || '—', icon: FileText },
          { label: 'Fortnox Order', value: order?.fortnox_order_id || '—', icon: FileText },
          { label: 'Kundreferens', value: order?.customer_reference || '—', icon: FileText },
          { label: 'Leveranssätt', value: order?.delivery_method || '—', icon: Truck }
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="p-3 rounded-lg bg-white/5 border border-white/10">
            <div className="flex items-center gap-1 mb-1">
              {Icon && <Icon className="w-3 h-3 text-white/50" />}
              <p className="text-xs text-white/50">{label}</p>
            </div>
            <p className="text-sm font-medium text-white break-words">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}