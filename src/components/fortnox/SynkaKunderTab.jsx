import { useState, useMemo } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, Search, Hash, Mail, Phone, MapPin, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function SynkaKunderTab() {
  const [search, setSearch] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const { data: customers = [], isLoading, refetch } = useQuery({
    queryKey: ['fortnoxCustomers'],
    queryFn: () => base44.entities.FortnoxCustomer.list('-updated_date', 2000),
  });

  const filtered = useMemo(() => {
    if (!search) return customers;
    const q = search.toLowerCase();
    return customers.filter(c =>
      c.name?.toLowerCase().includes(q) ||
      c.customer_number?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.city?.toLowerCase().includes(q)
    );
  }, [customers, search]);

  const handleSync = async () => {
    setSyncing(true);
    setLastResult(null);
    toast.info('Hämtar alla kunder från Fortnox (kan ta en stund)...');
    try {
      const res = await base44.functions.invoke('syncFortnoxCustomers', {});
      const { created = 0, updated = 0, total_in_fortnox, synced_count } = res.data;
      const msg = `Synkade ${synced_count} kunder — ${created} nya, ${updated} uppdaterade`;
      toast.success(msg);
      setLastResult({ created, updated, synced_count, total_in_fortnox });
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Synk misslyckades');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Sync button + result */}
      <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Synka alla kunder från Fortnox</h2>
            <p className="text-sm text-white/50 mt-0.5">
              Hämtar samtliga kunder via paginering och uppdaterar/skapar poster i databasen.
            </p>
          </div>
          <Button
            onClick={handleSync}
            disabled={syncing}
            className="bg-blue-600 hover:bg-blue-500 text-white gap-2 whitespace-nowrap"
          >
            {syncing ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Synkar...</>
            ) : (
              <><RefreshCw className="w-4 h-4" /> Synka alla kunder</>
            )}
          </Button>
        </div>

        {lastResult && (
          <div className="flex flex-wrap gap-4 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-sm">
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle2 className="w-4 h-4" />
              <span className="font-semibold">Synk klar!</span>
            </div>
            <span className="text-white/70">{lastResult.synced_count} totalt synkade</span>
            <span className="text-green-400">+{lastResult.created} nya</span>
            <span className="text-blue-400">↻ {lastResult.updated} uppdaterade</span>
            {lastResult.total_in_fortnox && (
              <span className="text-white/50">{lastResult.total_in_fortnox} totalt i Fortnox</span>
            )}
          </div>
        )}
      </div>

      {/* Summary + search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <p className="text-sm text-white/50">
          {customers.length} kunder synkade
          {filtered.length !== customers.length && ` • ${filtered.length} visas`}
        </p>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Sök kundnummer, namn, ort..."
            className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/30"
          />
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-white/50">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Laddar kunder...
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-white/50">
          {customers.length === 0
            ? 'Inga kunder synkade ännu. Klicka "Synka alla kunder".'
            : 'Ingen matchning på sökningen.'}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/5">
          <table className="w-full text-sm">
            <thead className="border-b border-white/10 bg-white/5">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-white/70">Kundnummer</th>
                <th className="px-4 py-3 text-left font-semibold text-white">Kundnamn</th>
                <th className="px-4 py-3 text-left font-semibold text-white/70">Stad</th>
                <th className="px-4 py-3 text-left font-semibold text-white/70">E-post</th>
                <th className="px-4 py-3 text-left font-semibold text-white/70">Telefon</th>
                <th className="px-4 py-3 text-left font-semibold text-white/70">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map(customer => (
                <tr key={customer.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 text-white/60 font-mono flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 flex-shrink-0" />
                    {customer.customer_number}
                  </td>
                  <td className="px-4 py-3 font-medium text-white">{customer.name}</td>
                  <td className="px-4 py-3 text-white/60">
                    {customer.city ? (
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" />{customer.city}
                      </span>
                    ) : <span className="text-white/30">—</span>}
                  </td>
                  <td className="px-4 py-3 text-white/60">
                    {customer.email ? (
                      <a href={`mailto:${customer.email}`} className="flex items-center gap-1.5 hover:text-blue-400">
                        <Mail className="w-3.5 h-3.5" />{customer.email}
                      </a>
                    ) : <span className="text-white/30">—</span>}
                  </td>
                  <td className="px-4 py-3 text-white/60">
                    {customer.phone ? (
                      <a href={`tel:${customer.phone}`} className="flex items-center gap-1.5 hover:text-blue-400">
                        <Phone className="w-3.5 h-3.5" />{customer.phone}
                      </a>
                    ) : <span className="text-white/30">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                      customer.active ? 'bg-green-500/15 text-green-300' : 'bg-red-500/15 text-red-300'
                    }`}>
                      {customer.active ? 'Aktiv' : 'Inaktiv'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}