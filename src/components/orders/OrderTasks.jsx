import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, CheckCircle2, Circle, ClipboardList, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

const priorityColors = {
  low: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  normal: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  urgent: "bg-red-500/20 text-red-400 border-red-500/30",
};

const priorityLabels = {
  low: "Låg",
  normal: "Normal",
  high: "Hög",
  urgent: "Akut",
};

const statusColors = {
  to_do: "text-slate-400",
  in_progress: "text-blue-400",
  completed: "text-green-400",
  cancelled: "text-red-400",
};

export default function OrderTasks({ orderId }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [newTask, setNewTask] = useState({ name: '', priority: 'normal', assigned_to: '', description: '' });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', orderId],
    queryFn: () => base44.entities.Task.filter({ order_id: orderId }),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Task.create({ ...data, order_id: orderId, status: 'to_do' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', orderId] });
      setNewTask({ name: '', priority: 'normal', assigned_to: '', description: '' });
      setShowForm(false);
      toast.success("Uppgift skapad");
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks', orderId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Task.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', orderId] });
      toast.success("Uppgift borttagen");
    }
  });

  const toggleStatus = (task) => {
    const next = task.status === 'completed' ? 'to_do' : 'completed';
    updateMutation.mutate({ id: task.id, data: { status: next } });
  };

  const handleCreate = (e) => {
    e.preventDefault();
    if (!newTask.name.trim()) return toast.error("Ange ett namn");
    createMutation.mutate(newTask);
  };

  return (
    <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <ClipboardList className="w-4 h-4" />
          Uppgifter ({tasks.length})
        </h3>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setShowForm(!showForm)}
          className="h-7 text-xs text-blue-400 hover:text-blue-300"
        >
          {showForm ? <ChevronUp className="w-4 h-4 mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
          {showForm ? 'Dölj' : 'Ny uppgift'}
        </Button>
      </div>

      {showForm && (
         <div className="mb-4 space-y-2 p-3 rounded-lg bg-slate-900/60 border border-slate-700">
           <Input
             placeholder="Uppgiftens namn *"
             value={newTask.name}
             onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
             className="bg-slate-800 border-slate-700 text-white text-sm h-8"
           />
           <div className="grid grid-cols-2 gap-2">
             <select
               value={newTask.priority}
               onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
               className="bg-slate-800 border border-slate-700 text-white text-sm rounded-md px-2 h-8"
             >
               <option value="low">Låg prioritet</option>
               <option value="normal">Normal prioritet</option>
               <option value="high">Hög prioritet</option>
               <option value="urgent">Akut prioritet</option>
             </select>
             <Input
               placeholder="Tilldelad (email)"
               value={newTask.assigned_to}
               onChange={(e) => setNewTask({ ...newTask, assigned_to: e.target.value })}
               className="bg-slate-800 border-slate-700 text-white text-sm h-8"
             />
           </div>
           <Textarea
             placeholder="Beskrivning..."
             value={newTask.description}
             onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
             className="bg-slate-800 border-slate-700 text-white text-sm h-16 resize-none"
           />
           <div className="flex gap-2">
             <Button size="sm" onClick={handleCreate} disabled={createMutation.isPending} className="bg-blue-600 hover:bg-blue-500 h-7 text-xs">
               {createMutation.isPending ? 'Sparar...' : 'Spara'}
             </Button>
             <Button size="sm" variant="ghost" onClick={() => setShowForm(false)} className="h-7 text-xs text-slate-400">
               Avbryt
             </Button>
           </div>
         </div>
       )}

      {tasks.length === 0 && !showForm && (
        <p className="text-sm text-slate-500 text-center py-2">Inga uppgifter ännu</p>
      )}

      <div className="space-y-2">
        {tasks.map((task) => (
          <div key={task.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-700/30 group">
            <button onClick={() => toggleStatus(task)} className="mt-0.5 flex-shrink-0">
              {task.status === 'completed'
                ? <CheckCircle2 className="w-4 h-4 text-green-400" />
                : <Circle className={cn("w-4 h-4", statusColors[task.status])} />
              }
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn("text-sm font-medium", task.status === 'completed' ? 'line-through text-slate-500' : 'text-white')}>
                  {task.name}
                </span>
                <Badge className={cn("text-xs h-4 px-1.5", priorityColors[task.priority])}>
                  {priorityLabels[task.priority]}
                </Badge>
              </div>
              {task.assigned_to && (
                <p className="text-xs text-slate-500 mt-0.5">{task.assigned_to}</p>
              )}
              {task.description && (
                <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{task.description}</p>
              )}
            </div>
            <button
              onClick={() => deleteMutation.mutate(task.id)}
              className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-opacity flex-shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}