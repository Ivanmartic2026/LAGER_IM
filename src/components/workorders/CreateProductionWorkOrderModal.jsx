import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Factory, X } from "lucide-react";

export default function CreateProductionWorkOrderModal({ open, onOpenChange }) {
  const [formData, setFormData] = useState({
    order_number: '',
    customer_name: '',
    delivery_date: '',
    notes: ''
  });
  const queryClient = useQueryClient();

  const createWorkOrderMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      return base44.entities.WorkOrder.create({
        order_id: '',
        order_number: data.order_number,
        customer_name: data.customer_name,
        delivery_date: data.delivery_date || null,
        current_stage: 'production',
        status: 'pending',
        production_notes: data.notes,
        assigned_to_production: user.email,
        assigned_to_production_name: user.full_name
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workOrders'] });
      toast.success('Arbetsorder skapad i produktion');
      setFormData({ order_number: '', customer_name: '', delivery_date: '', notes: '' });
      onOpenChange(false);
    },
    onError: () => {
      toast.error('Kunde inte skapa arbetsorder');
    }
  });

  const handleCreate = () => {
    if (!formData.customer_name.trim()) {
      toast.error('Kundnamn är obligatoriskt');
      return;
    }
    createWorkOrderMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Factory className="w-5 h-5 text-blue-400" />
            Ny produktionsarbetsorder
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Skapa en arbetsorder som startar direkt i produktion
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-white/60 mb-2 block">Ordernummer (valfritt)</label>
            <Input
              value={formData.order_number}
              onChange={e => setFormData({ ...formData, order_number: e.target.value })}
              placeholder="t.ex. ORD-2026-001"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
            />
          </div>

          <div>
            <label className="text-xs text-white/60 mb-2 block">Kundnamn *</label>
            <Input
              value={formData.customer_name}
              onChange={e => setFormData({ ...formData, customer_name: e.target.value })}
              placeholder="Kundnamn"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
            />
          </div>

          <div>
            <label className="text-xs text-white/60 mb-2 block">Leveransdatum (valfritt)</label>
            <Input
              type="date"
              value={formData.delivery_date}
              onChange={e => setFormData({ ...formData, delivery_date: e.target.value })}
              className="bg-white/5 border-white/10 text-white"
            />
          </div>

          <div>
            <label className="text-xs text-white/60 mb-2 block">Anteckningar</label>
            <Textarea
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Lägg till anteckningar..."
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-sm"
              rows={2}
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-white/10 text-white/70 hover:text-white"
          >
            Avbryt
          </Button>
          <Button
            onClick={handleCreate}
            disabled={createWorkOrderMutation.isPending}
            className="bg-blue-600 hover:bg-blue-500 text-white"
          >
            {createWorkOrderMutation.isPending ? 'Skapar...' : 'Skapa'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}