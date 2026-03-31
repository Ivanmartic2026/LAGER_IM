import React from 'react';
import { Textarea } from "@/components/ui/textarea";
import { FileText } from "lucide-react";

export default function NotesSection({ notes = '', onSaveNotes }) {
  return (
    <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
      <h3 className="font-semibold text-white mb-3 flex items-center gap-2 text-sm">
        <FileText className="w-4 h-4 text-white/60" />
        Anteckningar
      </h3>
      <Textarea
        defaultValue={notes}
        onBlur={e => onSaveNotes('production_notes', e.target.value)}
        placeholder="Lägg till anteckningar..."
        className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-sm"
        rows={3}
      />
    </div>
  );
}