import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { CheckCircle2, Circle, Plus, Trash2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

export default function DesignerSection({ workOrderId }) {
  const queryClient = useQueryClient();
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskAssignedTo, setNewTaskAssignedTo] = useState('');
  const [designerNotes, setDesignerNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // Fetch work order to get designer notes
  const { data: workOrder } = useQuery({
    queryKey: ['workOrder', workOrderId],
    queryFn: async () => {
      const list = await base44.entities.WorkOrder.filter({ id: workOrderId });
      return list[0] || null;
    },
    enabled: !!workOrderId
  });

  // Fetch tasks for this work order (designer type)
  const { data: tasks = [] } = useQuery({
    queryKey: ['designerTasks', workOrderId],
    queryFn: async () => {
      const allTasks = await base44.entities.Task.filter({ work_order_id: workOrderId });
      return allTasks.filter(t => t.type === 'design' || !t.type) || [];
    },
    enabled: !!workOrderId
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (taskData) => {
      return base44.entities.Task.create({
        ...taskData,
        work_order_id: workOrderId,
        status: 'to_do',
        assigned_to_name: taskData.assigned_to_name || ''
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['designerTasks', workOrderId] });
      setNewTaskName('');
      setNewTaskDesc('');
      setNewTaskAssignedTo('');
      setIsAddingTask(false);
      toast.success('Task created');
    }
  });

  // Update task status mutation
  const updateTaskMutation = useMutation({
    mutationFn: ({ id, status }) => {
      const updateData = { status };
      // Add completed timestamp when marking as done
      if (status === 'completed') {
        updateData.completed_date = new Date().toISOString();
      }
      return base44.entities.Task.update(id, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['designerTasks', workOrderId] });
      toast.success('Task updated');
    }
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: (taskId) => base44.entities.Task.delete(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['designerTasks', workOrderId] });
      toast.success('Task deleted');
    }
  });

  // Save designer notes
  const handleSaveDesignerNotes = async () => {
    if (!workOrder) return;
    setIsSavingNotes(true);
    try {
      await base44.entities.WorkOrder.update(workOrderId, {
        deviations: designerNotes // Using deviations field for designer notes
      });
      queryClient.invalidateQueries({ queryKey: ['workOrder', workOrderId] });
      toast.success('Notes saved');
    } catch (e) {
      toast.error('Could not save notes');
    } finally {
      setIsSavingNotes(false);
    }
  };

  // Initialize notes from workOrder
  React.useEffect(() => {
    if (workOrder?.deviations) {
      setDesignerNotes(workOrder.deviations);
    }
  }, [workOrder]);

  const completedCount = tasks.filter(t => t.status === 'completed').length;

  return (
    <div className="bg-white/5 rounded-2xl border border-white/10 p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />
            Construction and Design Lino
          </h3>
          {tasks.length > 0 && (
          <p className="text-xs text-white/50 mt-1">
            {completedCount} of {tasks.length} tasks completed
          </p>
          )}
        </div>
      </div>

      {/* Designer Notes */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-white/70">Designer notes</label>
        <Textarea
          value={designerNotes}
          onChange={(e) => setDesignerNotes(e.target.value)}
          placeholder="Add instructions, notes or special requirements for the designer..."
          className="bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-none"
          rows={3}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleSaveDesignerNotes}
          disabled={isSavingNotes}
          className="bg-white/5 border-white/20 hover:bg-white/10 text-white text-xs"
        >
          {isSavingNotes ? 'Saving...' : 'Save notes'}
        </Button>
      </div>

      {/* Tasks Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-white">Tasks for the designer</h4>
          {!isAddingTask && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsAddingTask(true)}
              className="text-blue-400 hover:text-blue-300 hover:bg-white/5 text-xs gap-1"
            >
              <Plus className="w-3 h-3" />
              Add task
            </Button>
          )}
        </div>

        {/* Add Task Form */}
         {isAddingTask && (
           <div className="bg-white/5 rounded-lg p-3 space-y-2 border border-white/10">
             <Input
               placeholder="Task title..."
               value={newTaskName}
               onChange={(e) => setNewTaskName(e.target.value)}
               className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-sm"
             />
             <Textarea
               placeholder="Description (optional)..."
               value={newTaskDesc}
               onChange={(e) => setNewTaskDesc(e.target.value)}
               className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-sm resize-none"
               rows={2}
             />
             <Input
               placeholder="Assigned to (e.g., John Doe, Design Team)..."
               value={newTaskAssignedTo}
               onChange={(e) => setNewTaskAssignedTo(e.target.value)}
               className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-sm"
             />
             <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => {
                  if (!newTaskName.trim()) {
                    toast.error('Task title cannot be empty');
                    return;
                  }
                  createTaskMutation.mutate({
                    name: newTaskName,
                    description: newTaskDesc,
                    assigned_to_name: newTaskAssignedTo
                  });
                }}
                disabled={createTaskMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
              >
                {createTaskMutation.isPending ? 'Creating...' : 'Create'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                   setIsAddingTask(false);
                   setNewTaskName('');
                   setNewTaskDesc('');
                   setNewTaskAssignedTo('');
                 }}
                className="text-white/60 hover:text-white hover:bg-white/5 text-xs"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Tasks List */}
        {tasks.length > 0 ? (
          <div className="space-y-2">
            {tasks.map(task => (
              <div
                key={task.id}
                className="bg-white/5 rounded-lg p-3 border border-white/10 flex items-start gap-3 hover:border-white/20 transition-colors"
              >
                <button
                  onClick={() => {
                    const newStatus = task.status === 'completed' ? 'to_do' : 'completed';
                    updateTaskMutation.mutate({ id: task.id, status: newStatus });
                  }}
                  disabled={updateTaskMutation.isPending}
                  className="mt-0.5 text-white/50 hover:text-white transition-colors flex-shrink-0"
                >
                  {task.status === 'completed' ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <Circle className="w-5 h-5" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                   <p
                     className={`text-sm font-medium ${
                       task.status === 'completed'
                         ? 'text-white/50 line-through'
                         : 'text-white'
                     }`}
                   >
                     {task.name}
                   </p>
                   {task.assigned_to_name && (
                     <p className="text-xs text-blue-400 mt-1">Assigned to: {task.assigned_to_name}</p>
                   )}
                   {task.description && (
                     <p className="text-xs text-white/40 mt-1">{task.description}</p>
                   )}
                   {task.due_date && (
                     <p className="text-xs text-white/40 mt-1">
                       Due: {format(new Date(task.due_date), 'PPP', { locale: sv })}
                     </p>
                   )}
                   {task.status === 'completed' && task.completed_date && (
                     <p className="text-xs text-green-400/70 mt-1">
                       ✓ Completed {format(new Date(task.completed_date), 'PPP HH:mm', { locale: sv })}
                     </p>
                   )}
                 </div>

                <button
                  onClick={() => {
                    if (confirm('Delete this task?')) {
                      deleteTaskMutation.mutate(task.id);
                    }
                  }}
                  disabled={deleteTaskMutation.isPending}
                  className="text-white/40 hover:text-red-400 transition-colors flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            {isAddingTask ? null : (
              <>
                <AlertCircle className="w-5 h-5 text-white/30 mx-auto mb-2" />
                <p className="text-sm text-white/50">No tasks yet</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}