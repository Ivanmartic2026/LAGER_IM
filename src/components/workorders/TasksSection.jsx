import { useState } from 'react';
import { CheckSquare, Square, AlertTriangle, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const PRIORITY_CONFIG = {
  high:   { label: 'Hög',  color: 'text-red-400',    bg: 'border-red-500/30' },
  urgent: { label: 'AKUT', color: 'text-orange-400', bg: 'border-orange-500/30' },
  normal: { label: '',     color: '',                bg: 'border-white/10' },
  low:    { label: '',     color: '',                bg: 'border-white/10' },
};

const ROLES = [
  { value: 'pl_konstruktor', label: 'PL / Konstruktör', color: 'text-purple-400' },
  { value: 'lager',          label: 'Lager',            color: 'text-yellow-400' },
  { value: 'tekniker',       label: 'Tekniker',         color: 'text-green-400' },
  { value: '',               label: 'Övrigt',           color: 'text-white/40' },
];

const STATUS_LABELS = { to_do: 'Ej påbörjad', in_progress: 'Pågår', completed: 'Klar' };

function TaskItem({ task, onToggle }) {
  const pc = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.normal;
  const isDone = task.status === 'completed';
  return (
    <div className={`flex items-start gap-3 p-2.5 rounded-xl border transition-all ${isDone ? 'opacity-40' : ''} ${pc.bg} bg-white/3`}>
      <button onClick={() => onToggle(task)} className="mt-0.5 flex-shrink-0 hover:opacity-80">
        {isDone ? <CheckSquare className="w-4 h-4 text-green-400" /> : <Square className="w-4 h-4 text-white/30" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${isDone ? 'line-through text-white/40' : 'text-white'}`}>{task.name}</p>
        {task.description && <p className="text-xs text-white/40 mt-0.5">{task.description}</p>}
        <div className="flex items-center gap-2 mt-1">
          {(task.priority === 'high' || task.priority === 'urgent') && (
            <span className={`flex items-center gap-0.5 text-[10px] font-bold ${pc.color}`}>
              <AlertTriangle className="w-3 h-3" />{pc.label}
            </span>
          )}
          <span className="text-[10px] text-white/30">{STATUS_LABELS[task.status] || task.status}</span>
        </div>
      </div>
    </div>
  );
}

function AddTaskForm({ onAdd, onCancel, workOrderId, orderId, defaultRole }) {
  const [name, setName] = useState('');
  const [priority, setPriority] = useState('normal');
  const [role, setRole] = useState(defaultRole || '');
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await base44.entities.Task.create({
        name: name.trim(), priority, role: role || null,
        status: 'to_do',
        work_order_id: workOrderId,
        order_id: orderId,
      });
      onAdd();
    } catch {
      toast.error('Kunde inte skapa uppgift');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-2 p-3 rounded-xl bg-white/5 border border-white/10 space-y-2">
      <Input value={name} onChange={e => setName(e.target.value)} placeholder="Uppgiftens namn..."
        className="bg-white/5 border-white/10 text-white text-sm h-8"
        onKeyDown={e => e.key === 'Enter' && handleAdd()} autoFocus />
      <div className="flex gap-2">
        <select value={priority} onChange={e => setPriority(e.target.value)}
          className="flex-1 bg-white/5 border border-white/10 text-white text-xs rounded-lg px-2 py-1.5">
          <option value="normal">Normal prioritet</option>
          <option value="high">Hög prioritet</option>
          <option value="urgent">AKUT</option>
          <option value="low">Låg</option>
        </select>
        <select value={role} onChange={e => setRole(e.target.value)}
          className="flex-1 bg-white/5 border border-white/10 text-white text-xs rounded-lg px-2 py-1.5">
          {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>
      <div className="flex gap-2">
        <Button onClick={handleAdd} disabled={saving || !name.trim()} className="bg-blue-600 hover:bg-blue-500 h-7 text-xs flex-1">
          {saving ? 'Sparar...' : 'Lägg till'}
        </Button>
        <Button onClick={onCancel} variant="ghost" className="h-7 text-xs text-white/50">
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

function RoleGroup({ role, tasks, onToggle, workOrderId, orderId, onRefresh }) {
  const [adding, setAdding] = useState(false);
  if (tasks.length === 0 && !adding) return null;

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs font-bold uppercase tracking-wider ${role.color}`}>
          {role.label} ({tasks.length})
        </span>
        <button onClick={() => setAdding(true)} className="text-white/30 hover:text-white/60 transition-colors">
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="space-y-1.5">
        {tasks.map(t => <TaskItem key={t.id} task={t} onToggle={onToggle} />)}
        {adding && (
          <AddTaskForm defaultRole={role.value} workOrderId={workOrderId} orderId={orderId}
            onAdd={() => { setAdding(false); onRefresh(); }}
            onCancel={() => setAdding(false)} />
        )}
      </div>
    </div>
  );
}

export default function TasksSection({ tasks = [], workOrderId, orderId, onTaskUpdated }) {
  const [updating, setUpdating] = useState(null);
  const [addingGeneral, setAddingGeneral] = useState(false);

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

  // Sort each role group: urgent/high first, then incomplete before complete
  const pOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
  const sortTasks = (arr) => [...arr].sort((a, b) => {
    const pa = pOrder[a.priority] ?? 2, pb = pOrder[b.priority] ?? 2;
    if (pa !== pb) return pa - pb;
    if (a.status === 'completed' && b.status !== 'completed') return 1;
    if (b.status === 'completed' && a.status !== 'completed') return -1;
    return 0;
  });

  const grouped = ROLES.map(role => ({
    ...role,
    tasks: sortTasks(tasks.filter(t => (t.role || '') === role.value))
  }));

  const totalDone = tasks.filter(t => t.status === 'completed').length;

  return (
    <div className="bg-black rounded-2xl border border-white/10 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-green-400" />
          Uppgifter
          <span className="text-xs text-white/40 font-normal">({totalDone}/{tasks.length} klara)</span>
        </h3>
        <button onClick={() => setAddingGeneral(true)} className="flex items-center gap-1 text-xs text-white/40 hover:text-white/70 transition-colors">
          <Plus className="w-3.5 h-3.5" /> Ny uppgift
        </button>
      </div>

      {addingGeneral && (
        <AddTaskForm workOrderId={workOrderId} orderId={orderId}
          onAdd={() => { setAddingGeneral(false); onTaskUpdated?.(); }}
          onCancel={() => setAddingGeneral(false)} />
      )}

      {tasks.length === 0 && !addingGeneral ? (
        <p className="text-sm text-white/30 text-center py-4">Inga uppgifter ännu</p>
      ) : (
        <div className="mt-3">
          {grouped.map(role => (
            <RoleGroup key={role.value} role={role} tasks={role.tasks}
              onToggle={toggleTask} workOrderId={workOrderId} orderId={orderId} onRefresh={onTaskUpdated} />
          ))}
        </div>
      )}
    </div>
  );
}