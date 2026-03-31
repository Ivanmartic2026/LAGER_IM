import React from 'react';
import { Textarea } from "@/components/ui/textarea";

export default function ProjectInfo({ workOrder, onSaveNotes }) {
  return (
    <div className="space-y-4 p-5 rounded-2xl bg-white/5 border border-white/10">
      {/* Project Description */}
      <div>
        <label className="text-xs text-white/50 mb-2 block font-medium">Projektbeskrivning</label>
        <p className="text-sm text-white/70 p-3 rounded-lg bg-white/5 border border-white/10">
          {workOrder.name || '—'}
        </p>
      </div>

      {/* Customer Instructions */}
      <div>
        <label className="text-xs text-white/50 mb-2 block font-medium">Kundinstruktioner</label>
        <Textarea
          defaultValue={workOrder.picking_notes || ''}
          onBlur={e => onSaveNotes('picking_notes', e.target.value)}
          placeholder="Lägg till kundinstruktioner här..."
          className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-sm"
          rows={4}
        />
      </div>
    </div>
  );
}