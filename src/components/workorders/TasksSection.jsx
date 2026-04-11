import { useState } from 'react';
import { CheckSquare, Square, AlertTriangle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const PRIORITY_CONFIG = {
  high:   { label: 'Hög',      color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/30' },
  urgent: { label: 'AKUT',     color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30' },
  normal: { label: 'Normal',   color: 'text-white/50',   bg: 'bg-white/5 border-white/10' },
  low:    { label: 'Låg',      color: 'text-white/30',   bg: 'bg-white/5 border-white/10' },
};

const STATUS_LABELS = {
  to_do:       'Ej påbörjad',
  in_progress: 'Pågår',
  completed:   'Klar',
  cancelled:   'Avbruten',
};

export default function TasksSection({ tasks, onTaskUpdated }) {
  const [updating, setUpdating] = useState(null);

  if (!tasks || tasks.length === 0) return null;

  const toggleTask = async (task) => {
    const newStatus = task.status === 'completed' ? 'to_do' : 'completed';
    setUpdating(task.id);
    try {
      await base44.entities.Task.update(task.id, { status: newStatus });
      onTaskUpdated?.();
    } catch {
      toast.error('Kunde inte uppdatera uppgift');
    } finally {
      setUpdating(null);
    }
  };

  // Sort: urgent > high > normal > low, then incomplete before complete
  const sorted = [...tasks].sort((a, b) => {
    const pOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
    const pa = pOrder[a.priority] ?? 2;
    const pb = pOrder[b.priority] ?? 2;
    if (pa !== pb) return pa - pb;
    // completed last
    if (a.status === 'completed' && b.status !== 'completed') return 1;
    if (b.status === 'completed' && a.status !== 'completed') return -1;
    return 0;
  });

  return (
    <div className="bg-black rounded-2xl border border-white/10 p-5">
      <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
        <CheckSquare className="w-4 h-4 text-green-400" />
        Uppgifter
        <span className="text-xs text-white/40 font-normal">({tasks.length} st)</span>
      </h3>

      <div className="space-y-2">
        {sorted.map(task => {
          const pc = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.normal;
          const isDone = task.status === 'completed';
          const isUpdating = updating === task.id;

          return (
            <div
              key={task.id}
              className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${isDone ? 'opacity-50' : ''} ${pc.bg}`}
            >
              <button
                onClick={() => toggleTask(task)}
                disabled={isUpdating}
                className="mt-0.5 flex-shrink-0 transition-opacity hover:opacity-80"
              >
                {isDone
                  ? <CheckSquare className="w-5 h-5 text-green-400" />
                  : <Square className="w-5 h-5 text-white/30" />
                }
              </button>

              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${isDone ? 'line-through text-white/40' : 'text-white'}`}>
                  {task.name}
                </p>
                {task.description && (
                  <p className="text-xs text-white/40 mt-0.5">{task.description}</p>
                )}
                <div className="flex items-center gap-2 mt-1.5">
                  {(task.priority === 'high' || task.priority === 'urgent') && (
                    <span className={`flex items-center gap-1 text-[10px] font-bold ${pc.color}`}>
                      <AlertTriangle className="w-3 h-3" />
                      {pc.label}
                    </span>
                  )}
                  <span className="text-[10px] text-white/30">{STATUS_LABELS[task.status] || task.status}</span>
                  {task.assigned_to_name && (
                    <span className="text-[10px] text-white/30">· {task.assigned_to_name}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}