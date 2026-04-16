import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Trash2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function DataCleanupPanel() {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState(null);

  const handleRunCleanup = async () => {
    setIsRunning(true);
    setResult(null);

    try {
      const res = await base44.functions.invoke('cleanupPurchaseOrderData', {});
      setResult(res.data);
      toast.success(`Rensning slutförd: ${res.data.fixed} poster fixades`);
    } catch (error) {
      console.error('Cleanup error:', error);
      toast.error('Rensning misslyckades: ' + error.message);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6 space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
          <Trash2 className="w-5 h-5 text-amber-400" />
          Datarensning för Inköpsordrar
        </h3>
        <p className="text-sm text-slate-400">
          Rensningsfunktionen fixar följande:
        </p>
        <ul className="text-sm text-slate-400 space-y-1 mt-2 ml-4">
          <li>• fortnox_project_number "-" → null</li>
          <li>• payment_terms "100_percent" → "100_procent_forskott"</li>
          <li>• Tom delivery_terms → null</li>
          <li>• Tom mode_of_transport → null</li>
        </ul>
      </div>

      <Button
        onClick={handleRunCleanup}
        disabled={isRunning}
        className="bg-red-600 hover:bg-red-500 text-white"
      >
        {isRunning ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
            Kör rensning...
          </>
        ) : (
          <>
            <Trash2 className="w-4 h-4 mr-2" />
            Kör datarensning
          </>
        )}
      </Button>

      {result && (
        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-4 space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-medium">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            Rensning slutförd
          </div>
          <p className="text-sm text-emerald-300">
            <strong>{result.fixed}</strong> inköpsorder fixades
          </p>
          {result.details.length > 0 && (
            <details className="text-xs text-emerald-300/80">
              <summary className="cursor-pointer font-medium">Se detaljer</summary>
              <ul className="mt-2 space-y-1 ml-4">
                {result.details.map((poNumber) => (
                  <li key={poNumber}>• {poNumber}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}