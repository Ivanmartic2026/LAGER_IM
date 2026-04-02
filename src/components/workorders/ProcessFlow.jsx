import React from 'react';
import { Package, Factory, Truck, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const STAGES = [
  { key: 'picking', label: 'Picking', icon: Package },
  { key: 'production', label: 'Production', icon: Factory },
  { key: 'delivery', label: 'Delivery', icon: Truck },
  { key: 'completed', label: 'Done', icon: CheckCircle2 }
];

export default function ProcessFlow({ currentStage }) {
  const currentStageIdx = STAGES.findIndex(s => s.key === currentStage);

  return (
    <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
      <div className="flex items-center justify-between">
        {STAGES.map((stage, idx) => {
          const isDone = idx < currentStageIdx;
          const isCurrent = idx === currentStageIdx;
          const Icon = stage.icon;

          return (
            <React.Fragment key={stage.key}>
              <div className="flex flex-col items-center gap-1">
                <div className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center border transition-all",
                  isDone ? 'bg-green-500/20 border-green-500/30' :
                  isCurrent ? 'bg-blue-500/20 border-blue-500/30' :
                  'bg-white/5 border-white/10'
                )}>
                  {isDone
                    ? <CheckCircle2 className="w-4 h-4 text-green-400" />
                    : <Icon className={cn("w-4 h-4", isCurrent ? 'text-blue-400' : 'text-white/30')} />
                  }
                </div>
                <span className={cn("text-xs font-medium", 
                  isCurrent ? 'text-blue-400' : isDone ? 'text-green-400/70' : 'text-white/30')}>
                  {stage.label}
                </span>
              </div>
              {idx < STAGES.length - 1 && (
                <div className={cn("flex-1 h-0.5 mx-2 rounded", idx < currentStageIdx ? 'bg-green-500/40' : 'bg-white/10')} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}