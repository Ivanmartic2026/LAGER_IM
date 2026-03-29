import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

export default function FortnoxCustomerSelect({ value, onSelect, disabled }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);

  useEffect(() => {
    if (open && customers.length === 0) {
      fetchCustomers();
    }
  }, [open]);

  // Stäng dropdown vid klick utanför
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const result = await base44.functions.invoke('fetchFortnoxCustomers', {});
      if (result.data.success) {
        setCustomers(result.data.customers || []);
      } else {
        toast.error(`Kunde inte hämta kunder: ${result.data.error}`);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Kunde inte hämta Fortnox-kunder');
    } finally {
      setLoading(false);
    }
  };

  const selectedCustomer = customers.find(c => c.CustomerNumber === value);
  const filteredCustomers = customers.filter(c =>
    !search ||
    c.Name?.toLowerCase().includes(search.toLowerCase()) ||
    c.CustomerNumber?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        disabled={disabled}
        className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-left flex items-center justify-between hover:border-slate-500 transition-colors"
      >
        <span>{selectedCustomer ? selectedCustomer.Name : value ? `Kund #${value}` : 'Välj kund...'}</span>
        <ChevronDown className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-lg">
          <div className="p-2 border-b border-slate-700">
            <Input
              placeholder="Sök på namn eller nummer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-slate-800 border-slate-700 text-white text-sm"
            />
          </div>

          <div className="max-h-64 overflow-y-auto">
            {loading ? (
              <div className="p-4 flex items-center justify-center">
                <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="p-4 text-sm text-white/50 text-center">
                Ingen kund hittad
              </div>
            ) : (
              filteredCustomers.map((customer) => (
                <button
                  type="button"
                  key={customer.CustomerNumber}
                  onClick={() => {
                    onSelect(customer);
                    setOpen(false);
                    setSearch('');
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-800 border-b border-slate-800 text-sm"
                >
                  <div className="font-medium text-white">{customer.Name}</div>
                  <div className="text-xs text-white/50">{customer.CustomerNumber}</div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}