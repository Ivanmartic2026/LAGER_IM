import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, AlertCircle, Send, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function FortnoxPOSyncButton({ po }) {
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const syncStatus = po.fortnox_po_sync_status || 'not_synced';

  const handleSync = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('syncPurchaseOrderToFortnox', {
        purchaseOrderId: po.id
      });
      const data = res.data;

      if (data?.validationErrors?.length > 0) {
        toast.error(
          <div>
            <p className="font-semibold mb-1">Validering misslyckades:</p>
            <ul className="list-disc pl-4 text-sm space-y-0.5">
              {data.validationErrors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>,
          { duration: 8000 }
        );
        return;
      }

      if (data?.success) {
        toast.success(`✅ Leverantörsorder skapad i Fortnox #${data.documentNumber}`);
        queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      } else {
        toast.error(`❌ Misslyckades: ${data?.error || 'Okänt fel'}`, { duration: 8000 });
        queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      }
    } catch (e) {
      toast.error('Synk misslyckades: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  if (syncStatus === 'synced') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-green-500/15 border border-green-500/30 text-green-400">
        <CheckCircle2 className="w-3.5 h-3.5" />
        Fortnox PO #{po.fortnox_po_id}
      </span>
    );
  }

  if (syncStatus === 'sync_error') {
    return (
      <div className="flex items-center gap-1.5">
        <span
          title={po.fortnox_po_sync_error || 'Okänt fel'}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-red-500/15 border border-red-500/30 text-red-400 cursor-help"
        >
          <AlertCircle className="w-3 h-3" />
          Sync-fel
        </span>
        <button
          onClick={handleSync}
          disabled={loading}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          Försök igen
        </button>
      </div>
    );
  }

  // not_synced or null
  return (
    <button
      onClick={handleSync}
      disabled={loading}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50 border border-blue-400/30"
    >
      {loading ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : (
        <Send className="w-3 h-3" />
      )}
      {loading ? 'Skickar...' : 'Skicka till Fortnox'}
    </button>
  );
}