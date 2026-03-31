import React from 'react';
import { Factory, CheckCircle2, Camera, AlertCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function ProductionChecklist({ 
  workOrder,
  order,
  onChecklistChange, 
  onSaveNotes, 
  onImageUpload, 
  onCompleteProduction,
  uploading
}) {
  const checklist = workOrder.checklist || {};
  const allChecked = checklist.assembled && checklist.tested && checklist.ready_for_delivery;
  const canStartProduction = workOrder.all_materials_ready || !workOrder.materials_needed?.some(m => m.needs_purchase);

  const checklistItems = [
    { key: 'assembled', label: 'Monterat' },
    { key: 'tested', label: 'Testat' },
    { key: 'ready_for_delivery', label: 'Redo för leverans' }
  ];

  return (
    <div className="p-5 rounded-2xl bg-blue-500/10 border border-blue-500/30">
      <div className="flex items-start justify-between mb-4">
        <h2 className="font-bold text-blue-400 flex items-center gap-2">
          <Factory className="w-5 h-5" />
          Produktion
        </h2>
      </div>

      {/* Fortnox Info */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {[
          { label: 'Projekt', value: order?.fortnox_project_number || '—' },
          { label: 'Order', value: order?.fortnox_order_id || '—' }
        ].map(({ label, value }) => (
          <div key={label} className="p-2 rounded bg-blue-500/20 border border-blue-500/30">
            <p className="text-xs text-blue-300 mb-1">{label}</p>
            <p className="text-xs font-medium text-blue-100 break-words">{value}</p>
          </div>
        ))}
      </div>

      {!canStartProduction && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 mb-4 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-400">Kan ej starta – väntar på blockerande material</p>
        </div>
      )}

      {workOrder.production_started_date && (
        <>
          {/* Checklist */}
          <div className="space-y-2 mb-4">
            {checklistItems.map(({ key, label }) => (
              <label key={key} className="flex items-center gap-3 p-3 rounded-lg bg-white/5 cursor-pointer hover:bg-white/10">
                <Checkbox
                  checked={!!checklist[key]}
                  onCheckedChange={() => onChecklistChange(key)}
                />
                <span className={cn("text-sm font-medium", checklist[key] ? 'text-white' : 'text-white/60')}>
                  {label}
                </span>
                {checklist[key] && <CheckCircle2 className="w-4 h-4 text-green-400 ml-auto" />}
              </label>
            ))}
          </div>

          {/* Deviations */}
          <div className="mb-4">
            <label className="text-xs text-white/50 mb-1 block font-medium">Avvikelser / noteringar</label>
            <Textarea
              defaultValue={workOrder.deviations || ''}
              onBlur={e => onSaveNotes('deviations', e.target.value)}
              placeholder="Noterade avvikelser..."
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-sm"
              rows={2}
            />
          </div>

          {/* Assembly Images */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-white/50 font-medium">Monteringsbilder</span>
              <label className={cn("text-xs px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white cursor-pointer transition-colors flex items-center gap-1", 
                uploading && "opacity-50")}>
                {uploading ? <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Laddar...</> : 
                <><Camera className="w-3 h-3" />Lägg till bild</>}
                <input type="file" accept="image/*" multiple className="hidden" onChange={onImageUpload} disabled={uploading} />
              </label>
            </div>
            {workOrder.assembly_images?.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {workOrder.assembly_images.map((url, i) => (
                  <img key={i} src={url} alt="" className="w-16 h-16 rounded-lg object-cover border border-white/10" />
                ))}
              </div>
            )}
          </div>

          {allChecked && (
            <Button onClick={onCompleteProduction} className="bg-green-600 hover:bg-green-500 text-white w-full">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Slutför produktion → Leverans
            </Button>
          )}
        </>
      )}
    </div>
  );
}