import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { CheckCircle2, XCircle, Loader2, ArrowLeftRight, ArrowDown, ArrowUp, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

// ── Tab: Lager AI → Fortnox ────────────────────────────────────────────────
function PushToFortnoxTab() {
  const [suppliers, setSuppliers] = useState([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  const [selected, setSelected] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => { fetchSuppliers(); }, []);

  const fetchSuppliers = async () => {
    setLoadingSuppliers(true);
    try {
      const data = await base44.entities.Supplier.list();
      setSuppliers(data.sort((a, b) => (a.name || '').localeCompare(b.name || '')));
    } catch {
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

  const toggle = (id) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map(s => s.id)));
  };

  const runSync = async () => {
    if (selected.size === 0) { toast.error('Välj minst en leverantör'); return; }
    setSyncing(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke('syncSuppliersWithFortnox', {
        supplier_ids: [...selected],
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
    <div className="space-y-4">
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-sm text-amber-300">
        ⚠️ <strong>Kräver supplier-scope:</strong> Klicka på <strong>"Återanslut Fortnox"</strong> uppe till höger och godkänn om innan du synkar.
      </div>

      <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white font-semibold">Lager AI → Fortnox</h3>
            <p className="text-sm text-white/50">Matcha interna leverantörer mot Fortnox eller skapa nya</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={fetchSuppliers} variant="outline" size="sm" className="bg-white/5 border-white/20 text-white/70 hover:text-white">
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button onClick={runSync} disabled={syncing || selected.size === 0} className="bg-blue-600 hover:bg-blue-500 text-white">
              {syncing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Synkar...</> : <><ArrowUp className="w-4 h-4 mr-2" />Synka {selected.size > 0 ? `${selected.size} ` : ''}valda</>}
            </Button>
          </div>
        </div>

        <Input placeholder="Sök leverantör..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-slate-800 border-slate-700 text-white" />

        {loadingSuppliers ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-blue-400 animate-spin" /></div>
        ) : (
          <div className="overflow-x-auto -mx-6">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="p-3 pl-6 text-left"><Checkbox checked={filtered.length > 0 && selected.size === filtered.length} onCheckedChange={toggleAll} /></th>
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
                    <td className="p-3 pl-6"><Checkbox checked={selected.has(s.id)} onCheckedChange={() => toggle(s.id)} onClick={(e) => e.stopPropagation()} /></td>
                    <td className="p-3 text-white font-medium">{s.name}</td>
                    <td className="p-3 text-white/60">{s.email || '–'}</td>
                    <td className="p-3 text-white/60">{s.phone || '–'}</td>
                    <td className="p-3 text-white font-mono text-xs">{s.fortnox_supplier_number || '–'}</td>
                    <td className="p-3">
                      {s.fortnox_supplier_number ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs"><CheckCircle2 className="w-3 h-3" /> Synkad</span>
                      ) : (
                        <span className="px-2 py-1 rounded-full bg-slate-500/20 text-slate-400 text-xs">Ej synkad</span>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-white/40">Inga leverantörer hittades</td></tr>}
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
            {result.success ? <CheckCircle2 className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" /> : <XCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />}
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
    </div>
  );
}

// ── Tab: Fortnox → Lager AI ────────────────────────────────────────────────
function ImportFromFortnoxTab() {
  const [fortnoxSuppliers, setFortnoxSuppliers] = useState([]);
  const [internalSuppliers, setInternalSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [importing, setImporting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [intRes, fnRes] = await Promise.all([
        base44.entities.Supplier.list(),
        base44.functions.invoke('syncSuppliersWithFortnox', { dry_run: true, supplier_ids: [] })
      ]);
      setInternalSuppliers(intRes);

      // dry_run returns fortnox list in details
      const fnData = fnRes.data;
      if (fnData?.fortnox_list) {
        setFortnoxSuppliers(fnData.fortnox_list);
      } else {
        toast.error('Kunde inte hämta Fortnox-leverantörer: ' + (fnData?.error || 'okänt fel'));
      }
    } catch (err) {
      toast.error('Fel: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const internalNumberSet = new Set(internalSuppliers.map(s => s.fortnox_supplier_number).filter(Boolean));
  const internalNameSet = new Set(internalSuppliers.map(s => s.name?.toLowerCase().trim()).filter(Boolean));

  const enriched = fortnoxSuppliers.map(s => ({
    ...s,
    existsLocally: internalNumberSet.has(s.SupplierNumber) || internalNameSet.has(s.Name?.toLowerCase().trim())
  }));

  const filtered = enriched.filter(s =>
    !searchTerm ||
    s.Name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.SupplierNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const missing = filtered.filter(s => !s.existsLocally);

  const toggle = (num) => {
    const next = new Set(selected);
    next.has(num) ? next.delete(num) : next.add(num);
    setSelected(next);
  };

  const toggleAll = () => {
    setSelected(selected.size === missing.length ? new Set() : new Set(missing.map(s => s.SupplierNumber)));
  };

  const importSelected = async () => {
    if (selected.size === 0) { toast.error('Välj minst en leverantör'); return; }
    setImporting(true);
    try {
      const toImport = fortnoxSuppliers.filter(s => selected.has(s.SupplierNumber));
      await Promise.all(toImport.map(s =>
        base44.entities.Supplier.create({
          name: s.Name,
          fortnox_supplier_number: s.SupplierNumber,
          email: s.Email || '',
          phone: s.Phone || '',
          address: s.Address1 || '',
          is_active: true
        })
      ));
      toast.success(`${toImport.length} leverantörer importerade!`);
      setSelected(new Set());
      await fetchData();
    } catch (err) {
      toast.error('Import misslyckades: ' + err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white font-semibold">Fortnox → Lager AI</h3>
            <p className="text-sm text-white/50">Hämta leverantörer från Fortnox och importera de som saknas</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={fetchData} disabled={loading} variant="outline" className="bg-white/5 border-white/20 text-white/70 hover:text-white">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {loading ? '' : ' Hämta från Fortnox'}
            </Button>
            <Button onClick={importSelected} disabled={importing || selected.size === 0} className="bg-green-600 hover:bg-green-500 text-white">
              {importing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Importerar...</> : <><ArrowDown className="w-4 h-4 mr-2" />Importera {selected.size > 0 ? `${selected.size} ` : ''}valda</>}
            </Button>
          </div>
        </div>

        {fortnoxSuppliers.length === 0 && !loading ? (
          <div className="text-center py-12 text-white/40">Klicka "Hämta från Fortnox" för att ladda leverantörer</div>
        ) : loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-blue-400 animate-spin" /></div>
        ) : (
          <>
            <Input placeholder="Sök leverantör eller nummer..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-slate-800 border-slate-700 text-white" />
            <div className="overflow-x-auto -mx-6">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="p-3 pl-6 text-left"><Checkbox checked={missing.length > 0 && selected.size === missing.length} onCheckedChange={toggleAll} /></th>
                    <th className="p-3 text-left text-white/70">Leverantörsnummer</th>
                    <th className="p-3 text-left text-white/70">Namn</th>
                    <th className="p-3 text-left text-white/70">E-post</th>
                    <th className="p-3 text-left text-white/70">Telefon</th>
                    <th className="p-3 text-left text-white/70">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => (
                    <tr key={s.SupplierNumber} className={`border-b border-white/5 transition-colors ${!s.existsLocally ? 'hover:bg-white/5 cursor-pointer' : 'opacity-50'}`}
                      onClick={() => !s.existsLocally && toggle(s.SupplierNumber)}>
                      <td className="p-3 pl-6">
                        {!s.existsLocally && (
                          <Checkbox checked={selected.has(s.SupplierNumber)} onCheckedChange={() => toggle(s.SupplierNumber)} onClick={(e) => e.stopPropagation()} />
                        )}
                      </td>
                      <td className="p-3 text-white font-mono text-xs">{s.SupplierNumber}</td>
                      <td className="p-3 text-white font-medium">{s.Name}</td>
                      <td className="p-3 text-white/60">{s.Email || '–'}</td>
                      <td className="p-3 text-white/60">{s.Phone || '–'}</td>
                      <td className="p-3">
                        {s.existsLocally ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs"><CheckCircle2 className="w-3 h-3" /> Finns i Lager AI</span>
                        ) : (
                          <span className="px-2 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs">Saknas i Lager AI</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-white/40">Inga leverantörer hittades</td></tr>}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-white/30">{fortnoxSuppliers.length} i Fortnox • {enriched.filter(s => s.existsLocally).length} finns redan • {enriched.filter(s => !s.existsLocally).length} saknas</p>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main Panel ─────────────────────────────────────────────────────────────
export default function SupplierSyncPanel() {
  const [tab, setTab] = useState('push');

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => setTab('push')}
          className={`px-5 py-2.5 rounded-lg font-medium text-sm transition-all ${tab === 'push' ? 'bg-blue-600 text-white' : 'bg-white/5 border border-white/10 text-white/50 hover:text-white'}`}
        >
          <ArrowUp className="w-4 h-4 inline mr-2" />
          Lager AI → Fortnox
        </button>
        <button
          onClick={() => setTab('import')}
          className={`px-5 py-2.5 rounded-lg font-medium text-sm transition-all ${tab === 'import' ? 'bg-blue-600 text-white' : 'bg-white/5 border border-white/10 text-white/50 hover:text-white'}`}
        >
          <ArrowDown className="w-4 h-4 inline mr-2" />
          Fortnox → Lager AI
        </button>
      </div>

      {tab === 'push' && <PushToFortnoxTab />}
      {tab === 'import' && <ImportFromFortnoxTab />}
    </motion.div>
  );
}