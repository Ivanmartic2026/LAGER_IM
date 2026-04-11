import { useState, useEffect } from 'react';
import { CheckSquare, Square, Plus, X, AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const PHASES = [
  { value: 'säljare',      label: 'Säljare',      color: 'text-slate-400',  bg: 'bg-slate-500/15',  border: 'border-slate-500/30',  headerBg: '#6B6B6B' },
  { value: 'konstruktion', label: 'Konstruktion', color: 'text-blue-400',   bg: 'bg-blue-500/15',   border: 'border-blue-500/30',   headerBg: '#2E5FA3' },
  { value: 'produktion',   label: 'Produktion',   color: 'text-purple-400', bg: 'bg-purple-500/15', border: 'border-purple-500/30', headerBg: '#7C3AED' },
  { value: 'lager',        label: 'Lager',        color: 'text-orange-400', bg: 'bg-orange-500/15', border: 'border-orange-500/30', headerBg: '#D97706' },
  { value: 'montering',    label: 'Montering',    color: 'text-green-400',  bg: 'bg-green-500/15',  border: 'border-green-500/30',  headerBg: '#2E7D32' },
];

const TEAM_MEMBERS = [
  'alexander.hansson@imvision.se',
  'emil.norlin@imvision.se',
  'ivan@imvision.se',
  'josefine@imvision.se',
  'lino@imvision.se',
  'mergim@imvision.se',
];

const pOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
const sortTasks = (arr) => [...arr].sort((a, b) => {
  const pa = pOrder[a.priority] ?? 2, pb = pOrder[b.priority] ?? 2;
  if (pa !== pb) return pa - pb;
  if (a.status === 'completed' && b.status !== 'completed') return 1;
  if (b.status === 'completed' && a.status !== 'completed') return -1;
  return 0;
});

function AddTaskForm({ phase, orderId, workOrderId, onAdded, onCancel }) {
  const [name, setName] = useState('');
  const [priority, setPriority] = useState('normal');
  const [assignedTo, setAssignedTo] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await base44.entities.Task.create({
        name: name.trim(),
        priority,
        phase,
        status: 'to_do',
        order_id: orderId || null,
        work_order_id: workOrderId || null,
        assigned_to: assignedTo || null,
        assigned_to_name: assignedTo ? assignedTo.split('@')[0].replace('.', ' ') : null,
        due_date: dueDate || null,
        notes: notes || null,
      });
      onAdded();
    } catch {
      toast.error('Kunde inte skapa uppgift');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-2 p-3 rounded-xl bg-white/5 border border-white/15 space-y-2">
      <Input value={name} onChange={e => setName(e.target.value)}
        placeholder="Uppgiftens namn..." autoFocus
        className="bg-white/5 border-white/10 text-white text-sm h-8"
        onKeyDown={e => e.key === 'Enter' && handleAdd()} />
      <div className="flex gap-2">
        <select value={priority} onChange={e => setPriority(e.target.value)}
          className="flex-1 bg-white/5 border border-white/10 text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none">
          <option value="normal">Normal</option>
          <option value="high">Hög prioritet</option>
          <option value="urgent">AKUT</option>
          <option value="low">Låg</option>
        </select>
        <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)}
          className="flex-1 bg-white/5 border border-white/10 text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none">
          <option value="">— Tilldelad —</option>
          {TEAM_MEMBERS.map(m => <option key={m} value={m}>{m.split('@')[0].replace('.', ' ')}</option>)}
        </select>
      </div>
      <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
        className="bg-white/5 border-white/10 text-white text-xs h-7" />
      <Input value={notes} onChange={e => setNotes(e.target.value)}
        placeholder="Anteckningar (valfritt)..."
        className="bg-white/5 border-white/10 text-white text-xs h-7" />
      <div className="flex gap-2">
        <Button onClick={handleAdd} disabled={saving || !name.trim()}
          className="bg-blue-600 hover:bg-blue-500 h-7 text-xs flex-1">
          {saving ? 'Sparar...' : 'Lägg till'}
        </Button>
        <Button onClick={onCancel} variant="ghost" className="h-7 text-xs text-white/50">
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

function PhaseGroup({ phase, tasks, orderId, workOrderId, onRefresh }) {
  const [adding, setAdding] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [toggling, setToggling] = useState(null);

  const sorted = sortTasks(tasks);
  const doneCount = tasks.filter(t => t.status === 'completed').length;
  const hasHigh = tasks.some(t => t.priority === 'high' || t.priority === 'urgent');

  const toggleTask = async (task) => {
    setToggling(task.id);
    try {
      await base44.entities.Task.update(task.id, {
        status: task.status === 'completed' ? 'to_do' : 'completed'
      });
      onRefresh();
    } catch {
      toast.error('Kunde inte uppdatera');
    } finally {
      setToggling(null);
    }
  };

  return (
    <div className={cn('rounded-xl border overflow-hidden', phase.border, phase.bg)}>
      {/* Phase header */}
      <div className="flex items-center justify-between px-3 py-2">
        <button onClick={() => setCollapsed(!collapsed)} className="flex items-center gap-2 flex-1 text-left">
          {collapsed ? <ChevronRight className={cn('w-3.5 h-3.5', phase.color)} /> : <ChevronDown className={cn('w-3.5 h-3.5', phase.color)} />}
          <span className={cn('text-xs font-bold uppercase tracking-wider', phase.color)}>{phase.label}</span>
          <span className="text-xs text-white/40 ml-1">
            {doneCount}/{tasks.length} klara
          </span>
          {hasHigh && <span className="text-[10px] text-red-400 font-bold ml-1">⚠</span>}
        </button>
        {!collapsed && (
          <button onClick={() => setAdding(true)}
            className={cn('flex items-center gap-1 text-xs font-medium transition-colors', phase.color, 'hover:opacity-80')}>
            <Plus className="w-3 h-3" />Lägg till
          </button>
        )}
      </div>

      {!collapsed && (
        <div className="px-3 pb-3">
          {/* Tasks */}
          {sorted.length === 0 && !adding ? (
            <p className="text-xs text-white/25 py-1 pl-1">Inga uppgifter i denna fas</p>
          ) : (
            <div className="space-y-1">
              {sorted.map(task => {
                const isHigh = task.priority === 'high' || task.priority === 'urgent';
                const isDone = task.status === 'completed';
                const isLoading = toggling === task.id;
                return (
                  <div key={task.id} className={cn(
                    'flex items-start gap-2 p-2 rounded-lg border transition-all',
                    isDone ? 'opacity-50' : '',
                    isHigh && !isDone ? 'border-red-500/30 bg-red-500/5' : 'border-white/5 bg-white/3'
                  )}>
                    <button onClick={() => toggleTask(task)} disabled={isLoading}
                      className="mt-0.5 flex-shrink-0">
                      {isDone
                        ? <CheckSquare className="w-4 h-4 text-green-400" />
                        : <Square className={cn('w-4 h-4', isHigh ? 'text-red-400/60' : 'text-white/25')} />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm font-medium leading-tight',
                        isDone ? 'line-through text-white/40' : isHigh ? 'text-red-200' : 'text-white')}>
                        {isHigh && !isDone && <span className="text-red-400 mr-1">★</span>}
                        {task.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {task.assigned_to_name && (
                          <span className="text-[10px] text-white/35">{task.assigned_to_name}</span>
                        )}
                        {task.due_date && (
                          <span className="text-[10px] text-white/35">→ {task.due_date}</span>
                        )}
                        {isHigh && !isDone && (
                          <span className={cn('text-[10px] font-bold', task.priority === 'urgent' ? 'text-orange-400' : 'text-red-400')}>
                            {task.priority === 'urgent' ? 'AKUT' : 'HÖG'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {adding && (
            <AddTaskForm phase={phase.value} orderId={orderId} workOrderId={workOrderId}
              onAdded={() => { setAdding(false); onRefresh(); }}
              onCancel={() => setAdding(false)} />
          )}
        </div>
      )}
    </div>
  );
}

export default function PhaseTasksSection({ tasks = [], orderId, workOrderId, onRefresh, title = "Uppgifter per fas" }) {
  const totalDone = tasks.filter(t => t.status === 'completed').length;

  return (
    <div className="bg-black rounded-2xl border border-white/10 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-green-400" />
          {title}
          <span className="text-xs text-white/40 font-normal">({totalDone}/{tasks.length} klara)</span>
        </h3>
      </div>
      <div className="space-y-2">
        {PHASES.map(phase => (
          <PhaseGroup
            key={phase.value}
            phase={phase}
            tasks={tasks.filter(t => (t.phase || '') === phase.value)}
            orderId={orderId}
            workOrderId={workOrderId}
            onRefresh={onRefresh}
          />
        ))}
      </div>
    </div>
  );
}