import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, ArrowLeftRight, ArrowRight, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function SupplierSyncPanel() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [pushMissing, setPushMissing] = useState(false);

  const runSync = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke('syncSuppliersWithFortnox', {
        push_missing_to_fortnox: pushMissing
      });
      const data = res.data;
      setResult(data);
      if (data.success) {
        toast.success(`Leverantörssynk klar — ${data.suppliers_matched} matchade, ${data.suppliers_pushed_to_fortnox} skapade i Fortnox`);
      } else {
        toast.error(`Synk misslyckades: ${data.error}`);
      }
    } catch (error) {
      toast.error('Synk misslyckades: ' + error.message);
      setResult({ success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 space-y-4">
        <div>
          <h3 className="text-white font-semibold mb-1">Synkronisera leverantörer med Fortnox</h3>
          <p className="text-sm text-white/50">
            Hämtar alla leverantörer från Fortnox, matchar på namn och skriver tillbaka Fortnox-leverantörsnumret på dina interna leverantörer.
          </p>
        </div>

        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-2">
          <span className="text-amber-400 text-sm">⚠️</span>
          <div className="text-sm text-amber-300">
            <strong>Kräver nytt scope:</strong> Klicka på <strong>"Återanslut Fortnox"</strong> uppe till höger för att auktorisera om med <code className="bg-black/30 px-1 rounded">supplier</code>-scope, annars fungerar inte leverantörssynken.
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-white/70">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
              <ArrowLeft className="w-4 h-4 text-blue-400" />
              <span>Fortnox → Lager AI</span>
              <span className="text-white/40 text-xs">(matcha & spara FN-nr)</span>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-white/70 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={pushMissing}
              onChange={(e) => setPushMissing(e.target.checked)}
              className="rounded"
            />
            <span>Skapa saknade leverantörer i Fortnox</span>
            <ArrowRight className="w-4 h-4 text-green-400" />
            <span className="text-white/40 text-xs">(Lager AI → Fortnox)</span>
          </label>
        </div>

        <Button
          onClick={runSync}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-500 text-white"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Synkar...</>
          ) : (
            <><ArrowLeftRight className="w-4 h-4 mr-2" />Synka leverantörer nu</>
          )}
        </Button>
      </div>

      {result && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-6 rounded-2xl border ${result.success ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}
        >
          <div className="flex items-start gap-4">
            {result.success
              ? <CheckCircle2 className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
              : <XCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />}
            <div className="flex-1">
              <h3 className={`font-semibold mb-3 ${result.success ? 'text-green-400' : 'text-red-400'}`}>
                {result.success ? 'Synkronisering slutförd' : 'Synkronisering misslyckades'}
              </h3>
              {result.success && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Fortnox-leverantörer', value: result.fortnox_suppliers },
                    { label: 'Matchade & uppdaterade', value: result.suppliers_matched },
                    { label: 'Skapade i Fortnox', value: result.suppliers_pushed_to_fortnox },
                    { label: 'Saknas i Fortnox', value: result.missing_count },
                  ].map(({ label, value }) => (
                    <div key={label} className="p-3 rounded-lg bg-white/5 border border-white/10 text-center">
                      <p className="text-2xl font-bold text-white">{value ?? 0}</p>
                      <p className="text-xs text-white/50 mt-1">{label}</p>
                    </div>
                  ))}
                </div>
              )}
              {result.missing_names && result.missing_names.length > 0 && !pushMissing && (
                <div className="mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <p className="text-xs text-amber-400 font-medium mb-1">Leverantörer som saknas i Fortnox:</p>
                  <p className="text-xs text-amber-300/70">{result.missing_names.join(', ')}</p>
                  <p className="text-xs text-amber-300/50 mt-1">Kryssa i "Skapa saknade..." och kör synken igen för att pusha dem.</p>
                </div>
              )}
              {result.error && <p className="text-sm text-red-400 mt-2">{result.error}</p>}
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}