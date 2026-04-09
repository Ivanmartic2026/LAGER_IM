import React, { useState } from 'react';
import { useState } from 'react';
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Package, CheckCircle2, Camera, FileText, Truck, Phone, ArrowRight, Minus, CheckSquare, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveStage } from "@/components/workorders/ProcessFlow";
import { base44 } from "@/api/base44Client";

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
    <div className="flex items-center gap-2 text-sm text-gray-300">
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

  if (!items.length) return <p className="text-gray-500 text-sm">Inga artiklar kopplade till denna order.</p>;

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
              : <Square className="w-5 h-5 text-gray-500 shrink-0" />
            }
            <div className="flex-1 min-w-0">
              <p className={cn("text-sm font-medium", isChecked ? 'text-green-300 line-through' : 'text-gray-100')}>
                {item.article_name}
              </p>
              {article?.shelf_address?.[0] && (
                <p className="text-xs text-gray-500 mt-0.5">{article.shelf_address[0]}</p>
              )}
            </div>
            <span className="text-sm text-gray-400 shrink-0">{item.quantity_ordered} st</span>
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
  uploadingImages, onAssignToUser
}) {
  const [assigningUser, setAssigningUser] = useState(false);
  const stage = resolveStage(workOrder);
  const stageConf = STAGE_CONFIG[stage];
  const nextStage = stageConf?.next;

  const responsibleName = workOrder[`assigned_to_${stage}_name`];
  const responsibleEmail = workOrder[`assigned_to_${stage}`];

  // Gate logic — check if current stage checklist is complete
  const isChecklistComplete = () => {
    if (stage === 'lager') return workOrder.checklist?.picked === true;
    if (stage === 'montering') return workOrder.checklist?.assembled === true && workOrder.checklist?.tested === true;
    if (stage === 'leverans') return workOrder.checklist?.packed === true && workOrder.checklist?.ready_for_delivery === true;
    return true; // konstruktion & produktion have no gate
  };

  const handleAdvance = () => {
    if (!isChecklistComplete()) {
      alert('Slutför checklistan innan du kan gå vidare');
      return;
    }
    if (nextStage) {
      onAdvanceStage(nextStage);
    } else {
      onAdvanceStage('completed');
    }
  };

  const handleAssignToMe = async () => {
    if (!onAssignToUser) return;
    setAssigningUser(true);
    try {
      const user = await base44.auth.me();
      if (user) {
        await onAssignToUser(stage, user.full_name, user.email);
      }
    } finally {
      setAssigningUser(false);
    }
  };

  const checklist = workOrder.checklist || {};

  return (
    <div className="space-y-4 rounded-2xl p-6" style={{ backgroundColor: '#111827' }}>
      {/* Hero: current stage + responsible + advance button */}
      <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">{stageConf?.icon}</span>
              <h2 className="text-lg font-bold text-gray-100">{stageConf?.label}</h2>
            </div>
            <div className="mt-2">
              <p className="text-xs text-gray-500 mb-1">Ansvarig</p>
              <ResponsibleBadge name={responsibleName} email={responsibleEmail} />
              {!responsibleName && !responsibleEmail && (
                <p className="text-gray-500 text-sm">Ingen tilldelad</p>
              )}
            </div>
          </div>
          {stageConf && (
            <Button
              onClick={handleAdvance}
              disabled={!isChecklistComplete()}
              className={cn(
                "gap-2 font-semibold shrink-0",
                isChecklistComplete() ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              )}
              title={!isChecklistComplete() ? 'Slutför checklistan innan du kan gå vidare' : ''}
            >
              {stageConf.nextLabel}
              <ArrowRight className="w-4 h-4" />
            </Button>
          )}
          </div>
          {!responsibleName && !responsibleEmail && (
          <Button
            onClick={handleAssignToMe}
            disabled={assigningUser}
            size="sm"
            className="mt-2 bg-purple-600/20 border border-purple-500/30 text-purple-300 hover:bg-purple-600/30 gap-2"
          >
            📋 {assigningUser ? 'Tilldelar...' : 'Ta denna uppgift'}
          </Button>
          )}
          </div>
          <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Leveransanteckningar</h3>
            <Textarea
              key={workOrder.id + '_leverans'}
              defaultValue={workOrder.production_notes || ''}
              onBlur={e => onSaveNotes('production_notes', e.target.value)}
              placeholder="Anteckningar för leverans..."
              className="bg-black/40 border-white/10 text-gray-100 placeholder:text-gray-600 text-sm focus:border-white/30"
              rows={3}
            />
          </div>
        </div>
      )}
    </div>
  );
}