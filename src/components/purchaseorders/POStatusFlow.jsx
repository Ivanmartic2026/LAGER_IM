import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronRight, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Status flow steps in order
const STATUS_FLOW = [
  { key: 'draft',                         label: 'Utkast',            short: 'Utkast' },
  { key: 'sent',                          label: 'Skickad',           short: 'Skickad' },
  { key: 'confirmed',                     label: 'Bekräftad',         short: 'Bekräftad' },
  { key: 'waiting_for_supplier_documentation', label: 'Väntar dok.', short: 'Dok.' },
  { key: 'in_production',                 label: 'Under produktion',  short: 'Prod.' },
  { key: 'shipped',                       label: 'I transit',         short: 'Transit' },
  { key: 'ready_for_reception',           label: 'Klar mottagning',   short: 'Klar' },
  { key: 'received',                      label: 'Mottagen',          short: 'Mottagen' },
];

// Next logical status from each current status
const NEXT_STATUS = {
  draft: 'sent',
  sent: 'confirmed',
  confirmed: 'waiting_for_supplier_documentation',
  waiting_for_supplier_documentation: 'in_production',
  in_production: 'shipped',
  shipped: 'ready_for_reception',
  ready_for_reception: 'received',
};

export default function POStatusFlow({ po }) {
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const currentIndex = STATUS_FLOW.findIndex(s => s.key === po.status);
  const nextStatus = NEXT_STATUS[po.status];
  const nextStep = STATUS_FLOW.find(s => s.key === nextStatus);

  if (!nextStatus || po.status === 'received' || po.status === 'cancelled') {
    return null;
  }

  const handleAdvance = async (e) => {
    e.stopPropagation();
    setLoading(true);
    try {
      await base44.entities.PurchaseOrder.update(po.id, { status: nextStatus });
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      toast.success(`Status uppdaterad → ${nextStep?.label}`);
    } catch (err) {
      toast.error('Kunde inte uppdatera status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleAdvance}
      disabled={loading}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-600/20 border border-blue-500/40 text-blue-300 hover:bg-blue-600/40 hover:text-white transition-colors disabled:opacity-50"
    >
      {loading ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : (
        <ChevronRight className="w-3 h-3" />
      )}
      → {nextStep?.short}
    </button>
  );
}