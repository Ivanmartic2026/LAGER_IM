import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { CheckCircle2, XCircle, Loader2, ArrowLeftRight, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function SupplierSyncPanel() {
  const [suppliers, setSuppliers] = useState([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  const [selected, setSelected] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    setLoadingSuppliers(true);
    try {
      const data = await base44.entities.Supplier.list();
      setSuppliers(data.sort((a, b) => a.name?.localeCompare(b.name || '') || 0));
    } catch (err) {
      toast.error('Kunde inte hämta leverantörer');
    } finally {
      setLoadingSuppliers(false);
    }
  };

  const filtered = suppliers.filter(s =>
    !searchTerm ||
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.fortnox_supplier_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(s => s.id)));
    }
  };

  const toggle = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const runSync = async () => {
    if (selected.size === 0) {
      toast.error('Välj minst en leverantör');
      return;
    }
    setSyncing(true);
    setResult(null);
    try {
      const selectedSuppliers = suppliers.filter(s => selected.has(s.id));
      const res = await base44.functions.invoke('syncSuppliersWithFortnox', {
        supplier_ids: selectedSuppliers.map(s => s.id),
        push_missing_to_fortnox: true
      });
      const data = res.data;
      setResult(data);
      if (data.success) {
        toast.success(`Synk klar — ${data.suppliers_matched} matchade, ${data.suppliers_pushed_to_fortnox} skapade i Fortnox`);
        await fetchSuppliers();
        setSelected(new Set());
      } else {
        toast.error(`Synk misslyckades: ${data.error}`);
      }
    } catch (err) {
      toast.error('Synk misslyckades: ' + err.message);
      setResult({ success: false, error: err.message });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2">
        <span className="text-amber-400 text-sm mt-0.5">⚠️</span>
        <p className="text-sm text-amber-300">
          <strong>Kräver nytt scope:</strong> Klicka på <strong>"Återanslut Fortnox"</strong> uppe till höger och godkänn om innan du synkar leverantörer.
        </p>
      </div>

      <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white font-semibold">Välj leverantörer att synka</h3>
            <p className="text-sm text-white/50 mt-0.5">Välj vilka leverantörer som ska matchas/skapas i Fortnox</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={fetchSuppliers} variant="outline" size="sm" className="bg-white/5 border-white/20 text-white/70 hover:text-white">
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button
              onClick={runSync}
              disabled={syncing || selected.size === 0}
              className="bg-blue-600 hover:bg-blue-500 text-white"
            >
              {syncing
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Synkar...</>
                : <><ArrowLeftRight className="w-4 h-4 mr-2" />Synka {selected.size > 0 ? `${selected.size} ` : ''}valda</>
              }
            </Button>
          </div>
        </div>

        <Input
          placeholder="Sök leverantör..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-slate-800 border-slate-700 text-white"
        />

        {loadingSuppliers ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="p-3 pl-6 text-left">
                    <Checkbox
                      checked={filtered.length > 0 && selected.size === filtered.length}
                      onCheckedChange={toggleAll}
                    />
                  </th>
                  <th className="p-3 text-left text-white/70">Leverantör</th>
                  <th className="p-3 text-left text-white/70">E-post</th>
                  <th className="p-3 text-left text-white/70">Telefon</th>
                  <th className="p-3 text-left text-white/70">Fortnox-nr</th>
                  <th className="p-3 text-left text-white/70">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer" onClick={() => toggle(s.id)}>
                    <td className="p-3 pl-6">
                      <Checkbox
                        checked={selected.has(s.id)}
                        onCheckedChange={() => toggle(s.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td className="p-3 text-white font-medium">{s.name}</td>
                    <td className="p-3 text-white/60">{s.email || '–'}</td>
                    <td className="p-3 text-white/60">{s.phone || '–'}</td>
                    <td className="p-3 text-white font-mono text-xs">{s.fortnox_supplier_number || '–'}</td>
                    <td className="p-3">
                      {s.fortnox_supplier_number ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs">
                          <CheckCircle2 className="w-3 h-3" /> Synkad
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full bg-slate-500/20 text-slate-400 text-xs">
                          Ej synkad
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-white/40">Inga leverantörer hittades</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-xs text-white/30">{suppliers.length} leverantörer totalt • {suppliers.filter(s => s.fortnox_supplier_number).length} synkade</p>
      </div>

      {result && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
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
              {result.error && <p className="text-sm text-red-400 mt-2">{result.error}</p>}
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}