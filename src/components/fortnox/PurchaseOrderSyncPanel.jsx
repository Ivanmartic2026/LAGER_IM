import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, XCircle, Loader2, ArrowLeftRight, ArrowRight, ArrowLeft, RefreshCw, Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function PurchaseOrderSyncPanel() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [syncing, setSyncing] = useState({});
  const [fetchError, setFetchError] = useState(null);

  const fetchAll = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const [localPOs, fnRes] = await Promise.all([
        base44.entities.PurchaseOrder.list('-created_date', 200),
        base44.functions.invoke('syncPurchaseOrdersWithFortnox', { dry_run: true })
      ]);

      const fnData = fnRes.data;
      if (!fnData?.fortnox_list) {
        const errMsg = fnData?.error || 'okänt fel';
        setFetchError(errMsg);
        toast.error('Kunde inte hämta Fortnox-fakturor: ' + errMsg);
        setLoading(false);
        return;
      }

      const fortnoxList = fnData.fortnox_list || [];

      // Build lookup: fortnox GivenNumber → invoice
      const fnByNumber = {};
      const fnByYourRef = {};
      for (const inv of fortnoxList) {
        if (inv.GivenNumber) fnByNumber[String(inv.GivenNumber)] = inv;
        if (inv.YourReference) fnByYourRef[inv.YourReference.toLowerCase().trim()] = inv;
      }

      const merged = [];
      const usedFnNumbers = new Set();

      for (const po of localPOs) {
        const fnMatch =
          (po.fortnox_incoming_goods_id && fnByNumber[po.fortnox_incoming_goods_id]) ||
          (po.po_number && fnByYourRef[po.po_number.toLowerCase().trim()]);

        merged.push({
          key: po.id,
          internal: po,
          fortnox: fnMatch || null,
          inLagerAI: true,
          inFortnox: !!fnMatch,
        });

        if (fnMatch) usedFnNumbers.add(String(fnMatch.GivenNumber));
      }

      // Add Fortnox-only invoices
      for (const inv of fortnoxList) {
        if (!usedFnNumbers.has(String(inv.GivenNumber))) {
          merged.push({
            key: 'fn_' + inv.GivenNumber,
            internal: null,
            fortnox: inv,
            inLagerAI: false,
            inFortnox: true,
          });
        }
      }

      merged.sort((a, b) => {
        const nameA = (a.internal?.supplier_name || a.fortnox?.SupplierName || '').toLowerCase();
        const nameB = (b.internal?.supplier_name || b.fortnox?.SupplierName || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });

      setRows(merged);
    } catch (err) {
      setFetchError(err.message);
      toast.error('Fel: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const pushToFortnox = async (row) => {
    setSyncing(p => ({ ...p, [row.key]: true }));
    const label = row.internal?.po_number || row.internal?.supplier_name || 'PO';
    const toastId = toast.loading(`Synkar ${label} till Fortnox...`);
    try {
      const res = await base44.functions.invoke('syncPurchaseOrdersWithFortnox', { po_id: row.internal.id });
      const data = res.data;
      toast.dismiss(toastId);
      if (data?.success) {
        toast.success(`${label} synkad till Fortnox ✓`);
        await fetchAll();
      } else {
        toast.error('Misslyckades: ' + (data?.error || 'okänt fel'));
      }
    } catch (err) {
      toast.dismiss(toastId);
      toast.error('Fel: ' + err.message);
    } finally {
      setSyncing(p => ({ ...p, [row.key]: false }));
    }
  };

  const importToLagerAI = async (row) => {
    setSyncing(p => ({ ...p, [row.key]: true }));
    const label = row.fortnox?.SupplierName || row.fortnox?.GivenNumber || 'Faktura';
    try {
      const res = await base44.functions.invoke('syncPurchaseOrdersWithFortnox', {
        import_from_fortnox: true,
        fortnox_invoice_number: row.fortnox.GivenNumber
      });
      const data = res.data;
      if (data?.success) {
        toast.success(`${label} importerad till Lager AI ✓`);
        await fetchAll();
      } else {
        toast.error('Import misslyckades: ' + (data?.error || 'okänt fel'));
      }
    } catch (err) {
      toast.error('Import misslyckades: ' + err.message);
    } finally {
      setSyncing(p => ({ ...p, [row.key]: false }));
    }
  };

  const filtered = rows.filter(r => {
    if (!searchTerm) return true;
    const name = (r.internal?.supplier_name || r.fortnox?.SupplierName || '').toLowerCase();
    const num = (r.internal?.po_number || r.fortnox?.YourReference || String(r.fortnox?.GivenNumber || '')).toLowerCase();
    return name.includes(searchTerm.toLowerCase()) || num.includes(searchTerm.toLowerCase());
  });

  const stats = {
    total: rows.length,
    bothSystems: rows.filter(r => r.inLagerAI && r.inFortnox).length,
    onlyLagerAI: rows.filter(r => r.inLagerAI && !r.inFortnox).length,
    onlyFortnox: rows.filter(r => !r.inLagerAI && r.inFortnox).length,
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

      {fetchError && (
        <div className="p-4 rounded-xl bg-red-500/15 border border-red-500/40 flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div className="flex-1">
            <p className="text-red-300 font-semibold text-sm">Fel vid hämtning</p>
            <p className="text-red-300/70 text-sm mt-1 font-mono">{fetchError}</p>
          </div>
        </div>
      )}

      <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 space-y-4">

        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white font-semibold">Inköpsorder — Lager AI ↔ Fortnox</h3>
            <p className="text-sm text-white/50">Kombinerad vy. Synka åt valfritt håll per rad.</p>
          </div>
          <Button onClick={fetchAll} disabled={loading} className="bg-blue-600 hover:bg-blue-500 text-white">
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Laddar...</> : <><RefreshCw className="w-4 h-4 mr-2" />Hämta båda system</>}
          </Button>
        </div>

        {rows.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-center">
              <p className="text-xl font-bold text-green-400">{stats.bothSystems}</p>
              <p className="text-xs text-green-400/70 mt-0.5">I båda system</p>
            </div>
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
              <p className="text-xl font-bold text-blue-400">{stats.onlyLagerAI}</p>
              <p className="text-xs text-blue-400/70 mt-0.5">Saknas i Fortnox</p>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
              <p className="text-xl font-bold text-amber-400">{stats.onlyFortnox}</p>
              <p className="text-xs text-amber-400/70 mt-0.5">Saknas i Lager AI</p>
            </div>
          </div>
        )}

        <Input
          placeholder="Sök leverantör eller PO-nummer..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-slate-800 border-slate-700 text-white"
        />

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-7 h-7 text-blue-400 animate-spin" /></div>
        ) : rows.length === 0 ? (
          <div className="text-center py-16 text-white/40">
            Klicka <strong className="text-white/60">"Hämta båda system"</strong> för att ladda inköpsorder
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-white/50 text-xs uppercase tracking-wide">
                  <th className="p-3 pl-6 text-left">Leverantör</th>
                  <th className="p-3 text-left">PO-nummer</th>
                  <th className="p-3 text-center">Lager AI</th>
                  <th className="p-3 text-center w-16"></th>
                  <th className="p-3 text-center">Fortnox</th>
                  <th className="p-3 text-left">Fortnox-nr</th>
                  <th className="p-3 text-right pr-6">Åtgärd</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const supplierName = row.internal?.supplier_name || row.fortnox?.SupplierName || '–';
                  const poNumber = row.internal?.po_number || row.fortnox?.YourReference || '–';
                  const fnNumber = row.internal?.fortnox_incoming_goods_id || row.fortnox?.GivenNumber || '–';
                  const isSyncing = syncing[row.key];
                  const both = row.inLagerAI && row.inFortnox;

                  return (
                    <tr key={row.key} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="p-3 pl-6 text-white font-medium">{supplierName}</td>
                      <td className="p-3 font-mono text-xs text-white/70">{poNumber}</td>

                      <td className="p-3 text-center">
                        {row.inLagerAI ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs">
                            <CheckCircle2 className="w-3 h-3" /> Finns
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-500/15 text-slate-500 text-xs">
                            <XCircle className="w-3 h-3" /> Saknas
                          </span>
                        )}
                      </td>

                      <td className="p-3 text-center">
                        {both ? (
                          <ArrowLeftRight className="w-4 h-4 text-green-400 mx-auto" />
                        ) : row.inLagerAI ? (
                          <ArrowRight className="w-4 h-4 text-blue-400 mx-auto" />
                        ) : (
                          <ArrowLeft className="w-4 h-4 text-amber-400 mx-auto" />
                        )}
                      </td>

                      <td className="p-3 text-center">
                        {row.inFortnox ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs">
                            <CheckCircle2 className="w-3 h-3" /> Finns
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-500/15 text-slate-500 text-xs">
                            <XCircle className="w-3 h-3" /> Saknas
                          </span>
                        )}
                      </td>

                      <td className="p-3 font-mono text-xs text-white/50">{fnNumber}</td>

                      <td className="p-3 pr-6 text-right">
                        {both ? (
                          <span className="text-xs text-green-400/60">Synkad ✓</span>
                        ) : row.inLagerAI && !row.inFortnox ? (
                          <Button
                            size="sm"
                            onClick={() => pushToFortnox(row)}
                            disabled={isSyncing}
                            className="bg-blue-600/30 hover:bg-blue-600/60 text-blue-300 border-0 text-xs h-7 px-3"
                          >
                            {isSyncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Upload className="w-3 h-3 mr-1" />→ Fortnox</>}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => importToLagerAI(row)}
                            disabled={isSyncing}
                            className="bg-amber-600/30 hover:bg-amber-600/60 text-amber-300 border-0 text-xs h-7 px-3"
                          >
                            {isSyncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Download className="w-3 h-3 mr-1" />→ Lager AI</>}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="p-8 text-center text-white/40">Inga inköpsorder matchar sökningen</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {rows.length > 0 && (
          <p className="text-xs text-white/30">{stats.total} inköpsorder totalt</p>
        )}
      </div>
    </motion.div>
  );
}