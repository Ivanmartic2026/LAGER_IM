import React, { useState } from 'react';
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Package, CheckCircle2, Camera, FileText, Truck, Phone, ArrowRight, Minus, CheckSquare, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveStage } from "@/components/workorders/ProcessFlow";

const STAGE_CONFIG = {
  konstruktion: { label: 'Konstruktion', icon: '📐', next: 'produktion', nextLabel: 'Gå till Produktion' },
  produktion:   { label: 'Produktion',   icon: '🔧', next: 'lager',      nextLabel: 'Gå till Lager' },
  lager:        { label: 'Lager',        icon: '📦', next: 'montering',  nextLabel: 'Gå till Montering' },
  montering:    { label: 'Montering',    icon: '🔩', next: 'leverans',   nextLabel: 'Gå till Leverans' },
  leverans:     { label: 'Leverans',     icon: '🚛', next: null,         nextLabel: 'Slutför order' },
};

function ResponsibleBadge({ name, email }) {
  const display = name || email;
  if (!display) return null;
  const initials = display.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  return (
    <div className="flex items-center gap-2 text-sm text-white/60">
      <div className="w-7 h-7 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-[10px] font-bold text-blue-300">
        {initials}
      </div>
      <span>{display}</span>
    </div>
  );
}

function ArticleCheckList({ items, articles, onWithdraw }) {
  const [checkedItems, setCheckedItems] = useState({});

  const toggle = (id) => {
    setCheckedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (!items.length) return <p className="text-white/40 text-sm">Inga artiklar kopplade till denna order.</p>;

  const allChecked = items.every(item => checkedItems[item.id] || item.status === 'picked');

  return (
    <div className="space-y-2">
      {items.map(item => {
        const article = articles.find(a => a.id === item.article_id);
        const isPicked = item.status === 'picked';
        const isChecked = checkedItems[item.id] || isPicked;

        return (
          <div
            key={item.id}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
              isChecked ? 'bg-green-500/10 border-green-500/20' : 'bg-white/5 border-white/10 hover:bg-white/8'
            )}
            onClick={() => !isPicked && toggle(item.id)}
          >
            {isChecked
              ? <CheckSquare className="w-5 h-5 text-green-400 shrink-0" />
              : <Square className="w-5 h-5 text-white/30 shrink-0" />
            }
            <div className="flex-1 min-w-0">
              <p className={cn("text-sm font-medium", isChecked ? 'text-green-300 line-through' : 'text-white')}>
                {item.article_name}
              </p>
              {article?.shelf_address?.[0] && (
                <p className="text-xs text-white/40 mt-0.5">{article.shelf_address[0]}</p>
              )}
            </div>
            <span className="text-sm text-white/50 shrink-0">{item.quantity_ordered} st</span>
            {isPicked && (
              <Badge className="bg-green-500/20 border-green-500/30 text-green-400 text-[10px]">Uttagen ✓</Badge>
            )}
          </div>
        );
      })}
      <Button
        size="sm"
        className={cn(
          "w-full mt-3 gap-2 border transition-all",
          allChecked
            ? 'bg-green-500/20 border-green-500/30 text-green-300 hover:bg-green-500/30'
            : 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20'
        )}
        onClick={onWithdraw}
      >
        <Minus className="w-4 h-4" />
        {allChecked ? 'Ta ut alla från lagret ✓' : 'Ta ut från Lagret'}
      </Button>
    </div>
  );
}

export default function StageContent({
  workOrder, order, orderItems, articles,
  onSaveNotes, onWithdraw, onImageUpload, onChecklistChange, onAdvanceStage,
  uploadingImages
}) {
  const stage = resolveStage(workOrder);
  const stageConf = STAGE_CONFIG[stage];
  const nextStage = stageConf?.next;

  const responsibleName = workOrder[`assigned_to_${stage}_name`];
  const responsibleEmail = workOrder[`assigned_to_${stage}`];

  const handleAdvance = () => {
    if (nextStage) {
      onAdvanceStage(nextStage);
    } else {
      onAdvanceStage('completed');
    }
  };

  const checklist = workOrder.checklist || {};

  return (
    <div className="space-y-4">
      {/* Hero: current stage + responsible + advance button */}
      <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">{stageConf?.icon}</span>
              <h2 className="text-lg font-bold text-white">{stageConf?.label}</h2>
            </div>
            <div className="mt-2">
              <p className="text-xs text-white/40 mb-1">Ansvarig</p>
              <ResponsibleBadge name={responsibleName} email={responsibleEmail} />
              {!responsibleName && !responsibleEmail && (
                <p className="text-white/30 text-sm">Ingen tilldelad</p>
              )}
            </div>
          </div>
          {stageConf && (
            <Button
              onClick={handleAdvance}
              className="bg-blue-600 hover:bg-blue-500 text-white gap-2 font-semibold shrink-0"
            >
              {stageConf.nextLabel}
              <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Stage-specific content */}
      {stage === 'konstruktion' && (
        <div className="space-y-4">
          {workOrder.project_description && (
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
              <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2">Projektbeskrivning</h3>
              <p className="text-sm text-white/70">{workOrder.project_description}</p>
            </div>
          )}
          <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
            <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3 flex items-center gap-2">
              <FileText className="w-3.5 h-3.5" />
              Konstruktionsanteckningar
            </h3>
            <Textarea
              key={workOrder.id + '_konstruktion'}
              defaultValue={workOrder.picking_notes || ''}
              onBlur={e => onSaveNotes('picking_notes', e.target.value)}
              placeholder="Anteckningar för konstruktionsfasen..."
              className="bg-black/40 border-white/10 text-white placeholder:text-white/30 text-sm focus:border-white/30"
              rows={4}
            />
          </div>
        </div>
      )}

      {stage === 'produktion' && (
        <div className="space-y-4">
          {/* BOM / drawing links */}
          {(workOrder.drawing_url || workOrder.bill_of_materials_url) && (
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
              <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">Dokument</h3>
              <div className="flex flex-wrap gap-2">
                {workOrder.drawing_url && (
                  <a href={workOrder.drawing_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 text-sm bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-lg">
                    <FileText className="w-3.5 h-3.5" /> Ritning
                  </a>
                )}
                {workOrder.bill_of_materials_url && (
                  <a href={workOrder.bill_of_materials_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 text-sm bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-lg">
                    <FileText className="w-3.5 h-3.5" /> Stycklista (BOM)
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Articles */}
          <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
            <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Package className="w-3.5 h-3.5" />
              Artiklar ({orderItems.length})
            </h3>
            <ArticleCheckList items={orderItems} articles={articles} onWithdraw={onWithdraw} />
          </div>

          {/* Assembly images */}
          <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
            <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Camera className="w-3.5 h-3.5" />
              Monteringsbilder
            </h3>
            {(workOrder.assembly_images || []).length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                {workOrder.assembly_images.map((url, i) => (
                  <img key={i} src={url} alt="" className="w-full aspect-square object-cover rounded-lg" />
                ))}
              </div>
            )}
            <label className="block">
              <input type="file" accept="image/*" multiple onChange={onImageUpload} className="hidden" disabled={uploadingImages} />
              <div className="p-3 rounded-lg border border-dashed border-white/20 hover:border-white/40 text-center cursor-pointer">
                <p className="text-white/50 text-sm">{uploadingImages ? 'Laddar upp...' : '+ Lägg till bild'}</p>
              </div>
            </label>
          </div>

          {/* Notes */}
          <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
            <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">Produktionsanteckningar</h3>
            <Textarea
              key={workOrder.id + '_produktion'}
              defaultValue={workOrder.production_notes || ''}
              onBlur={e => onSaveNotes('production_notes', e.target.value)}
              placeholder="Anteckningar för produktion..."
              className="bg-black/40 border-white/10 text-white placeholder:text-white/30 text-sm focus:border-white/30"
              rows={3}
            />
          </div>
        </div>
      )}

      {stage === 'lager' && (
        <div className="space-y-4">
          {/* Pick list */}
          <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
            <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Package className="w-3.5 h-3.5" />
              Plocklista ({orderItems.length} artiklar)
            </h3>
            <ArticleCheckList items={orderItems} articles={articles} onWithdraw={onWithdraw} />
          </div>
          {/* Picking notes */}
          <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
            <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">Plockanteckningar</h3>
            <Textarea
              key={workOrder.id + '_lager'}
              defaultValue={workOrder.picking_notes || ''}
              onBlur={e => onSaveNotes('picking_notes', e.target.value)}
              placeholder="Noteringar vid plockning..."
              className="bg-black/40 border-white/10 text-white placeholder:text-white/30 text-sm focus:border-white/30"
              rows={3}
            />
          </div>
        </div>
      )}

      {stage === 'montering' && (
        <div className="space-y-4">
          {/* Checklist */}
          <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
            <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">Monteringschecklista</h3>
            <div className="space-y-2">
              {[
                { field: 'picked', label: 'Plockat' },
                { field: 'assembled', label: 'Monterat' },
                { field: 'tested', label: 'Testat' },
                { field: 'packed', label: 'Paketerat' },
                { field: 'ready_for_delivery', label: 'Redo för leverans' },
              ].map(({ field, label }) => (
                <div
                  key={field}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                    checklist[field] ? 'bg-green-500/10 border-green-500/20' : 'bg-white/5 border-white/10 hover:bg-white/8'
                  )}
                  onClick={() => onChecklistChange(field)}
                >
                  {checklist[field]
                    ? <CheckSquare className="w-5 h-5 text-green-400 shrink-0" />
                    : <Square className="w-5 h-5 text-white/30 shrink-0" />
                  }
                  <span className={cn("text-sm font-medium", checklist[field] ? 'text-green-300' : 'text-white/70')}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Assembly images */}
          <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
            <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Camera className="w-3.5 h-3.5" />
              Monteringsbilder
            </h3>
            {(workOrder.assembly_images || []).length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                {workOrder.assembly_images.map((url, i) => (
                  <img key={i} src={url} alt="" className="w-full aspect-square object-cover rounded-lg" />
                ))}
              </div>
            )}
            <label className="block">
              <input type="file" accept="image/*" multiple onChange={onImageUpload} className="hidden" disabled={uploadingImages} />
              <div className="p-3 rounded-lg border border-dashed border-white/20 hover:border-white/40 text-center cursor-pointer">
                <p className="text-white/50 text-sm">{uploadingImages ? 'Laddar upp...' : '+ Lägg till bild'}</p>
              </div>
            </label>
          </div>

          <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
            <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">Monteringsanteckningar</h3>
            <Textarea
              key={workOrder.id + '_montering'}
              defaultValue={workOrder.production_notes || ''}
              onBlur={e => onSaveNotes('production_notes', e.target.value)}
              placeholder="Anteckningar för montering..."
              className="bg-black/40 border-white/10 text-white placeholder:text-white/30 text-sm focus:border-white/30"
              rows={3}
            />
          </div>
        </div>
      )}

      {stage === 'leverans' && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
            <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Truck className="w-3.5 h-3.5" />
              Leveransinformation
            </h3>
            <div className="space-y-3">
              {(workOrder.delivery_contact_name || workOrder.technician_name) && (
                <div>
                  <p className="text-xs text-white/40 mb-1">Leveranskontakt</p>
                  <div className="flex items-center gap-2 text-sm text-white/70">
                    <User className="w-4 h-4 text-white/40" />
                    <span>{workOrder.delivery_contact_name || workOrder.technician_name}</span>
                  </div>
                </div>
              )}
              {(workOrder.delivery_contact_phone || workOrder.technician_phone) && (
                <div>
                  <p className="text-xs text-white/40 mb-1">Telefon</p>
                  <div className="flex items-center gap-2 text-sm text-white/70">
                    <Phone className="w-4 h-4 text-white/40" />
                    <a href={`tel:${workOrder.delivery_contact_phone || workOrder.technician_phone}`}
                      className="text-blue-400 hover:text-blue-300">
                      {workOrder.delivery_contact_phone || workOrder.technician_phone}
                    </a>
                  </div>
                </div>
              )}
              {order?.delivery_method && (
                <div>
                  <p className="text-xs text-white/40 mb-1">Leveranssätt</p>
                  <p className="text-sm text-white/70 capitalize">{order.delivery_method}</p>
                </div>
              )}
              {order?.tracking_number && (
                <div>
                  <p className="text-xs text-white/40 mb-1">Spårningsnummer</p>
                  <p className="text-sm text-white font-mono">{order.tracking_number}</p>
                </div>
              )}
              {order?.delivery_address && (
                <div>
                  <p className="text-xs text-white/40 mb-1">Leveransadress</p>
                  <p className="text-sm text-white/70">{order.delivery_address}</p>
                </div>
              )}
            </div>
          </div>
          <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
            <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">Leveransanteckningar</h3>
            <Textarea
              key={workOrder.id + '_leverans'}
              defaultValue={workOrder.production_notes || ''}
              onBlur={e => onSaveNotes('production_notes', e.target.value)}
              placeholder="Anteckningar för leverans..."
              className="bg-black/40 border-white/10 text-white placeholder:text-white/30 text-sm focus:border-white/30"
              rows={3}
            />
          </div>
        </div>
      )}
    </div>
  );
}