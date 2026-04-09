import React from 'react';
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

// The 5 work order stages
export const ORDER_STAGES = [
  { key: 'konstruktion', label: 'KONSTRUKTION', step: 1 },
  { key: 'produktion',   label: 'PRODUKTION',   step: 2 },
  { key: 'lager',        label: 'LAGER',         step: 3 },
  { key: 'montering',    label: 'MONTERING',     step: 4 },
  { key: 'leverans',     label: 'LEVERANS',      step: 5 },
];

// Map legacy current_stage values → new stage key
export function resolveStage(workOrder) {
  if (ORDER_STAGES.some(s => s.key === workOrder?.current_stage)) {
    return workOrder.current_stage;
  }
  const map = {
    picking:    'lager',
    picked:     'lager',
    production: 'produktion',
    delivery:   'leverans',
    completed:  'leverans',
    SÄLJ:         'konstruktion',
    KONSTRUKTION:  'konstruktion',
    PRODUKTION:    'produktion',
    LAGER:         'lager',
    MONTERING:     'montering',
  };
  return map[workOrder?.current_stage] || 'konstruktion';
}

// Get initials from a name
function getInitials(name) {
  if (!name) return null;
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

// Get timestamp for a stage
function getStageTimestamp(workOrder, stageKey) {
  const map = {
    konstruktion: null,
    produktion: workOrder?.production_started_date,
    lager: workOrder?.picking_started_date,
    montering: null,
    leverans: workOrder?.production_completed_date,
  };
  return map[stageKey];
}

// Compact inline version — used inside each row in the list
export function ProcessFlowCompact({ currentStage, workOrder }) {
  const stage = currentStage || resolveStage(workOrder);
  const currentIdx = ORDER_STAGES.findIndex(s => s.key === stage);

  return (
    <div className="flex items-center gap-0">
      {ORDER_STAGES.map((s, idx) => {
        const done    = idx < currentIdx;
        const current = idx === currentIdx;
        return (
          <React.Fragment key={s.key}>
            <div className={cn(
              "w-5 h-5 rounded-full border text-[9px] font-bold flex items-center justify-center flex-shrink-0 transition-all",
              done    ? 'bg-green-500/30 border-green-400/50 text-green-300'  :
              current ? 'bg-blue-500/30  border-blue-400/60  text-blue-200'   :
                        'bg-white/5      border-white/15      text-white/25'
            )}>
              {s.step}
            </div>
            {idx < ORDER_STAGES.length - 1 && (
              <div className={cn("w-4 h-px", done ? 'bg-green-400/40' : 'bg-white/10')} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// Full version — used in detail view and overview
export default function ProcessFlow({ currentStage, workOrder, onStageClick }) {
  const stage = currentStage || resolveStage(workOrder);
  const currentIdx = ORDER_STAGES.findIndex(s => s.key === stage);

  return (
    <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
      <p className="text-[10px] font-bold tracking-widest text-white/30 uppercase mb-4">Produktionsflöde</p>
      <div className="flex items-start">
        {ORDER_STAGES.map((s, idx) => {
          const done    = idx < currentIdx;
          const current = idx === currentIdx;
          const clickable = !!onStageClick;
          const responsibleName = workOrder?.[`assigned_to_${s.key}_name`] || workOrder?.[`assigned_to_${s.key}`];
          const initials = getInitials(responsibleName);
          const timestamp = getStageTimestamp(workOrder, s.key);

          return (
            <React.Fragment key={s.key}>
              <div
                className={cn("flex flex-col items-center gap-1 flex-shrink-0 min-w-[52px]", clickable && "cursor-pointer group")}
                onClick={() => onStageClick && onStageClick(s.key)}
                title={responsibleName ? `Ansvarig: ${responsibleName}` : undefined}
              >
                <div className={cn(
                  "w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-bold transition-all",
                  done    ? 'bg-green-500/20 border-green-400/50 text-green-300' :
                  current ? 'bg-white/15     border-white/50     text-white shadow-lg shadow-white/10' :
                            'bg-white/5      border-white/15     text-white/25',
                  clickable && !done && !current && 'group-hover:border-white/30 group-hover:bg-white/10 group-hover:text-white/50'
                )}>
                  {s.step}
                </div>
                <span className={cn(
                  "text-[9px] font-bold tracking-wider transition-colors text-center leading-tight",
                  done    ? 'text-green-400/70' :
                  current ? 'text-white/80'     :
                            'text-white/25'
                )}>
                  {s.label}
                </span>
                {/* Responsible initials */}
                {initials && (
                  <span className={cn(
                    "text-[9px] font-bold px-1.5 py-0.5 rounded-full",
                    done    ? 'bg-green-500/20 text-green-300' :
                    current ? 'bg-blue-500/20 text-blue-300' :
                              'bg-white/5 text-white/30'
                  )}>
                    {initials}
                  </span>
                )}
                {/* Timestamp */}
                {timestamp && (
                  <span className="text-[8px] text-white/25 text-center">
                    {format(new Date(timestamp), 'd MMM', { locale: sv })}
                  </span>
                )}
              </div>
              {idx < ORDER_STAGES.length - 1 && (
                <div className={cn(
                  "flex-1 h-px mx-1 mt-5 transition-colors",
                  done ? 'bg-green-400/40' : 'bg-white/10'
                )} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}