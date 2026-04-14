import { useState, useMemo } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Search, RefreshCw, Mail, Phone, MapPin, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function FortnoxCustomers() {
  const [search, setSearch] = useState('');
  const [syncing, setSyncing] = useState(false);

  const { data: customers = [], isLoading, refetch } = useQuery({
    queryKey: ['fortnoxCustomers'],
    queryFn: () => base44.entities.FortnoxCustomer.list('-updated_date', 1000),
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
    toast.info('Hämtar alla kunder från Fortnox (kan ta en stund)...');
    try {
      const res = await base44.functions.invoke('syncFortnoxCustomers', {});
      const { created = 0, updated = 0, total_in_fortnox } = res.data;
      toast.success(`✓ ${res.data.message}${total_in_fortnox ? ` (${total_in_fortnox} totalt i Fortnox)` : ''}`);
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Synk misslyckades');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-black p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Fortnox-kunder</h1>
            <p className="text-sm text-white/50 mt-1">
              {customers.length} kund{customers.length !== 1 ? 'er' : ''} synkade
              {search && ` (visar ${filtered.length} matchningar)`}
            </p>
          </div>
          <Button onClick={handleSync} disabled={syncing}
            className="bg-blue-600 hover:bg-blue-500 text-white gap-2 whitespace-nowrap">
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Synkar...' : 'Synka Fortnox-kunder'}
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Sök efter namn, kundnummer, e-post eller ort..."
            className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/30"
          />
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-white/50">Laddar kunder...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-white/50">
              {customers.length === 0 ? 'Inga kunder synkade ännu. Klicka "Synka Fortnox-kunder".' : 'Ingen matchning på sökningen.'}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/5">
            <table className="w-full text-sm">
              <thead className="border-b border-white/10 bg-white/5">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-white">Namn</th>
                  <th className="px-4 py-3 text-left font-semibold text-white/70">Kundnummer</th>
                  <th className="px-4 py-3 text-left font-semibold text-white/70">E-post</th>
                  <th className="px-4 py-3 text-left font-semibold text-white/70">Telefon</th>
                  <th className="px-4 py-3 text-left font-semibold text-white/70">Ort</th>
                  <th className="px-4 py-3 text-left font-semibold text-white/70">Organisationsnummer</th>
                  <th className="px-4 py-3 text-left font-semibold text-white/70">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filtered.map(customer => (
                  <tr key={customer.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 font-medium text-white">{customer.name}</td>
                    <td className="px-4 py-3 text-white/60 flex items-center gap-1.5">
                      <Hash className="w-3.5 h-3.5" />
                      {customer.customer_number}
                    </td>
                    <td className="px-4 py-3 text-white/60">
                      {customer.email ? (
                        <a href={`mailto:${customer.email}`} className="flex items-center gap-1.5 hover:text-blue-400">
                          <Mail className="w-3.5 h-3.5" />
                          {customer.email}
                        </a>
                      ) : (
                        <span className="text-white/30">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-white/60">
                      {customer.phone ? (
                        <a href={`tel:${customer.phone}`} className="flex items-center gap-1.5 hover:text-blue-400">
                          <Phone className="w-3.5 h-3.5" />
                          {customer.phone}
                        </a>
                      ) : (
                        <span className="text-white/30">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-white/60 flex items-center gap-1.5">
                      {customer.city ? (
                        <>
                          <MapPin className="w-3.5 h-3.5" />
                          {customer.city}
                        </>
                      ) : (
                        <span className="text-white/30">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-white/60">{customer.organisation_number || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                        customer.active
                          ? 'bg-green-500/15 text-green-300'
                          : 'bg-red-500/15 text-red-300'
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
    </div>
  );
}