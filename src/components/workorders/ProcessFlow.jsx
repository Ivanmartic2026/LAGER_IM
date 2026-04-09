import React from 'react';
import { cn } from "@/lib/utils";

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
  // Map old values to new stages
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
      <p className="text-[10px] font-bold tracking-widest text-white/30 uppercase mb-4">Ordersteg</p>
      <div className="flex items-center">
        {ORDER_STAGES.map((s, idx) => {
          const done    = idx < currentIdx;
          const current = idx === currentIdx;
          const clickable = !!onStageClick;

          return (
            <React.Fragment key={s.key}>
              <div
                className={cn("flex flex-col items-center gap-2 flex-shrink-0", clickable && "cursor-pointer group")}
                onClick={() => onStageClick && onStageClick(s.key)}
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
                  "text-[10px] font-bold tracking-wider transition-colors",
                  done    ? 'text-green-400/70' :
                  current ? 'text-white/80'     :
                            'text-white/25'
                )}>
                  {s.label}
                </span>
              </div>
              {idx < ORDER_STAGES.length - 1 && (
                <div className={cn(
                  "flex-1 h-px mx-1 mb-5 transition-colors",
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