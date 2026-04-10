import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, FileText, Truck, Building2 } from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { resolveStage } from "@/components/workorders/ProcessFlow";

const STAGE_CONFIG = {
  konstruktion: { label: 'Konstruktion', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30', icon: '📐' },
  produktion:   { label: 'Produktion',   color: 'bg-blue-500/20 text-blue-300 border-blue-500/30',     icon: '🔧' },
  lager:        { label: 'Lager',        color: 'bg-amber-500/20 text-amber-300 border-amber-500/30',  icon: '📦' },
  montering:    { label: 'Montering',    color: 'bg-orange-500/20 text-orange-300 border-orange-500/30', icon: '🔩' },
  leverans:     { label: 'Leverans',     color: 'bg-green-500/20 text-green-300 border-green-500/30',  icon: '🚛' },
};

const STATUS_CHIP = {
  väntande:   { label: 'Väntande',   color: 'bg-white/10 text-white/50' },
  pågår:      { label: 'Pågår',      color: 'bg-blue-500/20 text-blue-300' },
  klar:       { label: 'Klar',       color: 'bg-green-500/20 text-green-300' },
  avbruten:   { label: 'Avbruten',   color: 'bg-red-500/20 text-red-300' },
  // legacy english
  pending:    { label: 'Väntande',   color: 'bg-white/10 text-white/50' },
  in_progress:{ label: 'Pågår',      color: 'bg-blue-500/20 text-blue-300' },
  completed:  { label: 'Klar',       color: 'bg-green-500/20 text-green-300' },
  cancelled:  { label: 'Avbruten',   color: 'bg-red-500/20 text-red-300' },
};

export default function WorkOrderHeader({ workOrder, order, onNameChange, onStatusChange }) {
  const resolvedStage = resolveStage(workOrder);
  const stageConfig = STAGE_CONFIG[resolvedStage] || STAGE_CONFIG.konstruktion;
  const statusChip = STATUS_CHIP[workOrder.status] || STATUS_CHIP.pending;

  const deliveryDate = order?.delivery_date || workOrder.delivery_date;
  const isOverdue = deliveryDate && new Date(deliveryDate) < new Date() && workOrder.status !== 'completed' && workOrder.status !== 'klar';

  // Translate priority to Swedish
  const priorityMap = {
    'low': 'Låg',
    'normal': 'Normal',
    'high': 'Hög',
    'urgent': 'Brådskande',
  };
  const priorityDisplay = priorityMap[workOrder.priority?.toLowerCase()] || workOrder.priority || 'Normal';

  // Calculate delivery date urgency
  const daysUntilDelivery = deliveryDate ? Math.ceil((new Date(deliveryDate) - new Date()) / (1000 * 60 * 60 * 24)) : null;
  const deliveryColor = isOverdue ? 'text-red-400' : daysUntilDelivery && daysUntilDelivery <= 3 ? 'text-yellow-400' : 'text-white/60';
  const deliveryBg = isOverdue ? 'bg-red-500/20 border-red-500/30' : daysUntilDelivery && daysUntilDelivery <= 3 ? 'bg-yellow-500/20 border-yellow-500/30' : '';

  // Meta fields — only show if they have a value
  const metaFields = [
    { label: 'Prioritet',       value: priorityDisplay,             icon: null },
    { label: 'Fortnox Projekt', value: order?.fortnox_project_number,               icon: FileText },
    { label: 'Fortnox Order',   value: order?.fortnox_order_id,                     icon: FileText },
    { label: 'Kundreferens',    value: order?.customer_reference,                   icon: FileText },
    { label: 'Leveranssätt',    value: order?.delivery_method,                      icon: Truck },
  ].filter(f => f.value && f.value !== '—');

  return (
    <div className="space-y-4">
      {/* Main Header */}
      <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-white">
                {workOrder.order_number || `AO-${workOrder.id.slice(0, 6)}`}
              </h1>
              {/* Status chip */}
              <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", statusChip.color)}>
                {statusChip.label}
              </span>
            </div>
            <input
              type="text"
              defaultValue={workOrder.name || ''}
              onBlur={e => onNameChange(e.target.value)}
              placeholder="Lägg till namn på arbetsorder..."
              className="text-sm bg-white/5 border border-white/10 rounded px-2 py-1 text-white/70 placeholder:text-white/30 w-full mb-3"
            />
            <div className="space-y-1.5">
              {(order?.customer_name || workOrder.customer_name) && (
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-white/40 shrink-0" />
                  <p className="text-white/70 text-sm font-medium">{order?.customer_name || workOrder.customer_name}</p>
                </div>
              )}
              {deliveryDate && (
                <div className={cn("flex items-center gap-2 rounded-lg px-3 py-2 border text-sm font-medium", deliveryBg, deliveryColor)}>
                  <Clock className="w-4 h-4 shrink-0" />
                  {isOverdue ? (
                    <span>🔴 FÖRSENAD — {format(new Date(deliveryDate), 'd MMM yyyy', { locale: sv })}</span>
                  ) : daysUntilDelivery && daysUntilDelivery <= 3 ? (
                    <span>🟡 SNART — {format(new Date(deliveryDate), 'd MMM yyyy', { locale: sv })}</span>
                  ) : (
                    <span>Leverans: {format(new Date(deliveryDate), 'd MMM yyyy', { locale: sv })}</span>
                  )}
                </div>
              )}
            </div>
          </div>
          {/* Stage badge */}
          <Badge className={cn("px-3 py-1.5 border whitespace-nowrap text-sm font-semibold", stageConfig.color)}>
            {stageConfig.icon} {stageConfig.label}
          </Badge>
        </div>
      </div>

      {/* Critical notes — yellow warning banner */}
      {(order?.critical_notes) && (
        <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/40 flex items-start gap-3">
          <span className="text-xl flex-shrink-0">⚠️</span>
          <div>
            <p className="text-xs font-bold text-yellow-400 uppercase tracking-wider mb-1">Viktigt från sälj</p>
            <p className="text-sm text-yellow-100 whitespace-pre-wrap">{order.critical_notes}</p>
          </div>
        </div>
      )}

      {/* Meta Info — only non-empty fields */}
      {metaFields.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {metaFields.map(({ label, value, icon: Icon }) => (
            <div key={label} className="p-3 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center gap-1 mb-1">
                {Icon && <Icon className="w-3 h-3 text-white/40" />}
                <p className="text-xs text-white/40">{label}</p>
              </div>
              <p className="text-sm font-medium text-white break-words">{value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}